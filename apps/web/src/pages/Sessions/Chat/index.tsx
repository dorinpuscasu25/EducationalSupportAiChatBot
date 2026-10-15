import type { FC } from "react";
import { Route } from "@routes/_auth/_app/sessions";
import { ChatContainer } from "@pages/Chat";
import { useConversation, useIsActive } from "@pages/Chat/conversation";
import {
  useSessionSendMessage,
  useSessionStart,
} from "@apiQuery/mutation/sessions";

const SessionConversation: FC<{
  chatId?: string;
  chatKey: string;
  draft: string;
}> = ({ chatId, chatKey, draft }) => {
  const isActive = useIsActive();
  const start = useSessionStart();
  const send = useSessionSendMessage(chatKey);

  return (
    <ChatContainer
      chatId={chatId}
      chatKey={chatKey}
      onSend={(payload) =>
        chatId
          ? send.mutate(payload)
          : start.mutate({ payload, draft, isActive })
      }
    />
  );
};

export const SessionChatContainer = () => {
  const { chatId } = Route.useLoaderDeps();
  const { chatKey, draft, viewKey } = useConversation(chatId);
  return (
    <SessionConversation
      key={viewKey}
      chatId={chatId}
      chatKey={chatKey}
      draft={draft}
    />
  );
};
