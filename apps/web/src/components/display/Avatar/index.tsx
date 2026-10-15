import type { FC } from "react";
import { twMerge } from "tailwind-merge";

const SIZE = {
  sm: "size-8 text-xs",
  lg: "size-20 text-2xl",
};

/** A user's picture, or their initials when there is none. */
export const Avatar: FC<{
  src?: string;
  initials: string;
  size?: keyof typeof SIZE;
  className?: string;
}> = ({ src, initials, size = "sm", className }) =>
  src ? (
    <img
      src={src}
      alt=""
      className={twMerge("rounded-full object-cover", SIZE[size], className)}
    />
  ) : (
    <div
      className={twMerge(
        "bg-pop text-primary flex items-center justify-center rounded-full font-medium",
        SIZE[size],
        className,
      )}
    >
      {initials || "U"}
    </div>
  );
