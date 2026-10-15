import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPageContainer } from "@pages/ForgotPassword";

export const Route = createFileRoute("/forgot")({
  component: ForgotPasswordPageContainer,
});
