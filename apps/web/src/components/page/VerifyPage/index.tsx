import { useEffect, useState, type FC } from "react";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { AuthShell } from "@components/layout/AuthShell";
import { useAppForm } from "@hooks/form.hook";
import { verificationCode } from "@utils/format";

const RESEND_COOLDOWN = 60;

type Props = {
  email: string;
  onSubmit: (code: string) => void;
  /** Resolves once a new code is on its way; starts the cooldown. */
  onResend: () => Promise<unknown>;
  pending?: boolean;
  resendPending?: boolean;
  error?: string | null;
  /** Why the last resend failed; shown under its button. */
  resendError?: string | null;
};

export const VerifyPage: FC<Props> = ({
  email,
  onSubmit,
  onResend,
  pending,
  resendPending,
  error,
  resendError,
}) => {
  const [cooldown, setCooldown] = useState(0);
  const form = useAppForm({
    defaultValues: { code: "" },
    onSubmit: ({ value }) => onSubmit(value.code),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = () =>
    onResend().then(
      () => setCooldown(RESEND_COOLDOWN),
      () => undefined,
    );

  return (
    <AuthShell
      title="Confirmă emailul"
      subtitle={`Am trimis un cod de 6 cifre la ${email || "adresa ta"}. Introdu-l mai jos.`}
    >
      <Form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
        <Alert>{error}</Alert>
        <form.AppField
          name="code"
          children={(field) => (
            <field.Input
              label="Cod de confirmare"
              variant="compact"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              transform={verificationCode}
            />
          )}
        />
        <form.AppForm>
          <form.Subscribe selector={(state) => state.values.code.length === 6}>
            {(complete) => (
              <form.SubmitButton
                loading={pending}
                disabled={!complete}
                className="w-full"
              >
                Confirmă
              </form.SubmitButton>
            )}
          </form.Subscribe>
        </form.AppForm>
      </Form>

      <button
        type="button"
        disabled={resendPending || cooldown > 0}
        onClick={resend}
        className="text-muted hover:text-primary mt-4 text-sm disabled:opacity-50"
      >
        {cooldown > 0 ? `Retrimite codul (${cooldown}s)` : "Retrimite codul"}
      </button>
      <Alert className="mt-2">{resendError}</Alert>
    </AuthShell>
  );
};
