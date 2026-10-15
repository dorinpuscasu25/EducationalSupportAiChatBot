import { useFieldContext } from "@context/form.context";

// Validation messages are only shown once the user has left the field or
// tried to submit, never while they are still typing the first time.
export function useFieldError(): string | null {
  const field = useFieldContext<unknown>();
  const { isTouched, errors } = field.state.meta;
  const submitted = field.form.state.submissionAttempts > 0;
  if (!isTouched && !submitted) return null;
  const first = errors.find(Boolean);
  if (!first) return null;
  return typeof first === "string" ? first : String(first);
}
