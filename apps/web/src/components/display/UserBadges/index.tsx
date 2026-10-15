import type { FC } from "react";
import type { UserRole, UserStatus } from "@api/auth/response";
import { Badge } from "@components/display/Badge";

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  pending: "În așteptare",
  active: "Activ",
  suspended: "Suspendat",
};

export const UserStatusBadge: FC<{ status: UserStatus }> = ({ status }) => (
  <Badge variant="pill">{USER_STATUS_LABEL[status] ?? status}</Badge>
);

export const UserRoleBadge: FC<{ role: UserRole }> = ({ role }) =>
  role === "admin" ? (
    <Badge variant="pill">Admin</Badge>
  ) : (
    <span className="text-muted text-xs">Cursant</span>
  );
