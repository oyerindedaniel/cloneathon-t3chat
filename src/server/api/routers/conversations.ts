import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  generateSystemMessage,
  detectConversationContext,
} from "@/lib/ai/system-message";
import {
  conversations,
  messages,
  conversationShares,
  type Message,
} from "@/server/db/schema";
import { eq, desc, asc, inArray, ilike, lt, and } from "drizzle-orm";
import { CONVERSATION_QUERY_LIMIT } from "@/constants/conversations";
import { v4 as uuidv4 } from "uuid";

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
  aiMessageId: z.string().min(1, "AI Message ID is required"),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  sequenceNumber: z.number().int(),
  metadata: z
    .object({
      tokenUsage: z
        .object({
          prompt: z.number().optional(),
          completion: z.number().optional(),
          total: z.number().optional(),
        })
        .optional(),
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      responseTime: z.number().optional(),
      reasoning: z.boolean().optional(),
      timestamp: z.string().optional(),
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
});

const getUserLocationSchema = z.object({
  timezone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export const conversationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(CONVERSATION_QUERY_LIMIT),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const conversationsWithMessages =
        await ctx.db.query.conversations.findMany({
          where: (conversation, { and, lt }) => {
            const conditions = [eq(conversation.userId, ctx.session.user.id)];
            if (cursor) {
              conditions.push(lt(conversation.updatedAt, new Date(cursor)));
            }
            return and(...conditions);
          },
          with: {
            messages: {
              orderBy: desc(messages.createdAt),
              limit: 1,
            },
          },
          orderBy: desc(conversations.updatedAt),
          limit: limit + 1,
        });

      let nextCursor: typeof cursor | undefined = undefined;
      if (conversationsWithMessages.length > limit) {
        const lastConversation = conversationsWithMessages.pop();
        if (lastConversation?.updatedAt) {
          nextCursor = lastConversation.updatedAt.toISOString();
        }
      }

      return {
        conversations: conversationsWithMessages.map(
          ({ messages, ...conv }) => ({
            ...conv,
            lastMessage: (messages[0] || null) as Message | null,
          })
        ),
        nextCursor,
      };
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

  share: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id: conversationId } = input;

      const conversation = await ctx.db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          messages: {
            orderBy: desc(messages.createdAt),
            limit: 1,
          },
        },
      });

      if (!conversation || conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found or unauthorized",
        });
      }

      const currentLastMessageAt =
        conversation.lastMessageAt || conversation.createdAt;

      const existingShare = await ctx.db.query.conversationShares.findFirst({
        where: and(
          eq(conversationShares.conversationId, conversationId),
          eq(conversationShares.sharedAt, currentLastMessageAt)
        ),
      });

      if (existingShare) {
        return existingShare;
      }

      const newShareId = uuidv4();

      const [newConversationShare] = await ctx.db
        .insert(conversationShares)
        .values({
          conversationId,
          shareId: newShareId,
          sharedAt: currentLastMessageAt,
        })
        .returning();

      if (!newConversationShare) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create new share link",
        });
      }

      return newConversationShare;
    }),

  forkShared: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { shareId } = input;

      const conversationShare = await ctx.db.query.conversationShares.findFirst(
        {
          where: eq(conversationShares.shareId, shareId),
        }
      );

      if (!conversationShare) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared conversation link not found",
        });
      }

      const originalConversation = await ctx.db.query.conversations.findFirst({
        where: eq(conversations.id, conversationShare.conversationId),
      });

      if (!originalConversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Original conversation not found for this share",
        });
      }

      const messagesToCopy = await ctx.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, originalConversation.id),
            lt(messages.createdAt, conversationShare.sharedAt!)
          )
        )
        .orderBy(asc(messages.sequenceNumber));

      // Create a new conversation for the current user
      const newConversationId = uuidv4();
      const newConversation = await ctx.db
        .insert(conversations)
        .values({
          id: newConversationId,
          userId: ctx.session.user.id,
          title: `Forked: ${originalConversation.title}`,
          model: originalConversation.model,
          parentConversationId: null,
          branchPointMessageId: null,
          branchLevel: 0,
          totalMessages: messagesToCopy.length,
          lastMessageAt:
            messagesToCopy.length > 0
              ? messagesToCopy[messagesToCopy.length - 1]?.createdAt
              : new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!newConversation[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create new conversation",
        });
      }

      if (messagesToCopy.length > 0) {
        const newMessages = messagesToCopy.map((msg) => ({
          ...msg,
          id: uuidv4(),
          conversationId: newConversation[0].id,
          aiMessageId: uuidv4(),
          parentMessageId: null,
          createdAt: new Date(),
        }));
        await ctx.db.insert(messages).values(newMessages);
      }

      return newConversation[0];
    }),

  getSharedById: publicProcedure
    .input(z.object({ shareId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const conversationShare =
          await ctx.db.query.conversationShares.findFirst({
            where: eq(conversationShares.shareId, input.shareId),
          });

        if (!conversationShare) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared conversation not found",
          });
        }

        const conversation = await ctx.db.query.conversations.findFirst({
          where: eq(conversations.id, conversationShare.conversationId),
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation linked to share not found",
          });
        }

        const conversationMessages = await ctx.db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversation.id),
              lt(messages.createdAt, conversationShare.sharedAt!)
            )
          )
          .orderBy(asc(messages.sequenceNumber));

        return {
          ...conversation,
          messages: conversationMessages,
          shareId: conversationShare.shareId,
          sharedAt: conversationShare.sharedAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared conversation not found",
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

      const result = await ctx.db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, id))
        .returning();

      return result[0]!;
    }),

  updateTitle: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, title } = input;

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

      const result = await ctx.db
        .update(conversations)
        .set({
          title,
          updatedAt: new Date(),
        })
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
      const {
        conversationId,
        aiMessageId,
        role,
        content,
        sequenceNumber,
        metadata,
      } = input;

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
          aiMessageId,
          conversationId,
          role,
          content,
          sequenceNumber,
          metadata,
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
            recentMessages.map((msg) => ({
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

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(100).default(CONVERSATION_QUERY_LIMIT),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit, cursor } = input;

      const searchedConversations = await ctx.db.query.conversations.findMany({
        where: (conversation, { and, lt }) => {
          const conditions = [
            eq(conversation.userId, ctx.session.user.id),
            ilike(conversation.title, `%${query}%`),
          ];
          if (cursor) {
            conditions.push(lt(conversation.updatedAt, new Date(cursor)));
          }
          return and(...conditions);
        },
        with: {
          messages: {
            orderBy: desc(messages.createdAt),
            limit: 1,
          },
        },
        orderBy: desc(conversations.updatedAt),
        limit: limit + 1,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (searchedConversations.length > limit) {
        const lastConversation = searchedConversations.pop();
        if (lastConversation?.updatedAt) {
          nextCursor = lastConversation.updatedAt.toISOString();
        }
      }

      return {
        conversations: searchedConversations.map(({ messages, ...conv }) => ({
          ...conv,
          lastMessage: (messages[0] || null) as Message | null,
        })),
        nextCursor,
      };
    }),
});
