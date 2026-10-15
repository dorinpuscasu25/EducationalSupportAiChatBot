import type { FC } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import { Control } from "@components/core/Control";
import { Alert } from "@components/display/Alert";
import { Card } from "@components/display/Card";
import { ErrorState } from "@components/display/RouteState";
import { PageHeader } from "@components/layout/PageHeader";

export const AdminSettingsPage: FC<{
  /** The setting could not load (C3): never shown as an editable "off". */
  loadFailure?: { message: string; onRetry: () => void };
  autoActivate: boolean;
  onAutoActivateChange: (value: boolean) => void;
  disabled?: boolean;
  saveFailed?: boolean;
}> = ({
  loadFailure,
  autoActivate,
  onAutoActivateChange,
  disabled,
  saveFailed,
}) => (
  <>
    <PageHeader title="Setări" />
    {loadFailure ? (
      <ErrorState {...loadFailure} />
    ) : (
      <div className="space-y-4 p-6">
        <Card theme="subtle" spacing="md">
          <Control.Checkbox
            checked={autoActivate}
            disabled={disabled}
            onChange={(event) => onAutoActivateChange(event.target.checked)}
            label={
              <span className="font-medium">
                Activează automat conturile noi
              </span>
            }
            description="Cine se înregistrează primește acces imediat, fără să aștepte aprobarea ta. Util pentru o grupă deschisă, ca să nu confirmi fiecare cont manual. Cu bifa scoasă, conturile noi rămân „în așteptare” și le aprobi din lista de cursanți."
          />

          {autoActivate && (
            <div className="border-border bg-pop/20 mt-4 flex gap-2.5 rounded-lg border p-3">
              <LuTriangleAlert className="text-highlight mt-0.5 size-4 shrink-0" />
              <p className="text-secondary text-sm leading-5">
                Cât timp bifa e pusă, oricine cunoaște adresa se poate
                înregistra și ajunge direct la asistent și la materialele
                academiei. Scoate-o dacă accesul e doar pentru cursanți
                înscriși.
              </p>
            </div>
          )}

          {saveFailed && (
            <Alert className="mt-3">
              Nu am putut salva setarea. Încearcă din nou.
            </Alert>
          )}
        </Card>
      </div>
    )}
  </>
);
