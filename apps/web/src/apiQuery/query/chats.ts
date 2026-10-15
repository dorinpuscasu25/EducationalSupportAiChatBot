import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { Chat } from "@api/chats/response";
import type { Message } from "@app_types/chat";
import { keys } from "../keys";
import { IDLE_TURN, type ChatTurn } from "../chat-cache";

// Subscriptions to the local chat cache (see apiQuery/chat-cache.ts). The
// cache is written by streaming and by route loaders, never fetched, so each
// hook only reads what is already there.
const NO_MESSAGES: Message[] = [];

function cacheEntry<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: QueryKey,
  fallback: T,
) {
  return {
    queryKey,
    queryFn: () => queryClient.getQueryData<T>(queryKey) ?? fallback,
    staleTime: Infinity,
  };
}

function useCacheEntry<T>(queryKey: QueryKey, fallback: T, enabled = true) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    ...cacheEntry(queryClient, queryKey, fallback),
    enabled,
  });
  return data ?? fallback;
}

/** The messages of a conversation (a chat id, or a draft key). */
export const useChatMessages = (chatKey: string) =>
  useCacheEntry<Message[]>(keys.chat.messages(chatKey), NO_MESSAGES);

/**
 * One message, selected from its conversation: the view re-renders only when
 * this message changes, not when another one does.
 */
export const useChatMessage = (chatKey: string, messageId: string) => {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    ...cacheEntry(queryClient, keys.chat.messages(chatKey), NO_MESSAGES),
    select: (messages: Message[]) =>
      messages.find((message) => message.id === messageId) ?? null,
  });
  return data ?? null;
};

export const useChatMeta = (chatId?: string) =>
  useCacheEntry<Chat | undefined>(keys.chat.meta(chatId), undefined, !!chatId);

/** Whether a reply is in flight in this conversation (not in any other). */
export const useChatTurn = (chatKey: string) =>
  useCacheEntry<ChatTurn>(keys.chat.turn(chatKey), IDLE_TURN);
