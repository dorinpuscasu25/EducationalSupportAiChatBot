import { useEffect, useRef, useState, type FC } from "react";
import { LuFileText, LuImage, LuPaperclip } from "react-icons/lu";
import { formatBytes } from "@utils/format";

export const FileChip: FC<{
  name: string;
  size?: number;
  onClick?: () => void;
}> = ({ name, size, onClick }) => {
  const Icon = /\.(png|jpe?g|webp)$/i.test(name)
    ? LuImage
    : /\.(pdf|docx|pptx|txt|md)$/i.test(name)
      ? LuFileText
      : LuPaperclip;
  const body = (
    <>
      <Icon className="size-3.5 shrink-0" />
      <span className="max-w-48 truncate">{name}</span>
      {size !== undefined && (
        <span className="text-secondary text-xs">{formatBytes(size)}</span>
      )}
    </>
  );
  const className =
    "bg-background border-divider mt-2 mr-2 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title="Descarcă"
      className={`${className} hover:border-subtle/50 cursor-pointer`}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
};

/** Shows an image the student picked, before it is uploaded. */
export const LocalImagePreview: FC<{ file: File }> = ({ file }) => {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const next = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URLs need cleanup
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? (
    <img
      src={url}
      alt={file.name || "Captură de ecran atașată"}
      className="border-divider mt-2 max-h-72 max-w-full rounded-lg border object-contain"
    />
  ) : null;
};

/**
 * Shows an uploaded image. Attachments are private, so the image is fetched
 * with the session token and displayed from a local object URL.
 */
export const RemoteImagePreview: FC<{
  /** Identifies the file: the image is fetched again only when it changes. */
  fileKey: string;
  name: string;
  load: () => Promise<Blob>;
  onOpen?: () => void;
}> = ({ fileKey, name, load, onOpen }) => {
  const [url, setUrl] = useState<string>();
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    let active = true;
    let created: string | undefined;
    loadRef
      .current()
      .then((blob) => {
        if (!active) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [fileKey]);
  if (!url) return <FileChip name={name} />;
  return (
    <button type="button" onClick={onOpen} className="block cursor-zoom-in">
      <img
        src={url}
        alt={name}
        className="border-divider mt-2 max-h-72 max-w-full rounded-lg border object-contain"
      />
    </button>
  );
};
