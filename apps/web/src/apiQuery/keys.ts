// Every React Query key in the app comes from here. Keys are hierarchical
// arrays rooted at the domain, so invalidating a prefix (e.g.
// keys.admin.users.all()) also invalidates everything nested under it.

export const keys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },

  sessions: {
    list: () => ["sessions", "list"] as const,
  },

  // Server snapshots of a chat, read by route loaders before hydrating the
  // local message cache below.
  chats: {
    session: (chatId: string) => ["chats", "session", chatId] as const,
  },

  // Local message cache that streaming writes into (see apiQuery/chat-cache).
  // A conversation is keyed by its chat id, or by a draft key ("draft:…")
  // until the backend has created the chat.
  chat: {
    all: () => ["chat"] as const,
    messages: (chatKey: string) => ["chat", chatKey, "messages"] as const,
    turn: (chatKey: string) => ["chat", chatKey, "turn"] as const,
    meta: (chatId?: string) => ["chat-meta", chatId] as const,
  },

  admin: {
    metrics: () => ["admin", "metrics"] as const,
    settings: () => ["admin", "settings"] as const,
    users: {
      all: () => ["admin", "users"] as const,
      list: (status?: string) =>
        ["admin", "users", "list", status ?? "all"] as const,
      detail: (id: string) => ["admin", "users", "detail", id] as const,
    },
    knowledge: () => ["admin", "knowledge"] as const,
  },
};
