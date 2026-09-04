'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';

/**
 * Send a push notification through Expo.
 * Quietly does nothing if the person has no token yet.
 */
export const sendPush = internalAction({
  args: {
    token: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    if (!args.token?.startsWith('ExponentPushToken')) return;

    try {
      const res = await fetch('https://exp.host/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: args.token,
          sound: 'default',
          title: args.title,
          body: args.body,
          data: args.data ?? {},
        }),
      });
      const out = await res.json().catch(() => null);
      console.info('Push sent:', JSON.stringify(out));
    } catch (error) {
      console.error('Failed to send push:', error);
    }
  },
});
