import type {
  Attachment,
  MessageFeedbackRating,
  Source,
} from "@api/chats/response";

/** A chat message as the UI holds it: server fields plus local stream state. */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Files picked locally, shown until the server's copy arrives. */
  files?: File[];
  attachments?: Attachment[];
  sources?: Source[];
  error?: boolean;
  server_id?: string;
  feedback?: MessageFeedbackRating;
  feedback_note?: string;
  complete?: boolean;
}
