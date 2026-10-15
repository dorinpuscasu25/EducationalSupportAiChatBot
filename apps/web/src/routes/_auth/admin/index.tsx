import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewContainer } from "@pages/Admin/Overview";

export const Route = createFileRoute("/_auth/admin/")({
  component: AdminOverviewContainer,
});
