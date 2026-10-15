import * as React from "react";

import { twMerge } from "tailwind-merge";
import { IconSpinner } from "@config/icons";

import { motion, type HTMLMotionProps } from "motion/react";

const VARIANT = {
  default: "bg-foreground border border-border text-primary",
  primary: "bg-action text-primary border border-border",
  disabled:
    "disabled:bg-subtle/20 opacity-50 border border-subtle/20 disabled:cursor-not-allowed text-primary",
  ghost: "bg-transparent border-none text-muted px-0",
};

const SIZE = {
  default: "h-10 px-4",
  large: "h-12 px-6",
  icon: "aspect-square rounded-md p-3",
};

const ALIGN = {
  default: "justify-center",
  left: "justify-start",
  right: "justify-end",
};

type Props = HTMLMotionProps<"button"> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  align?: keyof typeof ALIGN;
  loading?: boolean;
  children: React.ReactNode;
  animate?: boolean;
};

export const Button: React.FC<Props> = ({
  className,
  variant = "default",
  size = "default",
  align = "default",
  loading,
  children,
  disabled,
  animate = true,
  ...props
}) => {
  return (
    <motion.button
      whileTap={
        animate
          ? {
              opacity: 0.75,
              transition: { duration: 0.12 },
            }
          : undefined
      }
      type="button"
      className={twMerge(
        "hover:border-dim hover:bg-primary/10 flex cursor-pointer items-center rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none",
        SIZE[size],
        ALIGN[align],
        VARIANT[disabled ? "disabled" : variant],
        className,
      )}
      // A button whose request is running cannot be pressed again (C4, S19).
      disabled={disabled || loading}
      {...props}
    >
      {children}
      {loading && (
        <IconSpinner className="text-primary ml-2 size-6 animate-spin" />
      )}
    </motion.button>
  );
};
