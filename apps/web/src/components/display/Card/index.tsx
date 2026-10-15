import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const SPACING = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const THEME = {
  /** Page sections on the app background. */
  dark: "bg-foreground border-border rounded-2xl",
  /** Panels on the admin and account screens. */
  subtle: "bg-pop/30 border-border rounded-xl",
  /** Nested blocks inside another card. */
  inset: "bg-background/40 border-divider rounded-lg",
};

type Props = {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Rendered at the right of the title row. */
  actions?: ReactNode;
  spacing?: keyof typeof SPACING;
  theme?: keyof typeof THEME;
  className?: string;
};

export const Card: FC<Props> = ({
  children,
  title,
  subtitle,
  actions,
  spacing = "lg",
  theme = "dark",
  className,
}) => (
  <section
    className={twMerge("border", THEME[theme], SPACING[spacing], className)}
  >
    {(title || actions) && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <h2 className="text-primary font-medium">{title}</h2>}
          {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </section>
);
