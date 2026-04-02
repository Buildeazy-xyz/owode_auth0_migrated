import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("agent"),
        v.literal("contributor"),
      ),
    ),
    phone: v.optional(v.string()),
    /** Links a contributor-role user to their contributor record */
    contributorId: v.optional(v.id("contributors")),
    /** Agent approval status — only relevant when role === "agent" */
    agentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("under_review"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  }).index("by_token", ["tokenIdentifier"]),

  /** Agent verification applications */
  agent_verifications: defineTable({
    userId: v.id("users"),
    phone: v.string(),
    /** Convex storage ID for the government-issued ID document */
    govIdStorageId: v.id("_storage"),
    guarantorName: v.string(),
    guarantorPhone: v.string(),
    guarantorAddress: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    submittedAt: v.string(),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  contributors: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    agentId: v.id("users"),
    dailyAmount: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    userId: v.optional(v.id("users")),
  })
    .index("by_agent", ["agentId"])
    .index("by_phone", ["phone"]),

  collections: defineTable({
    contributorId: v.id("contributors"),
    agentId: v.id("users"),
    amount: v.number(),
    collectedAt: v.string(),
    referenceNumber: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("disputed"),
    ),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
    ),
    /** Bank transfer reference / session ID from contributor's bank app */
    bankReference: v.optional(v.string()),
    note: v.optional(v.string()),
    /** Admin who confirmed / disputed, and when */
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
  })
    .index("by_agent_and_date", ["agentId", "collectedAt"])
    .index("by_contributor", ["contributorId"])
    .index("by_reference", ["referenceNumber"])
    .index("by_status", ["status"]),
});
