import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server.d.ts";

// ─── Helpers ──────────────────────────────────────────────────────

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

// ─── Agent-facing ─────────────────────────────────────────────────

/** Generate a file upload URL (for government ID) */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/** Submit an agent verification application */
export const submit = mutation({
  args: {
    phone: v.string(),
    govIdStorageId: v.id("_storage"),
    guarantorName: v.string(),
    guarantorPhone: v.string(),
    guarantorAddress: v.string(),
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

    // Check if already submitted
    const existing = await ctx.db
      .query("agent_verifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "You have already submitted a verification application",
      });
    }

    // Set the user as agent with pending status
    await ctx.db.patch(user._id, {
      role: "agent",
      agentStatus: "pending",
      phone: args.phone,
    });

    // Create the verification record
    const verificationId = await ctx.db.insert("agent_verifications", {
      userId: user._id,
      phone: args.phone,
      govIdStorageId: args.govIdStorageId,
      guarantorName: args.guarantorName,
      guarantorPhone: args.guarantorPhone,
      guarantorAddress: args.guarantorAddress,
      status: "pending",
      submittedAt: new Date().toISOString(),
    });

    return verificationId;
  },
});

/** Get the current user's verification status */
export const getMyVerification = query({
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
    if (!user) return null;

    const verification = await ctx.db
      .query("agent_verifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return verification;
  },
});

// ─── Admin-facing ─────────────────────────────────────────────────

/** List all agent verification applications (optionally filtered) */
export const listVerifications = query({
  args: {
    statusFilter: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("under_review"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let verifications;
    if (args.statusFilter) {
      verifications = await ctx.db
        .query("agent_verifications")
        .withIndex("by_status", (q) => q.eq("status", args.statusFilter!))
        .order("desc")
        .take(100);
    } else {
      verifications = await ctx.db
        .query("agent_verifications")
        .order("desc")
        .take(100);
    }

    // Enrich with user details and document URL
    return await Promise.all(
      verifications.map(async (v) => {
        const user = await ctx.db.get(v.userId);
        const govIdUrl = await ctx.storage.getUrl(v.govIdStorageId);
        return {
          ...v,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          govIdUrl,
        };
      }),
    );
  },
});

/** Mark a verification as "under review" */
export const markUnderReview = mutation({
  args: { verificationId: v.id("agent_verifications") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const verification = await ctx.db.get(args.verificationId);
    if (!verification) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Verification not found",
      });
    }

    await ctx.db.patch(args.verificationId, {
      status: "under_review",
      reviewedBy: admin._id,
    });
    await ctx.db.patch(verification.userId, { agentStatus: "under_review" });

    return args.verificationId;
  },
});

/** Approve an agent's verification */
export const approve = mutation({
  args: {
    verificationId: v.id("agent_verifications"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const verification = await ctx.db.get(args.verificationId);
    if (!verification) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Verification not found",
      });
    }
    if (verification.status === "approved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Agent is already approved",
      });
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.verificationId, {
      status: "approved",
      reviewedBy: admin._id,
      reviewedAt: now,
    });
    await ctx.db.patch(verification.userId, { agentStatus: "approved" });

    return args.verificationId;
  },
});

/** Reject an agent's verification */
export const reject = mutation({
  args: {
    verificationId: v.id("agent_verifications"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const verification = await ctx.db.get(args.verificationId);
    if (!verification) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Verification not found",
      });
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.verificationId, {
      status: "rejected",
      reviewedBy: admin._id,
      reviewedAt: now,
      rejectionReason: args.reason,
    });
    await ctx.db.patch(verification.userId, { agentStatus: "rejected" });

    return args.verificationId;
  },
});
