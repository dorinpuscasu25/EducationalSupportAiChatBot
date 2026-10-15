import { AuthApi } from "@api/auth";
import { useSuspenseQuery } from "@tanstack/react-query";
import { keys } from "../keys";

export const userQueryOptions = () => ({
  queryKey: keys.auth.me(),
  queryFn: AuthApi.me,
});

export const useUser = () => {
  const { data } = useSuspenseQuery(userQueryOptions());

  return data;
};
