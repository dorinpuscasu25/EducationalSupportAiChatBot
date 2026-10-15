import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { LuUpload } from "react-icons/lu";
import { motion } from "motion/react";
import { twJoin } from "tailwind-merge";
import type { Message } from "@app_types/chat";
import { MAX_ATTACHMENTS, selectAttachments } from "@config/files";
import { useAppForm } from "@hooks/form.hook";
import { EmptyState } from "./EmptyState";
import type { MessageHandlers } from "./MessageItem";

export type SubmitMessage = (message: string, files?: File[]) => void;

export type ChatProps = {
  chatId?: string;
  messages: Message[];
  /**
   * Render one message. The container subscribes each message to the cache
   * on its own, so a streamed token re-renders only the message it extends.
   */
  renderMessage: (messageId: string, handlers: MessageHandlers) => ReactNode;
  loadingMessage: boolean;
  streamInProgress?: boolean;
  onSubmitMessage?: SubmitMessage;
};

export const ChatConversation: FC<ChatProps> = ({
  messages,
  renderMessage,
  loadingMessage,
  streamInProgress,
  onSubmitMessage,
}) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<string>();
  // dragenter/dragleave fire for every child element: count them, so the
  // overlay only goes away when the files leave the page.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const form = useAppForm({
    defaultValues: { message: "", files: [] as File[] },
    onSubmit: ({ value }) => {
      const message = value.message.trim();
      if (!message && value.files.length === 0) return;
      onSubmitMessage?.(message, value.files);
      clearInput();
    },
  });

  const clearInput = () => {
    if (inputRef.current) inputRef.current.innerHTML = "";
    setNotice(undefined);
    form.reset();
  };

  const addFiles = (incoming: File[]) => {
    const { accepted, notice } = selectAttachments(
      incoming,
      form.getFieldValue("files").length,
    );
    setNotice(notice);
    if (accepted.length) {
      form.setFieldValue("files", (prev) => [...prev, ...accepted]);
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const hasFiles = (event: React.DragEvent) =>
    event.dataTransfer.types.includes("Files");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // A file dropped outside the conversation (e.g. on the sidebar) would make
  // the browser open it and leave the chat; ignore such drops.
  useEffect(() => {
    const ignore = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", ignore);
    window.addEventListener("drop", ignore);
    return () => {
      window.removeEventListener("dragover", ignore);
      window.removeEventListener("drop", ignore);
    };
  }, []);

  // While a reply is in flight, nothing in the conversation may send.
  const handlers: MessageHandlers = {
    onRetry: streamInProgress
      ? undefined
      : () => {
          const lastUserMessage = [...messages]
            .reverse()
            .find((message) => message.role === "user");
          if (lastUserMessage) {
            onSubmitMessage?.(lastUserMessage.content, lastUserMessage.files);
          }
        },
  };

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col"
      onDragEnter={(event) => {
        if (!hasFiles(event) || streamInProgress) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event) || streamInProgress) return;
        // Required, or the browser opens the file instead of dropping it here.
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (!streamInProgress) addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {dragging && (
        <div
          role="status"
          className="border-subtle/60 bg-background/85 pointer-events-none fixed inset-4 z-40 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed backdrop-blur-sm"
        >
          <LuUpload className="text-soft size-8" />
          <p className="text-primary text-base font-medium">
            Lasă fișierele aici
          </p>
          <p className="text-muted text-xs">
            Capturi de ecran, PDF, Word, PowerPoint sau text · max{" "}
            {MAX_ATTACHMENTS} fișiere de 10 MB
          </p>
        </div>
      )}
      <div
        className={twJoin(
          "flex-1",
          messages.length ? "mb-6" : "flex flex-col justify-center py-8",
        )}
      >
        {!messages.length && (
          <EmptyState
            onAsk={streamInProgress ? undefined : (q) => onSubmitMessage?.(q)}
          />
        )}
        <div
          className={twJoin(
            "flex w-full flex-col gap-8",
            messages.length && "pb-25",
          )}
        >
          {messages.map((message) => (
            <Fragment key={message.id}>
              {renderMessage(message.id, handlers)}
            </Fragment>
          ))}
          {loadingMessage && (
            <motion.div
              role="status"
              aria-label="Pregătesc răspunsul"
              className="bg-pop size-6 shrink-0 rounded-full"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: [1, 0.7, 1], opacity: [1, 0.8, 1] }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 1.5,
                ease: "easeInOut",
              }}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="bg-background/80 sticky bottom-0 z-10 w-full shrink-0 pt-3 pb-3 backdrop-blur-md">
        <form.Subscribe
          selector={(state) => state.values.files}
          children={(files) => (
            <form.AppField
              name="message"
              children={(field) => (
                <field.ChatInput
                  ref={inputRef}
                  disabled={streamInProgress}
                  files={files}
                  onAddFiles={addFiles}
                  notice={notice}
                  onRemoveFile={(index) =>
                    form.setFieldValue("files", (prev) =>
                      prev.filter((_, i) => i !== index),
                    )
                  }
                  onSubmit={form.handleSubmit}
                />
              )}
            />
          )}
        />
        <p className="text-muted mt-2 text-center text-[11px]">
          Asistentul poate greși. Pentru situații importante, verifică cu echipa
          academiei.
        </p>
      </div>
    </div>
  );
};
