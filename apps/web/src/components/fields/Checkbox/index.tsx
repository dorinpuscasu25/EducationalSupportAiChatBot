import { type FC, type ReactNode } from "react";
import { useFieldContext } from "@context/form.context";
import { Control } from "@components/core/Control";

type Props = {
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export const Checkbox: FC<Props> = (props) => {
  const field = useFieldContext<boolean>();

  return (
    <Control.Checkbox
      name={field.name}
      checked={field.state.value}
      onChange={(e) => field.handleChange(e.target.checked)}
      onBlur={field.handleBlur}
      {...props}
    />
  );
};
