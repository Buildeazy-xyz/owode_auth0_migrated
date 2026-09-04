// convex/collections.ts
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
  sessionToken?: string,
) {
  // The app signs in with its own session token; the old web app used Auth0.
  let user = sessionToken
    ? await ctx.db
        .query("users")
        .withIndex("by_session", (q) => q.eq("sessionToken", sessionToken))
        .first()
    : null;

  if (!user) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  }

  if (!user) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  if (user.role === "agent" || user.role === "admin") {
    if (!requestedContributorId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Contributor is required",
      });
    }

    const contributor = await ctx.db.get(requestedContributorId);
    if (!contributor) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contributor not found",
      });
    }

    if (user.role === "agent" && contributor.agentId !== user._id) {
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

    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Contributor not assigned to this agent",
      });
    }

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
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contributorId, contributor } = await resolveContributorForDashboard(
      ctx,
      args.contributorId,
      args.sessionToken,
    );

    const frequency = contributor.frequency ?? "daily";

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

      // One stamp per payment, not per day - two payments today fill two squares.
      const paidDays = new Set<number>();
      let slot = 1;
      const ordered = [...thisCycleCollections].sort((a, b) =>
        a.collectedAt.localeCompare(b.collectedAt),
      );
      for (const _c of ordered) {
        if (slot <= STANDARD_MONTH_DAYS) {
          paidDays.add(slot);
          slot += 1;
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

/** App versions: identify the user by session token rather than Auth0. */
const userFromSession = async (ctx: any, sessionToken: string) =>
  await ctx.db
    .query('users')
    .withIndex('by_session', (q: any) => q.eq('sessionToken', sessionToken))
    .first();

export const myCardForApp = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await userFromSession(ctx, args.sessionToken);
    if (!user?.contributorId) return null;

    const contributor = await ctx.db.get(
      user.contributorId as Id<'contributors'>,
    );
    if (!contributor) return null;

    const collections = await ctx.db
      .query('collections')
      .withIndex('by_contributor', (q) => q.eq('contributorId', contributor._id))
      .collect();

    const totalSaved = collections.reduce((sum, c) => sum + c.amount, 0);

    const withdrawals = await ctx.db
      .query('withdrawal_requests')
      .withIndex('by_contributor_and_date', (q) =>
        q.eq('contributorId', contributor._id),
      )
      .collect();

    const paidOut = withdrawals
      .filter((w) => w.status === 'paid')
      .reduce((sum, w) => sum + w.amount, 0);

    // OWODE keeps one contribution per 31-payment cycle as its commission.
    const cycles = collections.length === 0 ? 0 : Math.floor((collections.length - 1) / 31) + 1;
    const commission = cycles * (contributor.dailyAmount ?? 0);


    const agent = await ctx.db.get(contributor.agentId);

    return {
      name: contributor.name,
      phone: contributor.phone,
      status: contributor.status,
      dailyAmount: contributor.dailyAmount,
      frequency: contributor.frequency ?? 'daily',
      totalSaved,
      available: Math.max(0, totalSaved - paidOut),
      contributionCount: collections.length,
      agentName: agent?.name ?? '',
      agentPhone: agent?.phone ?? '',
      recent: collections
        .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
        .slice(0, 20)
        .map((c) => ({
          id: c._id,
          amount: c.amount,
          collectedAt: c.collectedAt,
          status: c.status,
          reference: c.referenceNumber,
          method: c.paymentMethod,
        })),
    };
  },
});

export const agentHomeForApp = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user || user.role !== 'agent') return null;

    const contributors = await ctx.db
      .query('contributors')
      .withIndex('by_agent', (q) => q.eq('agentId', user._id))
      .collect();

    const allCollections = await ctx.db
      .query('collections')
      .withIndex('by_agent_and_date', (q) => q.eq('agentId', user._id))
      .collect();

    const today = new Date().toISOString().slice(0, 10);
    const todayCollections = allCollections.filter((c) =>
      c.collectedAt.startsWith(today),
    );

    return {
      agentName: user.name ?? '',
      agentStatus: user.agentStatus ?? 'pending',
      contributorCount: contributors.length,
      todayTotal: todayCollections.reduce((s, c) => s + c.amount, 0),
      todayCount: todayCollections.length,
      allTimeTotal: allCollections.reduce((s, c) => s + c.amount, 0),
      contributors: contributors.map((c) => ({
        id: c._id,
        name: c.name,
        phone: c.phone,
        amount: c.dailyAmount,
        frequency: c.frequency ?? 'daily',
        status: c.status,
      })),
    };
  },
});

