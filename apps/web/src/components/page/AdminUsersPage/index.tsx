import { useMemo, useState, type FC, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { CreateUserPayload } from "@api/admin";
import type { UserListItem } from "@api/admin/response";
import type { UserStatus } from "@api/auth/response";
import { Button } from "@components/core/Button";
import { Control } from "@components/core/Control";
import { Card } from "@components/display/Card";
import { ErrorState } from "@components/display/RouteState";
import { Table } from "@components/display/Table";
import { UserRoleBadge, UserStatusBadge } from "@components/display/UserBadges";
import { PageHeader } from "@components/layout/PageHeader";
import { AdminRoutes } from "@config/routes";
import { formatDate, formatNumber } from "@utils/format";
import { CreateUserForm } from "./CreateUserForm";

const FILTERS: { key: UserStatus | ""; label: string }[] = [
  { key: "", label: "Toți" },
  { key: "pending", label: "În așteptare" },
  { key: "active", label: "Activi" },
  { key: "suspended", label: "Suspendați" },
];

const PAGE_SIZE = 15;

type Props = {
  users?: UserListItem[];
  headerActions?: ReactNode;
  loading?: boolean;
  /** The list could not load (C3): shown in place of the table. */
  loadFailure?: { message: string; onRetry: () => void };
  /** Server-side status filter; "" lists everyone. */
  status: UserStatus | "";
  onStatusChange: (status: UserStatus | "") => void;
  onOpenUser: (userId: string) => void;
  onCreateUser: (payload: CreateUserPayload) => Promise<unknown>;
  /** The create form opened or closed: its last outcome no longer applies. */
  onCreateToggle: () => void;
  createError?: string | null;
};

export const AdminUsersPage: FC<Props> = ({
  users,
  headerActions,
  loading,
  loadFailure,
  status,
  onStatusChange,
  onOpenUser,
  onCreateUser,
  onCreateToggle,
  createError,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter((u) =>
      `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q),
    );
  }, [users, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <>
      <PageHeader
        title="Cursanți"
        subtitle={
          loadFailure ? undefined : `${formatNumber(filtered.length)} rezultate`
        }
        right={
          <div className="flex items-center gap-2">
            {headerActions}
            <Button
              onClick={() => {
                setShowCreate((v) => !v);
                onCreateToggle();
              }}
            >
              {showCreate ? "Închide" : "+ Adaugă cursant"}
            </Button>
          </div>
        }
      />
      <div className="p-8">
        {showCreate && (
          <CreateUserForm
            onSubmit={onCreateUser}
            onDone={() => setShowCreate(false)}
            error={createError}
          />
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key || "all"}
                onClick={() => {
                  onStatusChange(f.key);
                  setPage(0);
                }}
                className={
                  "rounded-lg px-3 py-1.5 text-sm transition-colors " +
                  (status === f.key
                    ? "bg-pop/60 text-primary"
                    : "text-muted hover:bg-pop/30")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <Control.Input
            variant="compact"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            aria-label="Caută după nume sau email"
            placeholder="Caută după nume sau email…"
            className="w-72"
          />
        </div>

        {loadFailure ? (
          <ErrorState {...loadFailure} />
        ) : (
          <>
            <Card theme="subtle" spacing="none" className="overflow-hidden">
              <Table.Root>
                <Table.Head
                  columns={[
                    "Cursant",
                    "Rol",
                    "Status",
                    "Pachet",
                    "Sesiuni",
                    "Consum lună",
                  ]}
                />
                <Table.Body>
                  {loading && (
                    <Table.Message colSpan={6}>Se încarcă…</Table.Message>
                  )}
                  {!loading && rows.length === 0 && (
                    <Table.Message colSpan={6}>Niciun cursant.</Table.Message>
                  )}
                  {rows.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      onClick={() => onOpenUser(u.id)}
                    />
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2 text-sm">
                <button
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                  className="text-muted hover:text-primary disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <span className="text-muted">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                  className="text-muted hover:text-primary disabled:opacity-40"
                >
                  Următor →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

const UserRow: FC<{ user: UserListItem; onClick: () => void }> = ({
  user,
  onClick,
}) => {
  const limit = user.quota?.monthly_token_limit ?? 0;
  const used = user.quota?.tokens_used ?? 0;
  return (
    <tr
      onClick={onClick}
      className="hover:bg-pop/30 cursor-pointer transition-colors"
    >
      <td className="px-5 py-3">
        {/* The row's way in for the keyboard (C8); a click anywhere else on
            the row opens the same page. */}
        <Link
          to={AdminRoutes.UserDetail}
          params={{ userId: user.id }}
          onClick={(event) => event.stopPropagation()}
          className="block rounded-sm"
        >
          <span className="block font-medium">
            {user.first_name} {user.last_name}
          </span>
          <span className="text-muted block text-xs">{user.email}</span>
        </Link>
      </td>
      <td className="px-5 py-3">
        <UserRoleBadge role={user.role} />
      </td>
      <td className="px-5 py-3">
        <UserStatusBadge status={user.status} />
      </td>
      <td className="px-5 py-3">
        {user.quota?.package_name || <span className="text-muted">—</span>}
      </td>
      <td className="px-5 py-3">
        {user.session_count > 0 ? (
          <>
            <div className="font-medium">{user.session_count}</div>
            {user.last_active_at && (
              <div className="text-muted text-xs">
                ultima: {formatDate(user.last_active_at)}
              </div>
            )}
          </>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-xs">
        {limit
          ? `${formatNumber(used)} / ${formatNumber(limit)}`
          : used
            ? `${formatNumber(used)} / ∞`
            : "—"}
      </td>
    </tr>
  );
};
