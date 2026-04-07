import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

/** The sole super-admin email address */
const SUPER_ADMIN_EMAIL = "olusegunolurin365@gmail.com";
const AUTO_ADMIN_EMAILS = ["aminatiyiola7@gmail.com"];
const AUTO_ADMIN_PHONE_BY_EMAIL: Record<string, string> = {
  "aminatiyiola7@gmail.com": "09026251588",
};
const VERIFICATION_TTL_MS = 10 * 60 * 1000;

function getIdentityPhone(identity: Record<string, unknown>): string | undefined {
  const value = identity.phone ?? identity.phoneNumber ?? identity.phone_number;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function maskEmail(email?: string) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

function maskPhone(phone?: string) {
  if (!phone) return null;
  const trimmed = phone.replace(/\s+/g, "");
  if (trimmed.length <= 4) return trimmed;
  return `${trimmed.slice(0, 4)}${"*".repeat(Math.max(1, trimmed.length - 6))}${trimmed.slice(-2)}`;
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase();
}

function isSuperAdminEmail(email?: string | null) {
  return normalizeEmail(email) === SUPER_ADMIN_EMAIL;
}

function isAutoAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  return !!normalized && AUTO_ADMIN_EMAILS.includes(normalized);
}

function getAutoAdminPhone(email?: string | null) {
  const normalized = normalizeEmail(email);
  return normalized ? AUTO_ADMIN_PHONE_BY_EMAIL[normalized] : undefined;
}

async function performApplicationReset(
  ctx: Pick<MutationCtx, "db">,
) {
  const verifications = await ctx.db.query("agent_verifications").collect();
  for (const verification of verifications) {
    await ctx.db.delete(verification._id);
  }

  const withdrawals = await ctx.db.query("withdrawal_requests").collect();
  for (const withdrawal of withdrawals) {
    await ctx.db.delete(withdrawal._id);
  }

  const collections = await ctx.db.query("collections").collect();
  for (const collection of collections) {
    await ctx.db.delete(collection._id);
  }

  const contributors = await ctx.db.query("contributors").collect();
  for (const contributor of contributors) {
    await ctx.db.delete(contributor._id);
  }

  const users = await ctx.db.query("users").collect();
  let deletedUsers = 0;

  for (const user of users) {
    if (user.isSuperAdmin || user.email === SUPER_ADMIN_EMAIL) {
      await ctx.db.patch(user._id, {
        role: "admin",
        isSuperAdmin: true,
        isVerified: true,
        contributorId: undefined,
        agentStatus: undefined,
      });
      continue;
    }

    await ctx.db.delete(user._id);
    deletedUsers += 1;
  }

  return {
    deletedUsers,
    deletedContributors: contributors.length,
    deletedCollections: collections.length,
    deletedWithdrawals: withdrawals.length,
    deletedVerifications: verifications.length,
  };
}

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

    const identityPhone = getIdentityPhone(identity as Record<string, unknown>);
    const autoAdminPhone = getAutoAdminPhone(identity.email);
    const resolvedPhone = identityPhone ?? autoAdminPhone;
    const shouldBeSuperAdmin = isSuperAdminEmail(identity.email);
    const shouldBeAdmin = shouldBeSuperAdmin || isAutoAdminEmail(identity.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      const patch: {
        name?: string;
        email?: string;
        phone?: string;
        isSuperAdmin?: boolean;
        role?: "admin";
        isVerified?: boolean;
        verifiedAt?: string;
      } = {};

      if (identity.name && identity.name !== user.name) {
        patch.name = identity.name;
      }
      if (identity.email && identity.email !== user.email) {
        patch.email = identity.email;
      }
      if (resolvedPhone && resolvedPhone !== user.phone) {
        patch.phone = resolvedPhone;
      }

      const wasAdmin = user.role === "admin" || user.isSuperAdmin;

      if (shouldBeSuperAdmin && (!user.isSuperAdmin || user.role !== "admin")) {
        patch.isSuperAdmin = true;
        patch.role = "admin";
      } else if (shouldBeAdmin && user.role !== "admin") {
        patch.role = "admin";
      }

      if (shouldBeAdmin || user.isSuperAdmin || user.role === "admin") {
        patch.isVerified = true;
        patch.verifiedAt = user.verifiedAt ?? new Date().toISOString();
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, patch);
      }

      if (!wasAdmin && shouldBeAdmin) {
        const displayName = identity.name ?? user.name ?? "OWODE Admin";
        const destinationEmail = identity.email ?? user.email;
        if (destinationEmail) {
          await ctx.scheduler.runAfter(0, internal.emails.sendAdminAccessGrantedEmail, {
            to: destinationEmail,
            name: displayName,
          });
        }
        if (resolvedPhone) {
          await ctx.scheduler.runAfter(0, internal.sms.sendAdminAccessGrantedSMS, {
            to: resolvedPhone,
            name: displayName,
          });
        }
      }

      return user._id;
    }

    // New user — check if this is a configured admin
    const isSuperAdmin = shouldBeSuperAdmin;
    const isConfiguredAdmin = shouldBeAdmin;
    const verifiedAt = isConfiguredAdmin ? new Date().toISOString() : undefined;
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      phone: resolvedPhone,
      tokenIdentifier: identity.tokenIdentifier,
      isVerified: isConfiguredAdmin,
      ...(verifiedAt ? { verifiedAt } : {}),
      ...(isConfiguredAdmin ? { role: "admin" } : {}),
      ...(isSuperAdmin ? { isSuperAdmin: true } : {}),
    });

    if (isConfiguredAdmin) {
      const displayName = identity.name ?? "OWODE Admin";
      if (identity.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendAdminAccessGrantedEmail, {
          to: identity.email,
          name: displayName,
        });
      }
      if (resolvedPhone) {
        await ctx.scheduler.runAfter(0, internal.sms.sendAdminAccessGrantedSMS, {
          to: resolvedPhone,
          name: displayName,
        });
      }
    }

    return userId;
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

