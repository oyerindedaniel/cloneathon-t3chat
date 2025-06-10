# T3 Chat Cloneathon - World-Class AI Chat Experience

A high-performance, feature-rich AI chat application built with modern web technologies, focusing on exceptional user experience, reliability, and scalability.

## 🎯 Project Vision

T3 Chat Cloneathon aims to deliver a **world-class chat UX** with **100% focus on performance**. We're building a chat application that doesn't just work—it excels in every aspect of user interaction, from instant responses to seamless cross-device continuity.

### Core Philosophy

- **Performance First**: Every architectural decision prioritizes speed and responsiveness
- **Reliability**: Robust streaming with bulletproof resumability
- **User Experience**: Intuitive, beautiful, and lightning-fast interactions
- **Scalability**: Built to handle massive concurrent users and conversations

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend**: Next.js 14+ with Static Shell Architecture
- **Backend**: tRPC with Next.js API Routes
- **Database**: Neon PostgreSQL with connection pooling
- **AI Provider**: OpenRouter with Vercel AI SDK
- **Streaming**: Server-Sent Events (SSE) + selective WebSockets
- **Authentication**: Better Auth with GitHub and Google providers
- **File Storage**: Vercel Blob or AWS S3
- **Deployment**: Vercel with edge functions

### Static Shell Architecture

We implement a **static shell approach** to achieve blazing-fast navigation:

```typescript
// app/page.tsx - Dynamic import with SSR disabled
const ChatApp = dynamic(() => import("../components/chat-app"), {
  ssr: false,
});
```

**Benefits:**

- Instant navigation between routes
- No page-specific JavaScript bundle loading
- Pure SPA experience after initial load
- Static HTML shell for SEO when needed

**Implementation Strategy:**

1. Static HTML shell prerendered at build time
2. Client-side React Router takes over after hydration
3. Catch-all rewrite in `next.config.js` for deep linking
4. API routes remain unaffected for backend functionality

## 🚀 Core Features Implementation

### 1. Multi-LLM Chat with OpenRouter

**Architecture Decision:**

- OpenRouter as the primary provider for access to 100+ models
- Vercel AI SDK for standardized streaming interface
- Model switching without conversation interruption

**Implementation Strategy:**

- **Model Registry**: Dynamic model discovery from OpenRouter API
- **Context Preservation**: Seamless model switching within conversations
- **Cost Optimization**: Token counting and cost prediction per model
- **Fallback Strategy**: Automatic model switching on rate limits/errors

**Technical Flow:**

1. User selects model from dynamic dropdown
2. Request routed through tRPC to Next.js API route
3. API route interfaces with OpenRouter using Vercel AI SDK
4. Streaming response via SSE to client
5. Context and history maintained in PostgreSQL

### 2. Authentication & Synchronization

**Better Auth Implementation:**

- **GitHub & Google OAuth**: Streamlined provider setup with Better Auth's modern approach
- **Session Management**: Server-side session storage with Redis clustering
- **Token Strategy**: HTTP-only cookies with CSRF protection and automatic refresh
- **Multi-device Support**: Session sharing across authenticated devices without client storage

**Sync Strategy - Server-Centric Approach:**

- **Real-time sync**: Direct database synchronization via tRPC subscriptions
- **Server-side state**: All conversation state maintained in PostgreSQL/Redis
- **Conflict resolution**: Server-timestamp-based resolution with merge strategies
- **Cross-device continuity**: Seamless session restoration via user authentication tokens

**Database Schema:**

```sql
-- Enhanced user and session management
users (id, email, name, avatar_url, github_id, google_id, preferences, created_at)
user_sessions (id, user_id, session_token, expires_at, device_info, last_active)
device_registrations (user_id, device_fingerprint, last_seen, is_active)
```

**Authentication Flow:**

1. User initiates OAuth with GitHub/Google via Better Auth
2. Server validates OAuth response and creates user session
3. Session token stored as HTTP-only cookie with Redis backing
4. Device fingerprint registered for cross-device continuity
5. tRPC context populated with authenticated user data
6. Real-time subscriptions established for user-specific data

### 3. Attachment Support (Images & PDFs)

**File Processing Pipeline:**

- **Images**: OpenAI Vision API for image analysis
- **PDFs**: OCR extraction using OpenAI Document Intelligence
- **Storage**: Vercel Blob with CDN distribution
- **Security**: Signed URLs with expiration

**Implementation Flow:**

1. Client uploads file to secure endpoint
2. File validation and virus scanning
3. Storage in Blob with metadata extraction
4. Background processing for content extraction
5. Indexed content stored in PostgreSQL with full-text search

**Supported Formats:**

- Images: JPEG, PNG, WebP, GIF (up to 10MB)
- Documents: PDF (up to 50MB)
- Future: Word documents, spreadsheets

### 4. AI Image Generation

**Provider Strategy:**

- Primary: OpenAI DALL-E 3 for highest quality
- Fallback: Stability AI for speed and cost efficiency
- Budget option: OpenRouter image models

**Generation Pipeline:**

1. Prompt optimization and safety filtering
2. Request routing based on user preferences
3. Async generation with progress tracking
4. Image optimization and CDN storage
5. Gallery integration with conversation context

### 5. Syntax Highlighting

**Approach:**

- **Library**: Shiki with VS Code themes
- **Languages**: 200+ programming languages
- **Performance**: Web Workers for large code blocks
- **Features**: Line numbers, copy functionality, theme switching

**Advanced Features:**

- Code execution for safe languages (JavaScript, Python sandbox)
- Diff highlighting for code comparisons
- Inline code suggestions and corrections

## 🌊 Advanced Chat Architecture: Deep Dive

### Server-Centric Streaming Architecture (RECOMMENDED)

**Core Philosophy:** The server is the single source of truth for all chat state, enabling true device-agnostic resumability.

**Architecture Components:**

#### 1. Stream Session Management

```typescript
// Redis Stream Session Schema
interface StreamSession {
  id: string; // UUID for stream identification
  conversationId: string; // Associated conversation
  userId: string; // Stream owner
  status: "active" | "paused" | "completed";
  createdAt: number; // Unix timestamp
  lastActivity: number; // Last message timestamp
  activeConnections: string[]; // Connected client IDs
  bufferSize: number; // Current buffer size
  totalMessages: number; // Total messages in stream
  metadata: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}
```

#### 2. Message Buffer System

