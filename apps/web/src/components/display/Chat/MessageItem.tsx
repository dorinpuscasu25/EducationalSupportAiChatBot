import { memo, type FC } from "react";
import { LuGraduationCap, LuRotateCw } from "react-icons/lu";
import { twJoin } from "tailwind-merge";
import type { MessageFeedbackRating } from "@api/chats/response";
import type { Message } from "@app_types/chat";
import { APP_NAME } from "@config/brand";
import { isImageName } from "@config/files";
import { downloadBlob } from "@utils/download";
import { FileChip, LocalImagePreview, RemoteImagePreview } from "./Attachments";
import { FeedbackControls } from "./FeedbackControls";
import { MessageContent } from "./MessageContent";
import { Sources } from "./Sources";

/** What a message can ask the conversation to do. */
export type MessageHandlers = {
  /** Unset while a reply streams. */
  onRetry?: () => void;
};

type Props = MessageHandlers & {
  message: Message;
  readOnly?: boolean;
  /** Fetches a saved attachment (private, so not a plain URL). */
  loadAttachment?: (attachmentId: string) => Promise<Blob>;
  onFeedback?: (rating: MessageFeedbackRating, note?: string) => Promise<void>;
};

const ThinkingIndicator = () => (
  <p className="text-muted mb-2 animate-pulse text-sm">Pregătesc răspunsul…</p>
);

export const MessageItem: FC<Props> = memo(
  ({ message, readOnly = false, onRetry, onFeedback, loadAttachment }) => {
    const isAssistant = message.role === "assistant";

    return (
      <article className={twJoin("flex", !isAssistant && "justify-end")}>
        <div
          className={twJoin(
            "text-soft min-w-0 rounded-lg px-4 py-3 text-[15px] leading-7 wrap-break-word sm:px-5",
            isAssistant
              ? "w-full"
              : "border-subtle/15 bg-subtle/10 max-w-[90%] border sm:max-w-4/5",
          )}
        >
          {isAssistant && (
            <>
              <div className="text-accent mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide">
                <LuGraduationCap className="size-4" /> {APP_NAME}
              </div>
              {!message.complete &&
                !message.error &&
                !message.content?.trim() && <ThinkingIndicator />}
              {message.error && (
                <div className="border-subtle/30 bg-subtle/5 mb-3 rounded-lg border p-3">
                  <p className="text-highlight mb-2 text-sm font-medium">
                    Răspunsul nu a putut fi generat
                  </p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={onRetry}
                      disabled={!onRetry}
                      className="border-highlight/30 hover:border-highlight/60 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50"
                    >
                      <LuRotateCw className="size-3.5" />
                      Încearcă din nou
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {message.content && <MessageContent content={message.content} />}
          {message.files?.map((file, i) =>
            isImageName(file.name) ? (
              <LocalImagePreview key={i} file={file} />
            ) : (
              <FileChip key={i} name={file.name} size={file.size} />
            ),
          )}
          {message.attachments?.map((a) => {
            const download = loadAttachment
              ? () =>
                  loadAttachment(a.id).then((blob) =>
                    downloadBlob(blob, a.file_name),
                  )
              : undefined;
            return isImageName(a.file_name) && loadAttachment ? (
              <RemoteImagePreview
                key={a.id}
                fileKey={a.id}
                name={a.file_name}
                load={() => loadAttachment(a.id)}
                onOpen={download}
              />
            ) : (
              <FileChip
                key={a.id}
                name={a.file_name}
                size={a.file_size}
                onClick={download}
              />
            );
          })}
          {/* Students see only the answer; the admin replay (readOnly)
              shows which materials it came from. */}
          {readOnly &&
            isAssistant &&
            message.sources &&
            message.sources.length > 0 && <Sources sources={message.sources} />}
          {readOnly && isAssistant && message.feedback && (
            <p className="text-muted mt-3 text-xs">
              Feedback cursant:{" "}
              {{
                helpful: "util",
                not_helpful: "neutil",
                incorrect_source: "informație greșită",
              }[message.feedback] ?? message.feedback}
              {message.feedback_note ? ` — ${message.feedback_note}` : ""}
            </p>
          )}
          {isAssistant &&
            message.content &&
            message.complete &&
            !message.error &&
            !readOnly &&
            onFeedback && (
              <FeedbackControls saved={message.feedback} submit={onFeedback} />
            )}
        </div>
      </article>
    );
  },
);
