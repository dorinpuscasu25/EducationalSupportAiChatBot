import { useState, type FC } from "react";
import type { MessageFeedbackRating } from "@api/chats/response";
import { Form } from "@components/core/Form";
import { useAppForm } from "@hooks/form.hook";

const REASONS = [
  "Răspuns incomplet",
  "Nu răspunde întrebării",
  "Informație greșită",
  "Informație greșită sau depășită",
  "Prea lent",
  "Eroare tehnică",
  "Alt motiv",
];

export const FeedbackControls: FC<{
  saved?: MessageFeedbackRating;
  submit: (rating: MessageFeedbackRating, note?: string) => Promise<void>;
}> = ({ saved, submit }) => {
  // A negative rating opens the detail form; "helpful" is sent at once.
  const [rating, setRating] = useState<MessageFeedbackRating | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async (value: MessageFeedbackRating, note = "") => {
    setBusy(true);
    setFailed(false);
    try {
      await submit(value, note);
      setRating(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const form = useAppForm({
    defaultValues: { reason: REASONS[0], note: "" },
    onSubmit: ({ value }) =>
      rating &&
      send(
        rating,
        value.reason + (value.note.trim() ? ": " + value.note.trim() : ""),
      ),
  });

  const openDetails = (value: MessageFeedbackRating, reason: string) => {
    setRating(value);
    form.setFieldValue("reason", reason);
  };

  if (saved)
    return <p className="text-muted mt-3 text-xs">Mulțumim pentru feedback.</p>;

  return (
    <div className="text-muted mt-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <span>A fost util?</span>
        <button
          disabled={busy}
          onClick={() => void send("helpful")}
          className="hover:text-primary"
        >
          Util
        </button>
        <button
          disabled={busy}
          onClick={() => openDetails("not_helpful", "Răspuns incomplet")}
          className="hover:text-primary"
        >
          Nu a fost util
        </button>
        <button
          disabled={busy}
          onClick={() => openDetails("incorrect_source", "Informație greșită")}
          className="hover:text-primary"
        >
          Informație greșită
        </button>
      </div>
      {rating && (
        <Form
          onSubmit={form.handleSubmit}
          className="border-border mt-3 space-y-3 rounded-md border p-3"
        >
          <form.AppField
            name="reason"
            children={(field) => (
              <field.Select
                label="Ce nu a funcționat?"
                variant="compact"
                options={REASONS.map((reason) => ({
                  value: reason,
                  label: reason,
                }))}
              />
            )}
          />
          <form.AppField
            name="note"
            children={(field) => (
              <field.Textarea
                aria-label="Detalii opționale despre problemă"
                variant="compact"
                maxLength={2000}
                placeholder="Detalii opționale. Nu include date personale sau confidențiale."
              />
            )}
          />
          <div className="flex gap-4">
            <button type="submit" disabled={busy}>
              Trimite feedback
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRating(null)}
            >
              Anulează
            </button>
          </div>
        </Form>
      )}
      {failed && (
        <p role="alert" className="mt-2">
          Feedbackul nu a fost salvat. Încearcă din nou.
        </p>
      )}
    </div>
  );
};
