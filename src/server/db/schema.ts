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
import { Message as AiMessage } from "ai";

/**
 * Multi-project schema support
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `t3chat_${name}`);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "data",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "pending",
  "streaming",
  "complete",
  "error",
]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "image",
  "pdf",
  "document",
  "audio",
  "video",
  "text",
]);

export const branchStatusEnum = pgEnum("branch_status", [
  "active",
  "archived",
  "merged",
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
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: varchar("image", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("user_email_idx").on(t.email),
    index("user_created_idx").on(t.createdAt),
  ]
);

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
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: varchar("scope", { length: 500 }),
    idToken: text("id_token"),
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

export const sessions = createTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: varchar("token", { length: 255 }).unique().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("session_token_idx").on(t.token),
    index("session_user_idx").on(t.userId),
    index("session_expires_idx").on(t.expiresAt),
  ]
);

export const verification = createTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("verification_identifier_idx").on(t.identifier),
    index("verification_expires_idx").on(t.expiresAt),
  ]
);

// ================================
// CONVERSATIONS & MESSAGES
// ================================

export const conversations = createTable(
  "conversation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    parentConversationId: uuid("parent_conversation_id"),
    branchPointMessageId: uuid("branch_point_message_id"),
    branchLevel: integer("branch_level").default(0).notNull(),
    branchStatus: branchStatusEnum("branch_status").default("active").notNull(),
    isShared: boolean("is_shared").default(false).notNull(),
    shareId: varchar("share_id", { length: 50 }).unique(),
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
    index("conversation_branch_level_idx").on(t.branchLevel),
    index("conversation_shared_idx").on(t.isShared),
    index("conversation_share_id_idx").on(t.shareId),
    index("conversation_last_message_idx").on(t.lastMessageAt.desc()),
  ]
);

export const messages = createTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aiMessageId: varchar("ai_message_id", { length: 255 }).unique().notNull(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    parts: jsonb("parts"),
    annotations: jsonb("annotations"),
    attachments: jsonb("attachments"),
    metadata: jsonb("metadata").$type<{
      tokenUsage?: {
        prompt?: number;
        completion?: number;
        total?: number;
      };
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseTime?: number;
      reasoning?: boolean;
      timestamp?: string;
      userAgent?: string;
      ipAddress?: string;
    }>(),
    status: messageStatusEnum("status").default("complete").notNull(),
    tokenUsage: integer("token_usage"),
    sequenceNumber: integer("sequence_number").notNull(),
    parentMessageId: uuid("parent_message_id"),
    branchLevel: integer("branch_level").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("message_ai_id_idx").on(t.aiMessageId),
    index("message_conversation_sequence_idx").on(
      t.conversationId,
      t.sequenceNumber
    ),
    index("message_conversation_created_idx").on(t.conversationId, t.createdAt),
    index("message_role_idx").on(t.role),
    index("message_status_idx").on(t.status),
    index("message_parent_idx").on(t.parentMessageId),
    index("message_branch_level_idx").on(t.branchLevel),
  ]
);

// ================================
// ATTACHMENTS
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
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    attachmentType: attachmentTypeEnum("attachment_type").notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    storageUrl: varchar("storage_url", { length: 1000 }),
    isProcessed: boolean("is_processed").default(false).notNull(),
    processingError: text("processing_error"),
    metadata: jsonb("metadata").default({}),
    aiAttachmentId: varchar("ai_attachment_id", { length: 255 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("attachment_message_idx").on(t.messageId),
    index("attachment_user_idx").on(t.userId),
    index("attachment_type_idx").on(t.attachmentType),
    index("attachment_storage_key_idx").on(t.storageKey),
    index("attachment_ai_id_idx").on(t.aiAttachmentId),
    index("attachment_created_idx").on(t.createdAt.desc()),
  ]
);

// ================================
// CONVERSATION BRANCHES
// ================================

export const conversationBranches = createTable(
  "conversation_branch",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentConversationId: uuid("parent_conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    branchConversationId: uuid("branch_conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    branchPointMessageId: uuid("branch_point_message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    branchName: varchar("branch_name", { length: 255 }),
    branchDescription: text("branch_description"),
    branchStatus: branchStatusEnum("branch_status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => [
    index("branch_parent_idx").on(t.parentConversationId),
    index("branch_conversation_idx").on(t.branchConversationId),
    index("branch_point_message_idx").on(t.branchPointMessageId),
    index("branch_user_idx").on(t.userId),
    index("branch_status_idx").on(t.branchStatus),
    index("branch_created_idx").on(t.createdAt.desc()),
  ]
);

// ================================
// STREAM ID TRACKING (minimal table for Redis stream IDs)
// ================================

export const streamIds = createTable(
  "stream_id",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: varchar("stream_id", { length: 255 }).unique().notNull(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("stream_id_idx").on(t.streamId),
    index("stream_conversation_idx").on(t.conversationId),
  ]
);

// ================================
// RELATIONS
// ================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  conversations: many(conversations),
  streamIds: many(streamIds),
  attachments: many(attachments),
  conversationBranches: many(conversationBranches),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
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
    messages: many(messages),
    streamIds: many(streamIds),
    attachments: many(attachments, {
      relationName: "conversationAttachments",
    }),
    parentConversation: one(conversations, {
      fields: [conversations.parentConversationId],
      references: [conversations.id],
      relationName: "conversationBranches",
    }),
    childConversations: many(conversations, {
      relationName: "conversationBranches",
    }),
    parentBranches: many(conversationBranches, {
      relationName: "parentBranches",
    }),
    childBranches: many(conversationBranches, {
      relationName: "childBranches",
    }),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  attachments: many(attachments),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
    relationName: "messageBranches",
  }),
  childMessages: many(messages, {
    relationName: "messageBranches",
  }),
  branchPoints: many(conversationBranches),
}));

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

export const conversationBranchesRelations = relations(
  conversationBranches,
  ({ one }) => ({
    parentConversation: one(conversations, {
      fields: [conversationBranches.parentConversationId],
      references: [conversations.id],
      relationName: "parentBranches",
    }),
    branchConversation: one(conversations, {
      fields: [conversationBranches.branchConversationId],
      references: [conversations.id],
      relationName: "childBranches",
    }),
    branchPointMessage: one(messages, {
      fields: [conversationBranches.branchPointMessageId],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [conversationBranches.userId],
      references: [users.id],
    }),
  })
);

export const streamIdsRelations = relations(streamIds, ({ one }) => ({
  conversation: one(conversations, {
    fields: [streamIds.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [streamIds.userId],
    references: [users.id],
  }),
}));

// ================================
// TYPES
// ================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type ConversationBranch = typeof conversationBranches.$inferSelect;
export type NewConversationBranch = typeof conversationBranches.$inferInsert;

export type StreamId = typeof streamIds.$inferSelect;
export type NewStreamId = typeof streamIds.$inferInsert;