export const recordForApp = mutation({
  args: {
    sessionToken: v.string(),
    contributorId: v.id('contributors'),
    amount: v.number(),
    paymentMethod: v.union(v.literal('cash'), v.literal('bank_transfer')),
    bankReference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();

    if (!user || user.role !== 'agent') {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Only agents can record collections' });
    }
    if (user.agentStatus !== 'approved') {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Your agent account is not approved yet',
      });
    }

    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'That contributor is not assigned to you',
      });
    }
    if (!args.amount || args.amount <= 0) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter a valid amount' });
    }

    const referenceNumber =
      'COL-' + Date.now().toString(36).toUpperCase() + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    await ctx.db.insert('collections', {
      contributorId: contributor._id,
      agentId: user._id,
      amount: args.amount,
      collectedAt: new Date().toISOString(),
      referenceNumber,
      status: 'pending',
      paymentMethod: args.paymentMethod,
      bankReference: args.bankReference?.trim() || undefined,
      note: args.note?.trim() || undefined,
    });

    return { referenceNumber };
  },
});

export const adminHomeForApp = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) return null;

    const allUsers = await ctx.db.query('users').collect();
    const allContributors = await ctx.db.query('contributors').collect();
    const allCollections = await ctx.db.query('collections').collect();
    const allWithdrawals = await ctx.db.query('withdrawal_requests').collect();

    const agentRow = (u: any) => ({
      id: u._id,
      name: u.name ?? '',
      phone: u.phone ?? '',
      status: u.agentStatus ?? 'pending',
    });

    const pendingAgents = allUsers
      .filter((u) => u.role === 'agent' && (u.agentStatus ?? 'pending') === 'pending')
      .map(agentRow);

    const rejectedAgents = allUsers
      .filter((u) => u.role === 'agent' && u.agentStatus === 'rejected')
      .map(agentRow);

    const approvedAgents = allUsers
      .filter((u) => u.role === 'agent' && u.agentStatus === 'approved')
      .map((u) => ({ id: u._id, name: u.name ?? '', phone: u.phone ?? '' }));

    const contributorRow = (c: any) => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      amount: c.dailyAmount,
      frequency: c.frequency ?? 'daily',
      address: c.address ?? '',
    });

    const unassigned = allContributors
      .filter((c) => c.pendingAssignment === true)
      .map(contributorRow);

    const assignedContributors = await Promise.all(
      allContributors
        .filter((c) => c.status === 'active' && !c.pendingAssignment)
        .map(async (c) => {
          const agent = await ctx.db.get(c.agentId);
          return { ...contributorRow(c), agentName: agent?.name ?? '' };
        }),
    );

    const declinedContributors = allContributors
      .filter((c) => c.pendingAssignment === false && c.status === 'inactive')
      .map(contributorRow);

    const pendingWithdrawals = await Promise.all(
      allWithdrawals
        .filter((w) => w.status === 'submitted' || w.status === 'processing')
        .map(async (w) => {
          const c = await ctx.db.get(w.contributorId);
          return {
            id: w._id,
            name: c?.name ?? 'Unknown',
            amount: w.amount,
            payout: w.payoutAmount ?? w.amount,
            bankName: w.bankName,
            accountNumber: w.accountNumber,
            status: w.status,
            awaitingSecond: Boolean(w.firstApprovedBy),
            reference: w.referenceNumber,
          };
        }),
    );

    // What OWODE has earned, taken from paid-out withdrawals.
    const companyProfit = allWithdrawals
      .filter((w) => w.status === 'paid')
      .reduce((sum, w) => sum + (w.commissionTaken ?? 0), 0);

    const profitPending = allWithdrawals
      .filter((w) => w.status === 'submitted' || w.status === 'processing')
      .reduce((sum, w) => sum + (w.commissionTaken ?? 0), 0);

    return {
      adminName: user.name ?? 'Admin',
      companyProfit,
      profitPending,
      totalContributors: allContributors.length,
      totalAgents: approvedAgents.length,
      totalCollected: allCollections.reduce((s, c) => s + c.amount, 0),
      pendingAgents,
      rejectedAgents,
      approvedAgents,
      unassigned,
      assignedContributors,
      declinedContributors,
      pendingWithdrawals,
    };
  },
});

