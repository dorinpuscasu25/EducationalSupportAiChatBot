import type { FC } from "react";
import { Alert } from "@components/display/Alert";
import { Card } from "@components/display/Card";
import { Form } from "@components/core/Form";
import { useAppForm } from "@hooks/form.hook";

export type ProfileValues = {
  first_name: string;
  last_name: string;
  phone: string;
};

export const ProfileCard: FC<{
  initialValues: ProfileValues;
  onSubmit: (values: ProfileValues) => void;
  pending?: boolean;
  saved?: boolean;
  /** Why the last save failed; the fields keep what was typed. */
  error?: string | null;
}> = ({ initialValues, onSubmit, pending, saved, error }) => {
  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <Card theme="subtle" spacing="md" title="Profil">
      <Form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
        <Alert>{error}</Alert>
        <div className="grid grid-cols-2 gap-3">
          <form.AppField
            name="last_name"
            children={(field) => <field.Input label="Nume" variant="compact" />}
          />
          <form.AppField
            name="first_name"
            children={(field) => (
              <field.Input label="Prenume" variant="compact" />
            )}
          />
        </div>
        <form.AppField
          name="phone"
          children={(field) => (
            <field.Input
              label="Telefon"
              variant="compact"
              placeholder="+37360000000"
            />
          )}
        />
        <div className="flex items-center gap-3">
          <form.AppForm>
            <form.SubmitButton loading={pending}>
              Salvează profilul
            </form.SubmitButton>
          </form.AppForm>
          {saved && (
            <Alert variant="success" className="py-1 text-xs">
              Salvat ✓
            </Alert>
          )}
        </div>
      </Form>
    </Card>
  );
};
