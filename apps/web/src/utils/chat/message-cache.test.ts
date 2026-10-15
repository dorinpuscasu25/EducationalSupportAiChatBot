import assert from "node:assert/strict";
import { test } from "vitest";

import { mergeHydratedMessages } from "./message-cache";

type TestMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  server_id?: string;
  complete?: boolean;
  files?: { name: string }[];
  attachments?: { id: string; file_name: string }[];
};

test("keeps the optimistic question while hydration catches up", () => {
  const optimistic: TestMessage = {
    id: "local-1",
    role: "user",
    content: "Când începe cursul?",
  };
  assert.deepEqual(mergeHydratedMessages([optimistic], []), [optimistic]);

  const merged = mergeHydratedMessages(
    [optimistic],
    [{ id: "server-1", role: "user", content: "Când începe cursul?" }],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "local-1");
  assert.equal(merged[0].server_id, "server-1");
});

test("server hydration wins over a stale incomplete local response", () => {
  const merged = mergeHydratedMessages(
    [
      {
        id: "local-assistant",
        server_id: "server-assistant",
        role: "assistant",
        content: "Raport complet",
        complete: false,
      },
    ],
    [
      {
        id: "server-assistant",
        role: "assistant",
        content: "Raport complet",
        complete: true,
      },
    ],
  );

  assert.equal(merged[0].complete, true);
});

test("CHAT-01 / S38 a question of several lines matches its CRLF server copy", () => {
  const merged = mergeHydratedMessages<TestMessage>(
    [{ id: "local-1", role: "user", content: "Primul rând\nal doilea" }],
    [{ id: "server-1", role: "user", content: "Primul rând\r\nal doilea" }],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "local-1");
  assert.equal(merged[0].server_id, "server-1");
});
