"use node";

import twilio from "twilio";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(sid, token);
}

function normalizePhoneNumber(value: string, label: string): string {
  const normalized = value.replace(/[\s()-]/g, "");
  if (!normalized) {
    throw new Error(`${label} is empty`);
  }
  if (normalized.startsWith("+")) {
    return normalized;
  }
  if (normalized.startsWith("234")) {
    return `+${normalized}`;
  }
  if (normalized.startsWith("0") && normalized.length === 11) {
    return `+234${normalized.slice(1)}`;
  }
  return normalized;
}

function getFromNumber(): string {
  const num =
    process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER;
  if (!num) {
    throw new Error(
      "TWILIO_PHONE_NUMBER or TWILIO_FROM_NUMBER not configured",
    );
  }
  return normalizePhoneNumber(num, "Twilio from number");
}

const SMS_NOTIFICATIONS_PAUSED = true;

function shouldSkipSms(to: string) {
  if (!SMS_NOTIFICATIONS_PAUSED) {
    return false;
  }

  console.info("SMS notifications are temporarily paused:", { to });
  return true;
}

/** Send a one-time account verification code */
export const sendAccountVerificationSMS = internalAction({
  args: { to: v.string(), name: v.string(), code: v.string() },
  handler: async (_ctx, { to, name, code }) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const message = await client.messages.create({
        body: `Hello ${name}, your OWODE verification code is ${code}. It expires in 10 minutes. — OWODE`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Account verification SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send account verification SMS:", error);
    }
  },
});

/** Notify an agent that their verification was approved */
export const sendAgentApprovalSMS = internalAction({
  args: { to: v.string(), agentName: v.string() },
  handler: async (_ctx, { to, agentName }) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const message = await client.messages.create({
        body: `Congratulations ${agentName}! Your OWODE agent account has been approved. Log in to start adding contributors and recording collections. — OWODE`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Agent approval SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send agent approval SMS:", error);
    }
  },
});

export const sendAdminAccessGrantedSMS = internalAction({
  args: { to: v.string(), name: v.string() },
  handler: async (_ctx, { to, name }) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const message = await client.messages.create({
        body: `Hello ${name}, your OWODE admin access is now active. Sign in with your email to manage the dashboard. — OWODE`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Admin access SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send admin access SMS:", error);
    }
  },
});

/** Notify an agent that their verification was rejected */
export const sendAgentRejectionSMS = internalAction({
  args: { to: v.string(), agentName: v.string(), reason: v.string() },
  handler: async (_ctx, { to, agentName, reason }) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const message = await client.messages.create({
        body: `Hello ${agentName}, your OWODE agent verification was not approved yet. Reason: ${reason}. Please update your details and submit again. — OWODE`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Agent rejection SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send agent rejection SMS:", error);
    }
  },
});

/** Notify a contributor that they have been onboarded */
export const sendContributorWelcomeSMS = internalAction({
  args: {
    to: v.string(),
    contributorName: v.string(),
    agentName: v.string(),
    frequency: v.string(),
    amount: v.number(),
  },
  handler: async (_ctx, { to, contributorName, agentName, frequency, amount }) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const message = await client.messages.create({
        body: `Welcome to OWODE, ${contributorName}! Agent ${agentName} has added you. ${frequency} contribution: \u20A6${amount.toLocaleString()}. Visit our app to view your virtual card. — OWODE`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Contributor welcome SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send contributor welcome SMS:", error);
    }
  },
});

/** Notify a contributor that a collection has been recorded */
export const sendCollectionSMS = internalAction({
  args: {
    to: v.string(),
    contributorName: v.string(),
    amount: v.number(),
    totalSaved: v.number(),
    contributionAmount: v.number(),
    frequency: v.string(),
    referenceNumber: v.string(),
    paymentMethod: v.string(),
  },
  handler: async (
    _ctx,
    { to, contributorName, amount, totalSaved, contributionAmount, frequency, referenceNumber, paymentMethod },
  ) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const method = paymentMethod === "bank_transfer" ? "Bank Transfer" : "Cash";
      const period = frequency === "weekly" ? "week" : frequency === "monthly" ? "month" : "day";
      const message = await client.messages.create({
        body: `Hi ${contributorName}, your OWODE contribution of \u20A6${amount.toLocaleString()} (${method}) has been recorded. Current contribution: \u20A6${contributionAmount.toLocaleString()}/${period}. Total saved: \u20A6${totalSaved.toLocaleString()}. Ref: ${referenceNumber}. — OWODE`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Collection SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send collection SMS:", error);
    }
  },
});

export const sendWithdrawalRequestAdminSMS = internalAction({
  args: {
    to: v.string(),
    contributorName: v.string(),
    contributorPhone: v.string(),
    agentName: v.string(),
    amount: v.number(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    referenceNumber: v.string(),
    contributionDays: v.number(),
    contributionFee: v.number(),
    penaltyFee: v.number(),
    payoutAmount: v.number(),
  },
  handler: async (
    _ctx,
    {
      to,
      contributorName,
      contributorPhone,
      agentName,
      amount,
      bankName,
      accountNumber,
      accountName,
      referenceNumber,
      contributionDays,
      contributionFee,
      penaltyFee,
      payoutAmount,
    },
  ) => {
    if (shouldSkipSms(to)) {
      return;
    }

    try {
      const client = getTwilioClient();
      const message = await client.messages.create({
        body: `OWODE withdrawal: ${contributorName} (${contributorPhone}) via ${agentName}. Req: \u20A6${amount.toLocaleString()}, days: ${contributionDays}, fees: \u20A6${(contributionFee + penaltyFee).toLocaleString()}, pay: \u20A6${payoutAmount.toLocaleString()}. ${bankName} ${accountName} ${accountNumber}. Ref: ${referenceNumber}.`,
        from: getFromNumber(),
        to: normalizePhoneNumber(to, "Recipient phone number"),
      });
      console.info("Withdrawal request admin SMS sent:", { to, sid: message.sid });
    } catch (error) {
      console.error("Failed to send withdrawal request admin SMS:", error);
    }
  },
});
