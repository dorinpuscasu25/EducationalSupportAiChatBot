import { describe, expect, test } from "vitest";
import { jsonResponse, mockApi } from "@test/api";
import { HTTP, getStoredToken, setStoredToken } from "./http";

async function drain(stream: AsyncGenerator<unknown>) {
  const events = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe("AUTH-04 / S30 a public endpoint's 401 is its own answer", () => {
  test("a wrong password rejects with the backend's code and signs nobody out", async () => {
    setStoredToken("a-working-session");
    mockApi({
      "POST /auth/login": jsonResponse({ error: "invalid_credentials" }, 401),
    });

    await expect(
      HTTP.post("/auth/login", { email: "a@b.c", password: "x" }, false),
    ).rejects.toThrow("invalid_credentials");
    expect(getStoredToken()).toBe("a-working-session");
  });
});

describe("AUTH-11 an authenticated 401 ends the session", () => {
  test("a request clears the token and rejects as unauthorized", async () => {
    setStoredToken("expired");
    mockApi({ "GET /users/me": jsonResponse({ error: "token_revoked" }, 401) });

    await expect(HTTP.get("/users/me")).rejects.toThrow("unauthorized");
    expect(getStoredToken()).toBeNull();
  });

  test("so does a chat stream (S2)", async () => {
    setStoredToken("expired");
    mockApi({
      "POST /chats/start/stream": jsonResponse({ error: "token_revoked" }, 401),
    });

    await expect(
      drain(
        HTTP.stream("/chats/start/stream", {
          method: "POST",
          data: new FormData(),
        }),
      ),
    ).rejects.toThrow("unauthorized");
    expect(getStoredToken()).toBeNull();
  });
});

describe("CHAT-16 a refused stream rejects with the backend's code", () => {
  test("so the chat can show why", async () => {
    setStoredToken("valid");
    mockApi({
      "POST /chats/start/stream": jsonResponse(
        { error: "module_not_entitled" },
        403,
      ),
    });

    await expect(
      drain(
        HTTP.stream("/chats/start/stream", {
          method: "POST",
          data: new FormData(),
        }),
      ),
    ).rejects.toThrow("module_not_entitled");
    expect(getStoredToken()).toBe("valid");
  });
});
