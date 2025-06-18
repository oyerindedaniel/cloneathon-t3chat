# Resumable Streams Architecture

## Overview

This application implements a sophisticated resumable streaming system that allows AI chat conversations to be interrupted and resumed seamlessly. The system uses a hybrid approach combining **PostgreSQL** for persistent data storage and **Redis** for real-time stream management.

## Architecture Components

### 1. Database Layer (PostgreSQL)

- **`conversations`** - Stores conversation metadata
- **`messages`** - Stores all chat messages with AI SDK message IDs
- **`stream_ids`** - Tracks stream sessions for resumability

### 2. Redis Layer

- **Stream Data** - Temporary storage of active streaming content
- **Stream Context** - Real-time stream state and buffers
- **Session Management** - Active connection tracking

### 3. AI SDK Integration

- **Message ID Generation** - Client (`msgc_`) and Server (`msgs_`) prefixes
- **Stream Context** - Resumable stream management
- **Message Tracking** - Consistent ID mapping between UI and database

## How It Works

### Stream Creation Flow

```
Client → API → Database → Redis → AI Model
  ↓       ↓        ↓        ↓        ↓
Send    Check    Store    Create   Start
Message Conv.    StreamID Context  Stream
  ↓       ↓        ↓        ↓        ↓
        Create   Register  Buffer   Stream
        Conv.    Stream    Data     Response
```

### Database Schema Relationships

```sql
-- Stream tracking table
CREATE TABLE stream_ids (
  id UUID PRIMARY KEY,
  stream_id VARCHAR(255) UNIQUE NOT NULL,  -- Redis stream identifier
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages with AI SDK integration
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  ai_message_id VARCHAR(255) UNIQUE NOT NULL,  -- AI SDK message ID
  conversation_id UUID REFERENCES conversations(id),
  role message_role NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,  -- Performance metrics, token usage, etc.
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Key Functions Explained

### `loadStreams(chatId: string)`

```typescript
export async function loadStreams(chatId: string): Promise<string[]> {
  const streams = await db
    .select({ streamId: streamIds.streamId })
    .from(streamIds)
    .where(eq(streamIds.conversationId, chatId))
    .orderBy(desc(streamIds.createdAt));

  return streams.map((stream) => stream.streamId);
}
```

**Purpose**: Retrieves all Redis stream IDs associated with a conversation
**Why**: When resuming a conversation, we need to know which Redis streams contain the data
**Database Role**: Acts as an index/registry of Redis streams
**Redis Role**: Contains the actual streaming data

### `appendStreamId()`

```typescript
export async function appendStreamId({
  chatId,
  streamId,
  userId,
}: {
  chatId: string;
  streamId: string;
  userId: string;
}): Promise<void> {
  await db.insert(streamIds).values({
    streamId,
    conversationId: chatId,
    userId,
  });
}
```

**Purpose**: Registers a new Redis stream in the database
**Why**: Creates a persistent link between conversations and their Redis streams
**Flow**: API creates Redis stream → Registers stream ID in DB → Enables future resumability

### `getMessagesByChatId()`

```typescript
export async function getMessagesByChatId({
  id,
}: {
  id: string;
}): Promise<Message[]> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      messages: {
        orderBy: asc(messages.sequenceNumber),
      },
    },
  });

  return conversation.messages.map(
    (msg): Message => ({
      id: msg.aiMessageId, // AI SDK message ID
      role: msg.role as Message["role"],
      content: msg.content,
      createdAt: msg.createdAt,
    })
  );
}
```

**Purpose**: Converts database messages to AI SDK format
**Why**: AI SDK needs consistent message format for resumability
**Key**: Uses `aiMessageId` field to maintain AI SDK message tracking

## Stream Resumption Process

### 1. Client Requests Resume

```typescript
// GET /api/chat?chatId=conversation-id
const streamIds = await loadStreams(chatId);
const recentStreamId = streamIds.at(-1);
```

### 2. Redis Stream Lookup

```typescript
const stream = await streamContext.resumableStream(
  recentStreamId,
  () => emptyDataStream
);
```

### 3. Fallback to Database

If Redis stream expired:

```typescript
const chatMessages = await getMessagesByChatId({ id: chatId });
const mostRecentMessage = chatMessages.at(-1);

