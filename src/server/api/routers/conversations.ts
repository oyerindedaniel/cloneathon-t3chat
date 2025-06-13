import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  generateSystemMessage,
  detectConversationContext,
} from "@/lib/ai/system-message";
import { conversations, messages, type Message } from "@/server/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";

const createConversationSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  modelId: z.string(),
  settings: z
    .object({
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(1).max(4096).default(1000),
    })
    .optional(),
});

const updateConversationSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  modelId: z.string().optional(),
  settings: z
    .object({
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().min(1).max(4096),
    })
    .optional(),
});

const addMessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  sequenceNumber: z.number().int(),
  metadata: z
    .object({
      timestamp: z.date().default(() => new Date()),
      model: z.string().optional(),
      tokens: z
        .object({
          prompt: z.number().optional(),
          completion: z.number().optional(),
          total: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const getUserLocationSchema = z.object({
  timezone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export const conversationsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const conversationList = await ctx.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, ctx.session.user.id))
      .orderBy(desc(conversations.updatedAt));

    const conversationsWithMessages = await Promise.all(
      conversationList.map(async (conversation) => {
        const latestMessage = await ctx.db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          ...conversation,
          lastMessage: latestMessage[0] || null,
        };
      })
    );

    return conversationsWithMessages;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const conversation = await ctx.db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.id))
          .limit(1);

        if (
          !conversation ||
          !conversation[0] ||
          conversation[0].userId !== ctx.session.user.id
        ) {
          console.log("did get here");
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        const conversationMessages = await ctx.db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, input.id))
          .orderBy(asc(messages.sequenceNumber));

        return {
          ...conversation[0],
          messages: conversationMessages,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
    }),

  create: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, title, modelId, settings } = input;

      const result = await ctx.db
        .insert(conversations)
        .values({
          id,
          title,
          model: modelId,
          temperature: settings?.temperature ?? 0.7,
          maxTokens: settings?.maxTokens ?? 4000,
          userId: ctx.session.user.id,
        })
        .returning();

      return result[0]!;
    }),

  update: protectedProcedure
    .input(updateConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, title, modelId, settings } = input;

      const existingConversation = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (
        !existingConversation[0] ||
        existingConversation[0].userId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const updateData: Partial<typeof conversations.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (title) updateData.title = title;
      if (modelId) updateData.model = modelId;
      if (settings) {
        updateData.temperature = settings.temperature;
        updateData.maxTokens = settings.maxTokens;
      }

      const result = await ctx.db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, id))
        .returning();

      return result[0]!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingConversation = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.id))
        .limit(1);

      if (
        !existingConversation[0] ||
        existingConversation[0].userId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await ctx.db
        .delete(messages)
        .where(eq(messages.conversationId, input.id));

      await ctx.db.delete(conversations).where(eq(conversations.id, input.id));

      return { success: true };
    }),

  addMessage: protectedProcedure
    .input(addMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { conversationId, role, content, sequenceNumber, metadata } = input;

      const conversation = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (
        !conversation ||
        !conversation[0] ||
        conversation[0].userId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const result = await ctx.db
        .insert(messages)
        .values({
          conversationId,
          role,
          content,
          sequenceNumber,
          metadata: metadata ? JSON.stringify(metadata) : {},
        })
        .returning();

      await ctx.db
        .update(conversations)
        .set({
          updatedAt: new Date(),
          lastMessageAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      return result[0]!;
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { conversationId, limit, offset } = input;

      const conversation = await ctx.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation[0] || conversation[0].userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const conversationMessages = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.sequenceNumber))
        .limit(limit)
        .offset(offset);

      return {
        messages: conversationMessages,
        hasMore: conversationMessages.length === limit,
      };
    }),

  generateSystemMessage: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        conversationId: z.string().optional(),
        userLocation: getUserLocationSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { modelId, conversationId, userLocation } = input;

      let conversationContext;

      if (conversationId) {
        const conversation = await ctx.db
          .select()
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);

        if (conversation[0] && conversation[0].userId === ctx.session.user.id) {
          const recentMessages = await ctx.db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conversationId))
            .orderBy(desc(messages.createdAt))
            .limit(10);

          conversationContext = detectConversationContext(
            recentMessages.map((msg: Message) => ({
              content: msg.content,
              role: msg.role,
            }))
          );
        }
      }

      const systemMessage = generateSystemMessage({
        modelId,
        userTimezone: userLocation?.timezone,
        userLocation: userLocation?.city
          ? `${userLocation.city}, ${userLocation.country}`
          : userLocation?.country,
        conversationContext,
      });

      return { systemMessage };
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ids } = input;

      const userConversations = await ctx.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(inArray(conversations.id, ids));

      const ownedIds = userConversations
        .filter((conv) => conv)
        .map((conv) => conv.id);

      if (ownedIds.length !== ids.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Some conversations don't belong to you",
        });
      }

      await ctx.db
        .delete(messages)
        .where(inArray(messages.conversationId, ownedIds));

      const result = await ctx.db
        .delete(conversations)
        .where(inArray(conversations.id, ownedIds));

      return { deletedCount: ownedIds.length };
    }),
});
