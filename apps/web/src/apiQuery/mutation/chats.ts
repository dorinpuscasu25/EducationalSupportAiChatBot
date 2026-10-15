import { ChatsApi, type MessageFeedbackPayload } from "@api/chats";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMessage } from "../chat-cache";

export const useSubmitMessageFeedback = (chatId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serverMessageId,
      rating,
      note,
    }: MessageFeedbackPayload & {
      /** Local cache id of the message. */
      messageId: string;
      /** Backend id, once the message has been saved. */
      serverMessageId: string;
    }) => {
      if (!chatId) throw Error("chatId required to submit feedback");
      return ChatsApi.submitMessageFeedback(chatId, serverMessageId, {
        rating,
        note,
      });
    },
    onSuccess: (_, { messageId, rating }) => {
      if (chatId) {
        updateMessage(queryClient, chatId, messageId, { feedback: rating });
      }
    },
  });
};
