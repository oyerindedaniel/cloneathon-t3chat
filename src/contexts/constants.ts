import { ChatHelpers } from "./types";

export const DEFAULT_CHAT_HELPERS = {
  messages: [],
  input: "",
  status: "ready",
  error: undefined,
  data: undefined,
  isLoading: false,
  id: "",
  setMessages: () => {},
  setInput: () => {},
  setData: () => {},
  handleInputChange: () => {},
  handleSubmit: () => {},
  stop: () => {},
  experimental_resume: () => {},
  reload: async () => undefined,
  append: async () => undefined,
  addToolResult: () => {},
} satisfies ChatHelpers;
