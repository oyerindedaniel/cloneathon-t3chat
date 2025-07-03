import { UseChatHelpers } from "@ai-sdk/react";
import { ToolCall, ToolResult } from "ai";

export type LocationToolCall = ToolCall<"getLocation", { message: string }>;

export type GetLocationResult =
  | { latitude: number; longitude: number; timezone: string }
  | { error: "permission_denied" | "not_supported" };

export type AllToolResults = ToolResult<
  "getLocation",
  {
    message: string;
  },
  GetLocationResult
>;

export type LocationToolStatus = "awaiting_user_input";

export type ChatHelpers = UseChatHelpers & {
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: GetLocationResult;
  }) => void;
};
