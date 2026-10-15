import { useNavigate } from "@tanstack/react-router";
import {
  ChangeEmailCard,
  ChangePasswordCard,
  SettingsPage,
} from "@components/page/SettingsPage";
import { uploadUrl } from "@api/http";
import { useUser } from "@apiQuery/query/auth";
import {
  useChangePassword,
  useConfirmEmailChange,
  useRequestEmailChange,
  useUpdateProfile,
  useUploadAvatar,
} from "@apiQuery/mutation/users";
import { HomeRoute } from "@config/routes";
import { errorMessage } from "@utils/errors";

export const SettingsPageContainer = () => {
  const navigate = useNavigate();
  const user = useUser();
  const profile = useUpdateProfile();
  const avatar = useUploadAvatar();
  const password = useChangePassword();
  const requestEmail = useRequestEmailChange();
  const confirmEmail = useConfirmEmailChange();

  const emailError = confirmEmail.error
    ? errorMessage(confirmEmail.error, "Cod invalid sau expirat.")
    : requestEmail.error
      ? errorMessage(requestEmail.error, "Nu am putut trimite codul.")
      : null;

  return (
    <SettingsPage
      user={user}
      avatarUrl={uploadUrl(user.avatar)}
      onBack={() => navigate({ to: HomeRoute, search: { chatId: undefined } })}
      onAvatarChange={(file) => avatar.mutate(file)}
      avatarPending={avatar.isPending}
      avatarError={avatar.error && errorMessage(avatar.error)}
      onProfileSubmit={(values) => profile.mutate(values)}
      profilePending={profile.isPending}
      profileSaved={profile.isSuccess}
      profileError={profile.error && errorMessage(profile.error)}
    >
      <ChangeEmailCard
        currentEmail={user.email}
        onRequest={(newEmail) => {
          confirmEmail.reset();
          return requestEmail.mutateAsync(newEmail);
        }}
        onConfirm={(code) => confirmEmail.mutateAsync(code)}
        onCancel={() => {
          requestEmail.reset();
          confirmEmail.reset();
        }}
        requestPending={requestEmail.isPending}
        confirmPending={confirmEmail.isPending}
        error={emailError}
      />
      <ChangePasswordCard
        onSubmit={(values) => password.mutateAsync(values)}
        pending={password.isPending}
        error={
          password.error &&
          errorMessage(password.error, "Nu am putut schimba parola.")
        }
      />
    </SettingsPage>
  );
};
