import { useState, type FC, type ReactNode } from "react";
import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { useFieldContext } from "@context/form.context";
import { Control } from "@components/core/Control";
import { useFieldError } from "../field-error";

// Curated list of relevant countries; Moldova first (default).
const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "RO", name: "România", flag: "🇷🇴" },
  { code: "UA", name: "Ucraina", flag: "🇺🇦" },
  { code: "RU", name: "Rusia", flag: "🇷🇺" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "DE", name: "Germania", flag: "🇩🇪" },
  { code: "FR", name: "Franța", flag: "🇫🇷" },
  { code: "GB", name: "Marea Britanie", flag: "🇬🇧" },
  { code: "US", name: "SUA", flag: "🇺🇸" },
];

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} +${getCountryCallingCode(c.code)}`,
}));

function initialState(value: string) {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  const country =
    parsed?.country && COUNTRIES.some((c) => c.code === parsed.country)
      ? parsed.country
      : "MD";
  return {
    country,
    national: parsed ? new AsYouType(country).input(parsed.nationalNumber) : "",
  };
}

/** Country picker plus national number; the field value is E.164. */
export const PhoneField: FC<{
  label?: ReactNode;
  variant?: "default" | "compact";
}> = ({ label, variant = "compact" }) => {
  const field = useFieldContext<string>();
  const error = useFieldError();
  const [{ country, national }, setState] = useState(() =>
    initialState(field.state.value),
  );

  const emit = (nextCountry: CountryCode, nextNational: string) => {
    setState({ country: nextCountry, national: nextNational });
    const digits = nextNational.replace(/\D/g, "");
    field.handleChange(
      digits ? `+${getCountryCallingCode(nextCountry)}${digits}` : "",
    );
  };

  return (
    <Control.Label label={label} error={error}>
      <div className="flex gap-2">
        <Control.Select
          variant={variant}
          className="w-auto"
          options={COUNTRY_OPTIONS}
          value={country}
          onChange={(e) => emit(e.target.value as CountryCode, national)}
        />
        <Control.Input
          variant={variant}
          value={national}
          // Pretty-format as the user types, keep only the national part.
          onChange={(e) =>
            emit(country, new AsYouType(country).input(e.target.value))
          }
          onBlur={field.handleBlur}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="60 000 000"
          aria-invalid={!!error}
        />
      </div>
    </Control.Label>
  );
};
