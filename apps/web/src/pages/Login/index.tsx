import { useNavigate } from "@tanstack/react-router";
import { LoginPage, type LoginValues } from "@components/page/LoginPage";
import { useLogin } from "@apiQuery/mutation/auth";
import { AuthRoutes, HomeRoute } from "@config/routes";
import { errorCode, errorMessage } from "@utils/errors";
import { safeRedirect } from "@utils/redirect";
import { Route } from "@routes/login";

export const LoginPageContainer = () => {
  const navigate = useNavigate();
  const login = useLogin();
  const back = safeRedirect(Route.useSearch().redirect);

  const handleSubmit = (values: LoginValues) =>
    login.mutate(values, {
      // Back to the page that sent the user here, if any (AUTH-05).
      onSuccess: () =>
        back
          ? navigate({ href: back, replace: true })
          : navigate({ to: HomeRoute, search: { chatId: undefined } }),
      onError: (error) => {
        if (errorCode(error) === "email_not_verified") {
          navigate({ to: AuthRoutes.Verify, search: { email: values.email } });
        }
      },
    });

  return (
    <LoginPage
      onSubmit={handleSubmit}
      pending={login.isPending}
      error={login.error && errorMessage(login.error)}
    />
  );
};
