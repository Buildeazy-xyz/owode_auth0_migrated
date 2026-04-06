import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

    const contributorCollections = await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) => q.eq("contributorId", args.contributorId))
      .collect();
    const totalSaved = contributorCollections.reduce((sum, item) => sum + item.amount, 0);
    const contributionAmount = contributor.dailyAmount;
    const frequency = contributor.frequency ?? "daily";

    // Send notification email to contributor if they have an email
    if (contributor.email) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendCollectionNotificationEmail,
        {
          to: contributor.email,
          contributorName: contributor.name,
          agentName: user.name ?? "Your Agent",
          amount: args.amount,
          totalSaved,
          contributionAmount,
          frequency,
          referenceNumber,
          paymentMethod: args.paymentMethod,
        },
      );
    }

    // Send SMS notification to contributor
    await ctx.scheduler.runAfter(0, internal.sms.sendCollectionSMS, {
      to: contributor.phone,
      contributorName: contributor.name,
      amount: args.amount,
      totalSaved,
      contributionAmount,
      frequency,
      referenceNumber,
      paymentMethod: args.paymentMethod,
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

/** Helper: count how many weeks (starting from a given weekday) fall within a given month */
function weeksInMonth(year: number, month: number, weekday: number): number {
  let count = 0;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(Date.UTC(year, month, d)).getUTCDay() === weekday) {
      count++;
    }
  }
  return count;
}

/** Virtual card summary for the current period (adapts to frequency) */
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

    const frequency = contributor.frequency ?? "daily";

    // Get all collections for this contributor
    const allCollections = await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) =>
        q.eq("contributorId", user.contributorId!),
      )
      .order("desc")
      .collect();

    const now = new Date();
    const totalSaved = allCollections.reduce((sum, c) => sum + c.amount, 0);

    if (frequency === "daily") {
      // Current month boundaries in UTC
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      ).toISOString();
      const monthEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      ).toISOString();

      const thisMonthCollections = allCollections.filter(
        (c) => c.collectedAt >= monthStart && c.collectedAt < monthEnd,
      );
      const monthTotal = thisMonthCollections.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      const paidDays = new Set<number>();
      for (const c of thisMonthCollections) {
        paidDays.add(new Date(c.collectedAt).getUTCDate());
      }

      const daysInMonth = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        0,
      ).getUTCDate();

      return {
        frequency: "daily" as const,
        contributionAmount: contributor.dailyAmount,
        daysInMonth,
        currentDay: now.getUTCDate(),
        paidDays: Array.from(paidDays).sort((a, b) => a - b),
        daysPaid: paidDays.size,
        periodTotal: monthTotal,
        totalSaved,
        totalCollections: allCollections.length,
        periodTarget: contributor.dailyAmount * daysInMonth,
        weeklyDay: undefined as number | undefined,
        monthlyDay: undefined as number | undefined,
        paidWeeks: undefined as number[] | undefined,
        weeksInPeriod: undefined as number | undefined,
        currentWeek: undefined as number | undefined,
        paidMonths: undefined as number[] | undefined,
        currentMonth: undefined as number | undefined,
      };
    }

    if (frequency === "weekly") {
      // Current month boundaries in UTC
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      ).toISOString();
      const monthEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      ).toISOString();

      const thisMonthCollections = allCollections.filter(
        (c) => c.collectedAt >= monthStart && c.collectedAt < monthEnd,
      );
      const periodTotal = thisMonthCollections.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      // Determine which weeks of the month have been paid
      const weekDay = contributor.weeklyDay ?? 1; // default Monday
      const totalWeeks = weeksInMonth(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        weekDay,
      );

      // Map collections to week numbers (1-based)
      const paidWeekNumbers = new Set<number>();
      const daysInMonth = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        0,
      ).getUTCDate();

      // Find all occurrences of the target weekday in this month
      const weekdayDates: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (
          new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d),
          ).getUTCDay() === weekDay
        ) {
          weekdayDates.push(d);
        }
      }

      for (const c of thisMonthCollections) {
        const collDay = new Date(c.collectedAt).getUTCDate();
        // Find the nearest week this falls into
        let closestWeek = 1;
        let minDist = Infinity;
        for (let i = 0; i < weekdayDates.length; i++) {
          const dist = Math.abs(collDay - weekdayDates[i]);
          if (dist < minDist) {
            minDist = dist;
            closestWeek = i + 1;
          }
        }
        paidWeekNumbers.add(closestWeek);
      }

      // Determine which week of the month we're in
      let currentWeek = 1;
      for (let i = 0; i < weekdayDates.length; i++) {
        if (now.getUTCDate() >= weekdayDates[i]) {
          currentWeek = i + 1;
        }
      }

      return {
        frequency: "weekly" as const,
        contributionAmount: contributor.dailyAmount,
        daysInMonth,
        currentDay: now.getUTCDate(),
        paidDays: [] as number[],
        daysPaid: paidWeekNumbers.size,
        periodTotal,
        totalSaved,
        totalCollections: allCollections.length,
        periodTarget: contributor.dailyAmount * totalWeeks,
        weeklyDay: contributor.weeklyDay,
        monthlyDay: undefined as number | undefined,
        paidWeeks: Array.from(paidWeekNumbers).sort((a, b) => a - b),
        weeksInPeriod: totalWeeks,
        currentWeek,
        paidMonths: undefined as number[] | undefined,
        currentMonth: undefined as number | undefined,
      };
    }

    // Monthly frequency
    // Current year boundaries
    const yearStart = new Date(
      Date.UTC(now.getUTCFullYear(), 0, 1),
    ).toISOString();
    const yearEnd = new Date(
      Date.UTC(now.getUTCFullYear() + 1, 0, 1),
    ).toISOString();

    const thisYearCollections = allCollections.filter(
      (c) => c.collectedAt >= yearStart && c.collectedAt < yearEnd,
    );
    const periodTotal = thisYearCollections.reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    // Map collections to months (0-based)
    const paidMonthNumbers = new Set<number>();
    for (const c of thisYearCollections) {
      paidMonthNumbers.add(new Date(c.collectedAt).getUTCMonth());
    }

    return {
      frequency: "monthly" as const,
      contributionAmount: contributor.dailyAmount,
      daysInMonth: new Date(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        0,
      ).getUTCDate(),
      currentDay: now.getUTCDate(),
      paidDays: [] as number[],
      daysPaid: paidMonthNumbers.size,
      periodTotal,
      totalSaved,
      totalCollections: allCollections.length,
      periodTarget: contributor.dailyAmount * 12,
      weeklyDay: undefined as number | undefined,
      monthlyDay: contributor.monthlyDay,
      paidWeeks: undefined as number[] | undefined,
      weeksInPeriod: undefined as number | undefined,
      currentWeek: undefined as number | undefined,
      paidMonths: Array.from(paidMonthNumbers).sort((a, b) => a - b),
      currentMonth: now.getUTCMonth(),
    };
  },
});
