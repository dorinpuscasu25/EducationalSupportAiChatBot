import { AuthApi, type RegisterPayload } from "@api/auth";
import type { AuthResponse } from "@api/auth/response";
import { clearStoredToken, setStoredToken } from "@api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AuthRoutes } from "@config/routes";
import { keys } from "../keys";

function useApplyAuth() {
  const queryClient = useQueryClient();
  return (resp: AuthResponse) => {
    setStoredToken(resp.token);
    queryClient.setQueryData(keys.auth.me(), resp.user);
    queryClient.invalidateQueries({ queryKey: keys.auth.me() });
  };
}

export const useLogin = () => {
  const apply = useApplyAuth();
  return useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      AuthApi.login(v.email, v.password),
    onSuccess: apply,
  });
};

export const useRegister = () =>
  useMutation({
    mutationFn: (payload: RegisterPayload) => AuthApi.register(payload),
  });

export const useVerifyEmail = () => {
  const apply = useApplyAuth();
  return useMutation({
    mutationFn: (v: { email: string; code: string }) =>
      AuthApi.verifyEmail(v.email, v.code),
    onSuccess: apply,
  });
};

export const useResendCode = () =>
  useMutation({
    mutationFn: (email: string) => AuthApi.resendCode(email),
  });

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) => AuthApi.forgotPassword(email),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: (v: { email: string; code: string; newPassword: string }) =>
      AuthApi.resetPassword(v.email, v.code, v.newPassword),
  });

/** Not a request: drops the token and every cached query, then leaves. */
export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return () => {
    clearStoredToken();
    queryClient.clear();
    navigate({ to: AuthRoutes.Login, search: { redirect: undefined } });
  };
};
