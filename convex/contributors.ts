import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

/** Frequency type used across the codebase */
type Frequency = "daily" | "weekly" | "monthly";

/** Labels for each frequency */
const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Short period label for UI (e.g. "/day", "/week", "/month") */
export const FREQUENCY_PERIOD: Record<Frequency, string> = {
  daily: "/day",
  weekly: "/week",
  monthly: "/month",
};

export const add = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    dailyAmount: v.number(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    weeklyDay: v.optional(v.number()),
    monthlyDay: v.optional(v.number()),
    startDate: v.optional(v.string()),
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
        message: "Only agents can add contributors",
      });
    }

    // Enforce phone uniqueness per agent
    const existingContributors = await ctx.db
      .query("contributors")
      .withIndex("by_agent", (q) => q.eq("agentId", user._id))
      .collect();
    const duplicatePhone = existingContributors.find(
      (c) => c.phone === args.phone,
    );
    if (duplicatePhone) {
      throw new ConvexError({
        code: "CONFLICT",
        message:
          "You already have a contributor with this phone number. Each contributor must have a unique phone number.",
      });
    }

    // Validate frequency-specific fields
    if (args.frequency === "weekly" && args.weeklyDay === undefined) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Please select a collection day for weekly contributions",
      });
    }
    if (args.frequency === "monthly" && args.monthlyDay === undefined) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Please select a collection day for monthly contributions",
      });
    }

    const contributorId = await ctx.db.insert("contributors", {
      name: args.name,
      phone: args.phone,
      email: args.email,
      agentId: user._id,
      dailyAmount: args.dailyAmount,
      frequency: args.frequency,
      weeklyDay: args.frequency === "weekly" ? args.weeklyDay : undefined,
      monthlyDay: args.frequency === "monthly" ? args.monthlyDay : undefined,
      startDate: args.startDate ?? new Date().toISOString(),
      status: "active",
    });

    // Send welcome email to contributor if they have an email
    if (args.email) {
      const freqLabel =
        args.frequency === "daily"
          ? "Daily"
          : args.frequency === "weekly"
            ? "Weekly"
            : "Monthly";
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendContributorWelcomeEmail,
        {
          to: args.email,
          contributorName: args.name,
          agentName: user.name ?? "Your Agent",
          frequency: freqLabel,
          amount: args.dailyAmount,
        },
      );
    }

    // Send welcome SMS to contributor
    const smsFreqLabel =
      args.frequency === "daily"
        ? "Daily"
        : args.frequency === "weekly"
          ? "Weekly"
          : "Monthly";
    await ctx.scheduler.runAfter(0, internal.sms.sendContributorWelcomeSMS, {
      to: args.phone,
      contributorName: args.name,
      agentName: user.name ?? "Your Agent",
      frequency: smsFreqLabel,
      amount: args.dailyAmount,
    });

    return contributorId;
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
    frequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
      ),
    ),
    weeklyDay: v.optional(v.number()),
    monthlyDay: v.optional(v.number()),
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

    const updates: Record<string, string | number | undefined> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.dailyAmount !== undefined) updates.dailyAmount = args.dailyAmount;

    // Handle frequency change
    if (args.frequency !== undefined) {
      updates.frequency = args.frequency;
      if (args.frequency === "weekly") {
        updates.weeklyDay = args.weeklyDay;
        updates.monthlyDay = undefined;
      } else if (args.frequency === "monthly") {
        updates.monthlyDay = args.monthlyDay;
        updates.weeklyDay = undefined;
      } else {
        updates.weeklyDay = undefined;
        updates.monthlyDay = undefined;
      }
    }

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

/** Claim a contributor record by matching phone number */
export const claimAccount = mutation({
  args: { phone: v.string() },
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

    // Find contributor records matching this phone
    const matches = await ctx.db
      .query("contributors")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();

    // Filter to only un-claimed records
    const unclaimed = matches.filter((c) => !c.userId);
    if (unclaimed.length === 0) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message:
          "No contributor account found with this phone number. Please ask your agent to add you first.",
      });
    }

    // Take the first match (most common scenario: one contributor per phone)
    const contributor = unclaimed[0];

    // Link both sides and backfill the contributor contact details from the signed-in user
    await ctx.db.patch(contributor._id, {
      userId: user._id,
      phone: args.phone,
      email: contributor.email ?? user.email,
    });
    await ctx.db.patch(user._id, {
      role: "contributor",
      phone: args.phone,
      contributorId: contributor._id,
    });

    return contributor._id;
  },
});

/** Get the current contributor's profile with agent info */
export const getMyProfile = query({
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
      return null;
    }

    const contributor = await ctx.db.get(user.contributorId);
    if (!contributor) return null;

    const agent = await ctx.db.get(contributor.agentId);

    return {
      ...contributor,
      agentName: agent?.name ?? "Unknown",
      agentPhone: agent?.phone ?? "",
    };
  },
});