async function requireAdminSession(ctx: any, sessionToken: string) {
  const user = await ctx.db
    .query('users')
    .withIndex('by_session', (q: any) => q.eq('sessionToken', sessionToken))
    .first();
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'Admins only' });
  }
  return user;
}

export const approveAgentForApp = mutation({
  args: { sessionToken: v.string(), agentId: v.id('users') },
  handler: async (ctx, args) => {
    const admin = await requireAdminSession(ctx, args.sessionToken);
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Agent not found' });
    }
    await ctx.db.patch(args.agentId, { agentStatus: 'approved' });
    return { ok: true };
  },
});

export const assignContributorForApp = mutation({
  args: {
    sessionToken: v.string(),
    contributorId: v.id('contributors'),
    agentId: v.id('users'),
    amount: v.number(),
    frequency: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly'),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    if (!args.amount || args.amount <= 0) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter a valid amount' });
    }
    await ctx.db.patch(args.contributorId, {
      agentId: args.agentId,
      dailyAmount: args.amount,
      frequency: args.frequency,
      status: 'active',
      pendingAssignment: undefined,
      startDate: new Date().toISOString(),
    });
    return { ok: true };
  },
});

export const makeAdminTemp = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .first();
    if (!user) return { ok: false, message: 'no user with that phone' };
    await ctx.db.patch(user._id, { role: 'admin', isSuperAdmin: true });
    return { ok: true, name: user.name };
  },
});

export const wipeUsersTemp = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    for (const u of users) await ctx.db.delete(u._id);

    const contributors = await ctx.db.query('contributors').collect();
    for (const c of contributors) await ctx.db.delete(c._id);

    const collections = await ctx.db.query('collections').collect();
    for (const c of collections) await ctx.db.delete(c._id);

    const withdrawals = await ctx.db.query('withdrawal_requests').collect();
    for (const w of withdrawals) await ctx.db.delete(w._id);

    return {
      users: users.length,
      contributors: contributors.length,
      collections: collections.length,
      withdrawals: withdrawals.length,
    };
  },
});

export const rejectAgentForApp = mutation({
  args: { sessionToken: v.string(), agentId: v.id('users'), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    await ctx.db.patch(args.agentId, { agentStatus: 'rejected' });
    return { ok: true };
  },
});

export const rejectContributorForApp = mutation({
  args: { sessionToken: v.string(), contributorId: v.id('contributors') },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    await ctx.db.patch(args.contributorId, {
      pendingAssignment: false,
      status: 'inactive',
    });
    return { ok: true };
  },
});

export const cleanupTemp = mutation({
  args: { agentPhone: v.optional(v.string()), contributorName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let deletedAgent = false;
    if (args.agentPhone) {
      const a = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phone', args.agentPhone!))
        .first();
      if (a) {
        await ctx.db.delete(a._id);
        deletedAgent = true;
      }
    }

    let unassigned = false;
    if (args.contributorName) {
      const all = await ctx.db.query('contributors').collect();
      const c = all.find(
        (x) => x.name.toLowerCase() === args.contributorName!.toLowerCase(),
      );
      if (c) {
        await ctx.db.patch(c._id, { pendingAssignment: true, status: 'inactive' });
        unassigned = true;
      }
    }

    return { deletedAgent, unassigned };
  },
});

export const listUsersTemp = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.map((u) => ({
      name: u.name ?? '',
      phone: u.phone ?? '',
      role: u.role ?? 'none',
      hasPassword: Boolean(u.passwordHash),
    }));
  },
});

