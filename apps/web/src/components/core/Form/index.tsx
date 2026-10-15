import type { FC, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onSubmit: () => void;
};

export const Form: FC<Props> = ({ children, className, onSubmit }) => {
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
};
