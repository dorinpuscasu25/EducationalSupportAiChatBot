import assert from "node:assert/strict";
import { test } from "vitest";

import { errorMessage, errorText, DEFAULT_ERROR_MESSAGE } from "./errors";

test("maps backend error codes to Romanian copy", () => {
  assert.equal(
    errorMessage(new Error("invalid_credentials")),
    "Email sau parolă incorecte.",
  );
  assert.equal(errorMessage(new Error("unknown_code")), DEFAULT_ERROR_MESSAGE);
  assert.equal(
    errorMessage(new Error("unknown_code"), "Cod invalid sau expirat."),
    "Cod invalid sau expirat.",
  );
});

test("CHAT-16 / S46 a streamed error shows a sentence, never a bare code", () => {
  assert.equal(errorText("some_unknown_code"), DEFAULT_ERROR_MESSAGE);
  assert.match(errorText("quota_exceeded"), /limita de utilizare/);
  assert.equal(errorText("invalid_credentials"), "Email sau parolă incorecte.");
  assert.equal(
    errorText("Serviciul nu este disponibil momentan. Încearcă din nou."),
    "Serviciul nu este disponibil momentan. Încearcă din nou.",
  );
  assert.equal(errorText(""), DEFAULT_ERROR_MESSAGE);
});