export const requestWithdrawalForApp = mutation({
  args: {
    sessionToken: v.string(),
    contributorId: v.id('contributors'),
    amount: v.number(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user || user.role !== 'agent' || user.agentStatus !== 'approved') {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only approved agents can request a withdrawal',
      });
    }

    const contributor = await ctx.db.get(args.contributorId);
    if (!contributor || contributor.agentId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'That contributor is not assigned to you',
      });
    }

    const collections = await ctx.db
      .query('collections')
      .withIndex('by_contributor', (q) => q.eq('contributorId', contributor._id))
      .collect();
    const totalSaved = collections.reduce((s, c) => s + c.amount, 0);

    const previous = await ctx.db
      .query('withdrawal_requests')
      .withIndex('by_contributor_and_date', (q) =>
        q.eq('contributorId', contributor._id),
      )
      .collect();
    const taken = previous
      .filter((w) => w.status === 'paid' || w.status === 'submitted' || w.status === 'processing')
      .reduce((s, w) => s + w.amount, 0);

    // OWODE keeps one contribution per 31-payment cycle as its commission.
    const cycles = collections.length === 0 ? 0 : Math.floor((collections.length - 1) / 31) + 1;
    const commission = cycles * (contributor.dailyAmount ?? 0);

    const available = Math.max(0, totalSaved - taken);
    if (args.amount <= 0) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter a valid amount' });
    }
    if (args.amount > available) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: `Only ₦${available.toLocaleString()} is available`,
      });
    }

    // One fee per completed cycle of 31 contributions, charged once.
    const alreadyCharged = previous.reduce(
      (sum, w) => sum + (w.cyclesCharged ?? 0),
      0,
    );
    const completedCycles = Math.floor(collections.length / 31);
    const cyclesToCharge = Math.max(0, completedCycles - alreadyCharged);
    const commissionTaken = cyclesToCharge * (contributor.dailyAmount ?? 0);
    const payoutAmount = Math.max(0, args.amount - commissionTaken);

    const referenceNumber =
      'WDR-' + Date.now().toString(36).toUpperCase();

    await ctx.db.insert('withdrawal_requests', {
      contributorId: contributor._id,
      agentId: user._id,
      amount: args.amount,
      bankName: args.bankName.trim(),
      accountNumber: args.accountNumber.trim(),
      accountName: args.accountName.trim(),
      note: args.note?.trim() || undefined,
      requestedAt: new Date().toISOString(),
      referenceNumber,
      status: 'submitted',
      availableBalanceAtRequest: available,
      payoutAmount,
      commissionTaken,
      cyclesCharged: cyclesToCharge,
    });

    return { referenceNumber, available: available - args.amount };
  },
});

export const todayCountForApp = query({
  args: { sessionToken: v.string(), contributorId: v.id('contributors') },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user) return { count: 0, total: 0 };

    const today = new Date().toISOString().slice(0, 10);
    const all = await ctx.db
      .query('collections')
      .withIndex('by_contributor', (q) => q.eq('contributorId', args.contributorId))
      .collect();
    const todays = all.filter((c) => c.collectedAt.startsWith(today));

    return {
      count: todays.length,
      total: todays.reduce((s, c) => s + c.amount, 0),
    };
  },
});

export const contributorDetailForApp = query({
  args: { sessionToken: v.string(), contributorId: v.id('contributors') },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user) return null;

    const c = await ctx.db.get(args.contributorId);
    if (!c) return null;
    if (user.role === 'agent' && c.agentId !== user._id) return null;

    const collections = await ctx.db
      .query('collections')
      .withIndex('by_contributor', (q) => q.eq('contributorId', c._id))
      .collect();

    const totalSaved = collections.reduce((s, x) => s + x.amount, 0);

    const withdrawals = await ctx.db
      .query('withdrawal_requests')
      .withIndex('by_contributor_and_date', (q) => q.eq('contributorId', c._id))
      .collect();
    const taken = withdrawals
      .filter((w) => w.status === 'paid')
      .reduce((s, w) => s + w.amount, 0);

    // OWODE keeps one contribution per 31-payment cycle as its commission.
    const cycles = collections.length === 0 ? 0 : Math.floor((collections.length - 1) / 31) + 1;
    const commission = cycles * (c.dailyAmount ?? 0);

    const today = new Date().toISOString().slice(0, 10);
    const todays = collections.filter((x) => x.collectedAt.startsWith(today));

    return {
      id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      address: c.address ?? '',
      occupation: c.occupation ?? '',
      amount: c.dailyAmount,
      frequency: c.frequency ?? 'daily',
      status: c.status,
      totalSaved,
      available: Math.max(0, totalSaved - taken),
      paymentCount: collections.length,
      todayCount: todays.length,
      todayTotal: todays.reduce((s, x) => s + x.amount, 0),
      recent: collections
        .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
        .slice(0, 20)
        .map((x) => ({
          id: x._id,
          amount: x.amount,
          collectedAt: x.collectedAt,
          status: x.status,
          method: x.paymentMethod,
          reference: x.referenceNumber,
        })),
    };
  },
});

