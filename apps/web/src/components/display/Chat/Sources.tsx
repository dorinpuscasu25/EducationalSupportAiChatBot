import { useState, type FC } from "react";
import { LuFileText } from "react-icons/lu";
import type { Source } from "@api/chats/response";

const SOURCES_PREVIEW = 4;

function pages(source: Source) {
  if (!source.page_start) return "";
  return source.page_end && source.page_end !== source.page_start
    ? ` · p. ${source.page_start}–${source.page_end}`
    : ` · p. ${source.page_start}`;
}

/** The passages an answer relied on. Shown to administrators only. */
export const Sources: FC<{ sources: Source[] }> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sources : sources.slice(0, SOURCES_PREVIEW);
  const hidden = sources.length - visible.length;

  return (
    <div className="border-divider mt-3 border-t pt-2">
      <div className="text-secondary mb-1.5 flex items-center gap-1 text-xs uppercase">
        <LuFileText className="size-3.5" /> Surse folosite ({sources.length})
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        {visible.map((s, i) => (
          <details
            key={`${s.document_id}-${i}`}
            className="border-divider/70 min-w-0 rounded-lg border px-2.5 py-2"
          >
            <summary className="cursor-pointer list-none truncate text-xs">
              <span className="text-secondary">[{s.index ?? i + 1}]</span>{" "}
              <span className="text-soft">{s.heading || s.title}</span>
              <span className="text-muted">
                {s.category ? ` · ${s.category}` : ""}
                {pages(s)}
              </span>
            </summary>
            {s.path && <p className="text-muted mt-2 text-[11px]">{s.path}</p>}
            {s.excerpt && (
              <p className="text-secondary border-primary/15 mt-2 max-h-60 overflow-y-auto border-l pl-2 text-xs leading-5 whitespace-pre-line">
                {s.excerpt}
              </p>
            )}
          </details>
        ))}
      </div>
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="text-secondary hover:text-primary mt-1.5 cursor-pointer text-xs"
        >
          {expanded ? "Arată mai puține" : `Arată toate cele ${sources.length}`}
        </button>
      )}
    </div>
  );
};
