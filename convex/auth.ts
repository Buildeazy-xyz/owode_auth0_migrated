'use node';

import { ConvexError, v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import bcrypt from 'bcryptjs';

function normalisePhone(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return '0' + d;
  if (d.startsWith('234')) return '0' + d.slice(3);
  return d;
}

function newToken() {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

/** Create an account with a phone number and password. */
export const register = action({
  args: {
    name: v.string(),
    phone: v.string(),
    password: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal("agent"), v.literal("contributor")),
    amount: v.optional(v.number()),
    frequency: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    ),
    address: v.optional(v.string()),
    occupation: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const phone = normalisePhone(args.phone);
    if (phone.length !== 11) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter a valid 11-digit phone number' });
    }
    if (args.password.length < 6) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Password must be at least 6 characters' });
    }
    if (!args.name.trim()) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter your name' });
    }

    const passwordHash = await bcrypt.hash(args.password, 10);
    const sessionToken = newToken();

    return await ctx.runMutation(internal.authStore.createAccount, {
      name: args.name.trim(),
      phone,
      email: args.email?.trim() || undefined,
      passwordHash,
      sessionToken,
      role: args.role,
      amount: args.amount,
      frequency: args.frequency,
      address: args.address,
      occupation: args.occupation,
    });
  },
});

/** Sign in with phone and password. */
export const login = action({
  args: { phone: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<any> => {
    const phone = normalisePhone(args.phone);
    const found: any = await ctx.runQuery(internal.authStore.findByPhone, { phone });

    if (!found?.passwordHash) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Incorrect phone number or password' });
    }

    const ok = await bcrypt.compare(args.password, found.passwordHash);
    if (!ok) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Incorrect phone number or password' });
    }

    const sessionToken = newToken();
    await ctx.runMutation(internal.authStore.setSession, {
      userId: found._id,
      sessionToken,
    });

    return {
      sessionToken,
      user: {
        id: found._id,
        name: found.name,
        phone: found.phone,
        role: found.role,
      },
    };
  },
});

export const createAgent = action({
  args: {
    name: v.string(),
    phone: v.string(),
    password: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const phone = normalisePhone(args.phone);
    if (phone.length !== 11) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Enter a valid 11-digit phone number' });
    }
    if (args.password.length < 6) {
      throw new ConvexError({ code: 'BAD_REQUEST', message: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(args.password, 10);
    const sessionToken = newToken();

    const result = await ctx.runMutation(internal.authStore.createAccount, {
      name: args.name.trim(),
      phone,
      email: args.email?.trim() || undefined,
      passwordHash,
      sessionToken,
      role: 'agent' as const,
    });

    return { ok: true, phone, name: args.name.trim() };
  },
});

/** Set or change the four-digit PIN used to confirm money actions. */
export const setPin = action({
  args: { sessionToken: v.string(), pin: v.string() },
  handler: async (ctx, args): Promise<any> => {
    if (!/^\d{4}$/.test(args.pin)) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'Your PIN must be four digits',
      });
    }
    const pinHash = await bcrypt.hash(args.pin, 10);
    return await ctx.runMutation(internal.authStore.storePin, {
      sessionToken: args.sessionToken,
      pinHash,
    });
  },
});

/** Check a PIN before a money action goes ahead. */
export const verifyPin = action({
  args: { sessionToken: v.string(), pin: v.string() },
  handler: async (ctx, args): Promise<any> => {
    const found: any = await ctx.runQuery(internal.authStore.findBySession, {
      sessionToken: args.sessionToken,
    });
    if (!found?.pinHash) {
      throw new ConvexError({
        code: 'NO_PIN',
        message: 'You have not set a PIN yet',
      });
    }
    const ok = await bcrypt.compare(args.pin, found.pinHash);
    if (!ok) {
      throw new ConvexError({ code: 'BAD_PIN', message: 'Incorrect PIN' });
    }
    return { ok: true };
  },
});

/**
 * Start a password reset. The response is identical whether or not the
 * account exists, so this cannot be used to discover who is registered.
 */
export const requestPasswordReset = action({
  args: { phone: v.string() },
  handler: async (ctx, args): Promise<any> => {
    const phone = normalisePhone(args.phone);
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const started = Date.now();
    const found: any = await ctx.runQuery(internal.authStore.findByPhone, { phone });

    if (found) {
      await ctx.runMutation(internal.authStore.storeResetCode, {
        userId: found._id,
        code,
      });
      await ctx.scheduler.runAfter(0, internal.sms.sendPasswordResetSMS, {
        to: phone,
        name: found.name ?? 'there',
        code,
      });
    }

    // Keep the timing similar whether or not the account exists.
    const elapsed = Date.now() - started;
    if (elapsed < 400) {
      await new Promise((r) => setTimeout(r, 400 - elapsed));
    }

    return {
      ok: true,
      message: 'If that number has an OWODE account, a code has been sent to it.',
    };
  },
});

/** Finish the reset with the code from the SMS. */
export const confirmPasswordReset = action({
  args: { phone: v.string(), code: v.string(), newPassword: v.string() },
  handler: async (ctx, args): Promise<any> => {
    if (args.newPassword.length < 8) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'Your new password must be at least 8 characters',
      });
    }

    const phone = normalisePhone(args.phone);
    const found: any = await ctx.runQuery(internal.authStore.findByPhone, { phone });

    if (!found || !found.resetCode) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'That code is not valid. Please request a new one.',
      });
    }

    if ((found.resetAttempts ?? 0) >= 5) {
      throw new ConvexError({
        code: 'TOO_MANY',
        message: 'Too many attempts. Please request a new code.',
      });
    }

    const expired =
      !found.resetCodeExpiresAt ||
      new Date(found.resetCodeExpiresAt).getTime() < Date.now();

    if (expired || found.resetCode !== args.code.trim()) {
      await ctx.runMutation(internal.authStore.bumpResetAttempts, {
        userId: found._id,
      });
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'That code is not valid. Please request a new one.',
      });
    }

    const passwordHash = await bcrypt.hash(args.newPassword, 10);
    const sessionToken = newToken();

    await ctx.runMutation(internal.authStore.applyNewPassword, {
      userId: found._id,
      passwordHash,
      sessionToken,
    });

    return {
      sessionToken,
      user: {
        id: found._id,
        name: found.name,
        phone: found.phone,
        role: found.role,
      },
    };
  },
});


/** Change the PIN by confirming the account password. */
export const resetPin = action({
  args: {
    sessionToken: v.string(),
    password: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    if (!/^\d{4}$/.test(args.newPin)) {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'Your PIN must be four digits',
      });
    }

    const found: any = await ctx.runQuery(internal.authStore.findBySession, {
      sessionToken: args.sessionToken,
    });

    if (!found?.passwordHash) {
      throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Please sign in again' });
    }

    const ok = await bcrypt.compare(args.password, found.passwordHash);
    if (!ok) {
      throw new ConvexError({
        code: 'BAD_PASSWORD',
        message: 'That password is not correct',
      });
    }

    const pinHash = await bcrypt.hash(args.newPin, 10);
    return await ctx.runMutation(internal.authStore.storePin, {
      sessionToken: args.sessionToken,
      pinHash,
    });
  },
});
