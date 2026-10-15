// Files a student can attach to a question. The backend checks each file's
// content against its extension and refuses anything else.

export const CHAT_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

const CHAT_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const CHAT_ATTACHMENT_ACCEPT = CHAT_ATTACHMENT_EXTENSIONS.join(",");

/** At most this many files per message, each up to MAX_ATTACHMENT_BYTES. */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function isChatAttachment(file: File): boolean {
  return (
    CHAT_ATTACHMENT_MIME_TYPES.includes(file.type) ||
    CHAT_ATTACHMENT_EXTENSIONS.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    )
  );
}

export const isImageName = (name: string) => /\.(png|jpe?g|webp)$/i.test(name);

/** A pasted screenshot has no useful name; give it one the backend accepts. */
export function namedAttachment(file: File): File {
  if (file.name && file.name !== "image.png") return file;
  const ext = file.type.split("/")[1] || "png";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new File([file], `captura-${stamp}.${ext}`, { type: file.type });
}

/**
 * The files that can be added to a message that already has `current` files,
 * and a Romanian note about any that were left out.
 */
export function selectAttachments(
  incoming: File[],
  current: number,
): { accepted: File[]; notice?: string } {
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of incoming.map(namedAttachment)) {
    if (!isChatAttachment(file)) {
      problems.push(`„${file.name}” nu este un tip acceptat`);
    } else if (file.size > MAX_ATTACHMENT_BYTES) {
      problems.push(`„${file.name}” depășește 10 MB`);
    } else {
      accepted.push(file);
    }
  }
  const room = Math.max(0, MAX_ATTACHMENTS - current);
  if (accepted.length > room) {
    problems.push(`poți atașa cel mult ${MAX_ATTACHMENTS} fișiere`);
  }
  return {
    accepted: accepted.slice(0, room),
    notice: problems.length ? `${problems.join("; ")}.` : undefined,
  };
}
