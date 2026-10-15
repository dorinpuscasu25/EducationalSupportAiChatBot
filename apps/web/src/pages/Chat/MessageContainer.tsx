import type { FC } from "react";
import { MessageItem, type MessageHandlers } from "@components/display/Chat";
import { useCallback } from "react";
import { ChatsApi } from "@api/chats";
import { useChatMessage } from "@apiQuery/query/chats";
import { useSubmitMessageFeedback } from "@apiQuery/mutation/chats";

/** One message, subscribed to its own cache entry (see apiQuery/chat-cache). */
export const MessageContainer: FC<
  MessageHandlers & { chatId?: string; chatKey: string; messageId: string }
> = ({ chatId, chatKey, messageId, ...handlers }) => {
  const message = useChatMessage(chatKey, messageId);
  const feedback = useSubmitMessageFeedback(chatId);
  const loadAttachment = useCallback(
    (attachmentId: string) =>
      ChatsApi.fetchFile(ChatsApi.attachmentPath(chatId ?? "", attachmentId)),
    [chatId],
  );
  if (!message) return null;

  return (
    <MessageItem
      message={message}
      loadAttachment={chatId ? loadAttachment : undefined}
      {...handlers}
      onFeedback={async (rating, note) => {
        // Feedback needs a saved message; a not-yet-created chat has none.
        if (!chatId) return;
        await feedback.mutateAsync({
          messageId: message.id,
          serverMessageId: message.server_id ?? message.id,
          rating,
          note,
        });
      }}
    />
  );
};
