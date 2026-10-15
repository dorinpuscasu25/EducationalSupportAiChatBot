import { HTTP } from "@api/http";
import type { User } from "@api/auth/response";

export type UpdateProfilePayload = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  language?: string;
};

export const UsersApi = {
  updateProfile(payload: UpdateProfilePayload) {
    return HTTP.patch<User>("/users/me", payload);
  },
  changePassword(currentPassword: string, newPassword: string) {
    return HTTP.post<{ ok: boolean }>("/users/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
  uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append("avatar", file);
    return HTTP.post<User>("/users/me/avatar", fd);
  },
  requestEmailChange(newEmail: string) {
    return HTTP.post<{ ok: boolean; new_email: string }>(
      "/users/me/email/request",
      { new_email: newEmail },
    );
  },
  confirmEmailChange(code: string) {
    return HTTP.post<User>("/users/me/email/confirm", { code });
  },
};
