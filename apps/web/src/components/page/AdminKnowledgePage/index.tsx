import { useState, type FC } from "react";
import { LuRefreshCw, LuSearch } from "react-icons/lu";
import type {
  KnowledgeDocument,
  KnowledgeOverview,
  KnowledgeSearchResult,
} from "@api/admin/response";
import { Button } from "@components/core/Button";
import { Alert } from "@components/display/Alert";
import { Badge } from "@components/display/Badge";
import { Card } from "@components/display/Card";
import { ErrorState } from "@components/display/RouteState";
import { Table } from "@components/display/Table";
import { PageHeader } from "@components/layout/PageHeader";
import { formatBytes, formatDateTime, formatNumber } from "@utils/format";

const STATUS_LABEL: Record<KnowledgeDocument["status"], string> = {
  ready: "Indexat",
  empty: "Fără text",
  failed: "Eroare",
};

type Props = {
  overview?: KnowledgeOverview;
  loading?: boolean;
  loadFailure?: { message: string; onRetry: () => void };
  onSync: (force: boolean) => void;
  syncPending?: boolean;
  syncError?: string;
  searchQuery: string;
  onSearch: (query: string) => void;
  searchResults?: KnowledgeSearchResult[];
  searchLoading?: boolean;
};

const Stat: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Card theme="subtle" spacing="md">
    <div className="text-muted text-xs tracking-wide uppercase">{label}</div>
    <div className="mt-2 text-2xl font-semibold">{value}</div>
  </Card>
);

