import type { FC } from "react";
import { LuShield, LuSettings, LuLogOut } from "react-icons/lu";
import { Link } from "@components/core/Link";
import { Avatar } from "@components/display/Avatar";
import { AccountRoutes, AdminRoutes } from "@config/routes";

export const UserFooter: FC<{
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  isAdmin: boolean;
  onLogout: () => void;
}> = ({ name, email, initials, avatarUrl, isAdmin, onLogout }) => (
  <div className="flex flex-col gap-2">
    {isAdmin && (
      <Link
        to={AdminRoutes.Overview}
        className="text-muted hover:text-primary flex items-center gap-2 text-sm"
      >
        <LuShield className="size-4" />
        Admin
      </Link>
    )}
    <div className="flex items-center gap-2">
      <Avatar src={avatarUrl} initials={initials} />
      <div className="min-w-0 flex-1">
        <div className="text-primary truncate text-sm">{name}</div>
        <div className="text-muted truncate text-xs">{email}</div>
      </div>
      <Link
        to={AccountRoutes.Settings}
        className="text-muted hover:text-primary"
        aria-label="Setări cont"
      >
        <LuSettings className="size-4" />
      </Link>
      <button
        onClick={onLogout}
        className="text-muted hover:text-primary"
        title="Deconectare"
      >
        <LuLogOut className="size-4" />
      </button>
    </div>
  </div>
);
