import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ADMIN_WITHDRAWAL_EMAIL = "iyiolaqozeem1@gmail.com";
const ADMIN_WITHDRAWAL_PHONE = "08085806038";

function generateWithdrawalReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WDL-${timestamp}-${random}`;
}

function calculateWithdrawalTerms(dailyAmount: number, contributionDays: number, amount: number) {
  const contributionFee = Math.max(0, Math.round(dailyAmount / 2));
  const penaltyFee = contributionDays < 26 ? contributionFee : 0;
  const payoutAmount = Math.max(0, amount - contributionFee - penaltyFee);

  return {
    contributionDays,
    contributionFee,
    penaltyFee,
    payoutAmount,
  };
}

function buildWithdrawalPreview({
  dailyAmount,
  contributionDays,
  totalSaved,
  consumedAmount,
  requestedAmount,
  withdrawAll,
}: {
  dailyAmount: number;
  contributionDays: number;
  totalSaved: number;
  consumedAmount: number;
  requestedAmount?: number;
  withdrawAll: boolean;
}) {
  const availableBalance = Math.max(0, totalSaved - consumedAmount);
  const normalizedAmount = withdrawAll
    ? availableBalance
    : Math.max(0, requestedAmount ?? availableBalance);
  const { contributionFee, penaltyFee, payoutAmount } =
    calculateWithdrawalTerms(dailyAmount, contributionDays, normalizedAmount);

  return {
    totalSaved,
    consumedAmount,
    availableBalance,
    requestedAmount: normalizedAmount,
    contributionDays,
    contributionFee,
    penaltyFee,
    payoutAmount,
  };
}

function getApprovedWithdrawalTotal(
  requests: Array<Doc<"withdrawal_requests">>,
  excludeRequestId?: Doc<"withdrawal_requests">["_id"],
) {
  return requests
    .filter(
      (request) =>
        request.status === "paid" && request._id !== excludeRequestId,
    )
    .reduce((sum, request) => sum + request.amount, 0);
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

async function requireAdmin(
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

  if (!user || user.role !== "admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only admins can review withdrawals",
    });
  }

  return user;
}

export const getPreview = query({
  args: {
    contributorId: v.id("contributors"),
    amount: v.optional(v.number()),
    withdrawAll: v.optional(v.boolean()),
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

    const consumedAmount = getApprovedWithdrawalTotal(previousRequests);

    return buildWithdrawalPreview({
      dailyAmount: contributor.dailyAmount,
      contributionDays: collections.length,
      totalSaved,
      consumedAmount,
      requestedAmount: args.amount,
      withdrawAll: args.withdrawAll ?? true,
    });
  },
});

export const requestWithdrawal = mutation({
  args: {
    contributorId: v.id("contributors"),
    amount: v.optional(v.number()),
    withdrawAll: v.optional(v.boolean()),
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

    const withdrawAll = args.withdrawAll ?? true;
    const amount = Number(args.amount ?? 0);
    const bankName = args.bankName.trim();
    const accountName = args.accountName.trim();
    const accountNumber = args.accountNumber.replace(/\D/g, "");
    const note = args.note?.trim();

    if (!withdrawAll && (!Number.isFinite(amount) || amount <= 0)) {
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

    const consumedAmount = getApprovedWithdrawalTotal(previousRequests);

    const preview = buildWithdrawalPreview({
      dailyAmount: contributor.dailyAmount,
      contributionDays: collections.length,
      totalSaved,
      consumedAmount,
      requestedAmount: amount,
      withdrawAll,
    });

    if (preview.availableBalance <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This contributor does not have any available balance to withdraw yet",
      });
    }

    if (preview.requestedAmount > preview.availableBalance) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Withdrawal amount exceeds the contributor's available balance of ₦${preview.availableBalance.toLocaleString()}`,
      });
    }

    if (preview.payoutAmount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Withdrawal amount must be greater than the total fees of ₦${(
          preview.contributionFee + preview.penaltyFee
        ).toLocaleString()}`,
      });
    }

    const referenceNumber = generateWithdrawalReference();
    const requestedAt = new Date().toISOString();

    const requestId = await ctx.db.insert("withdrawal_requests", {
      contributorId: contributor._id,
      agentId: user._id,
      amount: preview.requestedAmount,
      bankName,
      accountNumber,
      accountName,
      note,
      requestedAt,
      referenceNumber,
      status: "submitted",
      availableBalanceAtRequest: preview.availableBalance,
      contributionDaysAtRequest: preview.contributionDays,
      contributionFee: preview.contributionFee,
      penaltyFee: preview.penaltyFee,
      payoutAmount: preview.payoutAmount,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendWithdrawalRequestAdminEmail, {
      to: ADMIN_WITHDRAWAL_EMAIL,
      contributorName: contributor.name,
      contributorPhone: contributor.phone,
      agentName: user.name ?? "OWODE Agent",
      amount: preview.requestedAmount,
      bankName,
      accountNumber,
      accountName,
      referenceNumber,
      requestedAt,
      note,
      contributionDays: preview.contributionDays,
      contributionFee: preview.contributionFee,
      penaltyFee: preview.penaltyFee,
      payoutAmount: preview.payoutAmount,
    });

    await ctx.scheduler.runAfter(0, internal.sms.sendWithdrawalRequestAdminSMS, {
      to: ADMIN_WITHDRAWAL_PHONE,
      contributorName: contributor.name,
      contributorPhone: contributor.phone,
      agentName: user.name ?? "OWODE Agent",
      amount: preview.requestedAmount,
      bankName,
      accountNumber,
      accountName,
      referenceNumber,
      contributionDays: preview.contributionDays,
      contributionFee: preview.contributionFee,
      penaltyFee: preview.penaltyFee,
      payoutAmount: preview.payoutAmount,
    });

    return {
      requestId,
      referenceNumber,
      availableBalance: preview.availableBalance,
      contributionDays: preview.contributionDays,
      contributionFee: preview.contributionFee,
      penaltyFee: preview.penaltyFee,
      payoutAmount: preview.payoutAmount,
      requestedAmount: preview.requestedAmount,
      remainingBalance: Math.max(0, preview.availableBalance - preview.requestedAmount),
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

export const listForAdmin = query({
  args: {
    statusFilter: v.optional(
      v.union(
        v.literal("submitted"),
        v.literal("processing"),
        v.literal("paid"),
        v.literal("rejected"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const requests = args.statusFilter
      ? await ctx.db
          .query("withdrawal_requests")
          .withIndex("by_status", (q) => q.eq("status", args.statusFilter!))
          .order("desc")
          .take(100)
      : await ctx.db.query("withdrawal_requests").order("desc").take(100);

    return await Promise.all(
      requests.map(async (request) => {
        const contributor = await ctx.db.get(request.contributorId);
        const agent = await ctx.db.get(request.agentId);
        return {
          ...request,
          contributorName: contributor?.name ?? "Unknown",
          contributorPhone: contributor?.phone ?? "",
          agentName: agent?.name ?? "Unknown Agent",
        };
      }),
    );
  },
});

export const reviewRequest = mutation({
  args: {
    requestId: v.id("withdrawal_requests"),
    action: v.union(
      v.literal("processing"),
      v.literal("paid"),
      v.literal("rejected"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Withdrawal request not found",
      });
    }

    if (request.status === "paid" || request.status === "rejected") {
      if (request.status === args.action) {
        return {
          status: request.status,
          payoutAmount: request.payoutAmount ?? request.amount,
          deductedFromCompanyTotal: request.status === "paid",
        };
      }

      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          request.status === "paid"
            ? "This withdrawal has already been approved and cannot be changed again."
            : "This withdrawal has already been rejected and cannot be changed again.",
      });
    }

    if (args.action === "paid") {
      const collections = await ctx.db
        .query("collections")
        .withIndex("by_contributor", (q) => q.eq("contributorId", request.contributorId))
        .collect();
      const totalSaved = collections.reduce((sum, item) => sum + item.amount, 0);

      const contributorRequests = await ctx.db
        .query("withdrawal_requests")
        .withIndex("by_contributor_and_date", (q) =>
          q.eq("contributorId", request.contributorId),
        )
        .collect();

      const consumedAmount = getApprovedWithdrawalTotal(
        contributorRequests,
        request._id,
      );
      const availableBalance = Math.max(0, totalSaved - consumedAmount);

      if (request.amount > availableBalance) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: `This contributor only has ₦${availableBalance.toLocaleString()} left for approval right now.`,
        });
      }
    }

    await ctx.db.patch(args.requestId, {
      status: args.action,
      reviewedBy: admin._id,
      reviewedAt: new Date().toISOString(),
      reviewNote: args.note?.trim() || undefined,
    });

    return {
      status: args.action,
      payoutAmount: request.payoutAmount ?? request.amount,
      deductedFromCompanyTotal: args.action === "paid",
    };
  },
});
