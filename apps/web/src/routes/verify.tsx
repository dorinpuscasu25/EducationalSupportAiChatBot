import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VerifyPageContainer } from "@pages/Verify";

export const Route = createFileRoute("/verify")({
  validateSearch: z.object({
    email: z.string().optional().catch(""),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { email } = Route.useSearch();
  return <VerifyPageContainer email={email ?? ""} />;
}
