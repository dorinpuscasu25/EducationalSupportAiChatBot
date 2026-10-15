export type AssistantCompletionState = {
  role: "user" | "assistant";
  content: string;
  complete?: boolean;
  error?: boolean;
};

export function canShowAssistantActions(
  message: AssistantCompletionState,
): boolean {
  return (
    message.role === "assistant" &&
    message.complete === true &&
    message.content.trim().length > 0 &&
    !message.error
  );
}