// Create new stream with last message
const streamWithMessage = createDataStream({
  execute: (buffer) => {
    buffer.writeData({
      type: "append-message",
      message: JSON.stringify(mostRecentMessage),
    });
  },
});
```

## Redis vs Database Roles

### Redis (Temporary, Fast)

- **Active stream data** - Real-time chunks being streamed
- **Stream buffers** - Temporary message queues
- **Connection state** - Active client connections
- **TTL expiration** - Automatic cleanup after inactivity

### Database (Persistent, Reliable)

- **Stream registry** - Which Redis streams exist for each conversation
- **Final messages** - Completed messages with full metadata
- **Conversation history** - Permanent chat history
- **User associations** - Stream ownership and permissions

## Message ID System

### Client Messages (`msgc_` prefix)

```typescript
const messageIdGenerator = createIdGenerator({
  prefix: "msgc",
  size: 16,
});
```

### Server Messages (`msgs_` prefix)

```typescript
const serverMessageIdGenerator = createIdGenerator({
  prefix: "msgs",
  size: 16,
});
```

### Database Storage

Both client and server message IDs are stored in the `ai_message_id` field, enabling:

- **Message deduplication** - Prevent duplicate saves
- **Stream resumption** - Match streaming messages to database
- **Edit tracking** - Future message editing capabilities
- **Branch management** - Conversation branching support

## Performance Optimizations

### 1. Stream ID Indexing

```sql
CREATE INDEX stream_conversation_idx ON stream_ids(conversation_id);
CREATE INDEX stream_id_idx ON stream_ids(stream_id);
```

### 2. Message Upserts

```typescript
await db
  .insert(messages)
  .values(messageData)
  .onConflictDoUpdate({
    target: messages.aiMessageId,
    set: buildExcludedSetClause(messages, ["content", "metadata", "updatedAt"]),
  });
```

### 3. Redis TTL Management

- Streams auto-expire after inactivity
- Database maintains permanent registry
- Graceful fallback to database when Redis expires

## Error Handling & Resilience

### Redis Unavailable

- System falls back to database-only mode
- New streams created when Redis recovers
- No data loss, only reduced performance

### Database Unavailable

- Guest mode continues working (localStorage)
- Redis streams continue for active sessions
- Graceful degradation of features

### Stream Interruption

- Client can reconnect using stream ID
- Redis maintains buffer during brief disconnections
- Database provides fallback for expired streams

## Monitoring & Debugging

### Stream Health Check

```typescript
const activeStreams = await loadStreams(conversationId);
console.log(`Active streams for conversation: ${activeStreams.length}`);
```

### Message Consistency

```typescript
const dbMessages = await getMessagesByChatId({ id: conversationId });
const lastMessage = dbMessages.at(-1);
console.log(`Last saved message: ${lastMessage?.id}`);
```

### Redis Stream Status

```typescript
const streamExists = await streamContext.resumableStream(streamId, null);
console.log(`Redis stream active: ${!!streamExists}`);
```

## Configuration

### Redis Connection

```typescript
import { publisher, subscriber } from "./redis";

export const streamContext = createResumableStreamContext({
  waitUntil: after,
  publisher,
  subscriber,
});
```

### Stream Settings

- **TTL**: 1 hour for inactive streams
- **Buffer Size**: Configurable per stream
- **Max Connections**: Per user limits
- **Cleanup Interval**: Automatic Redis cleanup

This architecture provides a robust, scalable solution for resumable AI chat streams while maintaining data consistency and performance.
