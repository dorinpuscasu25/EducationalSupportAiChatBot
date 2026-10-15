import { createFileRoute } from "@tanstack/react-router";
import { SettingsPageContainer } from "@pages/Settings";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPageContainer,
});
