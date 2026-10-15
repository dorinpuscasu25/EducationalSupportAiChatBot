import type { FC } from "react";
import { LuBookOpen, LuCalendarDays, LuClipboardCheck } from "react-icons/lu";

const SUGGESTIONS = [
  {
    icon: LuCalendarDays,
    label: "Când încep cursurile și care este orarul?",
  },
  {
    icon: LuClipboardCheck,
    label: "Cum se desfășoară evaluarea și ce teme trebuie să predau?",
  },
  {
    icon: LuBookOpen,
    label: "Explică-mi pe scurt conceptele principale din primul modul.",
  },
];

/** Shown in an empty conversation: a greeting and a few example questions. */
export const EmptyState: FC<{ onAsk?: (question: string) => void }> = ({
  onAsk,
}) => (
  <div className="mx-auto w-full max-w-3xl text-center">
    <p className="text-highlight mb-3 text-sm font-medium">
      Asistentul cursanților
    </p>
    <h1 className="text-gradient-center text-3xl font-medium sm:text-4xl">
      Cu ce te pot ajuta?
    </h1>
    <p className="text-muted mx-auto mt-3 max-w-xl text-sm leading-6">
      Pune o întrebare despre cursuri, materialele de studiu sau organizarea
      academiei, sau atașează o captură de ecran ori un document.
    </p>
    {onAsk && (
      <div className="mx-auto mt-8 grid max-w-3xl gap-2 sm:grid-cols-3">
        {SUGGESTIONS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => onAsk(label)}
            className="border-divider hover:border-subtle/40 hover:bg-pop/40 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors"
          >
            <Icon className="text-secondary mt-0.5 size-4 shrink-0" />
            <span className="text-soft">{label}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);
