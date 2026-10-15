import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@test/render";
import { renderApp } from "@test/router";
import { AuthRoutes } from "@config/routes";
import { jsonResponse, mockApi } from "@test/api";

// AUTH-06 (docs/auth.trd.md) on the real route tree, signed out, with the
// network faked at fetch.

const EMAIL = "ana@e2e.test";

async function ask() {
  await userEvent.type(await screen.findByLabelText("Email"), EMAIL);
  await userEvent.click(screen.getByRole("button", { name: "Trimite codul" }));
}

describe("AUTH-06 Forgot password", () => {
  test("AUTH-06 sent: continues to the reset screen with the email", async () => {
    mockApi({ "POST /auth/forgot-password": { ok: true } });
    const { router } = await renderApp({ at: "/forgot", signedIn: false });

    await ask();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(AuthRoutes.Reset),
    );
    expect(router.state.location.search).toEqual({ email: EMAIL });
  });

  test("AUTH-06 failed (S6): a refused request shows an alert and keeps the email", async () => {
    mockApi({
      "POST /auth/forgot-password": jsonResponse(
        { error: "too_many_requests", retry_after: 3600 },
        429,
      ),
    });
    const { router } = await renderApp({ at: "/forgot", signedIn: false });

    await ask();

    // O3: `too_many_requests` has no copy of its own yet, so the default (C3).
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A apărut o eroare. Încearcă din nou.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
    expect(router.state.location.pathname).toBe(AuthRoutes.Forgot);
  });
});
