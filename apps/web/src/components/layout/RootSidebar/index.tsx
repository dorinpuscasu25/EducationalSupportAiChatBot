import { type FC, useState } from "react";
import {
  LuPlus,
  LuMessageSquare,
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
} from "react-icons/lu";
import { twJoin } from "tailwind-merge";

export type SessionsHistory = { id: string; title: string }[];

type Props = {
  sessions: SessionsHistory;
  currentChatId?: string;
  onNewConversation: () => void;
  onOpenSession: (chatId: string) => void;
  onDeleteSession?: (chatId: string) => void;
};

const PREVIEW = 12;

export const RootSidebar: FC<Props> = ({
  sessions,
  currentChatId,
  onNewConversation,
  onOpenSession,
  onDeleteSession,
}) => {
  const [expanded, setExpanded] = useState(() =>
    sessions.slice(PREVIEW).some((s) => s.id === currentChatId),
  );
  const visible = expanded ? sessions : sessions.slice(0, PREVIEW);

  return (
    <>
      <div className="mt-6">
        <button
          onClick={onNewConversation}
          className="bg-action text-primary flex w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <LuPlus className="size-4" />
          <span>Conversație nouă</span>
        </button>
      </div>

      <div className="mt-8">
        <p className="text-muted text-xs tracking-wider uppercase">
          Conversațiile mele
        </p>
        <div className="mt-2 flex flex-col gap-1">
          {sessions.length === 0 && (
            <p className="text-muted/70 px-2 text-xs">
              Conversațiile tale vor apărea aici.
            </p>
          )}
          {visible.map((session) => (
            <div
              key={session.id}
              className={twJoin(
                "group hover:bg-pop/40 flex items-center rounded-md transition-colors",
                session.id === currentChatId && "bg-pop/60",
              )}
            >
              <button
                onClick={() => onOpenSession(session.id)}
                aria-current={session.id === currentChatId ? "page" : undefined}
                className={twJoin(
                  "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm",
                  session.id === currentChatId ? "text-primary" : "text-muted",
                )}
              >
                <LuMessageSquare className="size-3.5 shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
              {onDeleteSession && (
                <button
                  type="button"
                  aria-label={`Șterge conversația ${session.title}`}
                  onClick={() => {
                    if (window.confirm("Ștergi această conversație?")) {
                      onDeleteSession(session.id);
                    }
                  }}
                  className="text-muted hover:text-primary mr-1 hidden rounded p-1 group-hover:block focus-visible:block"
                >
                  <LuTrash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {sessions.length > PREVIEW && (
            <button
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
              className="text-muted flex items-center gap-2 px-2 py-1.5 text-left text-xs"
            >
              {expanded ? <LuChevronUp /> : <LuChevronDown />}
              {expanded
                ? "Vezi mai puține"
                : `Vezi mai multe (${sessions.length - PREVIEW})`}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
