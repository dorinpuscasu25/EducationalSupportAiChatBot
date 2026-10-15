import {
  AdminApi,
  type CreateUserPayload,
  type SetQuotaPayload,
} from "@api/admin";
import type { UserRole } from "@api/auth/response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { keys } from "../keys";

// User changes show up in the roster, the detail view and the metrics.
const useInvalidateUsers = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.admin.users.all() });
    queryClient.invalidateQueries({ queryKey: keys.admin.metrics() });
  };
};

export const useActivateUser = () => {
  const invalidateUsers = useInvalidateUsers();
  return useMutation({
    mutationFn: AdminApi.activate,
    onSuccess: invalidateUsers,
  });
};

export const useSuspendUser = () => {
  const invalidateUsers = useInvalidateUsers();
  return useMutation({
    mutationFn: AdminApi.suspend,
    onSuccess: invalidateUsers,
  });
};

export const useSetUserRole = () => {
  const invalidateUsers = useInvalidateUsers();
  return useMutation({
    mutationFn: (v: { id: string; role: UserRole }) =>
      AdminApi.setRole(v.id, v.role),
    onSuccess: invalidateUsers,
  });
};

export const useSetUserQuota = () => {
  const invalidateUsers = useInvalidateUsers();
  return useMutation({
    mutationFn: (v: { id: string; payload: SetQuotaPayload }) =>
      AdminApi.setQuota(v.id, v.payload),
    onSuccess: invalidateUsers,
  });
};

export const useSendPasswordReset = () =>
  useMutation({ mutationFn: AdminApi.sendReset });

export const useCreateUser = () => {
  const invalidateUsers = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => AdminApi.createUser(payload),
    onSuccess: invalidateUsers,
  });
};

export const useUpdateAdminSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: AdminApi.updateSettings,
    onSuccess: (next) => queryClient.setQueryData(keys.admin.settings(), next),
  });
};

export const useSyncKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (force: boolean) => AdminApi.syncKnowledge(force),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.admin.knowledge() }),
  });
};
