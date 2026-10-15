import { AdminSettingsPage } from "@components/page/AdminSettingsPage";
import { useAdminSettings } from "@apiQuery/query/admin";
import { useUpdateAdminSettings } from "@apiQuery/mutation/admin";
import { loadFailure } from "../load-failure";

export const AdminSettingsContainer = () => {
  const settings = useAdminSettings();
  const update = useUpdateAdminSettings();

  return (
    <AdminSettingsPage
      loadFailure={loadFailure(settings)}
      autoActivate={settings.data?.auto_activate_users ?? false}
      onAutoActivateChange={(value) =>
        update.mutate({ auto_activate_users: value })
      }
      disabled={settings.isLoading || update.isPending}
      saveFailed={update.isError}
    />
  );
};
