import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Global test setup. Deliberately small: each stub fills a gap jsdom has, not a
 * behaviour the app should be shielded from. See the `testing` skill, Rule 3.
 */

// `globals: false`, so RTL registers no cleanup of its own. Without this a
// component from one test is still mounted during the next.
afterEach(cleanup);

// The bearer token lives in localStorage (`api/http.ts`); a token left by one
// test would sign the next one in.
beforeEach(() => {
  localStorage.clear();
});

/** `(max-width: 1279px)`, `(min-width: 768px)` and their combination. */
function widthMatches(query: string, width: number): boolean {
  const max = query.match(/max-width:\s*(\d+)px/);
  const min = query.match(/min-width:\s*(\d+)px/);
  if (!max && !min) return false;
  return (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]));
}

// jsdom has no matchMedia. `react-responsive` (`hooks/core.hooks.ts`) reads it
// for the sidebar's mobile collapse, and `motion` for reduced motion. Width
// queries are answered against window.innerWidth, a desktop 1440 here (the
// stories smoke test sets a story's viewport width); reduced motion always
// matches so animations finish instantly. react-responsive keeps this function
// from module load, so it reads the width on each call rather than being
// replaced later.
Object.defineProperty(window, "innerWidth", {
  writable: true,
  configurable: true,
  value: 1440,
});
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches:
      query.includes("prefers-reduced-motion") ||
      widthMatches(query, window.innerWidth),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// jsdom lays nothing out and has no scrollIntoView; the chat scrolls its last
// message into view on every update.
Element.prototype.scrollIntoView = function scrollIntoView() {};
window.scrollTo = () => {};

// jsdom has no object URLs, and Node's own URL.createObjectURL throws on a
// jsdom File (not a Node Blob). The chat previews a pasted screenshot with one
// (`LocalImagePreview`), and downloads go through one (`utils/download.ts`).
URL.createObjectURL = () => "blob:jsdom";
URL.revokeObjectURL = () => {};

// jsdom has no innerText (it depends on layout). The chat composer is a
// contentEditable that reads it; textContent is what it amounts to without CSS.
Object.defineProperty(HTMLElement.prototype, "innerText", {
  configurable: true,
  get(this: HTMLElement) {
    return this.textContent ?? "";
  },
  set(this: HTMLElement, value: string) {
    this.textContent = value;
  },
});

// `api/http.ts` reads the API base at module scope. A fixed origin keeps tests
// independent of the developer's `.env`, and `mockApi` matches on pathnames.
(import.meta.env as unknown as { VITE_API_URL: string }).VITE_API_URL =
  "http://api.test";
