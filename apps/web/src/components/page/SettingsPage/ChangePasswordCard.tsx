import { useState, type FC } from "react";
import { Card } from "@components/display/Card";
import { Alert } from "@components/display/Alert";
import { Form } from "@components/core/Form";
import { useAppForm } from "@hooks/form.hook";
import { confirmPasswordError, passwordError } from "@utils/validation";

export type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
};

export const ChangePasswordCard: FC<{
  /** Resolves when the password changed; the form then clears. */
  onSubmit: (values: ChangePasswordValues) => Promise<unknown>;
  pending?: boolean;
  error?: string | null;
}> = ({ onSubmit, pending, error }) => {
  const [changed, setChanged] = useState(false);
  const form = useAppForm({
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
    onSubmit: async ({ value, formApi }) => {
      setChanged(false);
      try {
        await onSubmit({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });
      } catch {
        return; // shown through `error`
      }
      setChanged(true);
      formApi.reset();
    },
  });

  return (
    <Card theme="subtle" spacing="md" title="Schimbă parola">
      <Form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
        <Alert>{error}</Alert>
        <form.AppField
          name="currentPassword"
          children={(field) => (
            <field.PasswordField label="Parola curentă" variant="compact" />
          )}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          <form.AppField
            name="newPassword"
            validators={{ onSubmit: ({ value }) => passwordError(value) }}
            children={(field) => (
              <field.PasswordField
                label="Parolă nouă"
                variant="compact"
                showStrength
              />
            )}
          />
          <form.AppField
            name="confirm"
            validators={{
              onSubmit: ({ value, fieldApi }) =>
                confirmPasswordError(
                  value,
                  fieldApi.form.getFieldValue("newPassword"),
                ),
            }}
            children={(field) => (
              <field.PasswordField
                label="Confirmă parola"
                variant="compact"
                autoComplete="new-password"
              />
            )}
          />
        </div>
        <div className="flex items-center gap-3">
          <form.AppForm>
            <form.SubmitButton loading={pending}>
              Schimbă parola
            </form.SubmitButton>
          </form.AppForm>
          {changed && (
            <Alert variant="success" className="py-1 text-xs">
              Parolă schimbată ✓
            </Alert>
          )}
        </div>
      </Form>
    </Card>
  );
};
