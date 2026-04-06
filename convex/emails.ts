"use node";

import { Buffer } from "node:buffer";
import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const RESEND_API_URL = "https://api.resend.com/emails";
const MAILGUN_API_BASE_URL =
  process.env.MAILGUN_API_BASE_URL ?? "https://api.mailgun.net/v3";
const RESEND_SENDER_EMAIL =
  process.env.SENDER_EMAIL ?? "OWODE <onboarding@resend.dev>";
const MAILGUN_SENDER_EMAIL =
  process.env.MAILGUN_FROM_EMAIL ??
  process.env.SENDER_EMAIL ??
  "OWODE <mailgun@mg.example.com>";

async function sendViaMailgun({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    return false;
  }

  const response = await fetch(`${MAILGUN_API_BASE_URL}/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      from: MAILGUN_SENDER_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailgun request failed (${response.status}): ${body}`);
  }

  console.info("Email sent via Mailgun:", { to, subject });
  return true;
}

async function sendViaResend({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return false;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_SENDER_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${body}`);
  }

  console.info("Email sent via Resend:", { to, subject });
  return true;
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    if (await sendViaResend({ to, subject, html })) {
      return;
    }
  } catch (error) {
    console.warn("Resend send failed, trying Mailgun fallback:", error);
  }

  try {
    if (await sendViaMailgun({ to, subject, html })) {
      return;
    }
  } catch (error) {
    console.warn("Mailgun send failed:", error);
  }

  console.warn(
    "No working Resend or Mailgun email configuration found in Convex env. Email skipped:",
    { to, subject },
  );
}

/** Send a one-time account verification code */
export const sendAccountVerificationEmail = internalAction({
  args: { to: v.string(), name: v.string(), code: v.string() },
  handler: async (_ctx, { to, name, code }) => {
    try {
      await sendEmail({
        to,
        subject: "Your OWODE verification code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #166534;">Hello ${escapeHtml(name)},</h1>
            <p>Use the verification code below to activate your OWODE account.</p>
            <div style="margin: 24px 0; padding: 16px; border-radius: 12px; background: #f0fdf4; text-align: center;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #166534;">${escapeHtml(code)}</span>
            </div>
            <p>This code expires in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send account verification email:", error);
    }
  },
});

/** Notify an agent that their verification was approved */
export const sendAgentApprovalEmail = internalAction({
  args: { to: v.string(), agentName: v.string() },
  handler: async (_ctx, { to, agentName }) => {
    try {
      await sendEmail({
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

/** Notify an agent that their verification was rejected */
export const sendAgentRejectionEmail = internalAction({
  args: { to: v.string(), agentName: v.string(), reason: v.string() },
  handler: async (_ctx, { to, agentName, reason }) => {
    try {
      await sendEmail({
        to,
        subject: "Update on Your OWODE Agent Verification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #991b1b;">Hello ${escapeHtml(agentName)},</h1>
            <p>Your OWODE agent verification could not be approved at this time.</p>
            <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
            <p>Please update your details and submit again from your dashboard.</p>
            <br />
            <p style="color: #6b7280; font-size: 14px;">— The OWODE Team</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send agent rejection email:", error);
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
      await sendEmail({
        to,
        subject: "Welcome to OWODE — You Have Been Onboarded!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #166534;">Welcome, ${escapeHtml(contributorName)}!</h1>
            <p>You have been added to <strong>OWODE Alajo-Àgbáiyè</strong> by your agent <strong>${escapeHtml(agentName)}</strong>.</p>
            <table style="margin: 16px 0; border-collapse: collapse;">
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Frequency:</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(frequency)}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Amount:</td><td style="padding: 6px 0; font-weight: 600;">₦${amount.toLocaleString()}</td></tr>
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
    totalSaved: v.number(),
    contributionAmount: v.number(),
    frequency: v.string(),
    referenceNumber: v.string(),
    paymentMethod: v.string(),
  },
  handler: async (
    _ctx,
    {
      to,
      contributorName,
      agentName,
      amount,
      totalSaved,
      contributionAmount,
      frequency,
      referenceNumber,
      paymentMethod,
    },
  ) => {
    try {
      const methodLabel =
        paymentMethod === "bank_transfer" ? "Bank Transfer" : "Cash";
      const planLabel =
        frequency === "weekly"
          ? "Weekly"
          : frequency === "monthly"
            ? "Monthly"
            : "Daily";
      await sendEmail({
        to,
        subject: `OWODE Collection Recorded — ₦${amount.toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h1 style="color: #166534;">Collection Recorded</h1>
            <p>Hello ${escapeHtml(contributorName)},</p>
            <p>A contribution of <strong>₦${amount.toLocaleString()}</strong> has been recorded by your agent <strong>${escapeHtml(agentName)}</strong>.</p>
            <table style="margin: 16px 0; border-collapse: collapse;">
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Current contribution:</td><td style="padding: 6px 0; font-weight: 600;">₦${contributionAmount.toLocaleString()} / ${escapeHtml(planLabel.toLowerCase())}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Total saved:</td><td style="padding: 6px 0; font-weight: 600;">₦${totalSaved.toLocaleString()}</td></tr>
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

export const sendWithdrawalRequestAdminEmail = internalAction({
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
    requestedAt: v.string(),
    note: v.optional(v.string()),
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
      requestedAt,
      note,
    },
  ) => {
    try {
      await sendEmail({
        to,
        subject: `OWODE Withdrawal Request — ₦${amount.toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
            <h1 style="color: #166534;">New Withdrawal Request</h1>
            <p>An agent has submitted a contributor withdrawal request for manual processing.</p>
            <table style="margin: 16px 0; border-collapse: collapse; width: 100%;">
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Contributor</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(contributorName)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Contributor phone</td><td style="padding: 8px 0;">${escapeHtml(contributorPhone)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Agent</td><td style="padding: 8px 0;">${escapeHtml(agentName)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; font-weight: 600;">₦${amount.toLocaleString()}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Bank</td><td style="padding: 8px 0;">${escapeHtml(bankName)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Account name</td><td style="padding: 8px 0;">${escapeHtml(accountName)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Account number</td><td style="padding: 8px 0;">${escapeHtml(accountNumber)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Reference</td><td style="padding: 8px 0;">${escapeHtml(referenceNumber)}</td></tr>
              <tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Requested at</td><td style="padding: 8px 0;">${escapeHtml(new Date(requestedAt).toLocaleString("en-NG"))}</td></tr>
              ${note ? `<tr><td style="padding: 8px 12px 8px 0; color: #6b7280;">Note</td><td style="padding: 8px 0;">${escapeHtml(note)}</td></tr>` : ""}
            </table>
            <p style="color: #6b7280; font-size: 14px;">Please process this withdrawal and update the contributor accordingly.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send withdrawal request admin email:", error);
    }
  },
});
