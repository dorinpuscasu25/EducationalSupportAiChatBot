import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@test/render";
import { renderApp } from "@test/router";
import { apiCalls, jsonResponse, mockApi } from "@test/api";

// AUTH-03 (docs/auth.trd.md) on the real route tree, signed out, with the
// network faked at fetch.

const EMAIL = "ana@e2e.test";

describe("AUTH-03 Resend the verification code", () => {
  test("AUTH-03 cooling down: a resent code starts the 60-second countdown", async () => {
    mockApi({ "POST /auth/resend-code": { ok: true } });
    await renderApp({ at: `/verify?email=${EMAIL}`, signedIn: false });

    await userEvent.click(
      await screen.findByRole("button", { name: "Retrimite codul" }),
    );

    expect(
      await screen.findByRole("button", { name: "Retrimite codul (60s)" }),
    ).toBeDisabled();
    expect(apiCalls().at(-1)).toMatchObject({
      method: "POST",
      path: "/auth/resend-code",
      body: { email: EMAIL },
    });
  });

  test("AUTH-03 failed (S6): a refused resend shows a message and does not start the countdown", async () => {
    mockApi({
      "POST /auth/resend-code": jsonResponse(
        { error: "too_many_requests", retry_after: 3600 },
        429,
      ),
    });
    await renderApp({ at: `/verify?email=${EMAIL}`, signedIn: false });

    await userEvent.click(
      await screen.findByRole("button", { name: "Retrimite codul" }),
    );

    // O3: `too_many_requests` has no copy of its own yet, so the default (C3).
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A apărut o eroare. Încearcă din nou.",
    );
    expect(screen.queryByText("too_many_requests")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retrimite codul" }),
    ).toBeEnabled();
  });
});
