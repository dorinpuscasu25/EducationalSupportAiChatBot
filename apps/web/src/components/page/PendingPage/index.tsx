import type { FC } from "react";
import { Button } from "@components/core/Button";
import type { UserStatus } from "@api/auth/response";

type Props = {
  status: UserStatus;
  onSignOut: () => void;
};

export const PendingPage: FC<Props> = ({ status, onSignOut }) => {
  const suspended = status === "suspended";

  return (
    <div className="bg-background/40 flex h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="bg-pop/40 border-border max-w-md rounded-2xl border p-8">
        <h1 className="text-primary text-xl font-semibold">
          {suspended ? "Cont suspendat" : "Cont în așteptarea aprobării"}
        </h1>
        <p className="text-muted mt-3 text-sm leading-relaxed">
          {suspended
            ? "Accesul tău a fost suspendat. Contactează administratorul pentru detalii."
            : "Contul tău a fost creat cu succes. Echipa academiei verifică înscrierea și îți aprobă accesul. Vei primi un email și vei putea folosi asistentul imediat după aprobare."}
        </p>
        <p className="text-muted mt-4 text-xs">
          Ai întrebări? Contactează echipa academiei și menționează adresa de
          email a contului.
        </p>
        <Button variant="ghost" className="mt-6" onClick={onSignOut}>
          Deconectare
        </Button>
      </div>
    </div>
  );
};