export const AdminKnowledgePage: FC<Props> = ({
  overview,
  loading,
  loadFailure,
  onSync,
  syncPending,
  syncError,
  searchQuery,
  onSearch,
  searchResults,
  searchLoading,
}) => {
  const [query, setQuery] = useState(searchQuery);
  const docs = overview?.documents ?? [];
  const sync = overview?.sync;
  const running = !!sync?.running;
  const ready = docs.filter((d) => d.status === "ready").length;
  const problems = docs.filter((d) => d.status !== "ready");

  return (
    <>
      <PageHeader
        title="Documente"
        subtitle="Materialele din care răspunde asistentul"
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={running || syncPending}
              onClick={() => onSync(true)}
              title="Recitește toate fișierele, inclusiv cele neschimbate"
            >
              Reindexează tot
            </Button>
            <Button
              disabled={running || syncPending}
              onClick={() => onSync(false)}
            >
              <LuRefreshCw
                className={`mr-2 size-4 ${running ? "animate-spin" : ""}`}
              />
              {running ? "Se sincronizează…" : "Sincronizează folderul"}
            </Button>
          </div>
        }
      />
      {loadFailure ? (
        <ErrorState {...loadFailure} />
      ) : (
        <div className="space-y-6 p-8">
          <Alert>{syncError}</Alert>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Documente indexate" value={formatNumber(ready)} />
            <Stat
              label="Fragmente"
              value={formatNumber(overview?.total_chunks)}
            />
            <Stat label="Cu probleme" value={formatNumber(problems.length)} />
            <Stat
              label="Căutare semantică"
              value={overview?.embeddings_enabled ? "Activă" : "Doar text"}
            />
          </div>

          <Card theme="subtle" spacing="md">
            <h3 className="font-semibold">Cum adaugi documente</h3>
            <p className="text-secondary mt-2 text-sm leading-6">
              Pune fișierele (PDF, DOCX, PPTX, TXT, MD) în folderul{" "}
              <code className="bg-primary/10 rounded px-1">documents/</code> al
              proiectului. Subfolderele devin categorii (de exemplu{" "}
              <code className="bg-primary/10 rounded px-1">
                documents/Modulul 1/curs.pdf
              </code>
              ). Apoi apasă „Sincronizează folderul”: fișierele noi sunt
              indexate, cele modificate reindexate, iar cele șterse dispar din
              baza asistentului.
            </p>
            {sync && (
              <p className="text-muted mt-3 text-xs">
                {running ? "Sincronizare pornită" : "Ultima sincronizare"}{" "}
                {formatDateTime(sync.finished_at ?? sync.started_at)} ·{" "}
                {sync.scanned} fișiere · {sync.added} noi · {sync.updated}{" "}
                actualizate · {sync.removed} șterse · {sync.failed} erori
                {sync.error ? ` · ${sync.error}` : ""}
              </p>
            )}
            {overview && !overview.embeddings_enabled && (
              <p className="text-muted mt-2 text-xs">
                Căutarea semantică e dezactivată (lipsește cheia API pentru
                embeddings). Asistentul caută după cuvinte, fără diacritice.
              </p>
            )}
          </Card>

          <Card theme="subtle" spacing="md">
            <h3 className="font-semibold">Testează căutarea</h3>
            <p className="text-muted mt-1 text-sm">
              Vezi ce fragmente ar găsi asistentul pentru o întrebare.
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSearch(query);
              }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ex: când se predă proiectul final?"
                className="border-divider bg-background flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              />
              <Button type="submit" disabled={!query.trim()}>
                <LuSearch className="mr-2 size-4" /> Caută
              </Button>
            </form>
            {searchLoading && (
              <p className="text-muted mt-3 text-sm">Se caută…</p>
            )}
            {searchResults && searchQuery && !searchLoading && (
              <div className="mt-4 space-y-2">
                {searchResults.length === 0 && (
                  <p className="text-muted text-sm">
                    Niciun fragment găsit. Asistentul ar răspunde că nu are
                    informația.
                  </p>
                )}
                {searchResults.map((r, i) => (
                  <details
                    key={r.chunk_id}
                    className="border-divider rounded-lg border px-3 py-2"
                  >
                    <summary className="cursor-pointer text-sm">
                      <span className="text-secondary">[{i + 1}]</span>{" "}
                      {r.heading || r.title}
                      {r.page_start ? (
                        <span className="text-muted"> · p. {r.page_start}</span>
                      ) : null}
                      <span className="text-muted ml-2 text-xs">{r.path}</span>
                    </summary>
                    <p className="text-secondary mt-2 text-xs leading-5 whitespace-pre-line">
                      {r.content}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </Card>

          <Card theme="subtle" spacing="none">
            <Table.Root>
              <Table.Head
                columns={[
                  "Document",
                  "Categorie",
                  "Tip",
                  "Mărime",
                  "Fragmente",
                  "Stare",
                  "Indexat",
                ]}
              />
              <Table.Body>
                {loading && (
                  <Table.Message colSpan={7}>Se încarcă…</Table.Message>
                )}
                {!loading && docs.length === 0 && (
                  <Table.Message colSpan={7}>
                    Niciun document încă. Adaugă fișiere în folderul documents/
                    și sincronizează.
                  </Table.Message>
                )}
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="max-w-80 px-5 py-3">
                      <div className="truncate font-medium" title={d.path}>
                        {d.title}
                      </div>
                      {d.error && (
                        <div className="text-muted mt-0.5 text-xs">
                          {d.error}
                        </div>
                      )}
                    </td>
                    <td className="text-muted px-5 py-3">
                      {d.category || "—"}
                    </td>
                    <td className="text-muted px-5 py-3 uppercase">
                      {d.file_type}
                    </td>
                    <td className="text-muted px-5 py-3">
                      {formatBytes(d.size_bytes)}
                    </td>
                    <td className="px-5 py-3">{formatNumber(d.chunk_count)}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={d.status === "ready" ? "outline" : "pill"}
                      >
                        {STATUS_LABEL[d.status]}
                      </Badge>
                    </td>
                    <td className="text-muted px-5 py-3 text-xs">
                      {formatDateTime(d.indexed_at)}
                    </td>
                  </tr>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        </div>
      )}
    </>
  );
};
