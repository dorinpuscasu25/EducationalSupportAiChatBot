import { createFormHook } from "@tanstack/react-form";
import type { ComponentProps } from "react";
import {
  useFormContext,
  formContext,
  fieldContext,
} from "@context/form.context.tsx";
import { Button } from "@components/core/Button";
import { Input } from "@components/fields/Input";
import { Textarea } from "@components/fields/Textarea";
import { Select } from "@components/fields/Select";
import { Checkbox } from "@components/fields/Checkbox";
import { PhoneField } from "@components/fields/PhoneField";
import { PasswordField } from "@components/fields/PasswordField";
import { FileInput } from "@components/fields/FileInput";
import { ChatInput } from "@components/fields/ChatInput";

/**
 * Submit button bound to the form: shows the spinner while the form submits
 * (or while `loading`, e.g. a mutation, is pending) and blocks double submits.
 * Render it inside <form.AppForm>.
 */
function SubmitButton({
  loading,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type">) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          loading={loading || isSubmitting}
          disabled={disabled || loading || isSubmitting}
          {...props}
        />
      )}
    </form.Subscribe>
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    Input,
    Textarea,
    Select,
    Checkbox,
    PhoneField,
    PasswordField,
    FileInput,
    ChatInput,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});