```typescript
// Redis Message Buffer Structure
interface MessageBuffer {
  streamId: string;
  messages: Array<{
    id: string;
    content: string;
    timestamp: number;
    acknowledged: boolean;
    clientId?: string; // Which client acknowledged
    retryCount: number;
    metadata: {
      tokens: number;
      latency: number;
    };
  }>;
  checkpoints: number[]; // Message IDs for resume points
  lastAcknowledged: string; // Last confirmed message ID
}
```

#### 3. Connection State Management

```typescript
// Client Connection Tracking
interface ClientConnection {
  id: string; // Unique client identifier
  userId: string;
  streamId: string;
  deviceInfo: {
    userAgent: string;
    fingerprint: string;
    type: "desktop" | "mobile" | "tablet";
  };
  connectionState: {
    connected: boolean;
    lastSeen: number;
    heartbeatInterval: number;
    reconnectAttempts: number;
  };
  acknowledgmentState: {
    lastAckedMessage: string;
    pendingAcks: string[];
    ackTimeouts: Map<string, number>;
  };
}
```

### Stream Lifecycle Management

#### Phase 1: Stream Initialization

```typescript
// Server-side stream creation
async function createStreamSession(
  conversationId: string,
  userId: string,
  config: StreamConfig
) {
  const streamId = generateUUID();

  // Create stream session in Redis
  await redis.hset(`stream:${streamId}`, {
    id: streamId,
    conversationId,
    userId,
    status: "active",
    createdAt: Date.now(),
    lastActivity: Date.now(),
    activeConnections: JSON.stringify([]),
    bufferSize: 0,
    totalMessages: 0,
    metadata: JSON.stringify(config),
  });

  // Set TTL for automatic cleanup
  await redis.expire(`stream:${streamId}`, 3600); // 1 hour

  // Initialize message buffer
  await redis.lpush(
    `buffer:${streamId}`,
    JSON.stringify({
      streamId,
      messages: [],
      checkpoints: [],
      lastAcknowledged: null,
    })
  );

  return streamId;
}
```

#### Phase 2: Message Streaming & Buffering

```typescript
// Server-side message streaming with buffering
async function streamMessage(
  streamId: string,
  content: string,
  metadata: MessageMetadata
) {
  const messageId = generateUUID();
  const timestamp = Date.now();

  // Create message object
  const message = {
    id: messageId,
    content,
    timestamp,
    acknowledged: false,
    retryCount: 0,
    metadata,
  };

  // Add to Redis buffer
  await redis.lpush(`buffer:${streamId}:messages`, JSON.stringify(message));

  // Update stream statistics
  await redis.hincrby(`stream:${streamId}`, "bufferSize", 1);
  await redis.hincrby(`stream:${streamId}`, "totalMessages", 1);
  await redis.hset(`stream:${streamId}`, "lastActivity", timestamp);

  // Send to all connected clients via SSE
  const activeConnections = await getActiveConnections(streamId);
  for (const connection of activeConnections) {
    await sendSSEMessage(connection.id, {
      type: "message",
      streamId,
      messageId,
      content,
      timestamp,
      metadata,
    });
  }

  // Set acknowledgment timeout
  setTimeout(() => checkMessageAcknowledgment(streamId, messageId), 5000);
}
```

#### Phase 3: Client Connection & Resume

```typescript
// Client connection with automatic resume
async function connectToStream(
  streamId: string,
  clientId: string,
  lastAckedMessage?: string
) {
  // Register client connection
  await redis.hset(`connection:${clientId}`, {
    streamId,
    connected: true,
    lastSeen: Date.now(),
    lastAckedMessage: lastAckedMessage || "",
  });

  // Add to active connections
  await redis.sadd(`stream:${streamId}:connections`, clientId);

  // Get unacknowledged messages for resume
  const unackedMessages = await getUnacknowledgedMessages(
    streamId,
    lastAckedMessage
  );

  // Send missed messages to client
  for (const message of unackedMessages) {
    await sendSSEMessage(clientId, {
      type: "resume",
      streamId,
      messageId: message.id,
      content: message.content,
      timestamp: message.timestamp,
      isResume: true,
    });
  }

  // Update stream activity
  await redis.hset(`stream:${streamId}`, "lastActivity", Date.now());
}
```

### Advanced Resumability Features

#### Cross-Device Stream Continuity

```typescript
// Device switching without interruption
async function switchDevice(
  userId: string,
  streamId: string,
  newClientId: string,
  oldClientId?: string
) {
  // Get current stream state
  const streamState = await redis.hgetall(`stream:${streamId}`);

  if (streamState.userId !== userId) {
    throw new Error("Unauthorized stream access");
  }

  // Gracefully disconnect old device
  if (oldClientId) {
    await sendSSEMessage(oldClientId, {
      type: "device_switch",
      message: "Conversation continued on another device",
    });
    await redis.srem(`stream:${streamId}:connections`, oldClientId);
  }

  // Connect new device
  await connectToStream(streamId, newClientId);

  // Update device priority
  await redis.hset(`stream:${streamId}`, "primaryDevice", newClientId);
}
```

#### Network Failure Recovery

```typescript
// Automatic recovery with exponential backoff
class StreamRecoveryManager {
  private reconnectAttempts = 0;
  private maxAttempts = 10;
  private baseDelay = 1000;

  async handleDisconnection(streamId: string, clientId: string) {
    // Mark connection as unstable
    await redis.hset(`connection:${clientId}`, "connected", false);

    // Keep stream alive for reconnection window
    await redis.expire(`stream:${streamId}`, 300); // 5 minutes

    // Attempt reconnection with exponential backoff
    this.attemptReconnection(streamId, clientId);
  }

  private async attemptReconnection(streamId: string, clientId: string) {
    if (this.reconnectAttempts >= this.maxAttempts) {
      // Move to permanent storage and cleanup
      await this.finalizeStream(streamId);
      return;
    }

    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);

    setTimeout(async () => {
      try {
        await this.testConnection(streamId, clientId);
        await connectToStream(streamId, clientId);
        this.reconnectAttempts = 0; // Reset on success
      } catch (error) {
        this.reconnectAttempts++;
        this.attemptReconnection(streamId, clientId);
      }
    }, delay);
  }
}
```

## 💬 Advanced Chat Branching Architecture

### Conversation Snapshots with Branch Points (RECOMMENDED)

**Core Concept:** Each conversation branch is a complete, independent conversation that shares context up to a specific branching point.

#### Database Schema for Branching

