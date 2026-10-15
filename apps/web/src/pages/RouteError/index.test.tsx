import { expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@test/render";
import { renderApp } from "@test/router";
import { jsonResponse, mockApi, shellApi } from "@test/api";

test("SHELL-09 failed (S7): a chat that cannot load shows an error with a retry, inside the shell", async () => {
  let available = false;
  mockApi({
    ...shellApi(),
    "GET /chats/chat-1": () =>
      available
        ? {
            id: "chat-1",
            title: "Conversație nouă",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            messages: [
              {
                id: "m1",
                chat_id: "chat-1",
                role: "user",
                content: "Întrebarea salvată",
                created_at: "2026-01-01T00:00:00Z",
              },
            ],
          }
        : jsonResponse({ error: "Resursa nu este disponibilă." }, 404),
  });
  await renderApp({ at: "/sessions?chatId=chat-1" });

  expect(
    await screen.findByText("Nu am putut încărca pagina."),
  ).toBeInTheDocument();
  // The shell is still there: the sidebar's actions work.
  expect(
    screen.getByRole("button", { name: "Conversație nouă" }),
  ).toBeInTheDocument();

  available = true;
  await userEvent.click(screen.getByRole("button", { name: "Reîncearcă" }));
  expect(await screen.findByText("Întrebarea salvată")).toBeInTheDocument();
});
