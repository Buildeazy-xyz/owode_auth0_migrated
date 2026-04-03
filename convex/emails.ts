"use node";

import escapeHtml from "escape-html";
import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

/** The verified sender email — user must verify this in Hercules Emails tab */
const SENDER_EMAIL = "info@owodealajo.com";

/** Notify an agent that their verification was approved */
export const sendAgentApprovalEmail = internalAction({
  args: { to: v.string(), agentName: v.string() },
  handler: async (_ctx, { to, agentName }) => {
    try {
      await hercules.email.send({
        from: SENDER_EMAIL,
        to,
        subject: "Your OWODE Agent Account Has Been Approved!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #166534;">Congratulations, ${escapeHtml(agentName)}!</h1>
            <p>Your agent verification application has been <strong>approved</strong>.</p>
            <p>You can now log in to your OWODE dashboard and start adding contributors and recording collections.</p>
            <br />
            <p style="color: #6b7280; font-size: 14px;">— The OWODE Team</p>
            <p style="color: #9ca3af; font-size: 12px;">Your Money is Safe.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send agent approval email:", error);
    }
  },
});

/** Notify a contributor that they have been onboarded by an agent */
export const sendContributorWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    contributorName: v.string(),
    agentName: v.string(),
    frequency: v.string(),
    amount: v.number(),
  },
  handler: async (_ctx, { to, contributorName, agentName, frequency, amount }) => {
    try {
      await hercules.email.send({
        from: SENDER_EMAIL,
        to,
        subject: "Welcome to OWODE — You Have Been Onboarded!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #166534;">Welcome, ${escapeHtml(contributorName)}!</h1>
            <p>You have been added to <strong>OWODE Alajo-Àgbáiye</strong> by your agent <strong>${escapeHtml(agentName)}</strong>.</p>
            <table style="margin: 16px 0; border-collapse: collapse;">
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Frequency:</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(frequency)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Amount:</td><td style="padding: 6px 0; font-weight: 600;">\u20A6${amount.toLocaleString()}</td></tr>
            </table>
            <p>Download the OWODE app or visit our website to view your virtual card, track payments, and manage your savings.</p>
            <br />
            <p style="color: #6b7280; font-size: 14px;">— The OWODE Team</p>
            <p style="color: #9ca3af; font-size: 12px;">Your Money is Safe.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send contributor welcome email:", error);
    }
  },
});

/** Notify a contributor that a collection has been recorded */
export const sendCollectionNotificationEmail = internalAction({
  args: {
    to: v.string(),
    contributorName: v.string(),
    agentName: v.string(),
    amount: v.number(),
    referenceNumber: v.string(),
    paymentMethod: v.string(),
  },
  handler: async (
    _ctx,
    { to, contributorName, agentName, amount, referenceNumber, paymentMethod },
  ) => {
    try {
      const methodLabel =
        paymentMethod === "bank_transfer" ? "Bank Transfer" : "Cash";
      await hercules.email.send({
        from: SENDER_EMAIL,
        to,
        subject: `OWODE Collection Recorded — \u20A6${amount.toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #166534;">Collection Recorded</h1>
            <p>Hello ${escapeHtml(contributorName)},</p>
            <p>A contribution of <strong>\u20A6${amount.toLocaleString()}</strong> has been recorded by your agent <strong>${escapeHtml(agentName)}</strong>.</p>
            <table style="margin: 16px 0; border-collapse: collapse;">
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Reference:</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(referenceNumber)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Method:</td><td style="padding: 6px 0;">${escapeHtml(methodLabel)}</td></tr>
            </table>
            <p>Log in to your dashboard to view your updated virtual card and payment history.</p>
            <br />
            <p style="color: #6b7280; font-size: 14px;">— The OWODE Team</p>
            <p style="color: #9ca3af; font-size: 12px;">Your Money is Safe.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send collection notification email:", error);
    }
  },
});
