import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@test/render";
import { renderApp } from "@test/router";
import { SessionsRoutes } from "@config/routes";
import {
  apiCalls,
  deferred,
  jsonResponse,
  mockApi,
  shellApi,
  sseResponse,
  type SseEvent,
} from "@test/api";

// CHAT (docs/chat.trd.md) on the real route tree, with the network faked at
// fetch: the stream, the loader and the cache run as they ship.

const NOW = "2026-01-01T00:00:00Z";
const QUESTION = "Ce prevede contractul de muncă?";
const REPLY = "Acesta este un răspuns de test.";
const FOLLOW_UP = "Și pentru contractul de închiriere?";
const SECOND_REPLY = "Al doilea răspuns de test.";

type ServerMessage = ReturnType<typeof message>;

const message = (id: string, role: "user" | "assistant", content: string) => ({
  id,
  chat_id: "chat-1",
  role,
  content,
  created_at: NOW,
});

const chat = (...messages: ServerMessage[]) => ({
  id: "chat-1",
  title: "Conversație nouă",
  created_at: NOW,
  updated_at: NOW,
  messages,
});

/** A whole turn as the backend streams it. */
function turn(
  answer: string,
  user: ServerMessage,
  { created = true }: { created?: boolean } = {},
): SseEvent[] {
  return [
    ...(created
      ? [{ event: "chat_created", data: { chat_id: "chat-1" } }]
      : []),
    { text: answer },
    {
      event: "assistant_saved",
      data: {
        message_id: `saved-${user.id}`,
        grounding_status: "not_required",
      },
    },
    {
      event: "done",
      data: { sources: null, user_message_id: user.id, user_message: user },
    },
  ];
}

const composer = () => screen.findByRole("textbox", { name: "Întrebarea ta" });

async function ask(text: string) {
  await userEvent.click(await composer());
  await userEvent.keyboard(`${text}{Enter}`);
}

const userQuestion = message("m-user", "user", QUESTION);

describe("CHAT-01 Start a session", () => {
  test("CHAT-01 sending → created → answered: the question at once, then the reply, once each", async () => {
    const created = deferred();
    const reply = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([
          { wait: created.promise },
          { event: "chat_created", data: { chat_id: "chat-1" } },
          { wait: reply.promise },
          ...turn(REPLY, userQuestion, { created: false }),
        ]),
      "GET /chats/chat-1": chat(userQuestion),
    });
    const { router } = await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    // Before the server has answered anything, only the client can show it.
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Pregătesc răspunsul" }),
    ).toBeInTheDocument();

    created.resolve();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ chatId: "chat-1" }),
    );

    reply.resolve();
    expect(await screen.findByText(REPLY)).toBeInTheDocument();
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
    expect(screen.getAllByText(REPLY)).toHaveLength(1);
  });

  test("CHAT-01 answered (S35): a reply that ends before the chat's server copy loads does not crash", async () => {
    const snapshot = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () => sseResponse(turn(REPLY, userQuestion)),
      "GET /chats/chat-1": async () => {
        await snapshot.promise;
        return chat(userQuestion, message("saved-m-user", "assistant", REPLY));
      },
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(await screen.findByText(REPLY)).toBeInTheDocument();
    snapshot.resolve();

    await waitFor(() => expect(screen.getAllByText(REPLY)).toHaveLength(1));
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
  });

  test("CHAT-01 answered (S36): an answer that arrives before the server copy is not blanked by it", async () => {
    const snapshot = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () => sseResponse(turn(REPLY, userQuestion)),
      // A copy read before the answer was saved.
      "GET /chats/chat-1": async () => {
        await snapshot.promise;
        return chat(userQuestion);
      },
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(await screen.findByText(REPLY)).toBeInTheDocument();
    snapshot.resolve();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText(REPLY)).toBeInTheDocument();
    expect(screen.queryByText(/Pregătesc răspunsul…/)).not.toBeInTheDocument();
  });

  test("CHAT-01 answered (S38): a question of several lines shows once", async () => {
    // The server stores what multipart sent: CRLF line breaks.
    const stored = message("m-user", "user", "Primul rând\r\nal doilea rând");
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () => sseResponse(turn(REPLY, stored)),
      "GET /chats/chat-1": chat(stored),
    });
    await renderApp({ at: "/sessions" });

    await userEvent.click(await composer());
    await userEvent.keyboard(
      "Primul rând{Shift>}{Enter}{/Shift}al doilea rând{Enter}",
    );

    expect(await screen.findByText(REPLY)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const questions = screen
      .getAllByRole("article")
      .filter((article) => article.textContent?.includes("al doilea rând"));
    expect(questions).toHaveLength(1);
  });
});

