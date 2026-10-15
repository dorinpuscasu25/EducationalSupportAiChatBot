import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@components/core/Button";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { AuthShell } from "@components/layout/AuthShell";
import { useAppForm } from "@hooks/form.hook";
import { AuthRoutes } from "@config/routes";
import { verificationCode } from "@utils/format";
import { confirmPasswordError, passwordError } from "@utils/validation";

export type ResetPasswordValues = {
  email: string;
  code: string;
  password: string;
  confirm: string;
};

type Props = {
  /** Prefilled from the forgot-password step; the field is hidden then. */
  email: string;
  onSubmit: (values: ResetPasswordValues) => void;
  onGoToLogin: () => void;
  pending?: boolean;
  done?: boolean;
  error?: string | null;
};

export const ResetPasswordPage: FC<Props> = ({
  email,
  onSubmit,
  onGoToLogin,
  pending,
  done,
  error,
}) => {
  const form = useAppForm({
    defaultValues: {
      email,
      code: "",
      password: "",
      confirm: "",
    } as ResetPasswordValues,
    onSubmit: ({ value }) => onSubmit(value),
  });

  if (done) {
    return (
      <AuthShell
        title="Parolă resetată"
        subtitle="Parola a fost schimbată. Te poți autentifica acum."
        footer={
          <Link to={AuthRoutes.Login} className="text-accent hover:underline">
            Mergi la autentificare
          </Link>
        }
      >
        <Button className="w-full" onClick={onGoToLogin}>
          Autentificare
        </Button>
      </AuthShell>
    );
  }

  return (
    <form.Subscribe selector={(state) => state.values.email}>
      {(currentEmail) => (
        <AuthShell
          title="Resetează parola"
          subtitle={`Introdu codul trimis la ${currentEmail || "adresa ta"} și noua parolă.`}
          footer={
            <Link
              to={AuthRoutes.Forgot}
              className="text-accent hover:underline"
            >
              Retrimite / schimbă emailul
            </Link>
          }
        >
          <Form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
            <Alert>{error}</Alert>
            {!email && (
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
            )}
            <form.AppField
              name="code"
              children={(field) => (
                <field.Input
                  label="Cod de resetare"
                  variant="compact"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  transform={verificationCode}
                />
              )}
            />
            <form.AppField
              name="password"
              validators={{ onSubmit: ({ value }) => passwordError(value) }}
              children={(field) => (
                <field.PasswordField
                  label="Parolă nouă"
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
              <form.Subscribe
                selector={(state) => state.values.code.length === 6}
              >
                {(complete) => (
                  <form.SubmitButton
                    loading={pending}
                    disabled={!complete}
                    className="w-full"
                  >
                    Resetează parola
                  </form.SubmitButton>
                )}
              </form.Subscribe>
            </form.AppForm>
          </Form>
        </AuthShell>
      )}
    </form.Subscribe>
  );
};
