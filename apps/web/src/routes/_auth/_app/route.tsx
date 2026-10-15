import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@pages/AppShell";

/** The app shell (sidebar + content) around the student's chat. */
export const Route = createFileRoute("/_auth/_app")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