export const getVerificationStatus = query({
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      isVerified: user.isVerified ?? false,
      verifiedAt: user.verifiedAt ?? null,
      maskedEmail: maskEmail(user.email),
      maskedPhone: maskPhone(user.phone),
      verificationCodeSentAt: user.verificationCodeSentAt ?? null,
      verificationCodeExpiresAt: user.verificationCodeExpiresAt ?? null,
    };
  },
});

export const sendVerificationCode = mutation({
  args: { phone: v.optional(v.string()) },
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const submittedPhone = args.phone?.trim();
    const deliveryPhone = submittedPhone || user.phone;

    if (user.isVerified) {
      return {
        alreadyVerified: true,
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(deliveryPhone),
      };
    }

    if (!user.email && !deliveryPhone) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Add your phone number or email before requesting a verification code.",
      });
    }

    const code = generateVerificationCode();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();

    await ctx.db.patch(user._id, {
      phone: deliveryPhone,
      verificationCode: code,
      verificationCodeSentAt: now,
      verificationCodeExpiresAt: expiresAt,
    });

    const displayName = user.name?.trim() || "there";

    if (user.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAccountVerificationEmail, {
        to: user.email,
        name: displayName,
        code,
      });
    }

    if (deliveryPhone) {
      await ctx.scheduler.runAfter(0, internal.sms.sendAccountVerificationSMS, {
        to: deliveryPhone,
        name: displayName,
        code,
      });
    }

    return {
      maskedEmail: maskEmail(user.email),
      maskedPhone: maskPhone(deliveryPhone),
      expiresAt,
    };
  },
});

export const verifyAccountCode = mutation({
  args: { code: v.string() },
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return { verified: true };
    }

    const submittedCode = args.code.trim();
    if (!submittedCode) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Please enter the verification code.",
      });
    }

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "No verification code was found. Please request a new code.",
      });
    }

    if (new Date(user.verificationCodeExpiresAt).getTime() < Date.now()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This verification code has expired. Please request a new one.",
      });
    }

    if (submittedCode !== user.verificationCode) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The verification code you entered is incorrect.",
      });
    }

    await ctx.db.patch(user._id, {
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      verificationCode: undefined,
      verificationCodeExpiresAt: undefined,
      verificationCodeSentAt: undefined,
    });

    return { verified: true };
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

export const resetAllDataInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await performApplicationReset(ctx);
  },
});

export const notifyConfiguredAdminInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const name = "Aminat Iyiola";

    await ctx.scheduler.runAfter(0, internal.emails.sendAdminAccessGrantedEmail, {
      to: "aminatiyiola7@gmail.com",
      name,
    });
    await ctx.scheduler.runAfter(0, internal.sms.sendAdminAccessGrantedSMS, {
      to: "09026251588",
      name,
    });

    return {
      notified: true,
      email: "aminatiyiola7@gmail.com",
      phone: "09026251588",
    };
  },
});
