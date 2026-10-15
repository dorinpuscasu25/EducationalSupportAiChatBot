import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@test/render";
import { renderApp } from "@test/router";
import { jsonResponse, mockApi, shellApi, testUser } from "@test/api";
import type { User } from "@api/auth/response";

// ADMIN-05 (docs/admin.trd.md) on the real route tree, with the network faked
// at fetch: the detail query and every action run as they ship.

const admin = () => ({
  ...shellApi(testUser({ id: "admin-1", role: "admin" })),
  "GET /admin/users/u-1/sessions": [],
});

const detail = (user: User) => ({
  user,
  quota: null,
  session_count: 0,
  tokens_total: 0,
  recent_usage: [],
  recent_sessions: [],
});

const LAST_ACTIVE_ADMIN =
  "Ultimul administrator activ nu poate fi suspendat sau retrogradat.";
const DEFAULT_ERROR = "A apărut o eroare. Încearcă din nou.";

/** What the backend answers when something breaks on its side. */
const serverError = () =>
  jsonResponse(
    { error: "Serviciul nu este disponibil momentan. Referință: test" },
    500,
  );

describe("ADMIN-05 User detail", () => {
  test("ADMIN-05 failed (S17): an unknown id shows an error, not “Se încarcă…”, and Listă still goes back", async () => {
    // Unlisted, so the detail answers 404, as the backend does for an unknown id.
    mockApi({ ...admin(), "GET /admin/users": [] });
    const { router } = await renderApp({ at: "/admin/users/missing" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nu am putut încărca pagina.",
    );
    expect(screen.queryByText("Se încarcă…")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Listă" }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/admin/users"),
    );
  });

  test("ADMIN-05 failed (S17): Reîncearcă loads the detail again", async () => {
    let available = false;
    const user = testUser({ id: "u-1", first_name: "Ion", last_name: "Rusu" });
    mockApi({
      ...admin(),
      "GET /admin/users/u-1/detail": () =>
        available ? detail(user) : serverError(),
    });
    await renderApp({ at: "/admin/users/u-1" });

    await screen.findByRole("alert");
    available = true;
    await userEvent.click(screen.getByRole("button", { name: "Reîncearcă" }));
    expect(
      await screen.findByRole("heading", { name: "Ion Rusu" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test.each([
    {
      action: "activate",
      user: { status: "pending" as const },
      button: "Activează contul",
      answer: serverError,
      copy: DEFAULT_ERROR,
    },
    {
      action: "suspend",
      user: {},
      button: "Suspendă contul",
      answer: () => jsonResponse({ error: LAST_ACTIVE_ADMIN }, 400),
      copy: LAST_ACTIVE_ADMIN,
    },
    {
      action: "suspend",
      user: {},
      button: "Suspendă contul",
      answer: serverError,
      copy: DEFAULT_ERROR,
    },
    {
      action: "role",
      user: { role: "admin" as const },
      button: "Scoate rolul admin",
      answer: () => jsonResponse({ error: LAST_ACTIVE_ADMIN }, 400),
      copy: LAST_ACTIVE_ADMIN,
    },
    {
      action: "role",
      user: {},
      button: "Promovează la admin",
      answer: serverError,
      copy: DEFAULT_ERROR,
    },
    {
      action: "send-reset",
      user: {},
      button: "Trimite resetare parolă",
      answer: serverError,
      copy: DEFAULT_ERROR,
    },
    {
      action: "quota",
      user: {},
      button: "Salvează limitele",
      answer: serverError,
      copy: DEFAULT_ERROR,
    },
  ])(
    "ADMIN-05 action failed (S6): $action refused → “$copy” next to “$button”",
    async ({ action, user: overrides, button, answer, copy }) => {
      const user = testUser({ id: "u-1", ...overrides });
      mockApi({
        ...admin(),
        "GET /admin/users/u-1/detail": detail(user),
        [`POST /admin/users/u-1/${action}`]: answer,
      });
      await renderApp({ at: "/admin/users/u-1" });

      await userEvent.click(
        await screen.findByRole("button", { name: button }),
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(copy);
      // Next to the control that triggered it, which can be pressed again.
      const control = screen.getByRole("button", { name: button });
      expect(alert.previousElementSibling).toBe(control);
      expect(control).toBeEnabled();
    },
  );

  test("ADMIN-05 action failed (S6): a new action clears the previous action's error", async () => {
    const user = testUser({ id: "u-1" });
    mockApi({
      ...admin(),
      "GET /admin/users/u-1/detail": detail(user),
      "POST /admin/users/u-1/role": serverError,
      "POST /admin/users/u-1/suspend": () =>
        jsonResponse({ error: LAST_ACTIVE_ADMIN }, 400),
    });
    await renderApp({ at: "/admin/users/u-1" });

    await userEvent.click(
      await screen.findByRole("button", { name: "Promovează la admin" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(DEFAULT_ERROR);
    await userEvent.click(
      screen.getByRole("button", { name: "Suspendă contul" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(LAST_ACTIVE_ADMIN),
    );
  });
});
