import { useNavigate } from "@tanstack/react-router";
import { ResetPasswordPage } from "@components/page/ResetPasswordPage";
import { useResetPassword } from "@apiQuery/mutation/auth";
import { AuthRoutes } from "@config/routes";
import { errorMessage } from "@utils/errors";

export const ResetPasswordPageContainer = ({ email }: { email: string }) => {
  const navigate = useNavigate();
  const reset = useResetPassword();

  return (
    <ResetPasswordPage
      email={email}
      onSubmit={(values) =>
        reset.mutate({
          email: values.email,
          code: values.code,
          newPassword: values.password,
        })
      }
      onGoToLogin={() =>
        navigate({ to: AuthRoutes.Login, search: { redirect: undefined } })
      }
      pending={reset.isPending}
      done={reset.isSuccess}
      error={
        reset.error && errorMessage(reset.error, "Cod invalid sau expirat.")
      }
    />
  );
};