```sql
-- Enhanced conversation structure
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  parent_conversation_id UUID REFERENCES conversations(id),
  branch_point_message_id UUID,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_shared BOOLEAN DEFAULT FALSE,
  branch_level INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- Indexing for performance
  INDEX idx_conversations_user_created (user_id, created_at DESC),
  INDEX idx_conversations_parent (parent_conversation_id),
  INDEX idx_conversations_branch_point (branch_point_message_id)
);

-- Message structure with branch tracking
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  parent_message_id UUID REFERENCES messages(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number INTEGER NOT NULL,
  is_branch_point BOOLEAN DEFAULT FALSE,
  branch_count INTEGER DEFAULT 0,

  -- Ensure message ordering
  UNIQUE(conversation_id, sequence_number),
  INDEX idx_messages_conversation_sequence (conversation_id, sequence_number),
  INDEX idx_messages_branch_points (conversation_id, is_branch_point) WHERE is_branch_point = TRUE
);

-- Branch relationships tracking
CREATE TABLE conversation_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_conversation_id UUID NOT NULL REFERENCES conversations(id),
  child_conversation_id UUID NOT NULL REFERENCES conversations(id),
  branch_point_message_id UUID NOT NULL REFERENCES messages(id),
  branch_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(parent_conversation_id, child_conversation_id)
);
```

#### Branching Implementation

##### 1. Creating a Branch

```typescript
// Server-side branch creation
async function createBranch(
  parentConversationId: string,
  branchPointMessageId: string,
  userId: string,
  newMessage: string
): Promise<BranchResult> {
  // Start database transaction
  return await db.transaction(async (tx) => {
    // Verify ownership and get parent conversation
    const parentConversation = await tx.query.conversations.findFirst({
      where: and(
        eq(conversations.id, parentConversationId),
        eq(conversations.userId, userId)
      ),
    });

    if (!parentConversation) {
      throw new Error("Parent conversation not found or unauthorized");
    }

    // Get messages up to branch point
    const branchPointMessage = await tx.query.messages.findFirst({
      where: and(
        eq(messages.id, branchPointMessageId),
        eq(messages.conversationId, parentConversationId)
      ),
    });

    if (!branchPointMessage) {
      throw new Error("Branch point message not found");
    }

    // Get all messages up to and including branch point
    const contextMessages = await tx.query.messages.findMany({
      where: and(
        eq(messages.conversationId, parentConversationId),
        lte(messages.sequenceNumber, branchPointMessage.sequenceNumber)
      ),
      orderBy: [asc(messages.sequenceNumber)],
    });

    // Create new conversation
    const newConversation = await tx
      .insert(conversations)
      .values({
        userId,
        parentConversationId,
        branchPointMessageId,
        title: await generateBranchTitle(contextMessages, newMessage),
        model: parentConversation.model,
        branchLevel: parentConversation.branchLevel + 1,
        totalMessages: contextMessages.length + 1,
      })
      .returning();

    // Copy context messages to new conversation
    for (let i = 0; i < contextMessages.length; i++) {
      const originalMessage = contextMessages[i];
      await tx.insert(messages).values({
        conversationId: newConversation[0].id,
        role: originalMessage.role,
        content: originalMessage.content,
        metadata: originalMessage.metadata,
        sequenceNumber: i + 1,
        isFromBranch: true,
      });
    }

    // Add the new message that triggered the branch
    const newMessageRecord = await tx
      .insert(messages)
      .values({
        conversationId: newConversation[0].id,
        role: "user",
        content: newMessage,
        sequenceNumber: contextMessages.length + 1,
      })
      .returning();

    // Mark branch point in parent conversation
    await tx
      .update(messages)
      .set({
        isBranchPoint: true,
        branchCount: sql`${messages.branchCount} + 1`,
      })
      .where(eq(messages.id, branchPointMessageId));

    // Create branch relationship
    await tx.insert(conversationBranches).values({
      parentConversationId,
      childConversationId: newConversation[0].id,
      branchPointMessageId,
      branchTitle: newConversation[0].title,
    });

    return {
      conversationId: newConversation[0].id,
      branchTitle: newConversation[0].title,
      newMessageId: newMessageRecord[0].id,
      contextMessages: contextMessages.length,
    };
  });
}
```

##### 2. Branch Navigation & Visualization

```typescript
// Get conversation with branch information
async function getConversationWithBranches(
  conversationId: string,
  userId: string
) {
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, userId)
    ),
    with: {
      messages: {
        orderBy: [asc(messages.sequenceNumber)],
        with: {
          branches: {
            with: {
              childConversation: {
                columns: {
                  id: true,
                  title: true,
                  totalMessages: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      },
      parentBranch: {
        with: {
          parentConversation: {
            columns: {
              id: true,
              title: true,
              branchLevel: true,
            },
          },
        },
      },
    },
  });

  return {
    conversation,
    breadcrumbs: await getBranchBreadcrumbs(conversationId),
    branchTree: await getBranchTree(conversationId),
  };
}

// Generate branch breadcrumbs for navigation
async function getBranchBreadcrumbs(
  conversationId: string
): Promise<BreadcrumbItem[]> {
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentId = conversationId;

  while (currentId) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, currentId),
      columns: {
        id: true,
        title: true,
        parentConversationId: true,
        branchLevel: true,
      },
    });

    if (!conversation) break;

    breadcrumbs.unshift({
      id: conversation.id,
      title: conversation.title,
      level: conversation.branchLevel,
    });

    currentId = conversation.parentConversationId;
  }

  return breadcrumbs;
}
```

##### 3. Branch Merging & Conflict Resolution

```typescript
// Advanced: Branch merging for collaborative features
async function mergeBranches(
  sourceBranchId: string,
  targetBranchId: string,
  mergeStrategy: "append" | "interleave" | "manual"
) {
  // Get both branches
  const sourceBranch = await getConversationWithMessages(sourceBranchId);
  const targetBranch = await getConversationWithMessages(targetBranchId);

  // Find common ancestor
  const commonAncestor = await findCommonAncestor(
    sourceBranchId,
    targetBranchId
  );

  // Apply merge strategy
  switch (mergeStrategy) {
    case "append":
      return await appendMerge(sourceBranch, targetBranch, commonAncestor);
    case "interleave":
      return await interleaveMerge(sourceBranch, targetBranch, commonAncestor);
    case "manual":
      return await createMergeConflictResolution(sourceBranch, targetBranch);
  }
}
```

## 🎯 Intelligent Title Generation System

### Multi-Strategy Title Generation

#### Strategy 1: Real-time WebSocket Title Generation (RECOMMENDED)

