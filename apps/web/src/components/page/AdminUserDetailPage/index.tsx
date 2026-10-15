import type { FC, ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";
import type { SetQuotaPayload } from "@api/admin";
import type {
  SessionSummary,
  UserDetail,
  UserStats,
} from "@api/admin/response";
import { Button } from "@components/core/Button";
import { Alert } from "@components/display/Alert";
import { Card } from "@components/display/Card";
import { ErrorState } from "@components/display/RouteState";
import { Table } from "@components/display/Table";
import { UsageBar } from "@components/display/UsageBar";
import { UserRoleBadge, UserStatusBadge } from "@components/display/UserBadges";
import { PageHeader } from "@components/layout/PageHeader";
import { formatDateTime, formatNumber } from "@utils/format";
import { ActivityChart } from "./ActivityChart";
import { QuotaForm } from "./QuotaForm";

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-muted">{label}</dt>
    <dd className="text-right">{value}</dd>
  </div>
);

const Metric: FC<{ label: string; value?: number }> = ({ label, value }) => (
  <div className="bg-background rounded-lg p-3">
    <div className="text-lg font-semibold">{formatNumber(value)}</div>
    <div className="text-muted text-xs">{label}</div>
  </div>
);

const PanelTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h3 className="border-border border-b px-5 py-4 font-semibold">{children}</h3>
);

type Props = {
  detail?: UserDetail;
  sessions?: SessionSummary[];
  sessionsFailure?: { message: string; onRetry: () => void };
  onOpenSession?: (chatId: string) => void;
  headerActions?: ReactNode;
  /** The detail could not load, or the id is unknown (C3). */
  loadFailure?: { message: string; onRetry: () => void };
  onBack: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onToggleAdmin: () => void;
  /** Activate, suspend or role change in flight. */
  busy?: boolean;
  /** Each action's failure, shown next to its control. */
  activateError?: string;
  suspendError?: string;
  roleError?: string;
  onSendReset: () => void;
  resetPending?: boolean;
  resetSent?: boolean;
  resetError?: string;
  onSaveQuota: (payload: SetQuotaPayload) => void;
  quotaPending?: boolean;
  quotaSaved?: boolean;
  quotaError?: string;
};

const EMPTY_STATS: UserStats = {
  question_count: 0,
  answer_count: 0,
  questions_last_7_days: 0,
  helpful_feedback: 0,
  problem_feedback: 0,
  daily_questions: [],
};

const BackButton: FC<{ onBack: () => void }> = ({ onBack }) => (
  <button
    onClick={onBack}
    className="text-muted hover:text-primary flex items-center gap-2 text-sm"
  >
    <LuArrowLeft className="size-4" /> Listă
  </button>
);

