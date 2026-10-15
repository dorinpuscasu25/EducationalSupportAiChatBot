import type { User, UserQuota } from "@api/auth/response";

export type AdminMetrics = {
  total_users: number;
  pending_users: number;
  active_users: number;
  suspended_users: number;
  assistant_responses: number;
  helpful_feedback: number;
  problem_feedback: number;
  questions_today: number;
  questions_last_7_days: number;
  knowledge_documents: number;
};

export type UsageEvent = {
  id: string;
  user_id: string;
  chat_id?: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
};

/** One conversation, summarised for the admin view. */
export type SessionSummary = {
  id: string;
  title?: string;
  message_count: number;
  /** Opening question, truncated server-side. */
  first_question?: string;
  created_at: string;
  updated_at: string;
};

/** Admin-controlled switches. */
export type AdminSettings = {
  auto_activate_users: boolean;
};

export type DailyCount = { day: string; count: number };

/** How a student uses the assistant. */
export type UserStats = {
  question_count: number;
  answer_count: number;
  questions_last_7_days: number;
  helpful_feedback: number;
  problem_feedback: number;
  first_active_at?: string | null;
  last_active_at?: string | null;
  daily_questions: DailyCount[];
};

export type UserDetail = {
  user: User;
  quota: UserQuota | null;
  stats: UserStats;
  session_count: number;
  tokens_total: number;
  recent_usage: UsageEvent[] | null;
  recent_sessions: SessionSummary[] | null;
};

/** A user row in the admin roster, with activity counts. */
export type UserListItem = User & {
  session_count: number;
  last_active_at?: string | null;
};

// ── Knowledge base ──────────────────────────────────────────────────────────

export type KnowledgeDocumentStatus = "ready" | "empty" | "failed";

export type KnowledgeDocument = {
  id: string;
  path: string;
  title: string;
  category: string;
  file_type: string;
  size_bytes: number;
  status: KnowledgeDocumentStatus;
  error?: string;
  chunk_count: number;
  embedded: boolean;
  indexed_at?: string;
};

export type KnowledgeSyncReport = {
  started_at: string;
  finished_at?: string;
  running: boolean;
  scanned: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  failed: number;
  error?: string;
};

export type KnowledgeOverview = {
  documents: KnowledgeDocument[];
  total_chunks: number;
  embeddings_enabled: boolean;
  embedding_model?: string;
  sync?: KnowledgeSyncReport | null;
};

export type KnowledgeSearchResult = {
  chunk_id: string;
  document_id: string;
  title: string;
  category?: string;
  path: string;
  heading?: string;
  content: string;
  page_start?: number;
  page_end?: number;
  score: number;
};
