import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@test/render";
import { renderApp } from "@test/router";
import { jsonResponse, mockApi, shellApi, testUser } from "@test/api";

// ADMIN-09 (docs/admin.trd.md) on the real route tree, with the network faked
// at fetch.

const admin = () => shellApi(testUser({ role: "admin" }));

// The box is named by its label, which also holds the description below it.
const AUTO_ACTIVATE = /^Activează automat conturile noi/;

describe("ADMIN-09 Settings", () => {
  test("ADMIN-09 load failed (S17): a setting that cannot load shows an error with a retry, never an editable “off”", async () => {
    let available = false;
    mockApi({
      ...admin(),
      "GET /admin/settings": () =>
        available
          ? { auto_activate_users: true }
          : jsonResponse({ error: "Serviciul nu este disponibil." }, 500),
    });
    await renderApp({ at: "/admin/settings" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nu am putut încărca pagina.",
    );
    expect(
      screen.queryByRole("checkbox", { name: AUTO_ACTIVATE }),
    ).not.toBeInTheDocument();

    available = true;
    await userEvent.click(screen.getByRole("button", { name: "Reîncearcă" }));
    const box = await screen.findByRole("checkbox", { name: AUTO_ACTIVATE });
    expect(box).toBeChecked();
    expect(box).toBeEnabled();
  });

  test("ADMIN-09 failed (S8): a refused change is announced; the box stays off", async () => {
    mockApi({
      ...admin(),
      "GET /admin/settings": { auto_activate_users: false },
      "POST /admin/settings": jsonResponse(
        { error: "Serviciul nu este disponibil." },
        500,
      ),
    });
    await renderApp({ at: "/admin/settings" });

    const box = await screen.findByRole("checkbox", { name: AUTO_ACTIVATE });
    await userEvent.click(box);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nu am putut salva setarea. Încearcă din nou.",
    );
    expect(box).not.toBeChecked();
  });
});
