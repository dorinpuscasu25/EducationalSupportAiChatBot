import { ChatConversation, type ChatProps } from "./ChatConversation";

export type { ChatProps, SubmitMessage } from "./ChatConversation";
export { MessageItem, type MessageHandlers } from "./MessageItem";
export { MessageContent } from "./MessageContent";

/** One conversation. Its container keys it per conversation (pages/Chat). */
export const Chat = (props: ChatProps) => <ChatConversation {...props} />;
