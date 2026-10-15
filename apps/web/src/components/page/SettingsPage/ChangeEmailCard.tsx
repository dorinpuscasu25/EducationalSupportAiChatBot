import { useState, type FC } from "react";
import { useStore } from "@tanstack/react-form";
import { Button } from "@components/core/Button";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { Card } from "@components/display/Card";
import { useAppForm } from "@hooks/form.hook";
import { verificationCode } from "@utils/format";

export const ChangeEmailCard: FC<{
  currentEmail: string;
  /** Resolves once the confirmation code was sent to the new address. */
  onRequest: (newEmail: string) => Promise<unknown>;
  /** Resolves once the code was accepted and the email changed. */
  onConfirm: (code: string) => Promise<unknown>;
  /** Back to step 1: the container drops the last error. */
  onCancel: () => void;
  requestPending?: boolean;
  confirmPending?: boolean;
  error?: string | null;
}> = ({
  currentEmail,
  onRequest,
  onConfirm,
  onCancel,
  requestPending,
  confirmPending,
  error,
}) => {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [done, setDone] = useState(false);

  const requestForm = useAppForm({
    defaultValues: { newEmail: "" },
    onSubmit: ({ value }) => {
      // A new change starts: the last one's confirmation goes.
      setDone(false);
      return onRequest(value.newEmail).then(
        () => setStep("code"),
        () => undefined,
      );
    },
  });

  const newEmail = useStore(
    requestForm.store,
    (state) => state.values.newEmail,
  );

  const confirmForm = useAppForm({
    defaultValues: { code: "" },
    onSubmit: ({ value, formApi }) =>
      onConfirm(value.code).then(
        () => {
          setDone(true);
          setStep("idle");
          formApi.reset();
          requestForm.reset();
        },
        () => undefined,
      ),
  });

  return (
    <Card
      theme="subtle"
      spacing="md"
      title="Schimbă emailul"
      subtitle={`Email curent: ${currentEmail}`}
    >
      <div className="flex flex-col gap-4">
        <Alert>{error}</Alert>
        {done && <Alert variant="success">Emailul a fost actualizat ✓</Alert>}

        {step === "idle" ? (
          <Form
            onSubmit={requestForm.handleSubmit}
            className="flex flex-col gap-4"
          >
            <requestForm.AppField
              name="newEmail"
              children={(field) => (
                <field.Input
                  label="Email nou"
                  variant="compact"
                  type="email"
                  required
                />
              )}
            />
            <div>
              <requestForm.AppForm>
                <requestForm.SubmitButton loading={requestPending}>
                  Trimite cod de confirmare
                </requestForm.SubmitButton>
              </requestForm.AppForm>
            </div>
          </Form>
        ) : (
          <Form
            onSubmit={confirmForm.handleSubmit}
            className="flex flex-col gap-4"
          >
            <p className="text-muted text-sm">
              Am trimis un cod la <b>{newEmail}</b>. Introdu-l mai jos.
            </p>
            <confirmForm.AppField
              name="code"
              children={(field) => (
                <field.Input
                  label="Cod"
                  variant="compact"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  transform={verificationCode}
                />
              )}
            />
            <div className="flex gap-2">
              <confirmForm.AppForm>
                <confirmForm.Subscribe
                  selector={(state) => state.values.code.length === 6}
                >
                  {(complete) => (
                    <confirmForm.SubmitButton
                      loading={confirmPending}
                      disabled={!complete}
                    >
                      Confirmă emailul
                    </confirmForm.SubmitButton>
                  )}
                </confirmForm.Subscribe>
              </confirmForm.AppForm>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("idle");
                  confirmForm.reset();
                  onCancel();
                }}
              >
                Anulează
              </Button>
            </div>
          </Form>
        )}
      </div>
    </Card>
  );
};
