import { ChatsApi } from "@api/chats";
import { SessionChatContainer } from "@pages/Sessions/Chat";
import { createFileRoute } from "@tanstack/react-router";
import { keys } from "@apiQuery/keys";
import { loadChat } from "@apiQuery/chat-cache";

export const Route = createFileRoute("/_auth/_app/sessions/")({
  validateSearch: (search: Record<string, string>) => {
    return { chatId: search.chatId ? search.chatId : undefined };
  },
  loaderDeps: ({ search }) => ({ chatId: search.chatId }),
  loader: ({ context: { queryClient }, deps: { chatId } }) =>
    !chatId
      ? undefined
      : loadChat(queryClient, chatId, keys.chats.session(chatId), () =>
          ChatsApi.getSessionMessages(chatId),
        ),
  component: SessionChatContainer,
});
