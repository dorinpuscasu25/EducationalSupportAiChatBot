import { type FC, type ReactNode } from "react";
import { useFieldContext } from "@context/form.context";
import { Control } from "@components/core/Control";
import { useFieldError } from "../field-error";

type Props = React.ComponentProps<typeof Control.Textarea> & {
  label?: ReactNode;
  hint?: ReactNode;
};

export const Textarea: FC<Props> = ({ label, hint, ...props }) => {
  const field = useFieldContext<string>();
  const error = useFieldError();

  return (
    <Control.Label label={label} hint={hint} error={error}>
      <Control.Textarea
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={!!error}
        {...props}
      />
    </Control.Label>
  );
};
