import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@test/render";
import { renderApp } from "@test/router";
import {
  apiCalls,
  jsonResponse,
  mockApi,
  shellApi,
  testUser,
  type ApiCall,
} from "@test/api";

// ADMIN-02 (docs/admin.trd.md) on the real route tree, with the network faked
// at fetch: the role guard, the queries and the activation run as they ship.

const admin = () => shellApi(testUser({ role: "admin" }));

const metrics = {
  total_users: 12345,
  pending_users: 2,
  active_users: 12341,
  suspended_users: 2,
  assistant_responses: 10,
  helpful_feedback: 3,
  problem_feedback: 1,
  blocked_responses: 0,
  partial_responses: 0,
};

const pendingUser = (id: string, email: string) => ({
  ...testUser({ id, email, status: "pending", first_name: "Ion" }),
  session_count: 0,
  last_active_at: null,
});

const ION = pendingUser("u-ion", "ion@e2e.test");
const ANA = pendingUser("u-ana", "ana.p@e2e.test");

/** The users list, answering the pending filter the overview asks for. */
const users = ({ query }: ApiCall) =>
  query.status === "pending" ? [ION, ANA] : [];

/**
 * A pending account's row: the innermost block holding its email and a button
 * (rows have no list semantics).
 */
function row(email: string) {
  let element: HTMLElement | null = screen.getByText(email);
  while (element && !within(element).queryByRole("button")) {
    element = element.parentElement;
  }
  return within(element!);
}

/** What the backend answers when something breaks on its side. */
const serverError = () =>
  jsonResponse(
    { error: "Serviciul nu este disponibil momentan. Referință: test" },
    500,
  );

describe("ADMIN-02 Overview", () => {
  test("ADMIN-02 loaded (S8): each Aprobă is named for its account", async () => {
    mockApi({
      ...admin(),
      "GET /admin/metrics": metrics,
      "GET /admin/users": users,
      "POST /admin/users/u-ana/activate": { ...ANA, status: "active" },
    });
    await renderApp({ at: "/admin" });

    expect(
      await screen.findByRole("button", { name: "Aprobă ion@e2e.test" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Aprobă ana.p@e2e.test" }),
    );
    expect(apiCalls().filter((call) => call.method === "POST")[0]?.path).toBe(
      "/admin/users/u-ana/activate",
    );
  });

  test("ADMIN-02 activation failed (S6): the error shows in that row only, and its button works again", async () => {
    mockApi({
      ...admin(),
      "GET /admin/metrics": metrics,
      "GET /admin/users": users,
      "POST /admin/users/u-ana/activate": serverError,
    });
    await renderApp({ at: "/admin" });
    await screen.findByText(ANA.email);

    await userEvent.click(
      row(ANA.email).getByRole("button", { name: /^Aprobă/ }),
    );

    expect(await row(ANA.email).findByRole("alert")).toHaveTextContent(
      "A apărut o eroare. Încearcă din nou.",
    );
    expect(row(ION.email).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      row(ANA.email).getByRole("button", { name: /^Aprobă/ }),
    ).toBeEnabled();
  });

  test.each(["GET /admin/metrics", "GET /admin/users"])(
    "ADMIN-02 failed (S17): when %s fails, an error with a retry, not empty counts",
    async (failing) => {
      let available = false;
      const answers: Record<string, (call: ApiCall) => unknown> = {
        "GET /admin/metrics": () => metrics,
        "GET /admin/users": users,
      };
      mockApi({
        ...admin(),
        ...answers,
        [failing]: (call: ApiCall) =>
          available ? answers[failing](call) : serverError(),
      });
      await renderApp({ at: "/admin" });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Nu am putut încărca pagina.",
      );
      // Nothing that looks like data: no counts waiting at "—", no empty list.
      expect(screen.queryByText("—")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Niciun cont în așteptare. 🎉"),
      ).not.toBeInTheDocument();

      available = true;
      await userEvent.click(screen.getByRole("button", { name: "Reîncearcă" }));
      expect(await screen.findByText("12.345")).toBeInTheDocument();
      expect(await screen.findByText(ANA.email)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
});
