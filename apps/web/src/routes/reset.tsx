import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetPasswordPageContainer } from "@pages/ResetPassword";

export const Route = createFileRoute("/reset")({
  validateSearch: z.object({
    email: z.string().optional().catch(""),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { email } = Route.useSearch();
  return <ResetPasswordPageContainer email={email ?? ""} />;
}