describe("CHAT-16 Failures are visible", () => {
  test("CHAT-16 refused (S2): a request the API refuses shows under the question", async () => {
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": jsonResponse(
        { error: "module_not_entitled" },
        403,
      ),
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(
      await screen.findByText("Răspunsul nu a putut fi generat"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Încearcă din nou" }),
    ).toBeInTheDocument();
  });

  test("CHAT-16 stream error (S37): an error before the chat exists is shown", async () => {
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([{ event: "error", data: "Resursa nu este disponibilă." }]),
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(
      await screen.findByText("Eroare: Resursa nu este disponibilă."),
    ).toBeInTheDocument();
  });

  test("CHAT-16 stream error (S46): a bare code is never shown", async () => {
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([
          { event: "chat_created", data: { chat_id: "chat-1" } },
          { event: "error", data: "quota_exceeded" },
        ]),
      "GET /chats/chat-1": chat(userQuestion),
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(
      await screen.findByText("Răspunsul nu a putut fi generat"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/quota_exceeded/)).not.toBeInTheDocument();
  });

  test("CHAT-16 stream error (S53): a stream that stops before `done` is a failure, not a reply in progress", async () => {
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([
          { event: "chat_created", data: { chat_id: "chat-1" } },
          { text: "Început de răspuns" },
        ]),
      "GET /chats/chat-1": chat(userQuestion),
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(
      await screen.findByText("Răspunsul nu a putut fi generat"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Încearcă din nou" }),
    ).toBeEnabled();
  });

  test("CHAT-16 retried (S54): the failed attempt stays above the retry and its answer when the chat reloads", async () => {
    const first = message("m-user", "user", QUESTION);
    const firstReply = message("m-reply", "assistant", REPLY);
    const followUp = message("m-follow", "user", FOLLOW_UP);
    const reply = deferred();
    let snapshot = chat(first, firstReply);
    let sends = 0;
    mockApi({
      ...shellApi(),
      "GET /chats/chat-1": () => snapshot,
      "POST /chats/chat-1/messages/stream": () => {
        sends += 1;
        if (sends === 1) {
          return jsonResponse({ error: "too_many_requests" }, 429);
        }
        // The question is saved before the reply streams.
        snapshot = chat(first, firstReply, followUp);
        return sseResponse([
          { wait: reply.promise },
          ...turn(SECOND_REPLY, followUp, { created: false }),
        ]);
      },
    });
    const { router, queryClient } = await renderApp({
      at: "/sessions?chatId=chat-1",
    });
    const reload = async () => {
      await router.invalidate();
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    };

    await ask(FOLLOW_UP);
    await userEvent.click(
      await screen.findByRole("button", { name: "Încearcă din nou" }),
    );
    // The chat reloads while the retry streams (a hover, a revisit)…
    await waitFor(() => expect(sends).toBe(2));
    await reload();
    reply.resolve();
    expect(await screen.findByText(SECOND_REPLY)).toBeInTheDocument();
    snapshot = chat(
      first,
      firstReply,
      followUp,
      message("saved-m-follow", "assistant", SECOND_REPLY),
    );
    // …and again once it is answered.
    await reload();

    const page = document.body.textContent ?? "";
    const failure = page.indexOf("Răspunsul nu a putut fi generat");
    expect(page.indexOf(FOLLOW_UP)).toBeLessThan(failure);
    expect(page.lastIndexOf(FOLLOW_UP)).toBeGreaterThan(failure);
    expect(page.indexOf(SECOND_REPLY)).toBeGreaterThan(
      page.lastIndexOf(FOLLOW_UP),
    );
    expect(screen.getAllByText(FOLLOW_UP)).toHaveLength(2);
    expect(screen.getAllByText(SECOND_REPLY)).toHaveLength(1);
  });
});

describe("CHAT-18 Behaviour during a reply", () => {
  test("CHAT-18 elsewhere (S1): preloading the blank chat mid-reply keeps the conversation", async () => {
    const reply = deferred();
    mockApi({
      ...shellApi(),
      "GET /chats/chat-1": chat(
        userQuestion,
        message("m-reply", "assistant", REPLY),
      ),
      "POST /chats/chat-1/messages/stream": () =>
        sseResponse([
          { wait: reply.promise },
          ...turn(SECOND_REPLY, message("m-follow", "user", FOLLOW_UP), {
            created: false,
          }),
        ]),
    });
    const { router } = await renderApp({ at: "/sessions?chatId=chat-1" });

    await ask(FOLLOW_UP);
    expect(await screen.findByText(FOLLOW_UP)).toBeInTheDocument();
    // What hovering the logo does: run the blank chat's loader.
    await router.preloadRoute({
      to: SessionsRoutes.Sessions,
      search: { chatId: undefined },
    });
    reply.resolve();

    expect(await screen.findByText(SECOND_REPLY)).toBeInTheDocument();
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
    expect(screen.getByText(REPLY)).toBeInTheDocument();
  });

  test("CHAT-18 in flight (S52): an earlier failure's “Încearcă din nou” cannot send while a reply is in flight", async () => {
    const reply = deferred();
    let sends = 0;
    mockApi({
      ...shellApi(),
      "GET /chats/chat-1": chat(
        userQuestion,
        message("m-reply", "assistant", REPLY),
      ),
      "POST /chats/chat-1/messages/stream": () => {
        sends += 1;
        if (sends === 1) {
          return jsonResponse({ error: "too_many_requests" }, 429);
        }
        return sseResponse([
          { wait: reply.promise },
          ...turn(SECOND_REPLY, message("m-follow", "user", FOLLOW_UP), {
            created: false,
          }),
        ]);
      },
    });
    await renderApp({ at: "/sessions?chatId=chat-1" });

    await ask(FOLLOW_UP);
    const retry = await screen.findByRole("button", {
      name: "Încearcă din nou",
    });
    await ask(FOLLOW_UP);
    await waitFor(() => expect(sends).toBe(2));

    expect(retry).toBeDisabled();
    await userEvent.click(retry);
    expect(sends).toBe(2);
    reply.resolve();
    expect(await screen.findByText(SECOND_REPLY)).toBeInTheDocument();
    expect(retry).toBeEnabled();
  });

  test("CHAT-18 back (S51): a blank chat left before its question became a chat is empty again", async () => {
    const created = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([{ wait: created.promise }, ...turn(REPLY, userQuestion)]),
      "GET /chats/chat-1": chat(
        userQuestion,
        message(`saved-${userQuestion.id}`, "assistant", REPLY),
      ),
      "GET /chats/chat-2": {
        ...chat(message("m-other", "user", FOLLOW_UP)),
        id: "chat-2",
      },
    });
    const { router } = await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    await router.navigate({
      to: SessionsRoutes.Sessions,
      search: { chatId: "chat-2" },
    });
    expect(await screen.findByText(FOLLOW_UP)).toBeInTheDocument();
    created.resolve();
    // Answered while the user was elsewhere: it lives in the chat now.
    await waitFor(() =>
      expect(
        apiCalls().filter((call) => call.path === "/chats").length,
      ).toBeGreaterThan(2),
    );

    router.history.back();
    expect(await screen.findByText("Cu ce te pot ajuta?")).toBeInTheDocument();
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Pregătesc răspunsul" }),
    ).toBeNull();
  });

  test("CHAT-18 in flight (S12): Enter does not send a second question", async () => {
    const reply = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([
          { event: "chat_created", data: { chat_id: "chat-1" } },
          { wait: reply.promise },
          ...turn(REPLY, userQuestion, { created: false }),
        ]),
      "GET /chats/chat-1": chat(userQuestion),
    });
    await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    await ask(FOLLOW_UP);
    reply.resolve();
    expect(await screen.findByText(REPLY)).toBeInTheDocument();
    expect(apiCalls().filter((call) => call.method === "POST")).toHaveLength(1);
  });

  test("CHAT-18 elsewhere (S3): a new conversation mid-reply is usable, and the user is not pulled back", async () => {
    const created = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([{ wait: created.promise }, ...turn(REPLY, userQuestion)]),
      "GET /chats/chat-1": chat(userQuestion),
    });
    const { router } = await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();

    // "Conversație nouă" from the blank chat itself: a fresh, empty draft.
    await userEvent.click(
      screen.getByRole("button", { name: "Conversație nouă" }),
    );
    expect(await screen.findByText("Cu ce te pot ajuta?")).toBeInTheDocument();
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Pregătesc răspunsul" }),
    ).toBeNull();

    created.resolve();
    // The old chat is created and listed, but the user stays where they are.
    await waitFor(() =>
      expect(
        apiCalls().filter((call) => call.path === "/chats").length,
      ).toBeGreaterThan(1),
    );
    expect(router.state.location.search).toEqual({});
    expect(screen.getByText("Cu ce te pot ajuta?")).toBeInTheDocument();
  });

  test("CHAT-18 in flight (S13): a draft typed while waiting survives the chat being created", async () => {
    const created = deferred();
    const reply = deferred();
    mockApi({
      ...shellApi(),
      "POST /chats/start/stream": () =>
        sseResponse([
          { wait: created.promise },
          { event: "chat_created", data: { chat_id: "chat-1" } },
          { wait: reply.promise },
          ...turn(REPLY, userQuestion, { created: false }),
        ]),
      "GET /chats/chat-1": chat(userQuestion),
    });
    const { router } = await renderApp({ at: "/sessions" });

    await ask(QUESTION);
    await userEvent.click(await composer());
    await userEvent.keyboard("ciornă");
    created.resolve();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ chatId: "chat-1" }),
    );

    expect(await composer()).toHaveTextContent("ciornă");
    reply.resolve();
  });
});

