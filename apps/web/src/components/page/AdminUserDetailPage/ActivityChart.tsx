import type { FC } from "react";
import type { DailyCount } from "@api/admin/response";

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });

/** Questions per day as a compact bar chart. */
export const ActivityChart: FC<{ days: DailyCount[] }> = ({ days }) => {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="text-muted text-sm">
        Nicio întrebare în ultimele 30 de zile.
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex h-28 items-end gap-[3px]"
        role="img"
        aria-label={`${total} întrebări în ultimele 30 de zile`}
      >
        {days.map((d) => (
          <div
            key={d.day}
            className="group relative flex h-full flex-1 items-end"
          >
            <div
              className="bg-subtle/60 group-hover:bg-primary w-full rounded-t-sm transition-colors"
              style={{
                height: d.count ? `${Math.max(6, (d.count / max) * 100)}%` : 2,
              }}
            />
            <div className="bg-foreground border-divider text-soft pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded border px-1.5 py-0.5 text-[11px] whitespace-nowrap group-hover:block">
              {dayLabel(d.day)}: {d.count}
            </div>
          </div>
        ))}
      </div>
      <div className="text-muted mt-2 flex justify-between text-[11px]">
        <span>{days[0] && dayLabel(days[0].day)}</span>
        <span>{days.at(-1) && dayLabel(days.at(-1)!.day)}</span>
      </div>
    </div>
  );
};
