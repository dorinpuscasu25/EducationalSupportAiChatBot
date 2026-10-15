import { expect, test } from "vitest";
import { latestError } from "./latest-error";

// The member actions of PROJ-05 and ORG-02 (add, change a role, remove) share
// one alert. Each action is `{ submittedAt, error }`, as React Query's
// mutation results give it: `submittedAt` is when it last started (0: never).

const conflict = new Error("conflict");
const forbidden = new Error("forbidden");

test("PROJ-05 failed (S22): the alert shows the latest action's failure, not the first action's", () => {
  // add failed, then a role change succeeded: nothing to show.
  expect(
    latestError([
      { submittedAt: 1, error: conflict },
      { submittedAt: 2, error: null },
      { submittedAt: 0, error: null },
    ]),
  ).toBeNull();
  // a removal failed after an add had failed: the removal's.
  expect(
    latestError([
      { submittedAt: 1, error: conflict },
      { submittedAt: 0, error: null },
      { submittedAt: 3, error: forbidden },
    ]),
  ).toBe(forbidden);
  // the next action started (in flight, no error yet): the alert clears.
  expect(
    latestError([
      { submittedAt: 5, error: null },
      { submittedAt: 4, error: forbidden },
      { submittedAt: 0, error: null },
    ]),
  ).toBeNull();
});

test("PROJ-05 listed: no action yet, nothing to show", () => {
  expect(
    latestError([
      { submittedAt: 0, error: null },
      { submittedAt: 0, error: null },
    ]),
  ).toBeNull();
  expect(latestError([])).toBeNull();
});
