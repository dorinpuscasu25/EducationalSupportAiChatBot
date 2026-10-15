import { ExportConversationsButton } from "@pages/Admin/ExportConversationsButton";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AdminUsersPage,
  type UsersFilter,
} from "@components/page/AdminUsersPage";
import { useAdminUsers } from "@apiQuery/query/admin";
import { useCreateUser, useSetUserRole } from "@apiQuery/mutation/admin";
import { AdminRoutes } from "@config/routes";
import { errorMessage } from "@utils/errors";
import { loadFailure } from "../load-failure";

export const AdminUsersContainer = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UsersFilter>("");
  // "admins" is filtered on the page; the server filters by status only.
  const users = useAdminUsers(
    status && status !== "admins" ? status : undefined,
  );
  const createUser = useCreateUser();
  const setRole = useSetUserRole();

  return (
    <AdminUsersPage
      users={users.data}
      headerActions={<ExportConversationsButton />}
      loading={users.isLoading}
      loadFailure={loadFailure(users)}
      status={status}
      onStatusChange={setStatus}
      onSetRole={(id, role) =>
        setRole.mutate(
          { id, role },
          {
            onError: (error) =>
              window.alert(
                errorMessage(
                  error,
                  "Nu am putut schimba rolul utilizatorului.",
                ),
              ),
          },
        )
      }
      roleChanging={setRole.isPending ? setRole.variables?.id : undefined}
      onOpenUser={(userId) =>
        navigate({ to: AdminRoutes.UserDetail, params: { userId } })
      }
      onCreateUser={(payload) => createUser.mutateAsync(payload)}
      // Opening or closing the form starts it afresh, without the last error.
      onCreateToggle={() => createUser.reset()}
      createError={
        createUser.error &&
        errorMessage(createUser.error, "Nu am putut crea utilizatorul.")
      }
    />
  );
};
