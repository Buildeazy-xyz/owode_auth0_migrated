import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** The sole super-admin email address */
const SUPER_ADMIN_EMAIL = "olusegunolurin365@gmail.com";

export const updateCurrentUser = mutation({
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
    if (user !== null) {
      // Auto-promote super admin on every login (ensures the flag stays set)
      if (
        identity.email === SUPER_ADMIN_EMAIL &&
        (!user.isSuperAdmin || user.role !== "admin")
      ) {
        await ctx.db.patch(user._id, {
          isSuperAdmin: true,
          role: "admin",
        });
      }
      return user._id;
    }

    // New user — check if this is the super admin
    const isSuperAdmin = identity.email === SUPER_ADMIN_EMAIL;
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      ...(isSuperAdmin ? { isSuperAdmin: true, role: "admin" } : {}),
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user;
  },
});

/**
 * Self-assign agent or contributor role during onboarding.
 * Admin role can only be assigned by the super admin via promoteToAdmin.
 */
export const setRole = mutation({
  args: {
    role: v.union(
      v.literal("agent"),
      v.literal("contributor"),
    ),
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
    // Don't allow users to overwrite their admin/super-admin role
    if (user.role === "admin" || user.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Admins cannot change their own role from here",
      });
    }
    await ctx.db.patch(user._id, { role: args.role });
    return user._id;
  },
});

/** Super-admin promotes another user to admin */
export const promoteToAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!caller || !caller.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the super admin can promote users to admin",
      });
    }

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(args.userId, { role: "admin" });
    return args.userId;
  },
});

/** Super-admin demotes an admin back to no role */
export const demoteAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!caller || !caller.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the super admin can demote admins",
      });
    }

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    if (target.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot demote the super admin",
      });
    }

    await ctx.db.patch(args.userId, { role: undefined });
    return args.userId;
  },
});

/** List all users (super admin only) */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!caller || !caller.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the super admin can list all users",
      });
    }

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name ?? "Unnamed",
      email: u.email ?? "",
      role: u.role,
      isSuperAdmin: u.isSuperAdmin ?? false,
    }));
  },
});

/** Remove a user's role entirely (super admin only) */
export const removeUserRole = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!caller || !caller.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the super admin can manage user roles",
      });
    }

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    if (target.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot remove the super admin role",
      });
    }

    await ctx.db.patch(args.userId, {
      role: undefined,
      agentStatus: undefined,
    });
    return args.userId;
  },
});

/** Delete a user entirely (super admin only) */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!caller || !caller.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the super admin can delete users",
      });
    }

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    if (target.isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot delete the super admin account",
      });
    }

    // If the user is an agent, also clean up their verification record
    const verification = await ctx.db
      .query("agent_verifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (verification) {
      await ctx.db.delete(verification._id);
    }

    // If the user is linked to a contributor, unlink it
    if (target.contributorId) {
      const contributor = await ctx.db.get(target.contributorId);
      if (contributor) {
        await ctx.db.patch(contributor._id, { userId: undefined });
      }
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    // Log the deletion reason (visible in backend logs)
    console.log(
      `User ${target.name ?? target._id} deleted by super admin. Reason: ${args.reason}`,
    );

    return args.userId;
  },
});
