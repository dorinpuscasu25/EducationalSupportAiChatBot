import type { FC } from "react";
import type { CreateUserPayload } from "@api/admin";
import type { UserRole } from "@api/auth/response";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { Card } from "@components/display/Card";
import { useAppForm } from "@hooks/form.hook";

// The fields have no visible labels (two per row, as in the TRD): each is
// named by an aria-label, its placeholder only hints at the value (C8).
export const CreateUserForm: FC<{
  /** Resolves once the account exists; the form then closes. */
  onSubmit: (payload: CreateUserPayload) => Promise<unknown>;
  onDone: () => void;
  error?: string | null;
}> = ({ onSubmit, onDone, error }) => {
  const form = useAppForm({
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      password: "",
      role: "user" as UserRole,
    },
    onSubmit: ({ value }) => onSubmit(value).then(onDone, () => undefined),
  });

  return (
    <Card
      theme="subtle"
      spacing="md"
      title="Utilizator nou (cont activ)"
      className="mb-4"
    >
      <Alert className="mb-3">{error}</Alert>
      <Form onSubmit={form.handleSubmit} className="grid grid-cols-2 gap-3">
        <form.AppField
          name="last_name"
          children={(field) => (
            <field.Input
              variant="compact"
              aria-label="Nume"
              placeholder="Nume"
              required
            />
          )}
        />
        <form.AppField
          name="first_name"
          children={(field) => (
            <field.Input
              variant="compact"
              aria-label="Prenume"
              placeholder="Prenume"
              required
            />
          )}
        />
        <form.AppField
          name="email"
          children={(field) => (
            <field.Input
              variant="compact"
              type="email"
              aria-label="Email"
              placeholder="Email"
              required
            />
          )}
        />
        <form.AppField
          name="phone"
          children={(field) => (
            <field.Input
              variant="compact"
              aria-label="Telefon"
              placeholder="Telefon (+373…)"
            />
          )}
        />
        <form.AppField
          name="password"
          children={(field) => (
            <field.PasswordField
              variant="compact"
              aria-label="Parolă"
              placeholder="Parolă (min 8)"
              autoComplete="new-password"
              required
            />
          )}
        />
        <form.AppField
          name="role"
          children={(field) => (
            <field.Select
              variant="compact"
              aria-label="Rol"
              options={[
                { value: "user", label: "Cursant" },
                { value: "admin", label: "Administrator" },
              ]}
            />
          )}
        />
        <div className="col-span-2">
          <form.AppForm>
            <form.SubmitButton>Creează cont</form.SubmitButton>
          </form.AppForm>
        </div>
      </Form>
    </Card>
  );
};
