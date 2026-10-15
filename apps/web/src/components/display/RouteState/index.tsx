import type { FC } from "react";
import { Button } from "@components/core/Button";

/** A screen whose data could not load: what happened, and a retry (C3). */
export const ErrorState: FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    role="alert"
    className="mx-auto flex w-full max-w-md flex-col items-center gap-3 py-16 text-center"
  >
    <p className="text-primary text-base font-medium">
      Nu am putut încărca pagina.
    </p>
    <p className="text-muted text-sm">{message}</p>
    <Button onClick={onRetry}>Reîncearcă</Button>
  </div>
);

/** A screen still loading its data (C2). */
export const LoadingState: FC = () => (
  <div
    role="status"
    aria-busy="true"
    className="text-muted mx-auto w-full max-w-md py-16 text-center text-sm"
  >
    Se încarcă…
  </div>
);
