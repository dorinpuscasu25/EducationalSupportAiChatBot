import type { FC, ReactNode } from "react";

/** Title bar of a full-width screen (admin console, account settings). */
export const PageHeader: FC<{
  title: string;
  subtitle?: string;
  right?: ReactNode;
}> = ({ title, subtitle, right }) => (
  <div className="border-border flex items-center justify-between border-b px-8 py-5">
    <div>
      <h1 className="text-lg font-semibold">{title}</h1>
      {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
    </div>
    {right}
  </div>
);
