import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { AuthShell } from "@components/layout/AuthShell";
import { useAppForm } from "@hooks/form.hook";
import { AuthRoutes } from "@config/routes";
import {
  confirmPasswordError,
  passwordError,
  phoneError,
} from "@utils/validation";

export type RegisterValues = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  confirm: string;
};

type Props = {
  onSubmit: (values: RegisterValues) => void;
  pending?: boolean;
  error?: string | null;
};

export const RegisterPage: FC<Props> = ({ onSubmit, pending, error }) => {
  const form = useAppForm({
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      password: "",
      confirm: "",
    } as RegisterValues,
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <AuthShell
      title="Creează cont"
      subtitle="Completează datele. Vei primi un cod de confirmare pe email, apoi echipa academiei îți aprobă accesul."
      footer={
        <>
          Ai deja cont?{" "}
          <Link to={AuthRoutes.Login} className="text-accent hover:underline">
            Autentifică-te
          </Link>
        </>
      }
    >
      <Form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
        <Alert>{error}</Alert>
        <div className="grid grid-cols-2 gap-3">
          <form.AppField
            name="last_name"
            children={(field) => (
              <field.Input label="Nume" variant="compact" required />
            )}
          />
          <form.AppField
            name="first_name"
            children={(field) => (
              <field.Input label="Prenume" variant="compact" required />
            )}
          />
        </div>
        <form.AppField
          name="email"
          children={(field) => (
            <field.Input
              label="Email"
              variant="compact"
              type="email"
              autoComplete="email"
              required
            />
          )}
        />
        <form.AppField
          name="phone"
          validators={{ onSubmit: ({ value }) => phoneError(value) }}
          children={(field) => <field.PhoneField label="Telefon" />}
        />
        <form.AppField
          name="password"
          validators={{ onSubmit: ({ value }) => passwordError(value) }}
          children={(field) => (
            <field.PasswordField
              label="Parolă"
              variant="compact"
              showStrength
              required
            />
          )}
        />
        <form.AppField
          name="confirm"
          validators={{
            onSubmit: ({ value, fieldApi }) =>
              confirmPasswordError(
                value,
                fieldApi.form.getFieldValue("password"),
              ),
          }}
          children={(field) => (
            <field.PasswordField
              label="Confirmă parola"
              variant="compact"
              autoComplete="new-password"
              required
            />
          )}
        />
        <form.AppForm>
          <form.SubmitButton loading={pending} className="w-full">
            Creează cont
          </form.SubmitButton>
        </form.AppForm>
      </Form>
    </AuthShell>
  );
};
