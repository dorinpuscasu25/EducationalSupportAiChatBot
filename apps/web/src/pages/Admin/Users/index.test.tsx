import { describe, expect, test, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@test/render";
import { renderApp } from "@test/router";
import { apiCalls, jsonResponse, mockApi, shellApi, testUser } from "@test/api";

// ADMIN-03 and ADMIN-04 (docs/admin.trd.md) on the real route tree, with the
// network faked at fetch.

const admin = () => shellApi(testUser({ role: "admin" }));

const listed = (id: string, email: string, last_name: string) => ({
  ...testUser({ id, email, first_name: "Ion", last_name }),
  session_count: 0,
  last_active_at: null,
});

const ION = listed("u-ion", "ion@e2e.test", "Rusu");

const SEARCH = "Caută după nume sau email";

describe("ADMIN-03 Users list", () => {
  test("ADMIN-03 failed (S17): a list that cannot load shows an error with a retry, not “Niciun utilizator.”", async () => {
    let available = false;
    mockApi({
      ...admin(),
      "GET /admin/users": () =>
        available
          ? [ION]
          : jsonResponse({ error: "Serviciul nu este disponibil." }, 500),
    });
    await renderApp({ at: "/admin/users" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nu am putut încărca pagina.",
    );
    expect(screen.queryByText("Niciun utilizator.")).not.toBeInTheDocument();

    available = true;
    await userEvent.click(screen.getByRole("button", { name: "Reîncearcă" }));
    expect(await screen.findByText(ION.email)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("ADMIN-03 loaded (S8): the search is named", async () => {
    mockApi({ ...admin(), "GET /admin/users": [ION] });
    await renderApp({ at: "/admin/users" });

    await userEvent.type(
      await screen.findByRole("textbox", { name: SEARCH }),
      "nimeni",
    );
    expect(await screen.findByText("Niciun utilizator.")).toBeInTheDocument();
  });

  test("ADMIN-03 loaded (S8): a row is reached with Tab and opened with Enter", async () => {
    mockApi({
      ...admin(),
      "GET /admin/users": [ION],
      "GET /admin/users/u-ion/detail": {
        user: ION,
        quota: null,
        session_count: 0,
        tokens_total: 0,
        recent_usage: [],
        recent_sessions: [],
      },
    });
    const { router } = await renderApp({ at: "/admin/users" });
    await screen.findByText(ION.email);

    // From the search box, the next stop is the first row.
    await userEvent.click(
      screen.getByPlaceholderText("Caută după nume sau email…"),
    );
    await userEvent.tab();
    expect(screen.getByText(ION.email).closest("tr")).toContainElement(
      document.activeElement as HTMLElement,
    );
    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/admin/users/u-ion"),
    );
    expect(
      await screen.findByRole("heading", { name: "Ion Rusu" }),
    ).toBeInTheDocument();
  });
});

const NEW_USER_FORM = "Utilizator nou (cont activ)";

async function openCreateForm() {
  await userEvent.click(
    await screen.findByRole("button", { name: "+ Adaugă utilizator" }),
  );
  const heading = await screen.findByRole("heading", { name: NEW_USER_FORM });
  return within(heading.closest("section")!);
}

describe("ADMIN Roles from the list", () => {
  test("“Fă admin” asks first, then promotes the user", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockApi({
      ...admin(),
      "GET /admin/users": [ION],
      "POST /admin/users/u-ion/role": { ...ION, role: "admin" },
    });
    await renderApp({ at: "/admin/users" });

    await userEvent.click(
      await screen.findByRole("button", { name: `Fă admin pe ${ION.email}` }),
    );
    await waitFor(() =>
      expect(
        apiCalls().find((c) => c.path === "/admin/users/u-ion/role")?.body,
      ).toEqual({ role: "admin" }),
    );
  });

  test("the Administratori filter lists only admins", async () => {
    const ADMIN = { ...listed("u-ana", "ana@e2e.test", "Pop"), role: "admin" };
    mockApi({ ...admin(), "GET /admin/users": [ION, ADMIN] });
    await renderApp({ at: "/admin/users" });
    await screen.findByText(ION.email);

    await userEvent.click(
      screen.getByRole("button", { name: "Administratori" }),
    );
    expect(screen.queryByText(ION.email)).not.toBeInTheDocument();
    expect(screen.getByText(ADMIN.email)).toBeInTheDocument();
  });
});

describe("ADMIN-04 Create a user", () => {
  test("ADMIN-04 open (S8): every field and the role are named", async () => {
    mockApi({ ...admin(), "GET /admin/users": [] });
    await renderApp({ at: "/admin/users" });
    const form = await openCreateForm();

    for (const name of ["Nume", "Prenume", "Email", "Telefon"]) {
      expect(form.getByRole("textbox", { name })).toBeInTheDocument();
    }
    expect(form.getByLabelText("Parolă")).toHaveAttribute("type", "password");
    expect(form.getByRole("combobox", { name: "Rol" })).toHaveValue("user");
  });

  test("ADMIN-04 rejected (S18): closing the form clears the error", async () => {
    mockApi({
      ...admin(),
      "GET /admin/users": [],
      "POST /admin/users": jsonResponse(
        { error: "email_already_registered" },
        409,
      ),
    });
    await renderApp({ at: "/admin/users" });
    const form = await openCreateForm();

    // Named by placeholder, so this also runs where the fields have no name.
    await userEvent.type(form.getByPlaceholderText("Nume"), "Rusu");
    await userEvent.type(form.getByPlaceholderText("Prenume"), "Ion");
    await userEvent.type(form.getByPlaceholderText("Email"), ION.email);
    await userEvent.type(
      form.getByPlaceholderText("Parolă (min 8)"),
      "parola-buna-1",
    );
    await userEvent.click(form.getByRole("button", { name: "Creează cont" }));
    expect(await form.findByRole("alert")).toHaveTextContent(
      "Există deja un cont cu acest email.",
    );

    await userEvent.click(screen.getByRole("button", { name: "Închide" }));
    await openCreateForm();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
