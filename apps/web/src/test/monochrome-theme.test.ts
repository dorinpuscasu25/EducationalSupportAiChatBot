import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// About the stylesheets rather than one module; Vitest runs from the repo root.
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("theme colors remain neutral", () => {
  const css = read("src/index.css");
  for (const [, hex] of css.matchAll(/--[\w-]+:\s*#([\da-f]{6})\s*;/gi)) {
    assert.equal(hex.slice(0, 2), hex.slice(2, 4));
    assert.equal(hex.slice(2, 4), hex.slice(4, 6));
  }
});

test("composer owns the focus ring instead of the editable text region", () => {
  const css = read("src/components/fields/ChatInput/style.module.css");
  assert.match(css, /\.composer:focus-within\s*\{[^}]*border-color:/);
  assert.match(
    css,
    /\.composer \.input\[contenteditable\]:focus-visible\s*\{\s*outline: none;/,
  );
});