```typescript
// WebSocket-based immediate title generation
class TitleGenerationService {
  private ws: WebSocket;
  private pendingTitles = new Map<string, TitleRequest>();

  async generateTitle(
    conversationId: string,
    messages: Message[]
  ): Promise<string> {
    const titleRequest: TitleRequest = {
      id: generateUUID(),
      conversationId,
      messages: messages.slice(0, 3), // First 3 messages for context
      timestamp: Date.now(),
      priority: "high",
    };

    // Store pending request
    this.pendingTitles.set(titleRequest.id, titleRequest);

    // Send via WebSocket for immediate processing
    this.ws.send(
      JSON.stringify({
        type: "title_generation",
        data: titleRequest,
      })
    );

    // Return promise that resolves when title is generated
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingTitles.delete(titleRequest.id);
        reject(new Error("Title generation timeout"));
      }, 10000);

      titleRequest.resolve = (title: string) => {
        clearTimeout(timeout);
        this.pendingTitles.delete(titleRequest.id);
        resolve(title);
      };

      titleRequest.reject = (error: Error) => {
        clearTimeout(timeout);
        this.pendingTitles.delete(titleRequest.id);
        reject(error);
      };
    });
  }

  // Handle WebSocket responses
  private handleTitleResponse(response: TitleResponse) {
    const request = this.pendingTitles.get(response.requestId);
    if (request) {
      if (response.success) {
        request.resolve?.(response.title);
      } else {
        request.reject?.(new Error(response.error));
      }
    }
  }
}
```

#### Strategy 2: Background Title Generation with Caching

```typescript
// Background title generation system
class BackgroundTitleGenerator {
  private queue = new Queue<TitleJob>("title-generation");
  private cache = new Map<string, string>();

  async queueTitleGeneration(conversationId: string, messages: Message[]) {
    // Check cache first
    const cacheKey = this.generateCacheKey(messages);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Add to processing queue
    const job = await this.queue.add(
      "generate-title",
      {
        conversationId,
        messages: messages.slice(0, 5),
        cacheKey,
        priority: this.calculatePriority(messages),
      },
      {
        priority: 10,
        attempts: 3,
        backoff: "exponential",
      }
    );

    return job.id;
  }

  // Process title generation jobs
  async processTitleGeneration(job: Job<TitleJob>) {
    const { conversationId, messages, cacheKey } = job.data;

    try {
      // Generate title using OpenAI
      const title = await this.generateTitleWithOpenAI(messages);

      // Cache the result
      this.cache.set(cacheKey, title);

      // Update conversation in database
      await db
        .update(conversations)
        .set({
          title,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Notify connected clients via WebSocket
      await this.notifyTitleUpdate(conversationId, title);

      return { title, conversationId };
    } catch (error) {
      console.error("Title generation failed:", error);
      throw error;
    }
  }

  private async generateTitleWithOpenAI(messages: Message[]): Promise<string> {
    const context = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Generate a concise, descriptive title (max 50 characters) for this conversation. Focus on the main topic or question discussed.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    return (
      response.choices[0]?.message?.content?.trim() || "Untitled Conversation"
    );
  }
}
```

#### Strategy 3: Hybrid Approach with Fallbacks

```typescript
// Comprehensive title generation with multiple fallback strategies
class HybridTitleGenerator {
  private strategies: TitleStrategy[] = [
    new WebSocketTitleStrategy(),
    new BackgroundTitleStrategy(),
    new LocalTitleStrategy(),
    new FallbackTitleStrategy(),
  ];

  async generateTitle(
    conversationId: string,
    messages: Message[],
    priority: "immediate" | "normal" | "background" = "normal"
  ): Promise<string> {
    for (const strategy of this.strategies) {
      try {
        if (strategy.canHandle(priority, messages)) {
          const title = await strategy.generate(conversationId, messages);

          if (title && title.length > 0) {
            // Cache successful result
            await this.cacheTitle(conversationId, messages, title);
            return title;
          }
        }
      } catch (error) {
        console.warn(`Title strategy ${strategy.name} failed:`, error);
        // Continue to next strategy
      }
    }

    // Ultimate fallback
    return this.generateBasicTitle(messages);
  }

  private generateBasicTitle(messages: Message[]): string {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      const preview = firstUserMessage.content.slice(0, 30);
      return preview.length < firstUserMessage.content.length
        ? `${preview}...`
        : preview;
    }
    return `Conversation ${new Date().toLocaleDateString()}`;
  }
}
```

### Title Generation Optimization

#### Contextual Title Enhancement

```typescript
// Enhanced title generation with context awareness
class ContextualTitleGenerator {
  async generateContextualTitle(
    conversationId: string,
    messages: Message[],
    userPreferences: UserPreferences
  ): Promise<string> {
    // Analyze conversation context
    const context = await this.analyzeConversationContext(messages);

    // Build optimized prompt based on context
    const prompt = this.buildContextualPrompt(context, userPreferences);

    // Generate title with context-aware model
    const title = await this.generateWithContext(prompt, context);

    // Validate and refine title
    return await this.validateAndRefineTitle(title, context);
  }

  private async analyzeConversationContext(
    messages: Message[]
  ): Promise<ConversationContext> {
    const analysis = {
      topics: await this.extractTopics(messages),
      intent: await this.classifyIntent(messages),
      complexity: this.assessComplexity(messages),
      language: await this.detectLanguage(messages),
      codePresent: this.detectCodeBlocks(messages),
      questionType: this.classifyQuestionType(messages),
    };

    return analysis;
  }

  private buildContextualPrompt(
    context: ConversationContext,
    preferences: UserPreferences
  ): string {
    let prompt = `Generate a concise title for this conversation about ${context.topics.join(
      ", "
    )}.`;

    if (context.codePresent) {
      prompt += " Include relevant programming context.";
    }

    if (context.questionType === "troubleshooting") {
      prompt += " Focus on the problem being solved.";
    }

    if (preferences.titleStyle === "technical") {
      prompt += " Use technical terminology when appropriate.";
    }

    prompt += ` Keep it under ${preferences.maxTitleLength || 50} characters.`;

    return prompt;
  }
}
```

## 🔄 Communication Strategy: SSE vs WebSockets

### Server-Sent Events (SSE) - Primary Choice

**Use Cases:**

- Main chat streaming
- File upload progress
- Background sync notifications
- System status updates

**Advantages:**

- Automatic reconnection
- Better for one-way communication
- Simpler implementation
- Works through most proxies
- Built-in message ordering

### WebSockets - Selective Use

**Use Cases:**

- Chat title generation (immediate response needed)
- Typing indicators
- Real-time collaboration features
- Presence indicators

**Implementation Strategy:**

