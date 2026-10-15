import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { AuthShell } from "@components/layout/AuthShell";
import { useAppForm } from "@hooks/form.hook";
import { AuthRoutes } from "@config/routes";

export type LoginValues = { email: string; password: string };

type Props = {
  onSubmit: (values: LoginValues) => void;
  pending?: boolean;
  error?: string | null;
};

export const LoginPage: FC<Props> = ({ onSubmit, pending, error }) => {
  const form = useAppForm({
    defaultValues: { email: "", password: "" } as LoginValues,
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <AuthShell
      title="Autentificare"
      subtitle="Intră în contul tău de cursant."
      footer={
        <>
          Nu ai cont?{" "}
          <Link
            to={AuthRoutes.Register}
            className="text-accent hover:underline"
          >
            Creează unul
          </Link>
        </>
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
        <form.AppField
          name="password"
          children={(field) => (
            <field.PasswordField label="Parolă" variant="compact" required />
          )}
        />
        <div className="-mt-2 text-right">
          <Link
            to={AuthRoutes.Forgot}
            className="text-muted hover:text-primary text-xs"
          >
            Am uitat parola
          </Link>
        </div>
        <form.AppForm>
          <form.SubmitButton
            variant="primary"
            loading={pending}
            className="w-full"
          >
            Intră în cont
          </form.SubmitButton>
        </form.AppForm>
      </Form>
    </AuthShell>
  );
};
