import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { getStoredToken } from "@api/http";
import { StatusGuard } from "@pages/StatusGuard";
import { AuthRoutes } from "@config/routes";

const Loading = () => (
  <div className="bg-background-dark h-dvh" aria-busy="true" />
);

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ location }) => {
    if (!getStoredToken()) {
      throw redirect({
        to: AuthRoutes.Login,
        search: { redirect: location.href },
      });
    }
  },
  pendingComponent: Loading,
  component: () => (
    <Suspense fallback={<Loading />}>
      <StatusGuard>
        <Outlet />
      </StatusGuard>
    </Suspense>
  ),
});
