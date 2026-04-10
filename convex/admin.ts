import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";
import { paginationOptsValidator } from "convex/server";

// ─── Helpers ──────────────────────────────────────────────────────

/** Resolves the calling user and asserts admin role */
async function requireAdmin(
  ctx: Pick<QueryCtx, "db" | "auth">,
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
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (!user || user.role !== "admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only admins can access this resource",
    });
  }
  return user;
}

const PENDING_IMPORT_PHONE_PREFIX = "__pending_import__:";

function normalizeContributorName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function isPendingImportPhone(phone: string) {
  return phone.startsWith(PENDING_IMPORT_PHONE_PREFIX);
}

// ─── Queries ──────────────────────────────────────────────────────

/** Platform-wide stats for the admin overview */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // All agents
    const allUsers = await ctx.db.query("users").collect();
    const agents = allUsers.filter((u) => u.role === "agent");
    const contributors = await ctx.db.query("contributors").collect();
    const activeContributors = contributors.filter(
      (c) => c.status === "active",
    ).length;

    // Today boundaries (UTC)
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();

    // All collections via scan (admin only, expected volume manageable)
    const allCollections = await ctx.db
      .query("collections")
      .order("desc")
      .take(8000);
    const allWithdrawals = await ctx.db
      .query("withdrawal_requests")
      .order("desc")
      .take(8000);

    const todayCollections = allCollections.filter(
      (c) => c.collectedAt >= todayStart,
    );
    const grossTodayTotal = todayCollections.reduce((s, c) => s + c.amount, 0);
    const grossTotalAmount = allCollections.reduce((s, c) => s + c.amount, 0);

    const paidWithdrawalsTotal = allWithdrawals
      .filter((w) => w.status === "paid")
      .reduce((sum, w) => sum + (w.payoutAmount ?? w.amount), 0);
    const paidWithdrawalsToday = allWithdrawals
      .filter((w) => w.status === "paid" && (w.reviewedAt ?? "") >= todayStart)
      .reduce((sum, w) => sum + (w.payoutAmount ?? w.amount), 0);

    const todayTotal = Math.max(0, grossTodayTotal - paidWithdrawalsToday);
    const totalAmount = Math.max(0, grossTotalAmount - paidWithdrawalsTotal);

    const pendingCount = allCollections.filter(
      (c) => c.status === "pending",
    ).length;
    const disputedCount = allCollections.filter(
      (c) => c.status === "disputed",
    ).length;
    const confirmedCount = allCollections.filter(
      (c) => c.status === "confirmed",
    ).length;

    const cashTotal = allCollections
      .filter((c) => c.paymentMethod === "cash")
      .reduce((s, c) => s + c.amount, 0);
    const transferTotal = allCollections
      .filter((c) => c.paymentMethod === "bank_transfer")
      .reduce((s, c) => s + c.amount, 0);

    const withdrawalRequestCount = allWithdrawals.filter(
      (w) => w.status === "submitted" || w.status === "processing",
    ).length;

    return {
      agentCount: agents.length,
      contributorCount: contributors.length,
      activeContributorCount: activeContributors,
      totalCollections: allCollections.length,
      totalAmount,
      grossTotalAmount,
      paidWithdrawalsTotal,
      withdrawalRequestCount,
      todayTotal,
      todayCount: todayCollections.length,
      pendingCount,
      disputedCount,
      confirmedCount,
      cashTotal,
      transferTotal,
    };
  },
});

/** List all agents with aggregated stats */
export const listAgents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allUsers = await ctx.db.query("users").collect();
    const agents = allUsers.filter((u) => u.role === "agent");

    const results = await Promise.all(
      agents.map(async (agent) => {
        const contributors = await ctx.db
          .query("contributors")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .collect();

        const collections = await ctx.db
          .query("collections")
          .withIndex("by_agent_and_date", (q) => q.eq("agentId", agent._id))
          .order("desc")
          .take(5000);

        const totalCollected = collections.reduce(
          (s, c) => s + c.amount,
          0,
        );
        const pendingAmount = collections
          .filter((c) => c.status === "pending")
          .reduce((s, c) => s + c.amount, 0);

        // Today
        const now = new Date();
        const todayStart = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
          ),
        ).toISOString();
        const todayAmount = collections
          .filter((c) => c.collectedAt >= todayStart)
          .reduce((s, c) => s + c.amount, 0);

        return {
          _id: agent._id,
          name: agent.name ?? "Unnamed Agent",
          email: agent.email ?? "",
          contributorCount: contributors.length,
          activeContributors: contributors.filter(
            (c) => c.status === "active",
          ).length,
          collectionCount: collections.length,
          totalCollected,
          pendingAmount,
          todayAmount,
        };
      }),
    );

    return results;
  },
});

