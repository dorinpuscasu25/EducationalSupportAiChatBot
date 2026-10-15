import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredToken } from "@api/http";
import { RegisterPageContainer } from "@pages/Register";
import { HomeRoute } from "@config/routes";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (getStoredToken()) {
      throw redirect({ to: HomeRoute, search: { chatId: undefined } });
    }
  },
  component: RegisterPageContainer,
});
