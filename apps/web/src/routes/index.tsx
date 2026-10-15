import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredToken } from "@api/http";
import { AuthRoutes, HomeRoute } from "@config/routes";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (getStoredToken()) {
      throw redirect({ to: HomeRoute, search: { chatId: undefined } });
    }
    throw redirect({ to: AuthRoutes.Login, search: { redirect: undefined } });
  },
});