/** All collections with filtering (paginated) */
export const listCollections = query({
  args: {
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("disputed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let baseQuery;
    if (args.statusFilter) {
      baseQuery = ctx.db
        .query("collections")
        .withIndex("by_status", (idx) =>
          idx.eq("status", args.statusFilter!),
        );
    } else {
      baseQuery = ctx.db.query("collections").order("desc");
    }

    const results = await baseQuery.paginate(args.paginationOpts);

    // Enrich with names
    const enrichedPage = await Promise.all(
      results.page.map(async (c) => {
        const contributor = await ctx.db.get(c.contributorId);
        const agent = await ctx.db.get(c.agentId);
        return {
          ...c,
          contributorName: contributor?.name ?? "Unknown",
          contributorPhone: contributor?.phone ?? "",
          agentName: agent?.name ?? "Unknown Agent",
        };
      }),
    );

    return { ...results, page: enrichedPage };
  },
});

/** Get detailed view of a single agent */
export const getAgentDetail = query({
  args: { agentId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.role !== "agent") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agent not found",
      });
    }

    const contributors = await ctx.db
      .query("contributors")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_agent_and_date", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(200);

    const withdrawals = await ctx.db
      .query("withdrawal_requests")
      .withIndex("by_agent_and_date", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(100);

    const enrichedCollections = await Promise.all(
      collections.map(async (c) => {
        const contributor = await ctx.db.get(c.contributorId);
        return {
          ...c,
          contributorName: contributor?.name ?? "Unknown",
          contributorPhone: contributor?.phone ?? "",
        };
      }),
    );

    const enrichedWithdrawals = await Promise.all(
      withdrawals.map(async (withdrawal) => {
        const contributor = await ctx.db.get(withdrawal.contributorId);
        return {
          ...withdrawal,
          contributorName: contributor?.name ?? "Unknown",
          contributorPhone: contributor?.phone ?? "",
        };
      }),
    );

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();

    const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
    const todayAmount = collections
      .filter((c) => c.collectedAt >= todayStart)
      .reduce((sum, c) => sum + c.amount, 0);
    const pendingAmount = collections
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0);
    const approvedWithdrawalsTotal = withdrawals
      .filter((w) => w.status === "paid")
      .reduce((sum, w) => sum + (w.payoutAmount ?? w.amount), 0);

    return {
      agent: {
        _id: agent._id,
        name: agent.name ?? "Unnamed",
        email: agent.email ?? "",
        phone: agent.phone ?? "",
      },
      summary: {
        contributorCount: contributors.length,
        activeContributors: contributors.filter((c) => c.status === "active").length,
        collectionCount: collections.length,
        totalCollected,
        todayAmount,
        pendingAmount,
        pendingCollectionCount: collections.filter((c) => c.status === "pending").length,
        confirmedCollectionCount: collections.filter((c) => c.status === "confirmed").length,
        withdrawalCount: withdrawals.length,
        approvedWithdrawalsTotal,
      },
      contributors,
      collections: enrichedCollections,
      withdrawals: enrichedWithdrawals,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────

/** Admin confirms a pending/disputed collection */
export const confirmCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Collection not found",
      });
    }
    if (collection.status === "confirmed") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Collection is already confirmed",
      });
    }

    await ctx.db.patch(args.collectionId, {
      status: "confirmed",
      reviewedBy: admin._id,
      reviewedAt: new Date().toISOString(),
      reviewNote: args.note,
    });

    return args.collectionId;
  },
});

/** Admin disputes a collection (flag as suspicious) */
export const disputeCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Collection not found",
      });
    }

    await ctx.db.patch(args.collectionId, {
      status: "disputed",
      reviewedBy: admin._id,
      reviewedAt: new Date().toISOString(),
      reviewNote: args.note,
    });

    return args.collectionId;
  },
});

/** Bulk confirm all pending collections for a specific agent */
export const bulkConfirmByAgent = mutation({
  args: {
    agentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const pendingCollections = await ctx.db
      .query("collections")
      .withIndex("by_agent_and_date", (q) => q.eq("agentId", args.agentId))
      .collect();

    const pending = pendingCollections.filter((c) => c.status === "pending");
    const now = new Date().toISOString();

    for (const collection of pending) {
      await ctx.db.patch(collection._id, {
        status: "confirmed",
        reviewedBy: admin._id,
        reviewedAt: now,
        reviewNote: "Bulk confirmed by admin",
      });
    }

    return { confirmedCount: pending.length };
  },
});

