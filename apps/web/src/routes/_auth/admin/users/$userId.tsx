import { createFileRoute } from "@tanstack/react-router";
import { AdminUserDetailContainer } from "@pages/Admin/UserDetail";

export const Route = createFileRoute("/_auth/admin/users/$userId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();
  return <AdminUserDetailContainer userId={userId} />;
}
