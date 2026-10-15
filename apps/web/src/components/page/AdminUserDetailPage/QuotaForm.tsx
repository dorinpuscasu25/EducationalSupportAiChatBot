import type { FC } from "react";
import type { SetQuotaPayload } from "@api/admin";
import type { UserQuota } from "@api/auth/response";
import { Form } from "@components/core/Form";
import { Alert } from "@components/display/Alert";
import { useAppForm } from "@hooks/form.hook";

// Initialized from the quota prop; the parent remounts it (via `key`) when the
// quota changes, so it never needs a state-syncing effect.
export const QuotaForm: FC<{
  quota: UserQuota | null;
  onSubmit: (payload: SetQuotaPayload) => void;
  pending?: boolean;
  saved?: boolean;
  /** The last save failed: shown next to the button. */
  error?: string;
}> = ({ quota, onSubmit, pending, saved, error }) => {
  const form = useAppForm({
    defaultValues: {
      packageName: quota?.package_name ?? "",
      monthlyTokenLimit: String(quota?.monthly_token_limit ?? 0),
    },
    onSubmit: ({ value }) =>
      onSubmit({
        package_name: value.packageName,
        monthly_token_limit: Number(value.monthlyTokenLimit) || 0,
      }),
  });

  return (
    <Form onSubmit={form.handleSubmit}>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <form.AppField
          name="packageName"
          children={(field) => (
            <field.Input
              label="Nume pachet"
              variant="compact"
              placeholder="ex: Standard"
            />
          )}
        />
        <form.AppField
          name="monthlyTokenLimit"
          children={(field) => (
            <field.Input
              label="Tokeni / lună (0 = nelimitat)"
              variant="compact"
              type="number"
            />
          )}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <form.AppForm>
          <form.SubmitButton loading={pending}>
            Salvează limitele
          </form.SubmitButton>
        </form.AppForm>
        <Alert>{error}</Alert>
        {saved && <span className="text-highlight text-xs">Salvat ✓</span>}
      </div>
    </Form>
  );
};
