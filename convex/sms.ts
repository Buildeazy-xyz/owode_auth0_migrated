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

function getFromNumber(): string {
  const num = process.env.TWILIO_PHONE_NUMBER;
  if (!num) {
    throw new Error("TWILIO_PHONE_NUMBER not configured");
  }
  return num;
}

/** Notify an agent that their verification was approved */
export const sendAgentApprovalSMS = internalAction({
  args: { to: v.string(), agentName: v.string() },
  handler: async (_ctx, { to, agentName }) => {
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: `Congratulations ${agentName}! Your OWODE agent account has been approved. Log in to start adding contributors and recording collections. — OWODE`,
        from: getFromNumber(),
        to,
      });
    } catch (error) {
      console.error("Failed to send agent approval SMS:", error);
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
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: `Welcome to OWODE, ${contributorName}! Agent ${agentName} has added you. ${frequency} contribution: \u20A6${amount.toLocaleString()}. Visit our app to view your virtual card. — OWODE`,
        from: getFromNumber(),
        to,
      });
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
    referenceNumber: v.string(),
    paymentMethod: v.string(),
  },
  handler: async (_ctx, { to, contributorName, amount, referenceNumber, paymentMethod }) => {
    try {
      const client = getTwilioClient();
      const method = paymentMethod === "bank_transfer" ? "Bank Transfer" : "Cash";
      await client.messages.create({
        body: `Hi ${contributorName}, your OWODE contribution of \u20A6${amount.toLocaleString()} (${method}) has been recorded. Ref: ${referenceNumber}. — OWODE`,
        from: getFromNumber(),
        to,
      });
    } catch (error) {
      console.error("Failed to send collection SMS:", error);
    }
  },
});
