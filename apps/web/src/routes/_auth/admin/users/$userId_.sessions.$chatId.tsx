import { createFileRoute } from "@tanstack/react-router";
import { UserSessionPage } from "@pages/Admin/UserSession";

export const Route = createFileRoute(
  "/_auth/admin/users/$userId_/sessions/$chatId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId, chatId } = Route.useParams();
  return <UserSessionPage userId={userId} chatId={chatId} />;
}
