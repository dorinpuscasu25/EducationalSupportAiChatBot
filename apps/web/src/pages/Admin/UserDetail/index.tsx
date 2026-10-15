import { useNavigate } from "@tanstack/react-router";
import { AdminUserDetailPage } from "@components/page/AdminUserDetailPage";
import { ExportConversationsButton } from "@pages/Admin/ExportConversationsButton";
import {
  useAdminUserSessions,
  useAdminUserDetail,
} from "@apiQuery/query/admin";
import {
  useActivateUser,
  useSendPasswordReset,
  useSetUserQuota,
  useSetUserRole,
  useSuspendUser,
} from "@apiQuery/mutation/admin";
import { AdminRoutes } from "@config/routes";
import { errorCode, errorMessage } from "@utils/errors";
import { loadFailure } from "../load-failure";

/**
 * The backend refuses to suspend or demote the last active admin with this
 * sentence rather than a code (O17); the TRD shows it as is.
 */
const LAST_ACTIVE_ADMIN =
  "Ultimul administrator activ nu poate fi suspendat sau retrogradat.";

/** Copy for a failed action (ADMIN-05 Errors), or nothing while it has not failed. */
const actionError = (error: Error | null) =>
  error
    ? errorMessage(
        error,
        errorCode(error) === LAST_ACTIVE_ADMIN ? LAST_ACTIVE_ADMIN : undefined,
      )
    : undefined;

export const AdminUserDetailContainer = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const detail = useAdminUserDetail(userId);
  const sessions = useAdminUserSessions(userId);
  const activate = useActivateUser();
  const suspend = useSuspendUser();
  const setRole = useSetUserRole();
  const sendReset = useSendPasswordReset();
  const setQuota = useSetUserQuota();
  const role = detail.data?.user.role;

  // Activate, suspend and the role share one place in the page: starting one
  // clears the outcome of the others, so only the latest failure shows.
  const access = [activate, suspend, setRole];
  const startAccess = (start: () => void) => {
    access.forEach((mutation) => mutation.reset());
    start();
  };

  return (
    <AdminUserDetailPage
      detail={detail.data}
      sessions={sessions.data}
      sessionsFailure={loadFailure(sessions)}
      onOpenSession={(chatId) =>
        navigate({
          to: "/admin/users/$userId/sessions/$chatId",
          params: { userId, chatId },
        })
      }
      headerActions={<ExportConversationsButton userId={userId} />}
      loadFailure={loadFailure(detail)}
      onBack={() => navigate({ to: AdminRoutes.Users })}
      onActivate={() => startAccess(() => activate.mutate(userId))}
      onSuspend={() => startAccess(() => suspend.mutate(userId))}
      onToggleAdmin={() =>
        startAccess(() =>
          setRole.mutate({
            id: userId,
            role: role === "admin" ? "user" : "admin",
          }),
        )
      }
      busy={activate.isPending || suspend.isPending || setRole.isPending}
      activateError={actionError(activate.error)}
      suspendError={actionError(suspend.error)}
      roleError={actionError(setRole.error)}
      onSendReset={() => sendReset.mutate(userId)}
      resetPending={sendReset.isPending}
      resetSent={sendReset.isSuccess}
      resetError={actionError(sendReset.error)}
      onSaveQuota={(payload) => setQuota.mutate({ id: userId, payload })}
      quotaPending={setQuota.isPending}
      quotaSaved={setQuota.isSuccess}
      quotaError={actionError(setQuota.error)}
    />
  );
};
