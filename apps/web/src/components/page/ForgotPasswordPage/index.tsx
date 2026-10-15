import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { AuthShell } from "@components/layout/AuthShell";
import { useAppForm } from "@hooks/form.hook";
import { AuthRoutes } from "@config/routes";

type Props = {
  onSubmit: (email: string) => void;
  pending?: boolean;
  error?: string | null;
};

export const ForgotPasswordPage: FC<Props> = ({ onSubmit, pending, error }) => {
  const form = useAppForm({
    defaultValues: { email: "" },
    onSubmit: ({ value }) => onSubmit(value.email),
  });

  return (
    <AuthShell
      title="Am uitat parola"
      subtitle="Introdu emailul contului. Dacă există, îți trimitem un cod de resetare."
      footer={
        <Link to={AuthRoutes.Login} className="text-accent hover:underline">
          ← Înapoi la autentificare
        </Link>
      }
    >
      <Form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
        <Alert>{error}</Alert>
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
        <form.AppForm>
          <form.SubmitButton loading={pending} className="w-full">
            Trimite codul
          </form.SubmitButton>
        </form.AppForm>
      </Form>
    </AuthShell>
  );
};
