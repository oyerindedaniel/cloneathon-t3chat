# AI SDK Parts System

## Overview

The AI SDK's `UIMessage` structure includes a powerful `parts` array that allows for rich, structured content beyond simple text messages. This system enables complex interactions including reasoning display, tool calls, web search results, and more.

## Message Structure

```typescript
interface UIMessage {
  id: string;
  role: "system" | "user" | "assistant" | "data";
  content: string;
  parts?: Array<
    | TextUIPart
    | ReasoningUIPart
    | ToolInvocationUIPart
    | SourceUIPart
    | StepStartUIPart
  >;
  createdAt?: Date;
  annotations?: Array<JSONValue>;
  experimental_attachments?: Array<Attachment>;
}
```

## Part Types

### 1. TextUIPart

Additional text content beyond the main message content.

```typescript
interface TextUIPart {
  type: "text";
  text: string;
}
```

**Example:**

```javascript
{
  type: "text",
  text: "Here's some additional information that supplements the main response."
}
```

### 2. ReasoningUIPart

AI's internal reasoning process, showing how it arrived at conclusions.

```typescript
interface ReasoningUIPart {
  type: "reasoning";
  reasoning: string;
}
```

**Example:**

```javascript
{
  type: "reasoning",
  reasoning: "Let me think through this step by step. The user is asking about quantum computing, so I need to explain both the basic principles and current applications. I should start with the fundamental concept of qubits..."
}
```

### 3. ToolInvocationUIPart

Represents tool calls and their results (web search, calculations, API calls, etc.).

```typescript
interface ToolInvocationUIPart {
  type: "tool-invocation";
  toolInvocation: {
    state: "partial-call" | "call" | "result";
    toolCallId: string;
    toolName: string;
    args: any;
    result?: any;
  };
}
```

**Example - Web Search:**

```javascript
{
  type: "tool-invocation",
  toolInvocation: {
    state: "result",
    toolCallId: "call_web_search_123",
    toolName: "web_search",
    args: {
      query: "latest developments in quantum computing 2024",
      max_results: 5
    },
    result: {
      results: [
        {
          title: "Quantum Computing Breakthrough 2024",
          url: "https://example.com/quantum-news",
          snippet: "Scientists achieve new milestone..."
        }
      ]
    }
  }
}
```

### 4. SourceUIPart

References to external sources used in generating the response.

```typescript
interface SourceUIPart {
  type: "source";
  source: {
    sourceType: "url";
    id: string;
    url: string;
    title?: string;
  };
}
```

### 5. StepStartUIPart

Indicates the beginning of a new step in multi-step reasoning.

```typescript
interface StepStartUIPart {
  type: "step-start";
}
```

## Role-Based Parts Usage

### User Messages (`role: "user"`)

**❌ Users typically do NOT have parts.** User messages are usually simple text input:

```javascript
{
  id: "user_msg_1",
  role: "user",
  content: "What are the latest developments in quantum computing?",
  parts: [] // Usually empty or undefined
}
```

### Assistant Messages (`role: "assistant"`)

**✅ Assistants frequently use parts** for rich responses:

```javascript
{
  id: "assistant_msg_1",
  role: "assistant",
  content: "Based on my research, here are the latest quantum computing developments:",
  parts: [
    {
      type: "reasoning",
      reasoning: "I need to search for recent quantum computing news and academic papers to provide accurate, up-to-date information."
    },
    {
      type: "tool-invocation",
      toolInvocation: {
        state: "result",
        toolCallId: "search_123",
        toolName: "web_search",
        args: { query: "quantum computing 2024 developments" },
        result: "Found 15 relevant articles..."
      }
    }
  ]
}
```

## Implementation in Our Chat Component

Our `ChatMessage` component handles parts as follows:

```typescript
// Extract and display reasoning parts
{
  message.parts
    ?.filter((part) => part.type === "reasoning")
    .map((part, index) => (
      <ReasoningDisplay
        key={`reasoning-${index}`}
        reasoning={part.reasoning}
        isStreaming={false}
      />
    ));
}

// Extract and display additional text parts
{
  message.parts
    ?.filter((part) => part.type === "text")
    .map((part, index) => (
      <div key={`text-${index}`} className="mt-2">
        <MarkdownRenderer content={part.text} className="" />
      </div>
    ));
}
```

## Future Scalability

The parts system is designed for our planned features:

### Web Search Integration

```javascript
parts: [
  {
    type: "tool-invocation",
    toolInvocation: {
      state: "result",
      toolName: "web_search",
      args: { query: "user's search term" },
      result: {
        /* search results */
      },
    },
  },
  {
    type: "source",
    source: {
      sourceType: "url",
      url: "https://found-website.com",
      title: "Relevant Article Title",
    },
  },
];
```

## Component Architecture
