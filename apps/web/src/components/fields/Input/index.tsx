import { type FC, type ReactNode } from "react";
import { useFieldContext } from "@context/form.context";
import { Control } from "@components/core/Control";
import { useFieldError } from "../field-error";

type Props = React.ComponentProps<typeof Control.Input> & {
  label?: ReactNode;
  hint?: ReactNode;
  /** Normalize what the user typed before storing it (e.g. digits only). */
  transform?: (value: string) => string;
};

export const Input: FC<Props> = ({ label, hint, transform, ...props }) => {
  const field = useFieldContext<string>();
  const error = useFieldError();

  return (
    <Control.Label label={label} hint={hint} error={error}>
      <Control.Input
        name={field.name}
        value={field.state.value}
        onChange={(e) =>
          field.handleChange(
            transform ? transform(e.target.value) : e.target.value,
          )
        }
        onBlur={field.handleBlur}
        aria-invalid={!!error}
        {...props}
      />
    </Control.Label>
  );
};