async function userFromToken(ctx: any, sessionToken: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_session', (q: any) => q.eq('sessionToken', sessionToken))
    .first();
}

export const listMessagesForApp = query({
  args: {
    sessionToken: v.string(),
    contributorId: v.optional(v.id('contributors')),
  },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user) return null;

    const targetId = (
      user.role === 'contributor' ? user.contributorId : args.contributorId
    ) as Id<'contributors'> | undefined;
    if (!targetId) return null;

    const contributor = await ctx.db.get(targetId);
    if (!contributor) return null;
    if (user.role === 'agent' && contributor.agentId !== user._id) return null;

    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_contributor', (q) => q.eq('contributorId', targetId))
      .collect();

    const withNames = await Promise.all(
      msgs
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
        .map(async (m) => {
          const sender = await ctx.db.get(m.senderId);
          return {
            id: m._id,
            body: m.body,
            sentAt: m.sentAt,
            senderRole: m.senderRole,
            senderName: sender?.name ?? '',
            mine: m.senderId === user._id,
            audioUrl: m.audioStorageId
              ? await ctx.storage.getUrl(m.audioStorageId)
              : null,
            audioSeconds: m.audioSeconds ?? null,
          };
        }),
    );

    return {
      contributorName: contributor.name,
      messages: withNames,
    };
  },
});

export const sendMessageForApp = mutation({
  args: {
    sessionToken: v.string(),
    contributorId: v.optional(v.id('contributors')),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Please sign in' });
    }
    if (!args.body.trim()) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Type a message' });
    }

    const targetId = (
      user.role === 'contributor' ? user.contributorId : args.contributorId
    ) as Id<'contributors'> | undefined;
    if (!targetId) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'No conversation yet' });
    }

    const contributor = await ctx.db.get(targetId);
    if (!contributor) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Contributor not found' });
    }
    if (user.role === 'agent' && contributor.agentId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your contributor' });
    }

    const now = new Date().toISOString();

    await ctx.db.insert('messages', {
      contributorId: targetId,
      agentId: contributor.agentId,
      senderId: user._id,
      senderRole: (user.role ?? 'contributor') as any,
      body: args.body.trim(),
      sentAt: now,
    });

    // When a contributor writes and nobody has replied recently, let them know
    // their agent has been notified rather than leaving them in silence.
    if (user.role === 'contributor') {
      const all = await ctx.db
        .query('messages')
        .withIndex('by_contributor', (q) => q.eq('contributorId', targetId))
        .collect();

      const lastFromStaff = all
        .filter((m) => m.senderRole !== 'contributor')
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];

      const SIX_HOURS = 6 * 60 * 60 * 1000;
      const stale =
        !lastFromStaff ||
        Date.now() - new Date(lastFromStaff.sentAt).getTime() > SIX_HOURS;

      if (stale) {
        const agent = await ctx.db.get(contributor.agentId);
        const phone = agent?.phone ? ' You can also call ' + agent.phone + '.' : '';

        await ctx.db.insert('messages', {
          contributorId: targetId,
          agentId: contributor.agentId,
          senderId: contributor.agentId,
          senderRole: 'agent' as const,
          body:
            'Thank you for your message. Your agent has been notified and will reply as soon as they can.' +
            phone,
          sentAt: new Date(Date.now() + 1000).toISOString(),
        });
      }
    }

    return { ok: true };
  },
});

export const adminConversationsForApp = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) return null;

    const all = await ctx.db.query('messages').collect();

    const byContributor = new Map<string, any[]>();
    for (const m of all) {
      const key = m.contributorId as unknown as string;
      if (!byContributor.has(key)) byContributor.set(key, []);
      byContributor.get(key)!.push(m);
    }

    const result = await Promise.all(
      Array.from(byContributor.entries()).map(async ([id, msgs]) => {
        const c: any = await ctx.db.get(id as any);
        const agent: any = c ? await ctx.db.get(c.agentId) : null;
        const sorted = msgs.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        return {
          contributorId: id,
          contributorName: c?.name ?? 'Unknown',
          agentName: agent?.name ?? '',
          last: sorted[0]?.body ?? '',
          lastAt: sorted[0]?.sentAt ?? '',
          count: msgs.length,
        };
      }),
    );

    return result.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  },
});