export const AdminUserDetailPage: FC<Props> = ({
  detail: d,
  sessions,
  sessionsFailure,
  onOpenSession,
  headerActions,
  loadFailure,
  onBack,
  onActivate,
  onSuspend,
  onToggleAdmin,
  busy,
  activateError,
  suspendError,
  roleError,
  onSendReset,
  resetPending,
  resetSent,
  resetError,
  onSaveQuota,
  quotaPending,
  quotaSaved,
  quotaError,
}) => {
  const u = d?.user;
  const stats = d?.stats ?? EMPTY_STATS;

  if (!d || !u) {
    return (
      <>
        <PageHeader
          title="Cursant"
          right={loadFailure && <BackButton onBack={onBack} />}
        />
        {loadFailure ? (
          <ErrorState {...loadFailure} />
        ) : (
          <div className="text-muted p-8 text-sm">Se încarcă…</div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${u.first_name} ${u.last_name}`}
        subtitle={u.email}
        right={
          <div className="flex items-center gap-4">
            {headerActions}
            <BackButton onBack={onBack} />
          </div>
        }
      />

      <div className="grid gap-5 p-8 lg:grid-cols-3">
        {/* Left: identity + actions */}
        <div className="space-y-5 lg:col-span-1">
          <Card theme="subtle" spacing="md">
            <div className="flex items-center gap-2">
              <UserStatusBadge status={u.status} />
              <UserRoleBadge role={u.role} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Email" value={u.email} />
              <Row label="Telefon" value={u.phone || "—"} />
              <Row label="Limbă" value={u.language || "—"} />
              <Row label="Creat" value={formatDateTime(u.created_at)} />
            </dl>

            <div className="mt-5 flex flex-col gap-2">
              {u.status !== "active" ? (
                <>
                  <Button disabled={busy} onClick={onActivate} align="left">
                    Activează contul
                  </Button>
                  <Alert>{activateError}</Alert>
                </>
              ) : (
                <>
                  <Button
                    variant="disabled"
                    disabled={busy}
                    onClick={onSuspend}
                    align="left"
                  >
                    Suspendă contul
                  </Button>
                  <Alert>{suspendError}</Alert>
                </>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                align="left"
                onClick={onToggleAdmin}
              >
                {u.role === "admin"
                  ? "Scoate rolul admin"
                  : "Promovează la admin"}
              </Button>
              <Alert>{roleError}</Alert>
              <Button
                variant="ghost"
                disabled={resetPending}
                align="left"
                onClick={onSendReset}
              >
                {resetSent
                  ? "Email de resetare trimis ✓"
                  : "Trimite resetare parolă"}
              </Button>
              <Alert>{resetError}</Alert>
            </div>
          </Card>

          <Card theme="subtle" spacing="md">
            <h3 className="mb-3 font-semibold">Statistici</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <Metric label="Întrebări" value={stats.question_count} />
              <Metric
                label="Întrebări (7 zile)"
                value={stats.questions_last_7_days}
              />
              <Metric label="Conversații" value={d.session_count} />
              <Metric label="Tokeni total" value={d.tokens_total} />
              <Metric label="Feedback util" value={stats.helpful_feedback} />
              <Metric
                label="Probleme raportate"
                value={stats.problem_feedback}
              />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row
                label="Prima întrebare"
                value={formatDateTime(stats.first_active_at)}
              />
              <Row
                label="Ultima activitate"
                value={formatDateTime(stats.last_active_at)}
              />
            </dl>
          </Card>
        </div>

        {/* Right: quota + usage */}
        <div className="space-y-5 lg:col-span-2">
          <Card theme="subtle" spacing="md">
            <h3 className="mb-4 font-semibold">
              Întrebări pe zi
              <span className="text-muted ml-2 text-sm font-normal">
                ultimele 30 de zile
              </span>
            </h3>
            <ActivityChart days={stats.daily_questions} />
          </Card>

          <Card theme="subtle" spacing="md">
            <h3 className="font-semibold">Limită de utilizare</h3>
            <div className="mt-3">
              <UsageBar
                used={d.quota?.tokens_used ?? 0}
                limit={d.quota?.monthly_token_limit ?? 0}
              />
            </div>
            <QuotaForm
              key={d.quota?.id ?? "none"}
              quota={d.quota ?? null}
              onSubmit={onSaveQuota}
              pending={quotaPending}
              saved={quotaSaved}
              error={quotaError}
            />
          </Card>

          <Card theme="subtle" spacing="none">
            <PanelTitle>
              Conversații
              {d.session_count ? (
                <span className="text-muted ml-2 text-sm font-normal">
                  {d.session_count} în total
                </span>
              ) : null}
            </PanelTitle>
            {sessionsFailure && <ErrorState {...sessionsFailure} />}
            {(sessions ?? d.recent_sessions ?? []).length === 0 ? (
              <div className="text-muted px-5 py-5 text-sm">
                Nicio sesiune încă.
              </div>
            ) : (
              <ul className="divide-border divide-y">
                {(sessions ?? d.recent_sessions ?? []).map((s) => (
                  <li key={s.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">
                        {onOpenSession ? (
                          <button
                            className="text-left hover:underline"
                            onClick={() => onOpenSession(s.id)}
                          >
                            {s.title || "Sesiune fără titlu"}
                          </button>
                        ) : (
                          s.title || "Sesiune fără titlu"
                        )}
                      </span>
                      <span className="text-muted shrink-0 text-xs">
                        {formatDateTime(s.updated_at)}
                      </span>
                    </div>
                    {/* The opening question is the clearest signal of what a
                        student actually needs help with. */}
                    {s.first_question && (
                      <p className="text-secondary mt-1 text-sm leading-5">
                        {s.first_question}
                      </p>
                    )}
                    <div className="text-muted mt-1 flex gap-3 text-xs">
                      <span>{s.message_count} mesaje</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card theme="subtle" spacing="none">
            <PanelTitle>Consum recent</PanelTitle>
            {(d.recent_usage ?? []).length === 0 ? (
              <div className="text-muted px-5 py-5 text-sm">
                Niciun consum înregistrat.
              </div>
            ) : (
              <Table.Root>
                <Table.Head
                  cellClassName="px-5 py-2"
                  columns={["Data", "Model", "Prompt", "Răspuns", "Total"]}
                />
                <Table.Body>
                  {(d.recent_usage ?? []).map((e) => (
                    <tr key={e.id}>
                      <td className="px-5 py-2">
                        {formatDateTime(e.created_at)}
                      </td>
                      <td className="text-muted px-5 py-2">{e.model}</td>
                      <td className="px-5 py-2">
                        {formatNumber(e.prompt_tokens)}
                      </td>
                      <td className="px-5 py-2">
                        {formatNumber(e.completion_tokens)}
                      </td>
                      <td className="px-5 py-2 font-medium">
                        {formatNumber(e.total_tokens)}
                      </td>
                    </tr>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};
