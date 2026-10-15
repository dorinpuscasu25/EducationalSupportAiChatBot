import { useNavigate } from "@tanstack/react-router";
import { VerifyPage } from "@components/page/VerifyPage";
import { useResendCode, useVerifyEmail } from "@apiQuery/mutation/auth";
import { HomeRoute } from "@config/routes";
import { errorMessage } from "@utils/errors";

export const VerifyPageContainer = ({ email }: { email: string }) => {
  const navigate = useNavigate();
  const verify = useVerifyEmail();
  const resend = useResendCode();

  return (
    <VerifyPage
      email={email}
      onSubmit={(code) =>
        verify.mutate(
          { email, code },
          {
            onSuccess: () =>
              navigate({ to: HomeRoute, search: { chatId: undefined } }),
          },
        )
      }
      onResend={() => resend.mutateAsync(email)}
      pending={verify.isPending}
      resendPending={resend.isPending}
      error={
        verify.error && errorMessage(verify.error, "Cod invalid sau expirat.")
      }
      resendError={resend.error && errorMessage(resend.error)}
    />
  );
};
