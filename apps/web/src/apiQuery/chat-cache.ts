import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ChatStreamEvent } from "@api/chats";
import type { Chat, ChatMessage } from "@api/chats/response";
import type { Message } from "@app_types/chat";
import { errorText } from "@utils/errors";
import { mergeHydratedMessages } from "@utils/chat/message-cache";
import { keys } from "./keys";

// The chat's local message cache. There is no separate store: streaming and
// route loaders write into the Query cache, and components subscribe through
// the hooks in query/chats.ts.
//
//   keys.chat.messages(chatKey)   the conversation's messages, in order: the
//                                 one copy of each message (a message view
//                                 selects its own entry from it)
//   keys.chat.turn(chatKey)       whether a reply is in flight in this chat
//   keys.chat.meta(chatId)        chat title
//
// `chatKey` is the chat id, or a draft key while the backend has not created
// the chat yet (a new conversation); migrateDraft moves a draft to its id.

const DRAFT_PREFIX = "draft:";

/** The cache key of a conversation not created yet; one per blank chat page. */
export const draftKey = (id: string) => `${DRAFT_PREFIX}${id}`;
export const isDraftKey = (chatKey: string) => chatKey.startsWith(DRAFT_PREFIX);

export type ChatTurn = { streaming: boolean };
export const IDLE_TURN: ChatTurn = { streaming: false };

export function setStreaming(
  queryClient: QueryClient,
  chatKey: string,
  streaming: boolean,
) {
  queryClient.setQueryData<ChatTurn>(keys.chat.turn(chatKey), { streaming });
}

function setMessages(
  queryClient: QueryClient,
  chatKey: string,
  update: (messages: Message[]) => Message[],
) {
  queryClient.setQueryData<Message[]>(
    keys.chat.messages(chatKey),
    (current = []) => update(current),
  );
}

function patchMessage(
  queryClient: QueryClient,
  chatKey: string,
  messageId: string,
  patch: (message: Message) => Partial<Message>,
) {
  setMessages(queryClient, chatKey, (messages) =>
    messages.map((message) =>
      message.id === messageId ? { ...message, ...patch(message) } : message,
    ),
  );
}

export function updateMessage(
  queryClient: QueryClient,
  chatKey: string,
  messageId: string,
  patch: Partial<Message>,
) {
  patchMessage(queryClient, chatKey, messageId, () => patch);
}

/**
 * Route loaders seed the cache from the server's copy of a chat. Merged, never
 * overwritten: messages still streaming locally keep what they have (S36).
 */
export function seedChatMessages(
  queryClient: QueryClient,
  chatId: string,
  chat: Chat,
) {
  queryClient.setQueryData(keys.chat.meta(chatId), chat);
  const hydrated: Message[] = (chat.messages ?? []).map((message) => ({
    ...message,
    server_id: message.id,
    complete: true,
  }));
  setMessages(queryClient, chatId, (current) =>
    mergeHydratedMessages(current, hydrated),
  );
}

/**
 * What chat route loaders do: fetch the server's latest copy of a chat (S4)
 * and merge it in. A conversation already in the cache (one just created from
 * a draft, or reopened) shows at once and refreshes in the background, so the
 * page never waits on it mid-reply (S35); only a chat opened cold waits.
 * Loaders also run on hover, so this only reads and merges, never clears (S1).
 */
export async function loadChat(
  queryClient: QueryClient,
  chatId: string,
  snapshotKey: QueryKey,
  fetchChat: () => Promise<Chat>,
) {
  const refresh = queryClient
    .fetchQuery({ queryKey: snapshotKey, queryFn: fetchChat, staleTime: 0 })
    .then((chat) => seedChatMessages(queryClient, chatId, chat));
  const cached = queryClient.getQueryData<Message[]>(
    keys.chat.messages(chatId),
  );
  if (cached?.length) {
    refresh.catch(() => undefined);
    return;
  }
  await refresh;
}

/** Show the user's message before the request; returns its local id. */
export function appendUserMessage(
  queryClient: QueryClient,
  chatKey: string,
  content: string,
  files?: File[],
): string {
  const id = crypto.randomUUID();
  setMessages(queryClient, chatKey, (messages) => [
    ...messages,
    { id, role: "user", content, files: files?.length ? files : undefined },
  ]);
  return id;
}

