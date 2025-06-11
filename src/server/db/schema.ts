// T3 Chat Cloneathon - Comprehensive Database Schema
// Optimized for performance with proper indexes and relations

import { sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Multi-project schema support
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
  (name) => `t3-chat-cloneathon-app_${name}`
);

// Enums for better type safety
export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);
export const attachmentTypeEnum = pgEnum("attachment_type", [
  "image",
  "pdf",
  "document",
]);
export const providerEnum = pgEnum("provider", [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "custom",
]);
export const streamStatusEnum = pgEnum("stream_status", [
  "active",
  "paused",
  "completed",
  "error",
]);

// ================================
// USER MANAGEMENT
// ================================

export const users = createTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    name: varchar("name", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    githubId: varchar("github_id", { length: 100 }).unique(),
    googleId: varchar("google_id", { length: 100 }).unique(),
    preferences: jsonb("preferences").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("user_email_idx").on(t.email),
    index("user_github_idx").on(t.githubId),
    index("user_google_idx").on(t.googleId),
    index("user_created_idx").on(t.createdAt),
  ]
);

export const userSessions = createTable(
  "user_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    deviceInfo: jsonb("device_info").default({}),
    lastActive: timestamp("last_active", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("session_token_idx").on(t.sessionToken),
    index("session_user_idx").on(t.userId),
    index("session_expires_idx").on(t.expiresAt),
    index("session_active_idx").on(t.lastActive),
  ]
);

// ================================
// BETTER AUTH ACCOUNTS
// ================================

export const accounts = createTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 100 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: varchar("scope", { length: 500 }),
    password: varchar("password", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    index("account_provider_idx").on(t.providerId),
    index("account_provider_account_idx").on(t.providerId, t.accountId),
  ]
);

// ================================
// API KEY MANAGEMENT (BYOK)
// ================================

export const apiKeys = createTable(
  "api_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: providerEnum("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    alias: varchar("alias", { length: 100 }),
    capabilities: jsonb("capabilities").default([]),
    rateLimit: jsonb("rate_limit").default({}),
    isActive: boolean("is_active").default(true).notNull(),
    lastValidated: timestamp("last_validated", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("api_key_user_idx").on(t.userId),
    index("api_key_provider_idx").on(t.provider),
    index("api_key_active_idx").on(t.isActive),
  ]
);

// ================================
// CONVERSATIONS & BRANCHING
// ================================

export const conversations = createTable(
  "conversation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    parentConversationId: uuid("parent_conversation_id"),
    branchPointMessageId: uuid("branch_point_message_id"),
    title: varchar("title", { length: 500 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    temperature: real("temperature").default(0.7),
    maxTokens: integer("max_tokens").default(4000),
    isShared: boolean("is_shared").default(false).notNull(),
    shareId: varchar("share_id", { length: 50 }).unique(),
    branchLevel: integer("branch_level").default(0).notNull(),
    totalMessages: integer("total_messages").default(0).notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("conversation_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("conversation_parent_idx").on(t.parentConversationId),
    index("conversation_branch_point_idx").on(t.branchPointMessageId),
    index("conversation_shared_idx").on(t.isShared),
    index("conversation_share_id_idx").on(t.shareId),
    index("conversation_last_message_idx").on(t.lastMessageAt.desc()),
  ]
);

export const messages = createTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    parentMessageId: uuid("parent_message_id"),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    tokenUsage: integer("token_usage"),
    sequenceNumber: integer("sequence_number").notNull(),
    isBranchPoint: boolean("is_branch_point").default(false).notNull(),
    branchCount: integer("branch_count").default(0).notNull(),
    isFromBranch: boolean("is_from_branch").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("message_conversation_sequence_idx").on(
      t.conversationId,
      t.sequenceNumber
    ),
    index("message_conversation_created_idx").on(t.conversationId, t.createdAt),
    index("message_branch_points_idx")
      .on(t.conversationId, t.isBranchPoint)
      .where(sql`${t.isBranchPoint} = true`),
    index("message_parent_idx").on(t.parentMessageId),
    index("message_role_idx").on(t.role),
  ]
);

