/** One of several related actions, as a React Query mutation result gives it. */
type Action = {
  /** When it last started, in ms; 0 if it never did. */
  submittedAt: number;
  error: unknown;
};

/**
 * The failure to show for several actions that share one message (a member's
 * add, role change and removal): the most recently started action's. An
 * earlier failure is no longer shown once another action starts, and the
 * message clears while that one runs (S22).
 */
export function latestError(actions: Action[]): unknown {
  let latest: Action | undefined;
  for (const action of actions) {
    if (!latest || action.submittedAt > latest.submittedAt) latest = action;
  }
  return latest?.error ?? null;
}
