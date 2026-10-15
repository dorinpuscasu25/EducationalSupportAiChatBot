import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const Root: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <table className={twMerge("w-full text-left text-sm", className)}>
    {children}
  </table>
);

/** Header row; `cellClassName` sets the padding shared with the body cells. */
const Head: FC<{ columns: ReactNode[]; cellClassName?: string }> = ({
  columns,
  cellClassName = "px-5 py-3",
}) => (
  <thead className="text-muted border-border border-b text-xs uppercase">
    <tr>
      {columns.map((column, index) => (
        <th key={index} className={twMerge("font-medium", cellClassName)}>
          {column}
        </th>
      ))}
    </tr>
  </thead>
);

const Body: FC<{ children: ReactNode }> = ({ children }) => (
  <tbody className="divide-border divide-y">{children}</tbody>
);

/** A full-width row for loading and empty states. */
const Message: FC<{ colSpan: number; children: ReactNode }> = ({
  colSpan,
  children,
}) => (
  <tr>
    <td colSpan={colSpan} className="text-muted px-5 py-6">
      {children}
    </td>
  </tr>
);

export const Table = {
  Root,
  Head,
  Body,
  Message,
};