export const conversationBranches = createTable(
  "conversation_branch",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentConversationId: uuid("parent_conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    childConversationId: uuid("child_conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    branchPointMessageId: uuid("branch_point_message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    branchTitle: varchar("branch_title", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("branch_parent_idx").on(t.parentConversationId),
    index("branch_child_idx").on(t.childConversationId),
    index("branch_point_idx").on(t.branchPointMessageId),
  ]
);

// ================================
// FILE ATTACHMENTS
// ================================

export const attachments = createTable(
  "attachment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    size: integer("size").notNull(),
    type: attachmentTypeEnum("type").notNull(),
    storageUrl: varchar("storage_url", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    extractedContent: text("extracted_content"),
    metadata: jsonb("metadata").default({}),
    isProcessed: boolean("is_processed").default(false).notNull(),
    processingError: text("processing_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("attachment_message_idx").on(t.messageId),
    index("attachment_user_idx").on(t.userId),
    index("attachment_type_idx").on(t.type),
    index("attachment_processed_idx").on(t.isProcessed),
    index("attachment_created_idx").on(t.createdAt),
  ]
);

// ================================
// STREAMING SYSTEM
// ================================

export const streamSessions = createTable(
  "stream_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: streamStatusEnum("status").default("active").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    modelConfig: jsonb("model_config").default({}),
    streamState: jsonb("stream_state").default({}),
    performance: jsonb("performance").default({}),
    reconnectionData: jsonb("reconnection_data").default({}),
    totalTokensGenerated: integer("total_tokens_generated").default(0),
    estimatedTimeRemaining: integer("estimated_time_remaining"),
    lastActivity: timestamp("last_activity", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("stream_conversation_idx").on(t.conversationId),
    index("stream_user_idx").on(t.userId),
    index("stream_status_idx").on(t.status),
    index("stream_activity_idx").on(t.lastActivity),
    index("stream_created_idx").on(t.createdAt),
  ]
);

export const messageQueue = createTable(
  "message_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: uuid("stream_id")
      .references(() => streamSessions.id, { onDelete: "cascade" })
      .notNull(),
    messageId: uuid("message_id").defaultRandom().notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    acknowledged: boolean("acknowledged").default(false).notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (t) => [
    index("queue_stream_sequence_idx").on(t.streamId, t.sequenceNumber),
    index("queue_stream_ack_idx").on(t.streamId, t.acknowledged),
    index("queue_created_idx").on(t.createdAt),
  ]
);

// ================================
// ANALYTICS & PERFORMANCE
// ================================

export const modelPerformance = createTable(
  "model_performance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    provider: providerEnum("provider").notNull(),
    averageLatency: real("average_latency").notNull(),
    successRate: real("success_rate").notNull(),
    tokensPerSecond: real("tokens_per_second").notNull(),
    costPerToken: real("cost_per_token"),
    totalRequests: integer("total_requests").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("perf_user_model_idx").on(t.userId, t.model),
    index("perf_model_provider_idx").on(t.model, t.provider),
    index("perf_updated_idx").on(t.lastUpdated),
  ]
);

// ================================
// RELATIONS
// ================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  accounts: many(accounts),
  apiKeys: many(apiKeys),
  conversations: many(conversations),
  attachments: many(attachments),
  streamSessions: many(streamSessions),
  modelPerformance: many(modelPerformance),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    parentConversation: one(conversations, {
      fields: [conversations.parentConversationId],
      references: [conversations.id],
      relationName: "ConversationBranches",
    }),
    childConversations: many(conversations, {
      relationName: "ConversationBranches",
    }),
    messages: many(messages),
    streamSessions: many(streamSessions),
    parentBranches: many(conversationBranches, {
      relationName: "ParentBranches",
    }),
    childBranches: many(conversationBranches, {
      relationName: "ChildBranches",
    }),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
    relationName: "MessageReplies",
  }),
  replies: many(messages, {
    relationName: "MessageReplies",
  }),
  attachments: many(attachments),
}));

export const conversationBranchesRelations = relations(
  conversationBranches,
  ({ one }) => ({
    parentConversation: one(conversations, {
      fields: [conversationBranches.parentConversationId],
      references: [conversations.id],
      relationName: "ParentBranches",
    }),
    childConversation: one(conversations, {
      fields: [conversationBranches.childConversationId],
      references: [conversations.id],
      relationName: "ChildBranches",
    }),
    branchPointMessage: one(messages, {
      fields: [conversationBranches.branchPointMessageId],
      references: [messages.id],
    }),
  })
);

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
}));

export const streamSessionsRelations = relations(
  streamSessions,
  ({ one, many }) => ({
    conversation: one(conversations, {
      fields: [streamSessions.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [streamSessions.userId],
      references: [users.id],
    }),
    messageQueue: many(messageQueue),
  })
);

export const messageQueueRelations = relations(messageQueue, ({ one }) => ({
  streamSession: one(streamSessions, {
    fields: [messageQueue.streamId],
    references: [streamSessions.id],
  }),
}));

export const modelPerformanceRelations = relations(
  modelPerformance,
  ({ one }) => ({
    user: one(users, {
      fields: [modelPerformance.userId],
      references: [users.id],
    }),
  })
);

// ================================
// TYPES
// ================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type ConversationBranch = typeof conversationBranches.$inferSelect;
export type NewConversationBranch = typeof conversationBranches.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type StreamSession = typeof streamSessions.$inferSelect;
export type NewStreamSession = typeof streamSessions.$inferInsert;

export type MessageQueue = typeof messageQueue.$inferSelect;
export type NewMessageQueue = typeof messageQueue.$inferInsert;

export type ModelPerformance = typeof modelPerformance.$inferSelect;
export type NewModelPerformance = typeof modelPerformance.$inferInsert;
