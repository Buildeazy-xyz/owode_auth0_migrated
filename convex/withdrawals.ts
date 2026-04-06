import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ADMIN_WITHDRAWAL_EMAIL =
  process.env.ADMIN_WITHDRAWAL_EMAIL ?? "iyiolaqozeem1@gmail.com";
const ADMIN_WITHDRAWAL_PHONE =
  process.env.ADMIN_WITHDRAWAL_PHONE ?? "08085806038";

function generateWithdrawalReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WDL-${timestamp}-${random}`;
}

async function requireAgent(
  ctx: Pick<MutationCtx | QueryCtx, "auth" | "db">,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "User not logged in",
    });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user || user.role !== "agent") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only agents can request withdrawals",
    });
  }

  return user;
}

export const requestWithdrawal = mutation({
  args: {
    contributorId: v.id("contributors"),
    amount: v.number(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAgent(ctx);

    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Contributor not assigned to this agent",
      });
    }

    const amount = Number(args.amount);
    const bankName = args.bankName.trim();
    const accountName = args.accountName.trim();
    const accountNumber = args.accountNumber.replace(/\D/g, "");
    const note = args.note?.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Enter a valid withdrawal amount",
      });
    }

    if (!bankName || !accountName || accountNumber.length < 10) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Bank name, account name, and a valid account number are required",
      });
    }

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) => q.eq("contributorId", args.contributorId))
      .collect();
    const totalSaved = collections.reduce((sum, item) => sum + item.amount, 0);

    const previousRequests = await ctx.db
      .query("withdrawal_requests")
      .withIndex("by_contributor_and_date", (q) =>
        q.eq("contributorId", args.contributorId),
      )
      .collect();

    const outstandingAmount = previousRequests
      .filter((request) => request.status === "submitted" || request.status === "processing")
      .reduce((sum, request) => sum + request.amount, 0);

    const availableBalance = Math.max(0, totalSaved - outstandingAmount);

    if (amount > availableBalance) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Withdrawal amount exceeds the contributor's available balance of ₦${availableBalance.toLocaleString()}`,
      });
    }

    const referenceNumber = generateWithdrawalReference();
    const requestedAt = new Date().toISOString();

    const requestId = await ctx.db.insert("withdrawal_requests", {
      contributorId: contributor._id,
      agentId: user._id,
      amount,
      bankName,
      accountNumber,
      accountName,
      note,
      requestedAt,
      referenceNumber,
      status: "submitted",
      availableBalanceAtRequest: availableBalance,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendWithdrawalRequestAdminEmail, {
      to: ADMIN_WITHDRAWAL_EMAIL,
      contributorName: contributor.name,
      contributorPhone: contributor.phone,
      agentName: user.name ?? "OWODE Agent",
      amount,
      bankName,
      accountNumber,
      accountName,
      referenceNumber,
      requestedAt,
      note,
    });

    await ctx.scheduler.runAfter(0, internal.sms.sendWithdrawalRequestAdminSMS, {
      to: ADMIN_WITHDRAWAL_PHONE,
      contributorName: contributor.name,
      contributorPhone: contributor.phone,
      agentName: user.name ?? "OWODE Agent",
      amount,
      bankName,
      accountNumber,
      accountName,
      referenceNumber,
    });

    return {
      requestId,
      referenceNumber,
      availableBalance,
      remainingBalance: Math.max(0, availableBalance - amount),
    };
  },
});

export const listByAgent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireAgent(ctx);

    const requests = await ctx.db
      .query("withdrawal_requests")
      .withIndex("by_agent_and_date", (q) => q.eq("agentId", user._id))
      .order("desc")
      .take(args.limit ?? 20);

    return await Promise.all(
      requests.map(async (request) => {
        const contributor = await ctx.db.get(request.contributorId);
        return {
          ...request,
          contributorName: contributor?.name ?? "Unknown",
          contributorPhone: contributor?.phone ?? "",
        };
      }),
    );
  },
});
