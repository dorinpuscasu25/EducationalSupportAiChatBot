import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import type { AdminMetrics, UserListItem } from "@api/admin/response";
import { Button } from "@components/core/Button";
import { Alert } from "@components/display/Alert";
import { Card } from "@components/display/Card";
import { ErrorState } from "@components/display/RouteState";
import { UserStatusBadge } from "@components/display/UserBadges";
import { PageHeader } from "@components/layout/PageHeader";
import { AdminRoutes } from "@config/routes";
import { formatNumber } from "@utils/format";

const Stat: FC<{ label: string; value?: number; accent?: string }> = ({
  label,
  value,
  accent = "text-primary",
}) => (
  <Card theme="subtle" spacing="md">
    <div className="text-muted text-xs tracking-wide uppercase">{label}</div>
    <div className={`mt-2 text-3xl font-semibold ${accent}`}>
      {formatNumber(value)}
    </div>
  </Card>
);

type Props = {
  /** The counts or the pending accounts could not load (C3). */
  loadFailure?: { message: string; onRetry: () => void };
  metrics?: AdminMetrics;
  pendingUsers?: UserListItem[];
  pendingLoading?: boolean;
  onActivate: (userId: string) => void;
  activating?: boolean;
  /** The last activation that failed, shown in that account's row. */
  activateError?: { userId: string; message: string };
};

export const AdminOverviewPage: FC<Props> = ({
  loadFailure,
  metrics: m,
  pendingUsers,
  pendingLoading,
  onActivate,
  activating,
  activateError,
}) => (
  <>
    <PageHeader
      title="Prezentare generală"
      subtitle="Utilizatori, aprobări și activitate"
    />
    {loadFailure ? (
      <ErrorState {...loadFailure} />
    ) : (
      <div className="p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total utilizatori" value={m?.total_users} />
          <Stat
            label="În așteptare"
            value={m?.pending_users}
            accent="text-highlight"
          />
          <Stat
            label="Activi"
            value={m?.active_users}
            accent="text-highlight"
          />
          <Stat
            label="Suspendați"
            value={m?.suspended_users}
            accent="text-highlight"
          />
        </div>

        <h2 className="mt-8 mb-3 font-semibold">Activitatea asistentului</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat label="Întrebări azi" value={m?.questions_today} />
          <Stat label="Întrebări (7 zile)" value={m?.questions_last_7_days} />
          <Stat label="Răspunsuri totale" value={m?.assistant_responses} />
          <Stat
            label="Feedback pozitiv"
            value={m?.helpful_feedback}
            accent="text-highlight"
          />
          <Stat
            label="Probleme raportate"
            value={m?.problem_feedback}
            accent="text-highlight"
          />
          <Stat label="Documente indexate" value={m?.knowledge_documents} />
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Cereri de aprobat</h2>
            <Link
              to={AdminRoutes.Users}
              className="text-muted hover:text-primary text-sm"
            >
              Vezi toți →
            </Link>
          </div>

          <Card theme="subtle" spacing="none">
            {pendingLoading && (
              <div className="text-muted p-5 text-sm">Se încarcă…</div>
            )}
            {pendingUsers?.length === 0 && (
              <div className="text-muted p-5 text-sm">
                Niciun cont în așteptare. 🎉
              </div>
            )}
            <div className="divide-border divide-y">
              {pendingUsers?.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 px-5 py-3"
                >
                  <div>
                    <div className="font-medium">
                      {u.first_name} {u.last_name}
                    </div>
                    <div className="text-muted text-xs">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserStatusBadge status={u.status} />
                    <Button
                      aria-label={`Aprobă ${u.email}`}
                      disabled={activating}
                      onClick={() => onActivate(u.id)}
                    >
                      Aprobă
                    </Button>
                  </div>
                  {activateError?.userId === u.id && (
                    <Alert className="mt-2 basis-full">
                      {activateError.message}
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )}
  </>
);
