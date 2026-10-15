import { Suspense, type FC, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { uploadUrl } from "@api/http";
import { useSessions } from "@apiQuery/query/sessions";
import { useUser } from "@apiQuery/query/auth";
import { useLogout } from "@apiQuery/mutation/auth";
import { useSessionDelete } from "@apiQuery/mutation/sessions";
import { newConversationState } from "@pages/Chat/conversation";
import { initialsOf } from "@utils/format";
import { RootLayout, UserFooter } from "@components/layout/RootLayout";
import { RootLayoutSkeleton } from "@components/layout/RootLayout/skeleton";
import { RootSidebar } from "@components/layout/RootSidebar";
import { SessionsRoutes } from "@config/routes";

const Container: FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const sessions = useSessions();
  const user = useUser();
  const logout = useLogout();
  const deleteSession = useSessionDelete();
  // strict:false so the shell works on every route it wraps.
  const search = useSearch({ strict: false }) as { chatId?: string };

  const newConversation = () =>
    navigate({
      to: SessionsRoutes.Sessions,
      search: { chatId: undefined },
      state: newConversationState(),
    });

  const sidebar = (
    <RootSidebar
      sessions={sessions.map((s) => ({ id: s.id, title: s.title }))}
      currentChatId={search.chatId}
      // Each visit to a blank chat is a fresh draft (pages/Chat/conversation):
      // nothing to clear, and a reply still in flight elsewhere is kept.
      onNewConversation={newConversation}
      onOpenSession={(chatId) =>
        navigate({ to: SessionsRoutes.Sessions, search: { chatId } })
      }
      onDeleteSession={(chatId) =>
        deleteSession.mutate(chatId, {
          onSuccess: () => {
            if (search.chatId === chatId) newConversation();
          },
        })
      }
    />
  );

  const footer = (
    <UserFooter
      name={`${user.first_name} ${user.last_name}`}
      email={user.email}
      initials={initialsOf(user)}
      avatarUrl={uploadUrl(user.avatar)}
      isAdmin={user.role === "admin"}
      onLogout={logout}
    />
  );

  return (
    <RootLayout sidebar={sidebar} footer={footer}>
      {children}
    </RootLayout>
  );
};

/** The signed-in app frame: sidebar navigation, account footer, content. */
export const AppShell: FC<{ children: ReactNode }> = ({ children }) => (
  <Suspense fallback={<RootLayoutSkeleton>{children}</RootLayoutSkeleton>}>
    <Container>{children}</Container>
  </Suspense>
);
