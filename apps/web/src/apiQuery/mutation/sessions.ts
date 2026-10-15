import { ChatsApi } from "@api/chats";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { SessionsRoutes } from "@config/routes";
import { keys } from "../keys";
import { runChatTurn } from "../chat-stream";

export type StartChatVariables = {
  payload: FormData;
  /** The draft key the new conversation lives under until it is created. */
  draft: string;
  /** Whether the user is still on that draft; only then does it open the chat. */
  isActive: () => boolean;
};

// Start a new conversation and stream the first reply.
export const useSessionStart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, draft, isActive }: StartChatVariables) =>
      runChatTurn(queryClient, {
        chatKey: draft,
        payload,
        stream: () => ChatsApi.startSessionStream(payload),
        listKey: keys.sessions.list(),
        snapshotKey: keys.chats.session,
        onChatCreated: (chatId) => {
          // Never pull a user who has moved on back to this chat (S3).
          if (!isActive()) return;
          navigate({
            to: SessionsRoutes.Sessions,
            search: { chatId },
            replace: true,
            // Same conversation, same view: the composer keeps its draft (S13).
            state: (state) => ({ ...state, draftKey: draft }),
          });
        },
      }),
  });
};

// Send a follow-up message in an existing conversation.
export const useSessionSendMessage = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FormData) =>
      runChatTurn(queryClient, {
        chatKey: chatId,
        payload,
        stream: () => ChatsApi.sendSessionMessage(chatId, payload),
        listKey: keys.sessions.list(),
        snapshotKey: keys.chats.session,
      }),
  });
};

// Delete a conversation and drop it from the sidebar.
export const useSessionDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => ChatsApi.deleteSession(chatId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.sessions.list() }),
  });
};
