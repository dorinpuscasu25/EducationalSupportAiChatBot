import { ExportConversationsButton } from "@pages/Admin/ExportConversationsButton";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { UserStatus } from "@api/auth/response";
import { AdminUsersPage } from "@components/page/AdminUsersPage";
import { useAdminUsers } from "@apiQuery/query/admin";
import { useCreateUser } from "@apiQuery/mutation/admin";
import { AdminRoutes } from "@config/routes";
import { errorMessage } from "@utils/errors";
import { loadFailure } from "../load-failure";

export const AdminUsersContainer = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UserStatus | "">("");
  const users = useAdminUsers(status || undefined);
  const createUser = useCreateUser();

  return (
    <AdminUsersPage
      users={users.data}
      headerActions={<ExportConversationsButton />}
      loading={users.isLoading}
      loadFailure={loadFailure(users)}
      status={status}
      onStatusChange={setStatus}
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
