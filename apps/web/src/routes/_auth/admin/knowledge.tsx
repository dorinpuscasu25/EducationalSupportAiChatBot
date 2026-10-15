import { createFileRoute } from "@tanstack/react-router";
import { AdminKnowledgeContainer } from "@pages/Admin/Knowledge";

export const Route = createFileRoute("/_auth/admin/knowledge")({
  component: AdminKnowledgeContainer,
});
