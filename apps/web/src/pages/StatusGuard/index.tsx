import type { FC, ReactNode } from "react";
import { PendingPage } from "@components/page/PendingPage";
import { useUser } from "@apiQuery/query/auth";
import { useLogout } from "@apiQuery/mutation/auth";

// Blocks the app for accounts that are not active. Renders inside Suspense so
// useUser can resolve /users/me, which the backend keeps reachable even for
// pending accounts.
export const StatusGuard: FC<{ children: ReactNode }> = ({ children }) => {
  const user = useUser();
  const logout = useLogout();

  if (user.status !== "active") {
    return <PendingPage status={user.status} onSignOut={logout} />;
  }
  return children;
};