- WebSocket connection established for active chat sessions
- Heartbeat mechanism for connection health
- Graceful fallback to polling if WebSocket fails
- Connection pooling for resource efficiency

**Why This Hybrid Approach:**

- **Best of both worlds**: SSE reliability + WebSocket immediacy
- **Resource efficiency**: WebSockets only when needed
- **Reliability**: SSE as primary with WebSocket enhancement
- **Scalability**: Reduced WebSocket connection count

## 🔄 Resumable Streams: The Ultimate Solution

Our resumable streams architecture ensures **zero message loss** and **seamless device switching**:

### Key Components

1. **Stream Session Manager**

   - Unique stream IDs with Redis storage
   - TTL-based cleanup (5 minutes after disconnect)
   - Cross-instance coordination

2. **Message Buffer System**

   - Redis-based queue per stream
   - Message acknowledgment system
   - Batch persistence to PostgreSQL

3. **Client Reconnection Logic**

   - Exponential backoff reconnection
   - Stream ID preservation via user authentication
   - Automatic resume from server-tracked last message

4. **Device Switching Support**
   - Stream session shared via user authentication
   - Multiple client connections to same stream
   - Last-active-device priority for control

### Real-World Scenarios

**Scenario 1: Network Interruption**

- Stream continues server-side during disconnection
- Client reconnects and resumes from last acknowledged message
- No user intervention required

**Scenario 2: Device Switch Mid-Stream**

- User opens chat on phone while desktop is streaming
- Phone client connects to existing stream session
- Stream continues on phone, desktop connection gracefully closes

**Scenario 3: Server Restart**

- Active streams saved to Redis before shutdown
- Streams restored on server restart
- Clients automatically reconnect and resume

## 🎨 User Experience Enhancements

### Performance Optimizations

1. **Preloading Strategies**

   - Model list caching
   - Conversation history prefetching
   - Predictive message loading

2. **UI Responsiveness**

   - Optimistic updates for user messages
   - Skeleton loading states
   - Progressive message rendering

3. **Memory Management**
   - Virtual scrolling for long conversations
   - Message content lazy loading
   - Image thumbnail generation

### Advanced Features

**Chat Sharing:**

- Secure share links with expiration
- Permission levels (view-only, collaborative)
- Public gallery for showcase conversations

**Web Search Integration:**

- Real-time search result injection
- Source attribution and linking
- Search result caching for performance

**Bring Your Own Key (BYOK):**

- Encrypted key storage per user
- Key validation and health checking
- Usage analytics and cost tracking

## 🗄️ Database Schema Design

### Core Tables

```sql
-- User management
users (id, email, name, avatar_url, preferences)
user_api_keys (user_id, provider, encrypted_key, is_active)

-- Chat system
conversations (id, user_id, title, model, is_shared, created_at)
messages (id, conversation_id, role, content, attachments, created_at)
conversation_branches (conversation_id, parent_conversation_id, branch_point)

-- Streaming system
stream_sessions (id, conversation_id, status, last_activity)
message_queue (stream_id, message_id, acknowledged, created_at)

-- File management
attachments (id, filename, content_type, storage_url, extracted_content)
```

### Indexing Strategy

- Conversation lookup by user: `(user_id, created_at)`
- Message retrieval: `(conversation_id, created_at)`
- Full-text search: `GIN index on message content`
- Stream management: `(stream_id, acknowledged)` for queue processing

## 🚀 Deployment & Scalability

### Production Architecture

1. **Application Layer**

   - Vercel deployment with edge functions
   - Automatic scaling based on demand
   - Global CDN for static assets

2. **Database Layer**

   - Neon PostgreSQL with read replicas
   - Connection pooling (PgBouncer)
   - Automated backups and point-in-time recovery

3. **Caching Layer**

   - Redis for stream management
   - Vercel KV for session storage
   - CDN caching for file attachments

4. **Monitoring & Observability**
   - Real-time performance metrics
   - Error tracking and alerting
   - Usage analytics and cost monitoring

### Scaling Considerations

- **Horizontal scaling**: Stateless API design allows unlimited scaling
- **Database optimization**: Query optimization and connection pooling
- **Redis clustering**: For high-availability stream management
- **CDN optimization**: Global file delivery and caching

## 🔒 Security & Privacy

### Data Protection

- End-to-end encryption for sensitive conversations
- SOC 2 compliance for enterprise features
- GDPR compliance with data export/deletion

### API Security

- Rate limiting per user and API key
- Request validation and sanitization
- API key encryption and secure storage

## 📈 Performance Targets

- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 2.0s
- **Message Streaming Latency**: < 100ms
- **File Upload Processing**: < 5s for 10MB files
- **Cross-device Sync**: < 500ms
- **Search Response Time**: < 200ms

## 🎯 Success Metrics

### User Experience

- Message delivery success rate: > 99.9%
- Stream resumption success: > 99.5%
- User retention (7-day): > 40%
- Average session duration: > 15 minutes

### Technical Performance

- API response time (p95): < 200ms
- Database query time (p95): < 50ms
- Error rate: < 0.1%
- Uptime: > 99.9%

---

This architecture delivers a **world-class chat experience** that prioritizes performance, reliability, and user satisfaction. Every technical decision is made with the end-user experience in mind, ensuring T3 Chat Cloneathon stands out in the competitive AI chat landscape.

## 🔄 Ultra-Performance Stream Reconnection & Recovery

### Page Reload During Active Streaming

**The Challenge:** User reloads page while AI is generating a response - traditional approaches lose the stream entirely.

**Our Solution:** Server-side stream persistence with instant reconnection and seamless resume.

#### Stream Persistence Architecture

```typescript
// Server-side stream state with Redis clustering
interface PersistedStream {
  id: string;
  userId: string;
  conversationId: string;
  status: "active" | "paused" | "completed" | "error";

  // Performance-critical metadata
  modelConfig: {
    provider: "openrouter" | "byok-openai" | "byok-anthropic";
    model: string;
    apiKey?: string; // For BYOK
    temperature: number;
    maxTokens: number;
  };

  // Stream state for instant resume
  streamState: {
    totalTokensGenerated: number;
    lastChunkTimestamp: number;
    bufferPosition: number;
    completionProgress: number;
    estimatedTimeRemaining: number;
  };

  // Performance tracking
  performance: {
    startTime: number;
    firstTokenLatency: number;
    averageTokenLatency: number;
    totalLatency: number;
    throughputTokensPerSecond: number;
  };

  // Reconnection data
  reconnection: {
    attemptCount: number;
    lastAttempt: number;
    clientFingerprint: string;
    deviceInfo: DeviceInfo;
  };
}
```

