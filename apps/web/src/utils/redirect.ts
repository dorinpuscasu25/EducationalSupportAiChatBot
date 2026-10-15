/**
 * The page to return to after login (AUTH-05), when it is safe to follow: a
 * path inside the app. Anything else (another site, "//host", a scheme) is
 * ignored, so a crafted link cannot send a user away after they sign in.
 */
export function safeRedirect(value?: string | null): string | undefined {
  if (!value || !value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}
