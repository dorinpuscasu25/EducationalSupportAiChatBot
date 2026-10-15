import { errorMessage } from "@utils/errors";

type Load = {
  isError: boolean;
  data: unknown;
  error: unknown;
  refetch: () => unknown;
};

/** What an admin screen shows when its data could not load (C3). */
export type LoadFailure = { message: string; onRetry: () => void };

/**
 * The failure of a screen's loads, if any has failed with nothing to show: the
 * first failure's reason (its code's copy, or a hint to try again) and a retry
 * of every failed load. A failed refresh of data already shown is not one; the
 * screen keeps what it has.
 */
export function loadFailure(...loads: Load[]): LoadFailure | undefined {
  const failed = loads.filter(
    (load) => load.isError && load.data === undefined,
  );
  if (!failed.length) return undefined;
  return {
    message: errorMessage(
      failed[0].error,
      "Încearcă din nou peste câteva momente.",
    ),
    onRetry: () => failed.forEach((load) => void load.refetch()),
  };
}
