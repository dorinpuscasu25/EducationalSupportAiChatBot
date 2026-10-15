import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@components/layout/AdminShell";
import { userQueryOptions } from "@apiQuery/query/auth";
import { HomeRoute } from "@config/routes";

export const Route = createFileRoute("/_auth/admin")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(userQueryOptions());
    if (user.role !== "admin") {
      throw redirect({
        to: HomeRoute,
        search: { chatId: undefined },
        replace: true,
      });
    }
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