#### Lightning-Fast Reconnection Implementation

```typescript
// Sub-100ms reconnection system
class UltraFastReconnectionManager {
  private readonly RECONNECTION_TIMEOUT = 30000; // 30 seconds max
  private readonly MAX_RECONNECTION_ATTEMPTS = 5;
  private readonly PERFORMANCE_THRESHOLD_MS = 100;

  async handlePageReload(
    userId: string,
    conversationId: string,
    clientFingerprint: string
  ): Promise<StreamReconnectionResult> {
    const startTime = performance.now();

    // Step 1: Ultra-fast stream lookup (< 10ms target)
    const activeStream = await this.findActiveStream(userId, conversationId);

    if (!activeStream) {
      return {
        status: "no_active_stream",
        latency: performance.now() - startTime,
      };
    }

    // Step 2: Validate stream ownership and device (< 5ms target)
    if (!this.validateStreamAccess(activeStream, userId, clientFingerprint)) {
      throw new Error("Unauthorized stream access");
    }

    // Step 3: Get buffered content since last client connection (< 20ms target)
    const missedContent = await this.getBufferedContent(
      activeStream.id,
      activeStream.streamState.bufferPosition
    );

    // Step 4: Reconnect to live stream (< 30ms target)
    const liveStream = await this.reconnectToLiveStream(activeStream.id);

    // Step 5: Update connection metadata
    await this.updateConnectionMetadata(activeStream.id, {
      clientFingerprint,
      reconnectedAt: Date.now(),
      reconnectionLatency: performance.now() - startTime,
    });

    const totalLatency = performance.now() - startTime;

    // Performance monitoring
    if (totalLatency > this.PERFORMANCE_THRESHOLD_MS) {
      await this.logPerformanceIssue("reconnection_slow", {
        latency: totalLatency,
        streamId: activeStream.id,
        userId,
      });
    }

    return {
      status: "reconnected",
      streamId: activeStream.id,
      missedContent,
      liveStream,
      latency: totalLatency,
      streamProgress: activeStream.streamState.completionProgress,
    };
  }

  // Optimized stream lookup with Redis pipeline
  private async findActiveStream(
    userId: string,
    conversationId: string
  ): Promise<PersistedStream | null> {
    const pipeline = redis.pipeline();

    // Use Redis pipeline for single round-trip
    pipeline.hgetall(`user:${userId}:active_streams`);
    pipeline.hgetall(`conversation:${conversationId}:stream`);
    pipeline.smembers(`user:${userId}:stream_ids`);

    const [userStreams, conversationStream, streamIds] = await pipeline.exec();

    // Find matching active stream
    const activeStreamId = this.findMatchingStream(
      userStreams,
      conversationStream,
      streamIds
    );

    if (!activeStreamId) return null;

    // Get full stream data
    return await redis.hgetall(`stream:${activeStreamId}`);
  }

  // High-performance buffered content retrieval
  private async getBufferedContent(
    streamId: string,
    fromPosition: number
  ): Promise<StreamChunk[]> {
    // Use Redis LRANGE for O(log(N)+M) performance
    const bufferedMessages = await redis.lrange(
      `stream:${streamId}:buffer`,
      fromPosition,
      -1
    );

    return bufferedMessages.map((msg) => JSON.parse(msg));
  }
}
```

#### Instant Stream Resume with Zero Latency

```typescript
// Client-side instant stream resume
class InstantStreamResume {
  private performanceMonitor = new PerformanceMonitor();

  async resumeStreamOnPageLoad(): Promise<void> {
    const resumeStartTime = performance.now();

    // Step 1: Check for active streams immediately on page load
    const activeStreams = await this.checkForActiveStreams();

    if (activeStreams.length === 0) return;

    // Step 2: Parallel reconnection for multiple streams
    const reconnectionPromises = activeStreams.map((stream) =>
      this.reconnectToStream(stream.id)
    );

    const results = await Promise.allSettled(reconnectionPromises);

    // Step 3: Handle reconnection results
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        this.handleSuccessfulReconnection(result.value, activeStreams[index]);
      } else {
        this.handleFailedReconnection(result.reason, activeStreams[index]);
      }
    });

    const totalResumeTime = performance.now() - resumeStartTime;

    // Performance logging
    this.performanceMonitor.logResumePerformance({
      totalTime: totalResumeTime,
      streamCount: activeStreams.length,
      successCount: results.filter((r) => r.status === "fulfilled").length,
    });
  }

  private async reconnectToStream(
    streamId: string
  ): Promise<StreamReconnection> {
    // Establish new SSE connection with resume parameters
    const eventSource = new EventSource(
      `/api/streams/${streamId}/resume?timestamp=${Date.now()}`
    );

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error("Reconnection timeout"));
      }, 5000);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "reconnection_success") {
          clearTimeout(timeout);
          resolve({
            streamId,
            missedChunks: data.missedChunks,
            currentPosition: data.currentPosition,
            estimatedCompletion: data.estimatedCompletion,
          });
        }
      };

      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error("Stream reconnection failed"));
      };
    });
  }
}
```

## 🔄 Advanced Model Retry & Switching Architecture

### Intelligent Model Retry System

**Performance Goal:** Switch models and retry in < 500ms with zero context loss.

