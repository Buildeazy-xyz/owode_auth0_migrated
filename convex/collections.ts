import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Generate a unique reference number for each collection */
function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OWD-${timestamp}-${random}`;
}

export const record = mutation({
  args: {
    contributorId: v.id("contributors"),
    amount: v.number(),
    paymentMethod: v.union(v.literal("cash"), v.literal("bank_transfer")),
    bankReference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user || user.role !== "agent") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only agents can record collections",
      });
    }

    // Verify the contributor belongs to this agent
    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Contributor not assigned to this agent",
      });
    }

    // Bank transfers should include a reference
    if (args.paymentMethod === "bank_transfer" && !args.bankReference) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Bank transfer reference is required for transfer payments",
      });
    }

    const referenceNumber = generateReference();
    const collectedAt = new Date().toISOString();

    const collectionId = await ctx.db.insert("collections", {
      contributorId: args.contributorId,
      agentId: user._id,
      amount: args.amount,
      collectedAt,
      referenceNumber,
      status: "pending",
      paymentMethod: args.paymentMethod,
      bankReference: args.bankReference,
      note: args.note,
    });

    return { collectionId, referenceNumber };
  },
});

export const listByAgent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_agent_and_date", (q) => q.eq("agentId", user._id))
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with contributor names
    return await Promise.all(
      collections.map(async (c) => {
        const contributor = await ctx.db.get(c.contributorId);
        return { ...c, contributorName: contributor?.name ?? "Unknown" };
      }),
    );
  },
});

export const getByReference = query({
  args: { referenceNumber: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const collection = await ctx.db
      .query("collections")
      .withIndex("by_reference", (q) =>
        q.eq("referenceNumber", args.referenceNumber),
      )
      .unique();

    if (!collection) {
      return null;
    }

    const contributor = await ctx.db.get(collection.contributorId);
    const agent = await ctx.db.get(collection.agentId);

    return {
      ...collection,
      contributorName: contributor?.name ?? "Unknown",
      contributorPhone: contributor?.phone ?? "",
      agentName: agent?.name ?? "Unknown",
    };
  },
});

export const getTodaySummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Get start of today in UTC
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();

    const todayCollections = await ctx.db
      .query("collections")
      .withIndex("by_agent_and_date", (q) =>
        q.eq("agentId", user._id).gte("collectedAt", todayStart),
      )
      .collect();

    const totalAmount = todayCollections.reduce((sum, c) => sum + c.amount, 0);
    const cashTotal = todayCollections
      .filter((c) => c.paymentMethod === "cash")
      .reduce((sum, c) => sum + c.amount, 0);
    const transferTotal = todayCollections
      .filter((c) => c.paymentMethod === "bank_transfer")
      .reduce((sum, c) => sum + c.amount, 0);

    // Get contributor counts
    const contributors = await ctx.db
      .query("contributors")
      .withIndex("by_agent", (q) => q.eq("agentId", user._id))
      .collect();
    const activeContributors = contributors.filter(
      (c) => c.status === "active",
    ).length;

    return {
      todayTotal: totalAmount,
      todayCount: todayCollections.length,
      cashTotal,
      transferTotal,
      activeContributors,
      totalContributors: contributors.length,
    };
  },
});

/** Get all collections for the current contributor this month */
export const getMyCollections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user || !user.contributorId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No contributor profile linked",
      });
    }

    return await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) =>
        q.eq("contributorId", user.contributorId!),
      )
      .order("desc")
      .take(100);
  },
});

/** Virtual card summary for the current month */
export const getMyCardSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user || !user.contributorId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No contributor profile linked",
      });
    }

    const contributor = await ctx.db.get(user.contributorId);
    if (!contributor) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contributor record not found",
      });
    }

    // Get all collections for this contributor
    const allCollections = await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) =>
        q.eq("contributorId", user.contributorId!),
      )
      .order("desc")
      .collect();

    // Current month boundaries in UTC
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString();

    const thisMonthCollections = allCollections.filter(
      (c) => c.collectedAt >= monthStart && c.collectedAt < monthEnd,
    );

    const totalSaved = allCollections.reduce((sum, c) => sum + c.amount, 0);
    const monthTotal = thisMonthCollections.reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    // Build a set of days-of-month that have payments
    const paidDays = new Set<number>();
    for (const c of thisMonthCollections) {
      const day = new Date(c.collectedAt).getUTCDate();
      paidDays.add(day);
    }

    // Days in current month
    const daysInMonth = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      0,
    ).getUTCDate();

    const currentDay = now.getUTCDate();

    return {
      dailyAmount: contributor.dailyAmount,
      daysInMonth,
      currentDay,
      paidDays: Array.from(paidDays).sort((a, b) => a - b),
      daysPaid: paidDays.size,
      monthTotal,
      totalSaved,
      totalCollections: allCollections.length,
      monthTarget: contributor.dailyAmount * daysInMonth,
    };
  },
});
