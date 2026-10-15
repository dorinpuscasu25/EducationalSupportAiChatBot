import type { FC } from "react";
import { twJoin } from "tailwind-merge";

function score(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) s++;
  if (pw.length >= 12 && /[^a-zA-Z0-9]/.test(pw)) s++;
  return s; // 0..3
}

const LABELS = ["Slabă", "Acceptabilă", "Bună", "Puternică"];
const COLORS = ["bg-dim", "bg-dim", "bg-dim", "bg-subtle"];

export const PasswordStrength: FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const s = score(password);
  const filled = s + 1; // 1..4 segments lit
  return (
    <div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={twJoin(
              "h-1 flex-1 rounded-full",
              i < filled ? COLORS[s] : "bg-border",
            )}
          />
        ))}
      </div>
      <div className="text-muted mt-1 text-xs">
        Putere: {LABELS[s]} · minim 8 caractere, o literă și o cifră
      </div>
    </div>
  );
};
