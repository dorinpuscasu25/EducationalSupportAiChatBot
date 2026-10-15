import type { FC } from "react";
import { formatNumber } from "@utils/format";

/** Token usage progress bar. limit 0 = unlimited. */
export const UsageBar: FC<{ used: number; limit: number }> = ({
  used,
  limit,
}) => {
  if (!limit) {
    return <div className="text-muted text-xs">Nelimitat</div>;
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="bg-background h-2 w-full overflow-hidden rounded-full">
        <div className="bg-dim h-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-muted mt-1 text-xs">
        {formatNumber(used)} / {formatNumber(limit)} tokeni ({pct}%)
      </div>
    </div>
  );
};
