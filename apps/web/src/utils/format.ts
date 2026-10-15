// Display formatting shared across pages. Romanian locale throughout.

const LOCALE = "ro-RO";

export function formatNumber(n?: number | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat(LOCALE).format(n);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(LOCALE, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(LOCALE);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Keep the digits of a 6-digit email/reset code as the user types it. */
export function verificationCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

/**
 * A user's initials for their avatar: the first letters of the first and last
 * name, in capitals (SHELL-06). Empty when there are none; `Avatar` then shows
 * "U".
 */
export function initialsOf(user: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
}
