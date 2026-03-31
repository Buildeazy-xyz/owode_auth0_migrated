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

    const referenceNumber = generateReference();
    const collectedAt = new Date().toISOString();

    const collectionId = await ctx.db.insert("collections", {
      contributorId: args.contributorId,
      agentId: user._id,
      amount: args.amount,
      collectedAt,
      referenceNumber,
      status: "pending",
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
      activeContributors,
      totalContributors: contributors.length,
    };
  },
});
