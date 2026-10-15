import { ChatsApi } from "@api/chats";
import { useSuspenseQuery } from "@tanstack/react-query";
import { keys } from "../keys";

export const useSessions = () => {
  const { data } = useSuspenseQuery({
    queryKey: keys.sessions.list(),
    queryFn: ChatsApi.getSessions,
  });

  return data;
};
