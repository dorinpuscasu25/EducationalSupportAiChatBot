import type { ChatMessage } from "./response";

export type DoneDataEvent = {
  user_message_id: string;
  user_message?: ChatMessage;
};

export type AssistantSavedData = {
  message_id: string;
};

export type ChatStreamEvent =
  | { event: "chat_created"; data: { chat_id: string } }
  | { event: "done"; data: DoneDataEvent }
  | { event: "message"; data: string }
  | { event: "assistant_saved"; data: AssistantSavedData }
  | { event: "error"; data: string };

export function toStreamEvent(
  event: string | null,
  data: unknown,
): ChatStreamEvent | null {
  switch (event) {
    case "chat_created":
      return { event, data: data as { chat_id: string } };
    case "done":
      return { event, data: data as DoneDataEvent };
    case "assistant_saved":
      return { event, data: data as AssistantSavedData };
    case "error":
      return { event, data: String(data) };
    case null:
    case "message":
      return typeof data === "string" ? { event: "message", data } : null;
    default:
      return null;
  }
}
