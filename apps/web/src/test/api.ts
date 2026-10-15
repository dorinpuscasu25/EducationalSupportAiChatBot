import { vi } from "vitest";
import type { User } from "@api/auth/response";

/**
 * A fake API for tests: replaces `fetch`, so everything above `api/http.ts`
 * (React Query, the router, the containers) runs for real.
 *
 * Keyed by `METHOD pathname`, written exactly as the `*Api` clients write their
 * paths: `"GET /chats"`, `"POST /chats/start/stream"`. A query string never has
 * to be spelled out. A value is the JSON body of a 200; a `Response` is sent
 * as is; a function receives the call and returns either (or a promise of
 * one). An unlisted request answers 404, so a screen fails visibly instead of
 * hanging.
 */
export type ApiCall = {
  method: string;
  path: string;
  query: Record<string, string>;
  /** Parsed JSON, the FormData itself, or undefined. */
  body: unknown;
  headers: Headers;
};

type Answer = unknown | Response | ((call: ApiCall) => unknown);

export const API_ORIGIN = "http://api.test";

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const noContent = () => new Response(null, { status: 204 });

let calls: ApiCall[] = [];

function toCall(input: RequestInfo | URL, init?: RequestInit): ApiCall {
  const url = new URL(String(input), API_ORIGIN);
  let body: unknown = init?.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      /* keep the raw string */
    }
  }
  return {
    method: (init?.method ?? "GET").toUpperCase(),
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body,
    headers: new Headers(init?.headers),
  };
}

export function mockApi(routes: Record<string, Answer>) {
  calls = [];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = toCall(input, init);
      calls.push(call);
      const answer = routes[`${call.method} ${call.path}`];
      if (answer === undefined) {
        return jsonResponse({ error: "not_found" }, 404);
      }
      const value = await (typeof answer === "function"
        ? (answer as (call: ApiCall) => unknown)(call)
        : answer);
      return value instanceof Response ? value.clone() : jsonResponse(value);
    },
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Every request the fake answered, in order. */
export const apiCalls = () => calls;

/**
 * One event of a chat stream, as the backend writes it: named events carry an
 * `event:` line and one-line JSON; text has no name and is a JSON string.
 * `{ wait }` holds the stream open until the promise settles, so a test can act
 * while a reply is in flight.
 */
export type SseEvent =
  | { event: string; data: unknown }
  | { text: string }
  | { wait: Promise<unknown> };

export function sseResponse(events: SseEvent[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const item of events) {
        if ("wait" in item) {
          await item.wait;
          continue;
        }
        const frame =
          "text" in item
            ? `data: ${JSON.stringify(item.text)}\n\n`
            : `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`;
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** A promise a test resolves by hand: `const gate = deferred(); … gate.resolve()`. */
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

const NOW = "2026-01-01T00:00:00Z";

export const testUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  first_name: "Ana",
  last_name: "Test",
  email: "ana@e2e.test",
  phone: "+37360000000",
  avatar: "",
  language: "ro",
  role: "user",
  status: "active",
  quota: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

/**
 * The answers every signed-in screen needs: the user (StatusGuard, sidebar)
 * and the sidebar's conversations.
 * Spread it under a test's own routes: `mockApi({ ...shellApi(), … })`.
 */
export function shellApi(user: User = testUser()): Record<string, Answer> {
  return {
    "GET /users/me": user,
    "GET /chats": [],
  };
}
