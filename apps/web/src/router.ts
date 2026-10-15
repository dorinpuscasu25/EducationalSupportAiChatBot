import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteError } from "@pages/RouteError";
import { LoadingState } from "@components/display/RouteState";

/** The app's router. Tests build theirs here too, on a memory history. */
export function createAppRouter(
  queryClient: QueryClient,
  history?: RouterHistory,
) {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    // A route that fails or is still loading shows it where its screen would
    // be (C2, C3), never a blank page or the router's own error screen.
    defaultErrorComponent: RouteError,
    defaultPendingComponent: LoadingState,
    scrollRestoration: true,
    context: {
      queryClient,
    },
    history,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface HistoryState {
    /** The draft a chat was created from, so its view is kept (pages/Chat). */
    draftKey?: string;
  }
}
