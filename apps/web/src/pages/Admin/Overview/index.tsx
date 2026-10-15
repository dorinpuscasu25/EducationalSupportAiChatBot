import { AdminOverviewPage } from "@components/page/AdminOverviewPage";
import { useAdminMetrics, useAdminUsers } from "@apiQuery/query/admin";
import { useActivateUser } from "@apiQuery/mutation/admin";
import { errorMessage } from "@utils/errors";
import { loadFailure } from "../load-failure";

export const AdminOverviewContainer = () => {
  const metrics = useAdminMetrics();
  const pending = useAdminUsers("pending");
  const activate = useActivateUser();

  return (
    <AdminOverviewPage
      loadFailure={loadFailure(metrics, pending)}
      metrics={metrics.data}
      pendingUsers={pending.data}
      pendingLoading={pending.isLoading}
      onActivate={(userId) => activate.mutate(userId)}
      activating={activate.isPending}
      activateError={
        activate.isError && activate.variables
          ? {
              userId: activate.variables,
              message: errorMessage(activate.error),
            }
          : undefined
      }
    />
  );
};
