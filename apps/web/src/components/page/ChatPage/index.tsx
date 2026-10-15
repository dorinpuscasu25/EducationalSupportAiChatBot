import { type FC } from "react";
import { Chat, type ChatProps } from "@components/display/Chat";
import type { Chat as ChatMeta } from "@api/chats/response";
import { APP_NAME } from "@config/brand";

type Props = ChatProps & {
  /** Title of the open chat, if any. */
  meta?: ChatMeta;
};

export const ChatPage: FC<Props> = ({ meta, ...chat }) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col">
    <header className="border-border mb-5 flex items-start justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <p className="text-accent mb-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
          {APP_NAME}
        </p>
        <h1
          className="truncate text-lg font-semibold tracking-tight sm:text-xl"
          title={meta?.title}
        >
          {meta?.title || "Conversație nouă"}
        </h1>
        <p className="text-muted mt-1 text-xs">
          Cursuri · Materiale · Organizare
        </p>
      </div>
    </header>
    <Chat {...chat} />
  </div>
);
