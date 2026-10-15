import type { FC } from "react";

import { Link as TLink, type LinkProps } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";

const VARIANT = {
  default: "text-primary",
  gradient: "text-gradient",
  buttonGhost: "py-2 px-4 rounded-lg font-medium",
};

type Props = {
  children: React.ReactNode;
  to: string;
  icon?: React.ReactNode;
  variant?: keyof typeof VARIANT;
  className?: string;
  target?: "_blank" | "_self";
} & LinkProps;

export const Link: FC<Props> = ({
  children,
  to,
  icon,
  variant = "default",
  className,
  target,
  ...props
}) => {
  return (
    <TLink
      activeOptions={{ exact: true }}
      to={to}
      target={target}
      className={twMerge(
        "flex items-center gap-2",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </TLink>
  );
};
