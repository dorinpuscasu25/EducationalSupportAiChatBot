import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const VARIANT = {
  default: "bg-foreground text-muted gap-2 px-4 py-2 text-sm",
  pill: "border border-dim/30 bg-dim/15 px-2 py-0.5 text-xs font-medium text-highlight",
  outline: "border-border text-muted border px-2.5 py-1 text-xs",
};

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  variant?: keyof typeof VARIANT;
  className?: string;
};

export const Badge: FC<Props> = ({
  children,
  icon,
  variant = "default",
  className,
}) => (
  <span
    className={twMerge(
      "inline-flex items-center rounded-full",
      VARIANT[variant],
      className,
    )}
  >
    {icon}
    {children}
  </span>
);
