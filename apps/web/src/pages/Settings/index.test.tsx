import { describe, expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@test/render";
import { renderApp } from "@test/router";
import {
  apiCalls,
  jsonResponse,
  mockApi,
  shellApi,
  testUser,
  type ApiCall,
} from "@test/api";

// ACCT (docs/account.trd.md) on the real route tree, with the network faked at
// fetch: the guard, the user query and the mutations run as they ship.

/** One of the page's cards, found by its title. */
async function card(title: string) {
  const heading = await screen.findByRole("heading", { name: title });
  return within(heading.closest("section")!);
}

const NEW_EMAIL = "nou@e2e.test";

/** Asks for a code to NEW_EMAIL; leaves the card on the code step. */
async function requestCode(emailCard: Awaited<ReturnType<typeof card>>) {
  await userEvent.type(emailCard.getByLabelText("Email nou"), NEW_EMAIL);
  await userEvent.click(
    emailCard.getByRole("button", { name: "Trimite cod de confirmare" }),
  );
  await emailCard.findByText(NEW_EMAIL);
}

const emailApi = {
  "POST /users/me/email/request": { ok: true, new_email: NEW_EMAIL },
  "POST /users/me/email/confirm": ({ body }: ApiCall) =>
    (body as { code: string }).code === "123456"
      ? testUser({ email: NEW_EMAIL })
      : jsonResponse({ error: "invalid_or_expired_code" }, 400),
};

describe("ACCT-01 Profile", () => {
  test("ACCT-01 failed (S6): a save that does not go through shows an alert in the card and keeps the typed values", async () => {
    mockApi({
      ...shellApi(),
      "PATCH /users/me": jsonResponse({ error: "internal_error" }, 500),
    });
    await renderApp({ at: "/settings" });
    const profile = await card("Profil");

    const lastName = profile.getByLabelText("Nume");
    await userEvent.clear(lastName);
    await userEvent.type(lastName, "Nesalvat");
    await userEvent.click(
      profile.getByRole("button", { name: "Salvează profilul" }),
    );

    expect(await profile.findByRole("alert")).toHaveTextContent(
      "A apărut o eroare. Încearcă din nou.",
    );
    expect(lastName).toHaveValue("Nesalvat");
    expect(profile.queryByText("Salvat ✓")).not.toBeInTheDocument();
    // The request did go out, with what was typed.
    expect(apiCalls().find((c) => c.method === "PATCH")?.body).toMatchObject({
      last_name: "Nesalvat",
    });
  });

  test("ACCT-01 saved (S15): the confirmation is announced as a status", async () => {
    mockApi({
      ...shellApi(),
      "PATCH /users/me": testUser({ last_name: "Popescu" }),
    });
    await renderApp({ at: "/settings" });
    const profile = await card("Profil");

    await userEvent.clear(profile.getByLabelText("Nume"));
    await userEvent.type(profile.getByLabelText("Nume"), "Popescu");
    await userEvent.click(
      profile.getByRole("button", { name: "Salvează profilul" }),
    );

    expect(await profile.findByRole("status")).toHaveTextContent("Salvat ✓");
    expect(profile.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ACCT-02 Avatar", () => {
  test("ACCT-02 initials (S15): the avatar button is named for what it does", async () => {
    mockApi(shellApi());
    await renderApp({ at: "/settings" });

    const avatar = await screen.findByRole("button", {
      name: "Schimbă avatarul",
    });
    // Without a picture, the first letter of the first name ("Ana").
    expect(avatar).toHaveTextContent("A");
  });

  test("ACCT-02 failed (S6): a refused file shows an alert under the avatar, never the backend's sentence, and the initials stay", async () => {
    mockApi({
      ...shellApi(),
      "POST /users/me/avatar": jsonResponse(
        {
          error:
            "Format neacceptat sau conținut diferit de extensie. Folosește PDF, DOCX, TXT, Markdown, PNG, JPEG sau WebP.",
        },
        400,
      ),
    });
    const { container } = await renderApp({ at: "/settings" });
    const avatar = await screen.findByRole("button", {
      name: "Schimbă avatarul",
    });

    await userEvent.upload(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      new File(["nu este o imagine"], "avatar.png", { type: "image/png" }),
    );

    const summary = within(avatar.closest("section")!);
    expect(await summary.findByRole("alert")).toHaveTextContent(
      "A apărut o eroare. Încearcă din nou.",
    );
    expect(screen.queryByText(/Format neacceptat/)).not.toBeInTheDocument();
    expect(screen.queryByText("Se încarcă avatarul…")).not.toBeInTheDocument();
    expect(avatar).toHaveTextContent("A");
    expect(avatar.querySelector("img")).toBeNull();
  });

  test("ACCT-02 failed (S50): picking the same file again sends it again", async () => {
    mockApi({
      ...shellApi(),
      "POST /users/me/avatar": jsonResponse({ error: "request_failed" }, 500),
    });
    const { container } = await renderApp({ at: "/settings" });
    const avatar = await screen.findByRole("button", {
      name: "Schimbă avatarul",
    });
    const picker =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["png"], "avatar.png", { type: "image/png" });
    const uploads = () =>
      apiCalls().filter((call) => call.path === "/users/me/avatar");

    await userEvent.upload(picker, file);
    await within(avatar.closest("section")!).findByRole("alert");
    await userEvent.upload(picker, file);

    await waitFor(() => expect(uploads()).toHaveLength(2));
  });
});

describe("ACCT-03 Change email", () => {
  test("ACCT-03 changed (S15): the confirmation is announced as a status", async () => {
    mockApi({ ...shellApi(), ...emailApi });
    await renderApp({ at: "/settings" });
    const emailCard = await card("Schimbă emailul");

    await requestCode(emailCard);
    await userEvent.type(emailCard.getByLabelText("Cod"), "123456");
    await userEvent.click(
      emailCard.getByRole("button", { name: "Confirmă emailul" }),
    );

    expect(await emailCard.findByRole("status")).toHaveTextContent(
      "Emailul a fost actualizat ✓",
    );
    expect(
      emailCard.getByText(`Email curent: ${NEW_EMAIL}`),
    ).toBeInTheDocument();
  });

  test("ACCT-03 idle (S16): a new change starts without the last confirmation", async () => {
    mockApi({ ...shellApi(), ...emailApi });
    await renderApp({ at: "/settings" });
    const emailCard = await card("Schimbă emailul");

    await requestCode(emailCard);
    await userEvent.type(emailCard.getByLabelText("Cod"), "123456");
    await userEvent.click(
      emailCard.getByRole("button", { name: "Confirmă emailul" }),
    );
    await emailCard.findByText("Emailul a fost actualizat ✓");

    await requestCode(emailCard);
    expect(
      emailCard.queryByText("Emailul a fost actualizat ✓"),
    ).not.toBeInTheDocument();
  });

  test("ACCT-03 idle (S16): Anulează clears the error and the typed code, and the next request starts empty", async () => {
    mockApi({ ...shellApi(), ...emailApi });
    await renderApp({ at: "/settings" });
    const emailCard = await card("Schimbă emailul");

    await requestCode(emailCard);
    await userEvent.type(emailCard.getByLabelText("Cod"), "000000");
    await userEvent.click(
      emailCard.getByRole("button", { name: "Confirmă emailul" }),
    );
    expect(await emailCard.findByRole("alert")).toHaveTextContent(
      "Cod invalid sau expirat.",
    );

    await userEvent.click(emailCard.getByRole("button", { name: "Anulează" }));
    expect(emailCard.getByLabelText("Email nou")).toBeInTheDocument();
    expect(emailCard.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(
      emailCard.getByRole("button", { name: "Trimite cod de confirmare" }),
    );
    expect(await emailCard.findByLabelText("Cod")).toHaveValue("");
    expect(
      emailCard.getByRole("button", { name: "Confirmă emailul" }),
    ).toBeDisabled();
  });
});

describe("ACCT-04 Change password", () => {
  test("ACCT-04 changed (S15): the confirmation is announced as a status", async () => {
    mockApi({ ...shellApi(), "POST /users/me/password": { ok: true } });
    await renderApp({ at: "/settings" });
    const passwordCard = await card("Schimbă parola");

    await userEvent.type(
      passwordCard.getByLabelText("Parola curentă"),
      "parola-veche-1",
    );
    await userEvent.type(
      passwordCard.getByLabelText("Parolă nouă"),
      "parola-noua-1",
    );
    await userEvent.type(
      passwordCard.getByLabelText("Confirmă parola"),
      "parola-noua-1",
    );
    await userEvent.click(
      passwordCard.getByRole("button", { name: "Schimbă parola" }),
    );

    expect(await passwordCard.findByRole("status")).toHaveTextContent(
      "Parolă schimbată ✓",
    );
  });
});
