import { isValidPhoneNumber } from "libphonenumber-js";

// Client-side checks mirroring the backend's rules. Each returns the Romanian
// message to show, or undefined when the value is fine, so they plug straight
// into TanStack Form validators.

export const PASSWORD_RULE =
  "Parola trebuie să aibă minim 8 caractere, o literă și o cifră.";

/** True when the password meets the backend policy (8+, letter + digit). */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
  );
}

export function passwordError(password: string): string | undefined {
  return isPasswordValid(password) ? undefined : PASSWORD_RULE;
}

export function confirmPasswordError(
  confirm: string,
  password: string,
): string | undefined {
  return confirm === password ? undefined : "Parolele nu coincid.";
}

/** Expects E.164 (e.g. +37360000000), as PhoneField produces. */
export function phoneError(phone: string): string | undefined {
  return phone && isValidPhoneNumber(phone)
    ? undefined
    : "Numărul de telefon nu este valid pentru țara selectată.";
}

export function requiredError(
  value: string,
  message = "Câmp obligatoriu.",
): string | undefined {
  return value.trim() ? undefined : message;
}
