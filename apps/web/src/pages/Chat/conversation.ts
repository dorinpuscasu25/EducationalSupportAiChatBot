import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { draftKey } from "@apiQuery/chat-cache";

/**
 * History state for a "new conversation" navigation: a fresh draft, so even
 * from a blank chat (same URL) the user gets an empty one.
 */
export const newConversationState = () => ({
  draftKey: draftKey(crypto.randomUUID()),
});

/**
 * Which conversation a chat page shows, and what keys its view.
 *
 * - `draft`: the cache key a new conversation lives under until the backend
 *   creates it. One per visit to a blank chat (each history entry has its own
 *   key), so "Conversație nouă" always opens an empty draft.
 * - `viewKey`: remounts the view per conversation, but not when the draft the
 *   user is typing in becomes a chat (the navigation carries `draftKey`), so
 *   the composer keeps its text (S13).
 */
export function useConversation(chatId: string | undefined) {
  const location = useRouterState({ select: (state) => state.location.state });
  const draft = location.draftKey ?? draftKey(location.__TSR_key ?? "initial");
  return {
    chatKey: chatId ?? draft,
    draft,
    viewKey: location.draftKey ?? chatId ?? draft,
  };
}

/** For async work that outlives the view: is the view still on screen? */
export function useIsActive() {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return () => active.current;
}