/**
 * Swap the optimistic user message (found by its local id) for the server's
 * copy: its id and stored text. A copy the loader
 * already merged in separately is dropped, so the question shows once; an
 * earlier attempt the loader mistook for it (same text, never saved) is a
 * local message again.
 */
export function reconcileUserMessage(
  queryClient: QueryClient,
  chatKey: string,
  localId: string,
  serverMessage?: ChatMessage,
) {
  if (!serverMessage) return;
  setMessages(queryClient, chatKey, (messages) => {
    let index = messages.findIndex((message) => message.id === localId);
    if (index === -1) {
      index = messages.findIndex(
        (message) => message.server_id === serverMessage.id,
      );
    }
    if (index === -1) {
      return [...messages, { ...serverMessage, server_id: serverMessage.id }];
    }
    const local = messages[index];
    const reconciled: Message = {
      ...serverMessage,
      ...local,
      server_id: serverMessage.id,
      files: serverMessage.attachments?.length ? undefined : local.files,
      attachments: serverMessage.attachments,
    };
    return messages.flatMap((message, messageIndex) => {
      if (messageIndex === index) return [reconciled];
      if (message.id === serverMessage.id) return [];
      if (message.server_id === serverMessage.id) {
        return [{ ...message, server_id: undefined }];
      }
      return [message];
    });
  });
}

/**
 * The backend created the chat a draft was waiting for: its messages and its
 * turn now live under the chat id. The draft entries are left to be garbage
 * collected, so a view still subscribed to them is never pulled from under.
 */
export function migrateDraft(
  queryClient: QueryClient,
  draft: string,
  chatId: string,
) {
  const drafted =
    queryClient.getQueryData<Message[]>(keys.chat.messages(draft)) ?? [];
  setMessages(queryClient, chatId, (current) => [
    ...current,
    ...drafted.filter((message) => !current.some((c) => c.id === message.id)),
  ]);
  queryClient.setQueryData(
    keys.chat.turn(chatId),
    queryClient.getQueryData(keys.chat.turn(draft)) ?? IDLE_TURN,
  );
}

/**
 * Once its turn is over, a migrated draft is a blank chat again: returning to
 * it (Back) shows an empty conversation, not a copy of the chat it became.
 */
export function clearDraft(queryClient: QueryClient, draft: string) {
  queryClient.setQueryData<Message[]>(keys.chat.messages(draft), []);
  setStreaming(queryClient, draft, false);
}

/** Make sure a just-created chat has a title in the cache until it reloads. */
export function ensureChatMeta(queryClient: QueryClient, chatId: string) {
  queryClient.setQueryData<Chat>(
    keys.chat.meta(chatId),
    (current) =>
      current ?? {
        id: chatId,
        title: "Conversație nouă",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
  );
}

function ensureAssistantMessage(
  queryClient: QueryClient,
  chatKey: string,
  assistantMessageId: string | null,
): string {
  if (assistantMessageId) return assistantMessageId;
  const id = crypto.randomUUID();
  setMessages(queryClient, chatKey, (messages) => [
    ...messages,
    { id, role: "assistant", content: "", complete: false },
  ]);
  return id;
}

// How each assistant-side stream event changes the message it belongs to.
function assistantPatch(
  streamEvent: ChatStreamEvent,
): ((message: Message) => Partial<Message>) | null {
  switch (streamEvent.event) {
    case "message":
      return (old) => ({ content: old.content + streamEvent.data });
    case "assistant_saved":
      return () => ({
        server_id: streamEvent.data.message_id,
        complete: true,
      });
    case "error":
      return (old) => ({
        content: old.content
          ? `${old.content}\n\nEroare: ${errorText(streamEvent.data)}`
          : `Eroare: ${errorText(streamEvent.data)}`,
        error: true,
      });
    default:
      return null;
  }
}

/**
 * Apply one stream event to the assistant message being streamed, creating it
 * on the first event. Returns the assistant message id to pass to the next call.
 */
export function applyAssistantStreamEvent(
  queryClient: QueryClient,
  chatKey: string,
  streamEvent: ChatStreamEvent,
  assistantMessageId: string | null,
): string | null {
  const patch = assistantPatch(streamEvent);
  if (!patch) return assistantMessageId;

  const messageId = ensureAssistantMessage(
    queryClient,
    chatKey,
    assistantMessageId,
  );
  patchMessage(queryClient, chatKey, messageId, patch);
  return messageId;
}
