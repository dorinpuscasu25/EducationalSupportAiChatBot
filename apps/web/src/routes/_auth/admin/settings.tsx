import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsContainer } from "@pages/Admin/Settings";

export const Route = createFileRoute("/_auth/admin/settings")({
  component: AdminSettingsContainer,
});