```typescript
// Ultra-fast model switching and retry system
class PerformantModelRetryManager {
  private modelPerformanceCache = new Map<string, ModelPerformanceMetrics>();
  private failoverStrategies = new Map<string, FailoverStrategy>();

  async retryWithDifferentModel(
    conversationId: string,
    failedModelConfig: ModelConfig,
    retryReason: "rate_limit" | "error" | "timeout" | "user_request"
  ): Promise<RetryResult> {
    const retryStartTime = performance.now();

    // Step 1: Get optimal alternative model (< 50ms)
    const alternativeModel = await this.selectOptimalAlternative(
      failedModelConfig,
      retryReason
    );

    // Step 2: Preserve conversation context (< 100ms)
    const contextPreservation = await this.preserveContext(conversationId);

    // Step 3: Initialize new stream with alternative model (< 200ms)
    const newStream = await this.initializeAlternativeStream(
      conversationId,
      alternativeModel,
      contextPreservation
    );

    // Step 4: Seamless handover (< 150ms)
    await this.performSeamlessHandover(conversationId, newStream);

    const totalRetryTime = performance.now() - retryStartTime;

    // Performance tracking
    this.trackRetryPerformance(
      failedModelConfig.model,
      alternativeModel.model,
      totalRetryTime
    );

    return {
      success: true,
      newModel: alternativeModel.model,
      retryLatency: totalRetryTime,
      streamId: newStream.id,
    };
  }

  // Intelligent model selection based on performance metrics
  private async selectOptimalAlternative(
    failedConfig: ModelConfig,
    retryReason: string
  ): Promise<ModelConfig> {
    const alternatives = await this.getModelAlternatives(failedConfig.model);

    // Score models based on performance metrics and compatibility
    const scoredAlternatives = alternatives.map((model) => ({
      model,
      score: this.calculateModelScore(model, failedConfig, retryReason),
    }));

    // Sort by score and select best performing alternative
    scoredAlternatives.sort((a, b) => b.score - a.score);

    return scoredAlternatives[0].model;
  }

  private calculateModelScore(
    model: ModelConfig,
    failedConfig: ModelConfig,
    retryReason: string
  ): number {
    const performanceMetrics = this.modelPerformanceCache.get(model.model);

    if (!performanceMetrics) {
      return 0.5; // Default score for unknown models
    }

    let score = 0;

    // Performance factors (higher is better)
    score += (1 - performanceMetrics.averageLatency / 10000) * 0.3; // Latency weight
    score += performanceMetrics.successRate * 0.3; // Reliability weight
    score += (performanceMetrics.tokensPerSecond / 100) * 0.2; // Throughput weight

    // Compatibility factors
    if (model.contextLength >= failedConfig.contextLength) score += 0.1;
    if (
      model.capabilities.includes("code") &&
      failedConfig.capabilities.includes("code")
    )
      score += 0.1;

    return score;
  }
}
```

### Model Performance Tracking & Auto-Optimization

```typescript
// Real-time model performance optimization
class ModelPerformanceOptimizer {
  private performanceMetrics = new Map<string, RealTimeMetrics>();
  private optimizationRules = new Set<OptimizationRule>();

  async trackModelPerformance(
    modelId: string,
    metrics: PerformanceSnapshot
  ): Promise<void> {
    const currentMetrics =
      this.performanceMetrics.get(modelId) || new RealTimeMetrics();

    // Update rolling averages for real-time optimization
    currentMetrics.updateLatency(metrics.latency);
    currentMetrics.updateThroughput(metrics.tokensPerSecond);
    currentMetrics.updateSuccessRate(metrics.success);
    currentMetrics.updateCostEfficiency(metrics.costPerToken);

    this.performanceMetrics.set(modelId, currentMetrics);

    // Trigger auto-optimization if thresholds are met
    if (this.shouldTriggerOptimization(currentMetrics)) {
      await this.optimizeModelSelection(modelId, currentMetrics);
    }
  }

  private async optimizeModelSelection(
    modelId: string,
    metrics: RealTimeMetrics
  ): Promise<void> {
    // Auto-demote poorly performing models
    if (metrics.averageLatency > 5000 || metrics.successRate < 0.9) {
      await this.demoteModel(modelId, "performance_degradation");
    }

    // Auto-promote high-performing models
    if (metrics.averageLatency < 1000 && metrics.successRate > 0.98) {
      await this.promoteModel(modelId, "excellent_performance");
    }
  }
}
```

## 🔑 High-Performance BYOK (Bring Your Own Key) Architecture

### Secure & Lightning-Fast API Key Management

**Performance Target:** Key validation and encryption/decryption in < 20ms.

```typescript
// Ultra-secure, high-performance BYOK system
class PerformantBYOKManager {
  private keyCache = new Map<string, EncryptedKeyCache>();
  private validationCache = new Map<string, ValidationResult>();
  private encryptionService = new AESGCMEncryption();

  async addAPIKey(
    userId: string,
    provider: "openai" | "anthropic" | "openrouter" | "google",
    apiKey: string,
    alias?: string
  ): Promise<BYOKResult> {
    const addKeyStartTime = performance.now();

    // Step 1: Fast validation (< 10ms local, < 500ms remote)
    const validation = await this.validateAPIKey(provider, apiKey);

    if (!validation.isValid) {
      return {
        success: false,
        error: "Invalid API key",
        provider,
        latency: performance.now() - addKeyStartTime,
      };
    }

    // Step 2: High-performance encryption (< 5ms)
    const encryptedKey = await this.encryptionService.encrypt(
      apiKey,
      this.generateUserKeyDerivation(userId)
    );

    // Step 3: Store with metadata (< 10ms)
    const keyRecord = await this.storeEncryptedKey({
      userId,
      provider,
      encryptedKey,
      alias: alias || `${provider}-${Date.now()}`,
      capabilities: validation.capabilities,
      rateLimit: validation.rateLimit,
      createdAt: new Date(),
      lastValidated: new Date(),
      isActive: true,
    });

    // Step 4: Update cache for instant future access (< 2ms)
    this.keyCache.set(this.generateCacheKey(userId, provider), {
      encryptedKey,
      capabilities: validation.capabilities,
      lastAccessed: Date.now(),
    });

    const totalLatency = performance.now() - addKeyStartTime;

    return {
      success: true,
      keyId: keyRecord.id,
      provider,
      capabilities: validation.capabilities,
      latency: totalLatency,
    };
  }

  // Lightning-fast key retrieval for streaming
  async getDecryptedKey(
    userId: string,
    provider: string,
    keyId?: string
  ): Promise<string | null> {
    const retrievalStartTime = performance.now();

    // Step 1: Check hot cache first (< 1ms)
    const cacheKey = this.generateCacheKey(userId, provider, keyId);
    const cached = this.keyCache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      // Decrypt from cache (< 3ms)
      const decryptedKey = await this.encryptionService.decrypt(
        cached.encryptedKey,
        this.generateUserKeyDerivation(userId)
      );

      return decryptedKey;
    }

    // Step 2: Fast database lookup (< 15ms)
    const keyRecord = await this.findAPIKey(userId, provider, keyId);

    if (!keyRecord) return null;

    // Step 3: Decrypt and cache (< 10ms)
    const decryptedKey = await this.encryptionService.decrypt(
      keyRecord.encryptedKey,
      this.generateUserKeyDerivation(userId)
    );

    // Update cache for next access
    this.keyCache.set(cacheKey, {
      encryptedKey: keyRecord.encryptedKey,
      capabilities: keyRecord.capabilities,
      lastAccessed: Date.now(),
    });

    return decryptedKey;
  }

  // Background key validation and health checking
  async performHealthCheck(userId: string): Promise<HealthCheckResult> {
    const userKeys = await this.getUserAPIKeys(userId);
    const healthPromises = userKeys.map((key) => this.checkKeyHealth(key));

    const results = await Promise.allSettled(healthPromises);

    return {
      totalKeys: userKeys.length,
      healthyKeys: results.filter(
        (r) => r.status === "fulfilled" && r.value.healthy
      ).length,
      unhealthyKeys: results.filter(
        (r) => r.status === "rejected" || !r.value?.healthy
      ).length,
      details: results.map((result, index) => ({
        keyId: userKeys[index].id,
        provider: userKeys[index].provider,
        healthy: result.status === "fulfilled" && result.value.healthy,
        error: result.status === "rejected" ? result.reason : undefined,
      })),
    };
  }
}
```