export const reviewWithdrawalForApp = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id('withdrawal_requests'),
    action: v.union(v.literal('paid'), v.literal('rejected')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminSession(ctx, args.sessionToken);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Request not found' });
    }
    if (request.status === 'paid' || request.status === 'rejected') {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'This withdrawal has already been settled',
      });
    }

    const now = new Date().toISOString();
    const DUAL_THRESHOLD = 100000;

    if (args.action === 'paid' && request.amount >= DUAL_THRESHOLD) {
      if (!request.firstApprovedBy) {
        await ctx.db.patch(args.requestId, {
          status: 'processing',
          firstApprovedBy: admin._id,
          firstApprovedAt: now,
          reviewNote: args.note?.trim() || undefined,
        });
        return { status: 'processing', awaitingSecond: true };
      }
      if (request.firstApprovedBy === admin._id) {
        throw new ConvexError({
          code: 'BAD_REQUEST',
          message: 'You already approved this. A different admin must give the second approval.',
        });
      }
    }

    await ctx.db.patch(args.requestId, {
      status: args.action,
      reviewedBy: admin._id,
      reviewedAt: now,
      reviewNote: args.note?.trim() || undefined,
      ...(args.action === 'paid'
        ? { receiptStatus: 'awaiting' as const, receiptAskedAt: now }
        : {}),
    });

    return { status: args.action, awaitingSecond: false };
  },
});

export const generateVoiceUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Please sign in' });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendVoiceNoteForApp = mutation({
  args: {
    sessionToken: v.string(),
    contributorId: v.optional(v.id('contributors')),
    storageId: v.id('_storage'),
    seconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Please sign in' });
    }

    const targetId = (
      user.role === 'contributor' ? user.contributorId : args.contributorId
    ) as Id<'contributors'> | undefined;
    if (!targetId) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'No conversation yet' });
    }

    const contributor = await ctx.db.get(targetId);
    if (!contributor) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Contributor not found' });
    }
    if (user.role === 'agent' && contributor.agentId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your contributor' });
    }

    await ctx.db.insert('messages', {
      contributorId: targetId,
      agentId: contributor.agentId,
      senderId: user._id,
      senderRole: (user.role ?? 'contributor') as any,
      body: 'Voice note',
      audioStorageId: args.storageId,
      audioSeconds: Math.round(args.seconds),
      sentAt: new Date().toISOString(),
    });

    return { ok: true };
  },
});

export const requestOwnWithdrawal = mutation({
  args: {
    sessionToken: v.string(),
    amount: v.number(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user?.contributorId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only contributors can request their own withdrawal',
      });
    }

    const contributor = await ctx.db.get(
      user.contributorId as Id<'contributors'>,
    );
    if (!contributor) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Account not found' });
    }

    const collections = await ctx.db
      .query('collections')
      .withIndex('by_contributor', (q) => q.eq('contributorId', contributor._id))
      .collect();
    const totalSaved = collections.reduce((s, c) => s + c.amount, 0);

    const previous = await ctx.db
      .query('withdrawal_requests')
      .withIndex('by_contributor_and_date', (q) =>
        q.eq('contributorId', contributor._id),
      )
      .collect();
    const taken = previous
      .filter(
        (w) =>
          w.status === 'paid' ||
          w.status === 'submitted' ||
          w.status === 'processing',
      )
      .reduce((s, w) => s + w.amount, 0);

    // OWODE keeps one contribution per 31-payment cycle as its commission.
    const cycles = collections.length === 0 ? 0 : Math.floor((collections.length - 1) / 31) + 1;
    const commission = cycles * (contributor.dailyAmount ?? 0);

    const available = Math.max(0, totalSaved - taken);

    if (args.amount <= 0) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter a valid amount' });
    }
    if (args.amount > available) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: `You have ₦${available.toLocaleString()} available`,
      });
    }

    // One fee per completed cycle of 31 contributions, charged once.
    const alreadyCharged = previous.reduce(
      (sum, w) => sum + (w.cyclesCharged ?? 0),
      0,
    );
    const completedCycles = Math.floor(collections.length / 31);
    const cyclesToCharge = Math.max(0, completedCycles - alreadyCharged);
    const commissionTaken = cyclesToCharge * (contributor.dailyAmount ?? 0);
    const payoutAmount = Math.max(0, args.amount - commissionTaken);

    const referenceNumber = 'WDR-' + Date.now().toString(36).toUpperCase();

    await ctx.db.insert('withdrawal_requests', {
      contributorId: contributor._id,
      agentId: contributor.agentId,
      amount: args.amount,
      bankName: args.bankName.trim(),
      accountNumber: args.accountNumber.trim(),
      accountName: args.accountName.trim(),
      note: args.note?.trim() || undefined,
      requestedAt: new Date().toISOString(),
      referenceNumber,
      status: 'submitted',
      availableBalanceAtRequest: available,
      payoutAmount,
      commissionTaken,
      cyclesCharged: cyclesToCharge,
    });

    return { referenceNumber, remaining: available - args.amount };
  },
});

