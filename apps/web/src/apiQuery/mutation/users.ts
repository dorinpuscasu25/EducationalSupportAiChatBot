import { UsersApi, type UpdateProfilePayload } from "@api/users";
import type { User } from "@api/auth/response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { keys } from "../keys";

// Account changes return the updated user; write it straight into the cache.
const useSetUser = () => {
  const queryClient = useQueryClient();
  return (user: User) => queryClient.setQueryData(keys.auth.me(), user);
};

export const useUpdateProfile = () => {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      UsersApi.updateProfile(payload),
    onSuccess: setUser,
  });
};

export const useUploadAvatar = () => {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: (file: File) => UsersApi.uploadAvatar(file),
    onSuccess: setUser,
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) =>
      UsersApi.changePassword(v.currentPassword, v.newPassword),
  });

export const useRequestEmailChange = () =>
  useMutation({
    mutationFn: (newEmail: string) => UsersApi.requestEmailChange(newEmail),
  });

export const useConfirmEmailChange = () => {
  const setUser = useSetUser();
  return useMutation({
    mutationFn: (code: string) => UsersApi.confirmEmailChange(code),
    onSuccess: setUser,
  });
};
