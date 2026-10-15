import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const VARIANT = {
  error: "border-dim/30 bg-dim/10 text-highlight",
  success: "border-border bg-pop/40 text-soft",
};

/** A banner for the outcome of a form or request; renders nothing when empty. */
export const Alert: FC<{
  children?: ReactNode;
  variant?: keyof typeof VARIANT;
  className?: string;
}> = ({ children, variant = "error", className }) =>
  children ? (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={twMerge(
        "rounded-lg border px-3 py-2 text-sm",
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </div>
  ) : null;
