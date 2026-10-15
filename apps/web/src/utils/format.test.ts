import assert from "node:assert/strict";
import { test } from "vitest";

import {
  formatBytes,
  formatNumber,
  initialsOf,
  verificationCode,
} from "./format";

test("formats numbers, sizes and verification codes", () => {
  assert.equal(formatNumber(undefined), "—");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(verificationCode("12a-34 567"), "123456");
});

test("SHELL-06 avatar initials: first letters of the first and last name, in capitals", () => {
  assert.equal(initialsOf({ first_name: "ana", last_name: "Rusu" }), "AR");
  assert.equal(initialsOf({ first_name: "Ion", last_name: "" }), "I");
  assert.equal(initialsOf({ first_name: null, last_name: undefined }), "");
});
