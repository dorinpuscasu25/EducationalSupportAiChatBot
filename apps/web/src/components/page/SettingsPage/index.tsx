import { useRef, type FC, type ReactNode } from "react";
import { LuArrowLeft, LuCamera } from "react-icons/lu";
import type { User } from "@api/auth/response";
import { Alert } from "@components/display/Alert";
import { Avatar } from "@components/display/Avatar";
import { Card } from "@components/display/Card";
import { UserStatusBadge } from "@components/display/UserBadges";
import { ProfileCard, type ProfileValues } from "./ProfileCard";

export type { ProfileValues } from "./ProfileCard";
export { ChangeEmailCard } from "./ChangeEmailCard";
export {
  ChangePasswordCard,
  type ChangePasswordValues,
} from "./ChangePasswordCard";

type Props = {
  user: User;
  avatarUrl?: string;
  onBack: () => void;
  onAvatarChange: (file: File) => void;
  avatarPending?: boolean;
  /** Why the last upload failed; shown under the avatar. */
  avatarError?: string | null;
  onProfileSubmit: (values: ProfileValues) => void;
  profilePending?: boolean;
  profileSaved?: boolean;
  profileError?: string | null;
  /** The email and password cards, wired by the container. */
  children?: ReactNode;
};

export const SettingsPage: FC<Props> = ({
  user,
  avatarUrl,
  onBack,
  onAvatarChange,
  avatarPending,
  avatarError,
  onProfileSubmit,
  profilePending,
  profileSaved,
  profileError,
  children,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-background/40 text-primary min-h-dvh">
      <div className="border-border flex items-center justify-between border-b px-8 py-5">
        <h1 className="text-lg font-semibold">Setări cont</h1>
        <button
          onClick={onBack}
          className="text-muted hover:text-primary flex items-center gap-2 text-sm"
        >
          <LuArrowLeft className="size-4" /> Înapoi
        </button>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <Card theme="subtle" spacing="md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative size-20 overflow-hidden rounded-full"
              title="Schimbă avatarul"
              aria-label="Schimbă avatarul"
            >
              <Avatar
                src={avatarUrl}
                size="lg"
                initials={(user.first_name?.[0] ?? "U").toUpperCase()}
              />
              <div className="bg-background-dark/40 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <LuCamera className="text-primary size-5" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarChange(file);
                // Cleared, so picking the same file again (a retry) is a
                // change too (S50).
                e.target.value = "";
              }}
            />
            <div>
              <div className="font-medium">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-muted text-sm">{user.email}</div>
              <div className="mt-1">
                <UserStatusBadge status={user.status} />
              </div>
              {avatarPending && (
                <div className="text-muted mt-1 text-xs">
                  Se încarcă avatarul…
                </div>
              )}
            </div>
          </div>
          <Alert className="mt-4">{avatarError}</Alert>
        </Card>

        <ProfileCard
          initialValues={{
            first_name: user.first_name ?? "",
            last_name: user.last_name ?? "",
            phone: user.phone ?? "",
          }}
          onSubmit={onProfileSubmit}
          pending={profilePending}
          saved={profileSaved}
          error={profileError}
        />

        {children}
      </div>
    </div>
  );
};