### BYOK Performance Optimization

```typescript
// Advanced BYOK performance optimization
class BYOKPerformanceOptimizer {
  private keyPerformanceMetrics = new Map<string, KeyPerformanceData>();
  private loadBalancer = new KeyLoadBalancer();

  async optimizeKeyUsage(
    userId: string,
    provider: string,
    requestType: "streaming" | "completion" | "embedding"
  ): Promise<OptimalKeySelection> {
    const userKeys = await this.getUserKeysForProvider(userId, provider);

    if (userKeys.length === 0) {
      return { useDefaultKey: true, reason: "no_byok_keys" };
    }

    if (userKeys.length === 1) {
      return {
        keyId: userKeys[0].id,
        reason: "single_key_available",
      };
    }

    // Multi-key optimization
    const optimalKey = await this.selectOptimalKey(userKeys, requestType);

    return {
      keyId: optimalKey.id,
      reason: "performance_optimized",
      metrics: {
        expectedLatency: optimalKey.averageLatency,
        successRate: optimalKey.successRate,
        rateLimit: optimalKey.currentRateLimit,
      },
    };
  }

  private async selectOptimalKey(
    keys: APIKeyRecord[],
    requestType: string
  ): Promise<APIKeyRecord> {
    // Score keys based on current performance
    const scoredKeys = keys.map((key) => {
      const metrics = this.keyPerformanceMetrics.get(key.id);
      const score = this.calculateKeyScore(key, metrics, requestType);

      return { key, score };
    });

    // Sort by score and return best performing key
    scoredKeys.sort((a, b) => b.score - a.score);

    return scoredKeys[0].key;
  }

  private calculateKeyScore(
    key: APIKeyRecord,
    metrics: KeyPerformanceData | undefined,
    requestType: string
  ): number {
    if (!metrics) return 0.5;

    let score = 0;

    // Performance factors
    score += (1 - metrics.averageLatency / 5000) * 0.4; // Latency (40%)
    score += metrics.successRate * 0.3; // Success rate (30%)
    score += (1 - metrics.rateLimitUtilization) * 0.2; // Rate limit headroom (20%)
    score += metrics.costEfficiency * 0.1; // Cost efficiency (10%)

    // Request type optimization
    if (requestType === "streaming" && metrics.streamingPerformance > 0.8) {
      score += 0.1; // Bonus for good streaming performance
    }

    return Math.min(1, score);
  }
}
```

## ⚡ Performance-Critical System Optimizations

### Database Connection Optimization

```typescript
// Ultra-high performance database connection management
class PerformanceOptimizedDB {
  private connectionPool: ConnectionPool;
  private queryCache = new Map<string, CachedQuery>();
  private preparedStatements = new Map<string, PreparedStatement>();

  constructor() {
    this.connectionPool = new ConnectionPool({
      host: process.env.DATABASE_URL,
      poolSize: 50, // High connection count for concurrent streams
      idleTimeout: 30000,
      connectionTimeout: 5000,
      statementTimeout: 10000,

      // Performance optimizations
      keepAliveInitialDelayMillis: 15000,
      keepAliveIntervalMillis: 10000,

      // Connection reuse optimization
      max: 50,
      min: 10,
      acquireTimeoutMillis: 5000,

      // Query optimization
      ssl: { rejectUnauthorized: false },
      parseInputDatesAsUTC: true,

      // Advanced performance settings
      application_name: "t3chat_performance",
      statement_cache_size: 1000,
      prepared_statement_cache_size: 1000,
    });
  }

  // Sub-10ms query execution for hot paths
  async executeOptimizedQuery<T>(
    queryKey: string,
    query: string,
    params: any[]
  ): Promise<T[]> {
    const queryStartTime = performance.now();

    // Check query cache first
    const cached = this.queryCache.get(queryKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.result;
    }

    // Use prepared statements for repeated queries
    let statement = this.preparedStatements.get(queryKey);
    if (!statement) {
      statement = await this.connectionPool.prepare(query);
      this.preparedStatements.set(queryKey, statement);
    }

    const result = await statement.execute(params);
    const queryLatency = performance.now() - queryStartTime;

    // Cache result if query was fast (< 50ms)
    if (queryLatency < 50) {
      this.queryCache.set(queryKey, {
        result,
        timestamp: Date.now(),
        ttl: this.calculateCacheTTL(queryLatency),
      });
    }

    return result;
  }
}
```

### Memory-Optimized Caching Strategy

```typescript
// Ultra-efficient memory management for high performance
class MemoryOptimizedCache {
  private l1Cache = new Map<string, any>(); // Hot data (< 1ms access)
  private l2Cache = new LRUCache({ max: 10000, ttl: 300000 }); // Warm data (< 5ms access)
  private compressionCache = new Map<string, CompressedData>(); // Cold data (< 20ms access)

  async get<T>(key: string): Promise<T | null> {
    // L1 Cache - Immediate access
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // L2 Cache - Fast access
    const l2Result = this.l2Cache.get(key);
    if (l2Result) {
      // Promote to L1 for hot data
      this.l1Cache.set(key, l2Result);
      return l2Result;
    }

    // L3 Compressed Cache - Decompression required
    const compressed = this.compressionCache.get(key);
    if (compressed) {
      const decompressed = await this.decompress(compressed);
      this.l2Cache.set(key, decompressed);
      return decompressed;
    }

    return null;
  }

  async set<T>(
    key: string,
    value: T,
    priority: "hot" | "warm" | "cold" = "warm"
  ): Promise<void> {
    switch (priority) {
      case "hot":
        this.l1Cache.set(key, value);
        break;
      case "warm":
        this.l2Cache.set(key, value);
        break;
      case "cold":
        const compressed = await this.compress(value);
        this.compressionCache.set(key, compressed);
        break;
    }
  }
}
```
