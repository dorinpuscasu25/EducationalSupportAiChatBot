import { useNavigate } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@components/page/ForgotPasswordPage";
import { useForgotPassword } from "@apiQuery/mutation/auth";
import { AuthRoutes } from "@config/routes";
import { errorMessage } from "@utils/errors";

export const ForgotPasswordPageContainer = () => {
  const navigate = useNavigate();
  const forgot = useForgotPassword();

  return (
    <ForgotPasswordPage
      onSubmit={(email) =>
        forgot.mutate(email, {
          onSuccess: () =>
            navigate({ to: AuthRoutes.Reset, search: { email } }),
        })
      }
      pending={forgot.isPending}
      error={forgot.error && errorMessage(forgot.error)}
    />
  );
};
