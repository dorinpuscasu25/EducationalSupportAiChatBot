import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersContainer } from "@pages/Admin/Users";

export const Route = createFileRoute("/_auth/admin/users/")({
  component: AdminUsersContainer,
});
