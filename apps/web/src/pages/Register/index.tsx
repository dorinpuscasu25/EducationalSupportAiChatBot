import { useNavigate } from "@tanstack/react-router";
import {
  RegisterPage,
  type RegisterValues,
} from "@components/page/RegisterPage";
import { useRegister } from "@apiQuery/mutation/auth";
import { AuthRoutes } from "@config/routes";
import { errorMessage } from "@utils/errors";

export const RegisterPageContainer = () => {
  const navigate = useNavigate();
  const register = useRegister();

  const handleSubmit = ({ confirm: _confirm, ...payload }: RegisterValues) =>
    register.mutate(payload, {
      onSuccess: () =>
        navigate({ to: AuthRoutes.Verify, search: { email: payload.email } }),
    });

  return (
    <RegisterPage
      onSubmit={handleSubmit}
      pending={register.isPending}
      error={
        register.error &&
        errorMessage(register.error, "Înregistrarea a eșuat. Încearcă din nou.")
      }
    />
  );
};
