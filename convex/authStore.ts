import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { internalMutation, internalQuery, query } from './_generated/server';

export const findByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .first(),
});

export const createAccount = internalMutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.string(),
    sessionToken: v.string(),
    role: v.optional(v.union(v.literal("agent"), v.literal("contributor"))),
    amount: v.optional(v.number()),
    frequency: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    ),
    address: v.optional(v.string()),
    occupation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .first();
    if (existing) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'This phone number already has an account',
      });
    }

    const userId = await ctx.db.insert('users', {
      tokenIdentifier: `owode|${args.phone}`,
      name: args.name,
      phone: args.phone,
      email: args.email,
      passwordHash: args.passwordHash,
      sessionToken: args.sessionToken,
      isVerified: true,
      role: args.role,
      agentStatus: args.role === "agent" ? "pending" : undefined,
    });

    // A contributor's own plan is recorded now; an admin only picks their agent.
    if (args.role === 'contributor') {
      const admin = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('isSuperAdmin'), true))
        .first();

      const contributorId = await ctx.db.insert('contributors', {
        name: args.name,
        phone: args.phone,
        email: args.email,
        agentId: admin?._id ?? userId,
        dailyAmount: args.amount ?? 0,
        frequency: args.frequency ?? 'daily',
        status: 'inactive',
        userId,
        startDate: new Date().toISOString(),
        address: args.address,
        occupation: args.occupation,
        pendingAssignment: true,
      });

      await ctx.db.patch(userId, { contributorId });
    }

    return {
      sessionToken: args.sessionToken,
      user: { id: userId, name: args.name, phone: args.phone, role: args.role },
    };
  },
});

export const setSession = internalMutation({
  args: { userId: v.id('users'), sessionToken: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { sessionToken: args.sessionToken });
  },
});

/** The app calls this on startup with its saved token. */
export const me = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      contributorId: user.contributorId,
      agentStatus: user.agentStatus,
    };
  },
});

export const findBySession = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first(),
});

export const storePin = internalMutation({
  args: { sessionToken: v.string(), pinHash: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_session', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!user) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Please sign in' });
    }
    await ctx.db.patch(user._id, { pinHash: args.pinHash });
    return { ok: true };
  },
});

export const storeResetCode = internalMutation({
  args: { userId: v.id('users'), code: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      resetCode: args.code,
      resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      resetAttempts: 0,
    });
  },
});

export const bumpResetAttempts = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const u = await ctx.db.get(args.userId);
    await ctx.db.patch(args.userId, {
      resetAttempts: (u?.resetAttempts ?? 0) + 1,
    });
  },
});

export const applyNewPassword = internalMutation({
  args: {
    userId: v.id('users'),
    passwordHash: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      sessionToken: args.sessionToken,
      resetCode: undefined,
      resetCodeExpiresAt: undefined,
      resetAttempts: undefined,
    });
  },
});
