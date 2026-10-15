import { useEffect } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ErrorState } from "@components/display/RouteState";
import { errorMessage } from "@utils/errors";

/**
 * Every route's error screen (the router's default): a failed loader or query
 * shows its copy and a retry where the screen would be, inside the layout
 * that is still standing (C3, S7), never the router's own screen.
 */
export const RouteError = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();
  const queryErrors = useQueryErrorResetBoundary();

  // A suspense query that failed retries when the screen is shown again.
  useEffect(() => {
    queryErrors.reset();
  }, [queryErrors]);

  return (
    <ErrorState
      message={errorMessage(error, "Încearcă din nou peste câteva momente.")}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
    />
  );
};
