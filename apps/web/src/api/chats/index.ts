import { HTTP, getStoredToken } from "@api/http";
import type {
  Chat,
  ChatMessage,
  ChatSummary,
  MessageFeedbackRating,
} from "./response";
import { toStreamEvent, type ChatStreamEvent } from "./stream-events";

export type {
  ChatStreamEvent,
  DoneDataEvent,
  AssistantSavedData,
} from "./stream-events";

export type MessageFeedbackPayload = {
  rating: MessageFeedbackRating;
  note?: string;
};

async function* streamEvents(
  url: string,
  payload: FormData,
): AsyncGenerator<ChatStreamEvent> {
  for await (const chunk of HTTP.stream(url, {
    method: "POST",
    data: payload,
  })) {
    const event = toStreamEvent(chunk.event, chunk.data);
    if (event) yield event;
  }
}

// A student's conversations. Answers stream as SSE; see stream-events.ts.
export const ChatsApi = {
  getSessions() {
    return HTTP.get<ChatSummary[]>(`/chats`);
  },
  getSessionMessages(chatId: string) {
    return HTTP.get<Chat>(`/chats/${chatId}`);
  },
  deleteSession(chatId: string) {
    return HTTP.delete(`/chats/${chatId}`);
  },
  startSessionStream(payload: FormData) {
    return streamEvents(`/chats/start/stream`, payload);
  },
  sendSessionMessage(chatId: string, payload: FormData) {
    return streamEvents(`/chats/${chatId}/messages/stream`, payload);
  },
  /** A private file (attachment) as a Blob, fetched with the session token. */
  async fetchFile(path: string): Promise<Blob> {
    const token = getStoredToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("request_failed");
    return response.blob();
  },
  attachmentPath(chatId: string, attachmentId: string) {
    return `/chats/${chatId}/attachments/${attachmentId}`;
  },
  submitMessageFeedback(
    chatId: string,
    messageId: string,
    payload: MessageFeedbackPayload,
  ) {
    return HTTP.post<ChatMessage>(
      `/chats/${chatId}/messages/${messageId}/feedback`,
      payload,
    );
  },
};
