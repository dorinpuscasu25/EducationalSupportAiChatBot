import type { FC } from "react";
import { ChatPage } from "@components/page/ChatPage";
import {
  useChatMessages,
  useChatMeta,
  useChatTurn,
} from "@apiQuery/query/chats";
import { MessageContainer } from "./MessageContainer";

/** The chat form fields, as the streaming endpoints expect them. */
function chatPayload(message: string, files: File[] = []) {
  const formData = new FormData();
  formData.append("content", message);
  files.forEach((file) => formData.append("files", file));
  return formData;
}

type Props = {
  /** The chat, once the backend has created it. */
  chatId?: string;
  /** Where its messages live: the chat id, or the draft key of a new chat. */
  chatKey: string;
  /** Start a new chat (no chatId yet) or send into the open one. */
  onSend: (payload: FormData) => void;
};

export const ChatContainer: FC<Props> = ({ chatId, chatKey, onSend }) => {
  const messages = useChatMessages(chatKey);
  const meta = useChatMeta(chatId);
  const { streaming } = useChatTurn(chatKey);
  // Sent, and nothing of the answer has arrived yet.
  const waiting = streaming && messages.at(-1)?.role === "user";

  return (
    <ChatPage
      chatId={chatId}
      meta={meta}
      messages={messages}
      renderMessage={(messageId, handlers) => (
        <MessageContainer
          chatId={chatId}
          chatKey={chatKey}
          messageId={messageId}
          {...handlers}
        />
      )}
      streamInProgress={streaming}
      loadingMessage={waiting}
      onSubmitMessage={(message, files) => onSend(chatPayload(message, files))}
    />
  );
};
