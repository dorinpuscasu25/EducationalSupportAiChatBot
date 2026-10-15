export type MessageFeedbackRating =
  | "helpful"
  | "not_helpful"
  | "incorrect_source";

/** A chat as listed in the sidebar. */
export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Chat extends ChatSummary {
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string; // markdown raw
  /** Only in the admin's view of a conversation; students never get them. */
  sources?: Source[];
  feedback?: MessageFeedbackRating;
  feedback_note?: string;
  attachments?: Attachment[];
  created_at: string;
}

/** A file the student sent with a question. */
export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string; // ".pdf" | ".docx" | ".png" …
  mime_type: string;
  file_size: number; // bytes
  created_at: string;
}

/** A passage from the academy's materials that an answer relies on. */
export interface Source {
  /** The number the answer cites it by, e.g. [1]. */
  index: number;
  document_id: string;
  title: string;
  category?: string;
  path?: string;
  heading?: string;
  excerpt?: string;
  page_start?: number;
  page_end?: number;
  score?: number;
}
