import { describe, expect, test, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@test/render";
import { renderApp } from "@test/router";
import { apiCalls, mockApi, noContent, shellApi } from "@test/api";

// The app shell on the real route tree, with the network faked at fetch.

const NOW = "2026-01-01T00:00:00Z";

const chat = (id: string, title: string) => ({
  id,
  title,
  created_at: NOW,
  updated_at: NOW,
});

const ORAR = chat("s1", "Orarul modulului 2");
const TEMA = chat("s2", "Tema pentru acasă");

function shell(routes: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({ ...shellApi(), "GET /chats": [ORAR, TEMA], ...routes });
}

/** The app at `at`, once the sidebar has its data. */
async function open(at: string) {
  const app = await renderApp({ at });
  await screen.findByRole(
    "button",
    { name: "Conversație nouă" },
    { timeout: 5_000 },
  );
  return app;
}

const SLOW = { timeout: 20_000 };

describe("SHELL Sidebar conversations", SLOW, () => {
  test("the conversation in the URL is aria-current, the others are not", async () => {
    shell({ "GET /chats/s1": { ...ORAR, messages: [] } });
    await open("/sessions?chatId=s1");

    expect(
      await screen.findByRole("button", { name: ORAR.title }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: TEMA.title }),
    ).not.toHaveAttribute("aria-current");
  });

  test("a conversation is opened from the sidebar", async () => {
    shell({ "GET /chats/s2": { ...TEMA, messages: [] } });
    const { router } = await open("/sessions");

    await userEvent.click(
      await screen.findByRole("button", { name: TEMA.title }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ chatId: "s2" }),
    );
  });

  test("deleting the open conversation asks first and returns to a new one", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    shell({
      "GET /chats/s1": { ...ORAR, messages: [] },
      "DELETE /chats/s1": noContent(),
    });
    const { router } = await open("/sessions?chatId=s1");

    await userEvent.click(
      await screen.findByRole("button", {
        name: `Șterge conversația ${ORAR.title}`,
      }),
    );
    await waitFor(() =>
      expect(
        apiCalls().some((c) => c.method === "DELETE" && c.path === "/chats/s1"),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ chatId: undefined }),
    );
  });

  test("an unknown path says so inside the shell", async () => {
    shell();
    await open("/sessions/unknown");

    expect(await screen.findByText("Not Found")).toBeInTheDocument();
  });
});
