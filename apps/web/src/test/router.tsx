import type { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type RouteComponent,
} from "@tanstack/react-router";
import { setStoredToken } from "@api/http";
import { createAppRouter } from "../router";
import { render, testQueryClient } from "./render";

/**
 * The whole app at `at`, on a memory history: the real route tree with the
 * app's own router options, so loaders, guards, preloading and navigation run
 * exactly as they ship. Signed in by default (a token in localStorage, which
 * `_auth`'s guard reads); answer the shell's requests with `shellApi()`.
 */
export async function renderApp({
  at,
  signedIn = true,
  queryClient = testQueryClient(),
}: {
  at: string;
  signedIn?: boolean;
  queryClient?: QueryClient;
}) {
  if (signedIn) setStoredToken("test-token");
  const router = createAppRouter(
    queryClient,
    createMemoryHistory({ initialEntries: [at] }),
  );
  await router.load();
  const result = render(<RouterProvider router={router} />, { queryClient });
  return { ...result, router };
}

/**
 * One component on a minimal router, for containers that navigate but read no
 * route of their own. A catch-all beside it lets any navigation settle, so the
 * test asserts where it went: `router.state.location`.
 */
export function renderOnRoute(
  component: RouteComponent,
  {
    path,
    at = path,
    queryClient = testQueryClient(),
  }: { path: string; at?: string; queryClient?: QueryClient },
) {
  const root = createRootRoute({ component: Outlet });
  const screen = createRoute({ getParentRoute: () => root, path, component });
  const elsewhere = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([screen, elsewhere]),
    history: createMemoryHistory({ initialEntries: [at] }),
    context: { queryClient },
  });
  const result = render(<RouterProvider router={router} />, { queryClient });
  return { ...result, router };
}