export const listPendingContributorImports = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);

    const imports = await ctx.db
      .query("contributors")
      .withIndex("by_agent", (q) => q.eq("agentId", admin._id))
      .collect();
    const allContributors = await ctx.db.query("contributors").take(8000);

    const assignedNames = new Set(
      allContributors
        .filter((contributor) => !isPendingImportPhone(contributor.phone))
        .map((contributor) => normalizeContributorName(contributor.name)),
    );

    return imports
      .filter((contributor) => isPendingImportPhone(contributor.phone))
      .filter(
        (contributor) =>
          !assignedNames.has(normalizeContributorName(contributor.name)),
      )
      .sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const cleanupStaleContributorImports = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);

    const imports = await ctx.db
      .query("contributors")
      .withIndex("by_agent", (q) => q.eq("agentId", admin._id))
      .collect();
    const allContributors = await ctx.db.query("contributors").take(8000);

    const assignedNames = new Set(
      allContributors
        .filter((contributor) => !isPendingImportPhone(contributor.phone))
        .map((contributor) => normalizeContributorName(contributor.name)),
    );

    let removedCount = 0;

    for (const contributor of imports) {
      if (
        isPendingImportPhone(contributor.phone) &&
        assignedNames.has(normalizeContributorName(contributor.name))
      ) {
        await ctx.db.delete(contributor._id);
        removedCount += 1;
      }
    }

    return { removedCount };
  },
});

export const bulkImportContributors = mutation({
  args: {
    rows: v.array(
      v.object({
        name: v.string(),
        amount: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existingContributors = await ctx.db.query("contributors").take(8000);
    const existingNames = new Set(
      existingContributors.map((contributor) =>
        normalizeContributorName(contributor.name),
      ),
    );
    const seenInImport = new Set<string>();
    const now = new Date().toISOString();
    const batchKey = Date.now();

    let importedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < args.rows.length; index += 1) {
      const row = args.rows[index];
      const cleanedName = row.name.trim().replace(/\s+/g, " ");
      const normalizedName = normalizeContributorName(cleanedName);
      const amount = row.amount === undefined ? 0 : Number(row.amount);

      if (!cleanedName || !Number.isFinite(amount) || amount < 0) {
        skippedCount += 1;
        continue;
      }

      if (seenInImport.has(normalizedName) || existingNames.has(normalizedName)) {
        skippedCount += 1;
        continue;
      }

      await ctx.db.insert("contributors", {
        name: cleanedName,
        phone: `${PENDING_IMPORT_PHONE_PREFIX}${batchKey}:${index}`,
        agentId: admin._id,
        dailyAmount: amount,
        frequency: undefined,
        weeklyDay: undefined,
        monthlyDay: undefined,
        startDate: now,
        status: "inactive",
      });

      seenInImport.add(normalizedName);
      existingNames.add(normalizedName);
      importedCount += 1;
    }

    return {
      importedCount,
      skippedCount,
    };
  },
});

export const assignImportedContributor = mutation({
  args: {
    contributorId: v.id("contributors"),
    phone: v.string(),
    dailyAmount: v.number(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    agentId: v.id("users"),
    weeklyDay: v.optional(v.number()),
    monthlyDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const contributor = await ctx.db.get(args.contributorId);

    if (!contributor) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contributor not found",
      });
    }

    if (contributor.agentId !== admin._id || !isPendingImportPhone(contributor.phone)) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This contributor is not waiting in your admin intake list",
      });
    }

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.role !== "agent") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Please choose a valid agent",
      });
    }

    const phone = args.phone.trim();
    if (!phone) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Phone number is required",
      });
    }

    const dailyAmount = Number(args.dailyAmount);
    if (!Number.isFinite(dailyAmount) || dailyAmount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Contribution amount must be greater than zero",
      });
    }

    if (args.frequency === "weekly" && args.weeklyDay === undefined) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Select the weekly collection day",
      });
    }

    if (args.frequency === "monthly" && args.monthlyDay === undefined) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Select the monthly collection day",
      });
    }

    const phoneMatches = await ctx.db
      .query("contributors")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .collect();
    const duplicatePhone = phoneMatches.find(
      (match) => match._id !== contributor._id,
    );

    if (duplicatePhone) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Another contributor is already using this phone number",
      });
    }

    await ctx.db.patch(args.contributorId, {
      phone,
      agentId: args.agentId,
      dailyAmount,
      frequency: args.frequency,
      weeklyDay: args.frequency === "weekly" ? args.weeklyDay : undefined,
      monthlyDay: args.frequency === "monthly" ? args.monthlyDay : undefined,
      status: "active",
      startDate: contributor.startDate ?? new Date().toISOString(),
    });

    return { contributorId: args.contributorId, agentName: agent.name ?? "Agent" };
  },
});
