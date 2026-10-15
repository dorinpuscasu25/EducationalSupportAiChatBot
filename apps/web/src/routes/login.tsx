import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getStoredToken } from "@api/http";
import { LoginPageContainer } from "@pages/Login";
import { HomeRoute } from "@config/routes";
import { safeRedirect } from "@utils/redirect";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  beforeLoad: ({ search }) => {
    if (getStoredToken()) {
      const back = safeRedirect(search.redirect);
      throw back
        ? redirect({ href: back })
        : redirect({ to: HomeRoute, search: { chatId: undefined } });
    }
  },
  component: LoginPageContainer,
});
