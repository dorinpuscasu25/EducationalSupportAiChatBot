import assert from "node:assert/strict";
import { test } from "vitest";

import {
  canShowAssistantActions,
  type AssistantCompletionState,
} from "./message-state";

test("shows export actions only after the assistant response is persisted", () => {
  const streaming: AssistantCompletionState = {
    role: "assistant",
    content: "Raport în curs de generare",
    complete: false,
  };
  assert.equal(canShowAssistantActions(streaming), false);
  assert.equal(canShowAssistantActions({ ...streaming, complete: true }), true);
  assert.equal(
    canShowAssistantActions({
      ...streaming,
      complete: true,
      error: true,
    }),
    false,
  );
});
