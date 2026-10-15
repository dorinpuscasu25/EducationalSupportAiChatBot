import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ChatStreamEvent } from "@api/chats";
import { errorMessage } from "@utils/errors";
import {
  appendUserMessage,
  applyAssistantStreamEvent,
  clearDraft,
  ensureChatMeta,
  isDraftKey,
  migrateDraft,
  reconcileUserMessage,
  setStreaming,
} from "./chat-cache";

// One streamed turn of a chat: a new conversation (draft) or a follow-up.

export type ChatTurnOptions = {
  /** Where the conversation lives: its chat id, or its draft key if new. */
  chatKey: string;
  payload: FormData;
  /** Opens the stream; called inside the turn so its failures are shown. */
  stream: () => AsyncGenerator<ChatStreamEvent>;
  /** The sidebar list that shows this chat. */
  listKey: QueryKey;
  /** The loader's server copy of a chat, marked stale once the turn is saved. */
  snapshotKey: (chatId: string) => QueryKey;
  /** A new chat was created (draft turns only). */
  onChatCreated?: (chatId: string) => void;
};

function messageContent(payload: FormData): string {
  const content = payload.get("content");
  return typeof content === "string" ? content : "";
}

/**
 * Run one turn: show the question at once, apply each event as it arrives,
 * and end with an answer or a visible failure, never with nothing (CHAT-16).
 */
export async function runChatTurn(
  queryClient: QueryClient,
  options: ChatTurnOptions,
) {
  const { payload, listKey, snapshotKey, onChatCreated } = options;
  let chatKey = options.chatKey;
  let assistantMessageId: string | null = null;
  // Whether the stream ended with `done` or `error`, as the backend ends it.
  let ended = false;

  setStreaming(queryClient, chatKey, true);
  const userMessageId = appendUserMessage(
    queryClient,
    chatKey,
    messageContent(payload),
    payload.getAll("files") as File[],
  );

  try {
    for await (const streamEvent of options.stream()) {
      if (streamEvent.event === "chat_created") {
        const chatId = streamEvent.data.chat_id;
        ensureChatMeta(queryClient, chatId);
        migrateDraft(queryClient, chatKey, chatId);
        chatKey = chatId;
        queryClient.invalidateQueries({ queryKey: listKey });
        onChatCreated?.(chatId);
        continue;
      }

      // Events before chat_created (an early error) land in the draft.
      assistantMessageId = applyAssistantStreamEvent(
        queryClient,
        chatKey,
        streamEvent,
        assistantMessageId,
      );

      if (streamEvent.event === "error") ended = true;
      if (streamEvent.event === "done") {
        ended = true;
        reconcileUserMessage(
          queryClient,
          chatKey,
          userMessageId,
          streamEvent.data.user_message,
        );
        queryClient.invalidateQueries({ queryKey: listKey });
        if (!isDraftKey(chatKey)) {
          // Stale for the next visit; never removed while a loader may be
          // reading it (S35).
          queryClient.invalidateQueries({
            queryKey: snapshotKey(chatKey),
            refetchType: "none",
          });
        }
      }
    }
    // Closed early (a proxy, a dropped connection): a failure, not an answer.
    if (!ended) throw Error("request_failed");
  } catch (error) {
    // A refused request, a network failure or a broken stream (S2).
    applyAssistantStreamEvent(
      queryClient,
      chatKey,
      { event: "error", data: errorMessage(error) },
      assistantMessageId,
    );
  } finally {
    setStreaming(queryClient, chatKey, false);
    if (chatKey !== options.chatKey) {
      // The draft became a chat: the conversation lives there now, and the
      // blank chat it was typed in is empty again (CHAT-18).
      clearDraft(queryClient, options.chatKey);
    }
  }
}
