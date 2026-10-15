import { Button } from "@components/core/Button";
import { useFieldContext } from "@context/form.context";
import { useRef, type InputEvent } from "react";
import { LuArrowUp, LuPaperclip, LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { CHAT_ATTACHMENT_ACCEPT, MAX_ATTACHMENTS } from "@config/files";

import styles from "./style.module.css";

type Props = {
  ref: React.Ref<HTMLDivElement>;
  disabled?: boolean;
  files: File[];
  /** Files picked, pasted or dropped; the conversation validates them. */
  onAddFiles: (files: File[]) => void;
  /** Why some files were not added. */
  notice?: string;
  onRemoveFile: (index: number) => void;
  onSubmit: (value: string) => void;
};

export const ChatInput: React.FC<Props> = ({
  ref,
  disabled,
  files,
  onAddFiles,
  onRemoveFile,
  notice,
  onSubmit,
}) => {
  const field = useFieldContext<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFiles = onAddFiles;

  const handleChange = (event: InputEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const text = el.textContent ?? "";

    if (text.trim() === "") {
      el.innerHTML = "";
      field.handleChange("");
      return;
    }

    field.handleChange(event.currentTarget.innerText);
  };

  const canSend = !disabled && (!!field.state.value.trim() || files.length > 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    // One reply at a time: Enter is blocked like the button.
    if (canSend) onSubmit(field.state.value);
  };

  // Screenshots pasted with Ctrl/Cmd+V are attached; text is pasted plain.
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = Array.from(event.clipboardData.files);
    if (pasted.length) {
      event.preventDefault();
      addFiles(pasted);
      return;
    }
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    document.execCommand("insertText", false, text);
  };

  return (
    <div
      className={`${styles.composer} relative w-full flex-1 rounded-lg border`}
    >
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="bg-background border-divider flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            >
              <LuPaperclip className="size-3.5 shrink-0" />
              <span className="max-w-40 truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Elimină ${file.name}`}
                onClick={() => onRemoveFile(index)}
                className="text-secondary hover:text-primary ml-0.5"
              >
                <LuX className="size-3.5 cursor-pointer" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative flex-1">
        <div
          ref={ref}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          contentEditable
          role="textbox"
          aria-label="Întrebarea ta"
          aria-multiline="true"
          suppressContentEditableWarning
          data-placeholder="Întreabă despre cursuri, materiale sau organizare…"
          autoFocus
          className={twMerge(
            "max-h-80 min-h-14 w-full gap-2 overflow-y-auto px-4 py-3.5 wrap-break-word whitespace-pre-wrap outline-0",
            styles.input,
          )}
          onInput={handleChange}
        />
      </div>
      {notice && (
        <p role="alert" className="text-highlight px-4 pb-1 text-xs">
          {notice}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            size="icon"
            className="bg-background/60 p-2"
            type="button"
            aria-label="Atașează fișiere sau capturi de ecran"
            title="Atașează PDF, Word, PowerPoint, text sau imagini"
            disabled={disabled || files.length >= MAX_ATTACHMENTS}
            onClick={() => fileInputRef.current?.click()}
          >
            <LuPaperclip className="text-primary size-5" />
          </Button>
          <span className="text-muted hidden truncate text-[11px] sm:inline">
            Enter trimite · Shift+Enter rând nou · lipește sau trage fișiere
            aici
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_ATTACHMENT_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <Button
          aria-label="Trimite"
          disabled={!canSend}
          size="icon"
          className="bg-primary hover:bg-soft p-2"
          onClick={() => onSubmit(field.state.value)}
        >
          <LuArrowUp className="text-background-dark size-5" />
        </Button>
      </div>
    </div>
  );
};
