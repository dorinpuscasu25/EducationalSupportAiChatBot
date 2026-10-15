import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

// Plain, controlled form controls. Inside a TanStack form use the bound
// versions in components/fields; use these directly for filters, search boxes
// and other inputs that are not part of a submitted form.

const VARIANT = {
  default: "bg-pop border-divider h-12 rounded-md px-3 text-base",
  compact: "bg-background border-border h-10 rounded-lg px-3 text-sm",
};

type Variant = keyof typeof VARIANT;

const BASE =
  "w-full border text-primary outline-0 placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-primary";

export const controlStyle = (variant: Variant = "default") =>
  twMerge(BASE, VARIANT[variant]);

const Input: FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    variant?: Variant;
    ref?: React.Ref<HTMLInputElement>;
  }
> = ({ variant, className, ...props }) => (
  <input className={twMerge(controlStyle(variant), className)} {...props} />
);

const Textarea: FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant?: Variant;
    ref?: React.Ref<HTMLTextAreaElement>;
  }
> = ({ variant, className, rows = 4, ...props }) => (
  <textarea
    rows={rows}
    className={twMerge(
      controlStyle(variant),
      "h-auto resize-y py-3 leading-6",
      className,
    )}
    {...props}
  />
);

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

const Select: FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    variant?: Variant;
    options: SelectOption[];
  }
> = ({ variant, className, options, ...props }) => (
  <select className={twMerge(controlStyle(variant), className)} {...props}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const Checkbox: FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label: ReactNode;
    description?: ReactNode;
  }
> = ({ label, description, className, ...props }) => (
  <label
    className={twMerge(
      "flex cursor-pointer items-start gap-3 text-sm",
      className,
    )}
  >
    <input
      type="checkbox"
      className="accent-highlight mt-0.5 size-4 shrink-0 cursor-pointer"
      {...props}
    />
    <span>
      <span className="block">{label}</span>
      {description && (
        <span className="text-muted mt-1 block text-sm leading-5">
          {description}
        </span>
      )}
    </span>
  </label>
);

/**
 * Label, optional hint and error around one control. For a group of buttons
 * use `as="div"`: a <label> would forward clicks on its text to the first one.
 */
const Label: FC<{
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  as?: "label" | "div";
  className?: string;
  children: ReactNode;
}> = ({ label, hint, error, as: Element = "label", className, children }) => (
  <Element className={twMerge("flex flex-col gap-1.5 text-sm", className)}>
    {(label || hint) && (
      <span className="flex items-center justify-between gap-3">
        {label && <span className="text-muted">{label}</span>}
        {hint && <span className="text-muted text-right text-xs">{hint}</span>}
      </span>
    )}
    {children}
    {error && <span className="text-danger text-xs">{error}</span>}
  </Element>
);

export const Control = {
  Input,
  Textarea,
  Select,
  Checkbox,
  Label,
};
