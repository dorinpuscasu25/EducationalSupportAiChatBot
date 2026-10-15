import { describe, expect, test } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { Message } from "@app_types/chat";
import { keys } from "./keys";
import { reconcileUserMessage } from "./chat-cache";

const NOW = "2026-01-01T00:00:00Z";
const QUESTION = "Ce prevede contractul de muncă?";

describe("CHAT-16 Failures are visible", () => {
  test("CHAT-16 retried (S55): the retry, not an earlier attempt the loader matched by text, becomes the saved question", () => {
    const queryClient = new QueryClient();
    // A loader ran mid-retry and matched the saved question to the first
    // unconfirmed one with its text: the attempt that was refused.
    queryClient.setQueryData<Message[]>(keys.chat.messages("chat-1"), [
      { id: "failed", role: "user", content: QUESTION, server_id: "m-saved" },
      { id: "error", role: "assistant", content: "Eroare: …", error: true },
      { id: "retry", role: "user", content: QUESTION },
    ]);

    reconcileUserMessage(queryClient, "chat-1", "retry", {
      id: "m-saved",
      chat_id: "chat-1",
      role: "user",
      content: QUESTION,
      created_at: NOW,
    });

    const messages = queryClient.getQueryData<Message[]>(
      keys.chat.messages("chat-1"),
    );
    expect(messages?.map(({ id, server_id }) => ({ id, server_id }))).toEqual([
      { id: "failed", server_id: undefined },
      { id: "error", server_id: undefined },
      { id: "retry", server_id: "m-saved" },
    ]);
  });
});
