import { type FC, type ReactNode } from "react";
import { useFieldContext } from "@context/form.context";
import { Control } from "@components/core/Control";
import { PasswordStrength } from "@components/display/PasswordStrength";
import { useFieldError } from "../field-error";

type Props = Omit<React.ComponentProps<typeof Control.Input>, "type"> & {
  label?: ReactNode;
  /** Show the strength meter (for a new password). */
  showStrength?: boolean;
};

export const PasswordField: FC<Props> = ({
  label,
  showStrength,
  autoComplete = showStrength ? "new-password" : "current-password",
  ...props
}) => {
  const field = useFieldContext<string>();
  const error = useFieldError();

  return (
    <div className="flex flex-col gap-2">
      <Control.Label label={label} error={error}>
        <Control.Input
          type="password"
          name={field.name}
          autoComplete={autoComplete}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={!!error}
          {...props}
        />
      </Control.Label>
      {showStrength && <PasswordStrength password={field.state.value} />}
    </div>
  );
};
