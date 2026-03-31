import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

export const add = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    dailyAmount: v.number(),
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
        message: "Only agents can add contributors",
      });
    }

    return await ctx.db.insert("contributors", {
      name: args.name,
      phone: args.phone,
      email: args.email,
      agentId: user._id,
      dailyAmount: args.dailyAmount,
      status: "active",
    });
  },
});

export const toggleStatus = mutation({
  args: {
    contributorId: v.id("contributors"),
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
        message: "Only agents can update contributors",
      });
    }

    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Contributor not assigned to this agent",
      });
    }

    const newStatus = contributor.status === "active" ? "inactive" : "active";
    await ctx.db.patch(args.contributorId, { status: newStatus });
    return newStatus;
  },
});

export const update = mutation({
  args: {
    contributorId: v.id("contributors"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    dailyAmount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"contributors">> => {
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
        message: "Only agents can update contributors",
      });
    }

    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Contributor not assigned to this agent",
      });
    }

    const updates: Record<string, string | number> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.dailyAmount !== undefined) updates.dailyAmount = args.dailyAmount;

    await ctx.db.patch(args.contributorId, updates);
    return args.contributorId;
  },
});

export const listByAgent = query({
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

    return await ctx.db
      .query("contributors")
      .withIndex("by_agent", (q) => q.eq("agentId", user._id))
      .collect();
  },
});