export const clearMessagesTemp = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query('contributors').collect();
    const c = all.find((x) => x.phone === args.phone);
    if (!c) return { ok: false, message: 'no contributor with that phone' };

    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_contributor', (q) => q.eq('contributorId', c._id))
      .collect();

    for (const m of msgs) await ctx.db.delete(m._id);

    return { ok: true, name: c.name, deleted: msgs.length };
  },
});

export const updateMyBankDetails = mutation({
  args: {
    sessionToken: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user?.contributorId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Contributors only' });
    }
    await ctx.db.patch(user.contributorId as Id<'contributors'>, {
      bankName: args.bankName.trim() || undefined,
      accountNumber: args.accountNumber.trim() || undefined,
      accountName: args.accountName.trim() || undefined,
    });
    return { ok: true };
  },
});

export const myProfileForApp = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.sessionToken);
    if (!user) return null;

    const c: any = user.contributorId
      ? await ctx.db.get(user.contributorId as Id<'contributors'>)
      : null;
    const agent: any = c ? await ctx.db.get(c.agentId) : null;

    return {
      name: user.name ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
      role: user.role ?? '',
      address: c?.address ?? '',
      occupation: c?.occupation ?? '',
      amount: c?.dailyAmount ?? 0,
      frequency: c?.frequency ?? 'daily',
      agentName: agent?.name ?? '',
      agentPhone: agent?.phone ?? '',
      bankName: c?.bankName ?? '',
      accountNumber: c?.accountNumber ?? '',
      accountName: c?.accountName ?? '',
    };
  },
});

export const clearAllMessagesTemp = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('messages').collect();
    for (const m of all) await ctx.db.delete(m._id);
    return { deleted: all.length };
  },
});

export const deleteContributorTemp = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query('contributors').collect();
    const matches = all.filter(
      (c) => c.name.toLowerCase() === args.name.toLowerCase(),
    );

    let removed = 0;
    for (const c of matches) {
      const cols = await ctx.db
        .query('collections')
        .withIndex('by_contributor', (q) => q.eq('contributorId', c._id))
        .collect();
      for (const x of cols) await ctx.db.delete(x._id);

      const wd = await ctx.db
        .query('withdrawal_requests')
        .withIndex('by_contributor_and_date', (q) => q.eq('contributorId', c._id))
        .collect();
      for (const x of wd) await ctx.db.delete(x._id);

      if (c.userId) {
        const u = await ctx.db.get(c.userId);
        if (u) await ctx.db.patch(c.userId, { contributorId: undefined });
      }

      await ctx.db.delete(c._id);
      removed += 1;
    }

    return { removed };
  },
});

export const setUserPhoneTemp = mutation({
  args: { oldPhone: v.string(), newPhone: v.string() },
  handler: async (ctx, args) => {
    const u = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', args.oldPhone))
      .first();
    if (!u) return { ok: false, message: 'no user' };
    await ctx.db.patch(u._id, { phone: args.newPhone });
    return { ok: true, name: u.name };
  },
});
