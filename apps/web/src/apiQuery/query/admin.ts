import { AdminApi } from "@api/admin";
import { useQuery } from "@tanstack/react-query";
import { keys } from "../keys";

// Admin screens render their own loading states, so these are plain queries.

export const useAdminMetrics = () =>
  useQuery({ queryKey: keys.admin.metrics(), queryFn: AdminApi.metrics });

export const useAdminSettings = () =>
  useQuery({ queryKey: keys.admin.settings(), queryFn: AdminApi.settings });

export const useAdminUsers = (status?: string) =>
  useQuery({
    queryKey: keys.admin.users.list(status),
    queryFn: () => AdminApi.listUsers(status),
  });

export const useAdminUserDetail = (id: string) =>
  useQuery({
    queryKey: keys.admin.users.detail(id),
    queryFn: () => AdminApi.userDetail(id),
    enabled: !!id,
  });

export const useAdminUserSessions = (id: string) =>
  useQuery({
    queryKey: [...keys.admin.users.detail(id), "sessions"],
    queryFn: () => AdminApi.userSessions(id),
    enabled: !!id,
  });

export const useAdminUserSession = (id: string, chatId: string) =>
  useQuery({
    queryKey: [...keys.admin.users.detail(id), "sessions", chatId],
    queryFn: () => AdminApi.userSession(id, chatId),
    enabled: !!id && !!chatId,
  });

/** Polls while a sync runs, so the table fills in as files are indexed. */
export const useKnowledge = () =>
  useQuery({
    queryKey: keys.admin.knowledge(),
    queryFn: AdminApi.knowledge,
    refetchInterval: (query) =>
      query.state.data?.sync?.running ? 2_000 : false,
  });

export const useKnowledgeSearch = (query: string) =>
  useQuery({
    queryKey: [...keys.admin.knowledge(), "search", query],
    queryFn: () => AdminApi.searchKnowledge(query),
    enabled: query.trim().length > 0,
  });
