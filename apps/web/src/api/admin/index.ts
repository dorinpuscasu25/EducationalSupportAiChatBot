import { HTTP, getStoredToken } from "@api/http";
import type { Chat } from "@api/chats/response";
import type { User, UserQuota, UserRole } from "@api/auth/response";
import type {
  AdminMetrics,
  AdminSettings,
  KnowledgeOverview,
  KnowledgeSearchResult,
  KnowledgeSyncReport,
  SessionSummary,
  UserDetail,
  UserListItem,
} from "./response";

export type SetQuotaPayload = {
  package_name: string;
  monthly_token_limit: number;
};

export type CreateUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  role?: UserRole;
};

export const AdminApi = {
  metrics() {
    return HTTP.get<AdminMetrics>("/admin/metrics");
  },
  settings() {
    return HTTP.get<AdminSettings>("/admin/settings");
  },
  updateSettings(patch: Partial<AdminSettings>) {
    return HTTP.post<AdminSettings>("/admin/settings", patch);
  },
  listUsers(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return HTTP.get<UserListItem[]>(`/admin/users${q}`);
  },
  userDetail(id: string) {
    return HTTP.get<UserDetail>(`/admin/users/${id}/detail`);
  },
  userSessions(id: string) {
    return HTTP.get<SessionSummary[]>(`/admin/users/${id}/sessions`);
  },
  /** Full conversation, same shape the user's own chat endpoint returns. */
  userSession(id: string, chatId: string) {
    return HTTP.get<Chat>(`/admin/users/${id}/sessions/${chatId}`);
  },
  userSessionAttachmentPath(id: string, chatId: string, attachmentId: string) {
    return `/admin/users/${id}/sessions/${chatId}/attachments/${attachmentId}`;
  },
  /**
   * Every conversation (or one user's) as a Markdown file, numbered and with
   * user/assistant turns labelled, ready to hand to an AI for analysis.
   */
  async exportConversations(userId?: string): Promise<Blob> {
    const q = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    const token = getStoredToken();
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/conversations/export${q}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Exportul nu a reușit.");
    }
    return response.blob();
  },
  activate(id: string) {
    return HTTP.post<User>(`/admin/users/${id}/activate`);
  },
  suspend(id: string) {
    return HTTP.post<User>(`/admin/users/${id}/suspend`);
  },
  setRole(id: string, role: UserRole) {
    return HTTP.post<User>(`/admin/users/${id}/role`, { role });
  },
  setQuota(id: string, payload: SetQuotaPayload) {
    return HTTP.post<UserQuota>(`/admin/users/${id}/quota`, payload);
  },
  sendReset(id: string) {
    return HTTP.post<{ ok: boolean }>(`/admin/users/${id}/send-reset`);
  },
  createUser(payload: CreateUserPayload) {
    return HTTP.post<User>("/admin/users", payload);
  },

  // ── Knowledge base ────────────────────────────────────────────────────────
  knowledge() {
    return HTTP.get<KnowledgeOverview>("/admin/knowledge");
  },
  syncKnowledge(force = false) {
    return HTTP.post<{ sync: KnowledgeSyncReport }>(
      `/admin/knowledge/sync${force ? "?force=true" : ""}`,
    );
  },
  searchKnowledge(query: string) {
    return HTTP.get<KnowledgeSearchResult[]>(
      `/admin/knowledge/search?q=${encodeURIComponent(query)}`,
    );
  },
};
