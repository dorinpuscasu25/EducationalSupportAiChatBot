// Failed requests reject with Error.message set to a machine-readable code:
// the backend's { "error": "<code>" } or one of the client codes thrown by
// api/http.ts. Never render error.message directly; map it here.

const ERROR_MESSAGES: Record<string, string> = {
  // Client-side (api/http.ts)
  unauthorized: "Sesiunea a expirat. Autentifică-te din nou.",
  request_failed: "Cererea nu a putut fi procesată.",
  streaming_not_supported: "Browserul nu suportă răspunsurile în timp real.",
  // Auth & account
  invalid_credentials: "Email sau parolă incorecte.",
  email_not_verified: "Emailul nu este confirmat. Te redirecționăm…",
  email_already_registered: "Există deja un cont cu acest email.",
  too_many_attempts: "Prea multe încercări. Cere un cod nou.",
  weak_password:
    "Parola este prea slabă (minimum 8 caractere, literă și cifră).",
  invalid_current_password: "Parola curentă este greșită.",
  // Chat & admin
  quota_exceeded:
    "Ai atins limita de utilizare pentru luna aceasta. Contactează echipa academiei.",
  message_too_long: "Mesajul este prea lung. Scurtează întrebarea.",
  account_not_active: "Contul tău nu este încă aprobat.",
  sync_already_running: "O sincronizare este deja în curs.",
};

export const DEFAULT_ERROR_MESSAGE = "A apărut o eroare. Încearcă din nou.";

export function errorCode(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

/**
 * Romanian copy for a failed request. Known codes get their shared message;
 * anything else gets `fallback` (context-specific, e.g. "Cod invalid sau
 * expirat.") or the generic message.
 */
export function errorMessage(
  error: unknown,
  fallback: string = DEFAULT_ERROR_MESSAGE,
): string {
  const code = errorCode(error);
  return (code && ERROR_MESSAGES[code]) || fallback;
}

/**
 * Copy for a message the backend streams as an `error` event, which is either
 * a sentence meant for the user or a bare code (`quota_exceeded`). A code is
 * never shown as is (S46): known codes get their copy, others the default.
 */
export function errorText(codeOrMessage: string): string {
  const text = codeOrMessage.trim();
  if (/^[a-z][a-z0-9_]*$/.test(text)) {
    return ERROR_MESSAGES[text] ?? DEFAULT_ERROR_MESSAGE;
  }
  return text || DEFAULT_ERROR_MESSAGE;
}
