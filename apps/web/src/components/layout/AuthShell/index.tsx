import type { FC, ReactNode } from "react";
import { APP_NAME, APP_TAGLINE } from "@config/brand";

export const AuthShell: FC<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}> = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-dvh items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">
      <div className="bg-pop/30 border-border rounded-2xl border p-8">
        <p className="text-accent mb-5 text-sm font-semibold tracking-wide">
          {APP_NAME} · {APP_TAGLINE}
        </p>
        <h1 className="text-primary text-2xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="text-muted mt-2 text-sm leading-relaxed">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
      {footer && (
        <div className="text-muted mt-4 text-center text-sm">{footer}</div>
      )}
    </div>
  </div>
);
