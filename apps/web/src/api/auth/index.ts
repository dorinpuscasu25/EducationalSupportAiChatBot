import { HTTP } from "@api/http";
import type { AuthResponse, User } from "./response";

export type RegisterPayload = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string; // E.164, e.g. +37360000000
  password: string;
};

export const AuthApi = {
  me() {
    return HTTP.get<User>("/users/me");
  },
  register(payload: RegisterPayload) {
    return HTTP.post<{ ok: boolean; email: string }>(
      "/auth/register",
      payload,
      false,
    );
  },
  verifyEmail(email: string, code: string) {
    return HTTP.post<AuthResponse>(
      "/auth/verify-email",
      { email, code },
      false,
    );
  },
  resendCode(email: string) {
    return HTTP.post<{ ok: boolean }>("/auth/resend-code", { email }, false);
  },
  login(email: string, password: string) {
    return HTTP.post<AuthResponse>("/auth/login", { email, password }, false);
  },
  forgotPassword(email: string) {
    return HTTP.post<{ ok: boolean }>(
      "/auth/forgot-password",
      { email },
      false,
    );
  },
  resetPassword(email: string, code: string, newPassword: string) {
    return HTTP.post<{ ok: boolean }>(
      "/auth/reset-password",
      { email, code, new_password: newPassword },
      false,
    );
  },
};