describe("CHAT-02 Follow-up in a session", () => {
  test("CHAT-02 answered (S4): reopening the chat shows the turns sent since", async () => {
    const first = message("m-user", "user", QUESTION);
    const firstReply = message("m-reply", "assistant", REPLY);
    const followUp = message("m-follow", "user", FOLLOW_UP);
    let snapshot = chat(first, firstReply);
    mockApi({
      ...shellApi(),
      "GET /chats/chat-1": () => snapshot,
      "POST /chats/chat-1/messages/stream": () => {
        snapshot = chat(
          first,
          firstReply,
          followUp,
          message("saved-m-follow", "assistant", SECOND_REPLY),
        );
        return sseResponse(turn(SECOND_REPLY, followUp, { created: false }));
      },
    });
    const { router } = await renderApp({ at: "/sessions?chatId=chat-1" });

    await ask(FOLLOW_UP);
    expect(await screen.findByText(SECOND_REPLY)).toBeInTheDocument();

    await router.navigate({
      to: SessionsRoutes.Sessions,
      search: { chatId: undefined },
    });
    expect(await screen.findByText("Cu ce te pot ajuta?")).toBeInTheDocument();
    await router.navigate({
      to: SessionsRoutes.Sessions,
      search: { chatId: "chat-1" },
    });

    expect(await screen.findByText(SECOND_REPLY)).toBeInTheDocument();
    expect(screen.getAllByText(FOLLOW_UP)).toHaveLength(1);
    expect(screen.getAllByText(SECOND_REPLY)).toHaveLength(1);
  });
});
