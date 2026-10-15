import assert from "node:assert/strict";
import { test } from "vitest";

import {
  confirmPasswordError,
  passwordError,
  phoneError,
  requiredError,
} from "./validation";

test("validates passwords, confirmations and phones", () => {
  assert.equal(passwordError("parola123"), undefined);
  assert.ok(passwordError("scurt"));
  assert.ok(passwordError("faracifre"));
  assert.equal(confirmPasswordError("a", "a"), undefined);
  assert.equal(confirmPasswordError("a", "b"), "Parolele nu coincid.");
  assert.equal(phoneError("+37360123456"), undefined);
  assert.ok(phoneError("+3736"));
  assert.ok(requiredError("   "));
});
