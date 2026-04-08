import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

/** Generate a unique reference number for each collection */
function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OWD-${timestamp}-${random}`;
}

const STANDARD_MONTH_DAYS = 31;

async function resolveContributorForDashboard(
  ctx: QueryCtx,
  requestedContributorId?: Id<"contributors">,
) {
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

  if (user.role === "agent") {
    if (!requestedContributorId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Contributor is required",
      });
    }

    const contributor = await ctx.db.get(requestedContributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Contributor not assigned to this agent",
      });
    }

    return {
      user,
      contributor,
      contributorId: contributor._id,
    };
  }

  if (!user.contributorId) {
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

  return {
    user,
    contributor,
    contributorId: contributor._id,
  };
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
  args: {
    contributorId: v.optional(v.id("contributors")),
  },
  handler: async (ctx, args) => {
    const { contributorId } = await resolveContributorForDashboard(
      ctx,
      args.contributorId,
    );

    return await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) => q.eq("contributorId", contributorId))
      .order("desc")
      .take(100);
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function getUtcDayDiff(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / DAY_MS));
}

function getMonthsDiff(later: Date, earlier: Date): number {
  return Math.max(
    0,
    (later.getUTCFullYear() - earlier.getUTCFullYear()) * 12 +
      (later.getUTCMonth() - earlier.getUTCMonth()),
  );
}

function getCycleAnchorDate(
  allCollections: Array<{ collectedAt: string }>,
): Date {
  const oldestCollection = allCollections[allCollections.length - 1];
  return startOfUtcDay(oldestCollection?.collectedAt ?? new Date());
}

function getDateCycle(anchorDate: Date, nowDate: Date, cycleLength: number) {
  const elapsedDays = getUtcDayDiff(nowDate, anchorDate);
  const cycleIndex = Math.floor(elapsedDays / cycleLength);
  const cycleStart = addUtcDays(anchorDate, cycleIndex * cycleLength);

  return {
    cycleStart,
    cycleEnd: addUtcDays(cycleStart, cycleLength),
    currentSlot: Math.min(cycleLength, getUtcDayDiff(nowDate, cycleStart) + 1),
  };
}

function getMonthCycle(anchorDate: Date, nowDate: Date, cycleLengthMonths: number) {
  const elapsedMonths = getMonthsDiff(nowDate, anchorDate);
  const cycleIndex = Math.floor(elapsedMonths / cycleLengthMonths);
  const cycleStart = addUtcMonths(anchorDate, cycleIndex * cycleLengthMonths);

  return {
    cycleStart,
    cycleEnd: addUtcMonths(cycleStart, cycleLengthMonths),
    currentSlot: Math.min(
      cycleLengthMonths,
      getMonthsDiff(nowDate, cycleStart) + 1,
    ),
  };
}

function getWeeklyCycleLength(): number {
  return Math.ceil(STANDARD_MONTH_DAYS / 7);
}

/** Virtual card summary for the current period (adapts to frequency) */
export const getMyCardSummary = query({
  args: {
    contributorId: v.optional(v.id("contributors")),
  },
  handler: async (ctx, args) => {
    const { contributorId, contributor } = await resolveContributorForDashboard(
      ctx,
      args.contributorId,
    );

    const frequency = contributor.frequency ?? "daily";

    // Get all collections for this contributor
    const allCollections = await ctx.db
      .query("collections")
      .withIndex("by_contributor", (q) => q.eq("contributorId", contributorId))
      .order("desc")
      .collect();

    const now = new Date();
    const currentUtcDate = startOfUtcDay(now);
    const cycleAnchorDate = getCycleAnchorDate(allCollections);
    const grossTotalSaved = allCollections.reduce((sum, c) => sum + c.amount, 0);
    const withdrawals = await ctx.db
      .query("withdrawal_requests")
      .withIndex("by_contributor_and_date", (q) =>
        q.eq("contributorId", contributorId),
      )
      .collect();
    const paidWithdrawalsTotal = withdrawals
      .filter((request) => request.status === "paid")
      .reduce((sum, request) => sum + request.amount, 0);
    const totalSaved = Math.max(0, grossTotalSaved - paidWithdrawalsTotal);

    if (frequency === "daily") {
      const { cycleStart, cycleEnd, currentSlot } = getDateCycle(
        cycleAnchorDate,
        currentUtcDate,
        STANDARD_MONTH_DAYS,
      );

      const thisCycleCollections = allCollections.filter((c) => {
        const collectedAt = startOfUtcDay(c.collectedAt);
        return collectedAt >= cycleStart && collectedAt < cycleEnd;
      });
      const periodTotal = thisCycleCollections.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      const paidDays = new Set<number>();
      for (const c of thisCycleCollections) {
        const cycleDay =
          getUtcDayDiff(startOfUtcDay(c.collectedAt), cycleStart) + 1;
        if (cycleDay >= 1 && cycleDay <= STANDARD_MONTH_DAYS) {
          paidDays.add(cycleDay);
        }
      }

      const daysInMonth = STANDARD_MONTH_DAYS;

      return {
        frequency: "daily" as const,
        contributionAmount: contributor.dailyAmount,
        daysInMonth,
        currentDay: currentSlot,
        paidDays: Array.from(paidDays).sort((a, b) => a - b),
        daysPaid: paidDays.size,
        periodTotal,
        totalSaved,
        grossTotalSaved,
        paidWithdrawalsTotal,
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
      const { cycleStart, cycleEnd, currentSlot } = getDateCycle(
        cycleAnchorDate,
        currentUtcDate,
        STANDARD_MONTH_DAYS,
      );

      const thisCycleCollections = allCollections.filter((c) => {
        const collectedAt = startOfUtcDay(c.collectedAt);
        return collectedAt >= cycleStart && collectedAt < cycleEnd;
      });
      const periodTotal = thisCycleCollections.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      const totalWeeks = getWeeklyCycleLength();
      const paidWeekNumbers = new Set<number>();
      for (const c of thisCycleCollections) {
        const weekNumber = Math.min(
          totalWeeks,
          Math.floor(
            getUtcDayDiff(startOfUtcDay(c.collectedAt), cycleStart) / 7,
          ) + 1,
        );
        if (weekNumber >= 1) {
          paidWeekNumbers.add(weekNumber);
        }
      }

      const daysInMonth = STANDARD_MONTH_DAYS;
      const currentWeek = Math.min(
        totalWeeks,
        Math.floor((currentSlot - 1) / 7) + 1,
      );

      return {
        frequency: "weekly" as const,
        contributionAmount: contributor.dailyAmount,
        daysInMonth,
        currentDay: currentSlot,
        paidDays: [] as number[],
        daysPaid: paidWeekNumbers.size,
        periodTotal,
        totalSaved,
        grossTotalSaved,
        paidWithdrawalsTotal,
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
    const monthAnchorDate = new Date(
      Date.UTC(
        cycleAnchorDate.getUTCFullYear(),
        cycleAnchorDate.getUTCMonth(),
        1,
      ),
    );
    const currentMonthDate = new Date(
      Date.UTC(
        currentUtcDate.getUTCFullYear(),
        currentUtcDate.getUTCMonth(),
        1,
      ),
    );
    const { cycleStart, cycleEnd, currentSlot } = getMonthCycle(
      monthAnchorDate,
      currentMonthDate,
      12,
    );

    const thisCycleCollections = allCollections.filter((c) => {
      const collectedAt = startOfUtcDay(c.collectedAt);
      return collectedAt >= cycleStart && collectedAt < cycleEnd;
    });
    const periodTotal = thisCycleCollections.reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    const paidMonthNumbers = new Set<number>();
    for (const c of thisCycleCollections) {
      const collectedAt = new Date(c.collectedAt);
      const collectionMonth = new Date(
        Date.UTC(collectedAt.getUTCFullYear(), collectedAt.getUTCMonth(), 1),
      );
      const monthIndex = getMonthsDiff(collectionMonth, cycleStart);
      if (monthIndex >= 0 && monthIndex < 12) {
        paidMonthNumbers.add(monthIndex);
      }
    }

    return {
      frequency: "monthly" as const,
      contributionAmount: contributor.dailyAmount,
      daysInMonth: STANDARD_MONTH_DAYS,
      currentDay: currentSlot,
      paidDays: [] as number[],
      daysPaid: paidMonthNumbers.size,
      periodTotal,
      totalSaved,
      grossTotalSaved,
      paidWithdrawalsTotal,
      totalCollections: allCollections.length,
      periodTarget: contributor.dailyAmount * 12,
      weeklyDay: undefined as number | undefined,
      monthlyDay: contributor.monthlyDay,
      paidWeeks: undefined as number[] | undefined,
      weeksInPeriod: undefined as number | undefined,
      currentWeek: undefined as number | undefined,
      paidMonths: Array.from(paidMonthNumbers).sort((a, b) => a - b),
      currentMonth: currentSlot - 1,
    };
  },
});
