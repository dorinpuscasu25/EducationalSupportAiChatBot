import assert from "node:assert/strict";
import { test } from "vitest";

import { toStreamEvent } from "./stream-events";

test("keeps unnamed message chunks as tokens", () => {
  assert.deepEqual(toStreamEvent(null, "răspuns"), {
    event: "message",
    data: "răspuns",
  });
});

test("parses chat_created, assistant_saved and done", () => {
  assert.deepEqual(toStreamEvent("chat_created", { chat_id: "c1" }), {
    event: "chat_created",
    data: { chat_id: "c1" },
  });
  assert.deepEqual(toStreamEvent("assistant_saved", { message_id: "m1" }), {
    event: "assistant_saved",
    data: { message_id: "m1" },
  });
  const done = { user_message_id: "u1", sources: [] };
  assert.deepEqual(toStreamEvent("done", done), { event: "done", data: done });
});

test("ignores unknown events", () => {
  assert.equal(toStreamEvent("tool_start", {}), null);
});
