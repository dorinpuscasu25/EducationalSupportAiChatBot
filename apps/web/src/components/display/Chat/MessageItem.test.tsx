import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@test/render";
import { MessageItem } from "./MessageItem";

describe("admin conversation replay", () => {
  test("shows the saved feedback and hides controls that change the conversation", () => {
    render(
      <MessageItem
        readOnly
        message={{
          id: "answer-1",
          role: "assistant",
          content: "Răspuns salvat",
          complete: true,
          error: true,
          feedback: "helpful",
          feedback_note: "Am găsit sursa",
        }}
        onRetry={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    expect(screen.getByText("Răspuns salvat")).toBeInTheDocument();
    expect(screen.getByText(/Feedback cursant: util/)).toHaveTextContent(
      "Am găsit sursa",
    );
    expect(
      screen.queryByRole("button", { name: "Încearcă din nou" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("shows a question's attachments and downloads a document on click", async () => {
    const load = vi.fn(async () => new Blob(["x"]));
    render(
      <MessageItem
        loadAttachment={load}
        message={{
          id: "q-1",
          role: "user",
          content: "Ce înseamnă eroarea?",
          files: [new File(["x"], "notite.txt", { type: "text/plain" })],
          attachments: [
            {
              id: "att-1",
              message_id: "q-1",
              file_name: "tema.pdf",
              file_type: ".pdf",
              mime_type: "application/pdf",
              file_size: 2048,
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("notite.txt")).toBeInTheDocument();
    screen.getByRole("button", { name: /tema\.pdf/ }).click();
    expect(load).toHaveBeenCalledWith("att-1");
  });

  test("students see only the answer; the admin replay also shows the sources", () => {
    const answer = {
      id: "a-1",
      role: "assistant" as const,
      content: "Poți lipsi de la cel mult trei lecții.",
      complete: true,
      sources: [{ index: 1, document_id: "d1", title: "Regulament intern" }],
    };
    const { unmount } = render(<MessageItem message={answer} />);
    expect(screen.getByText(answer.content)).toBeInTheDocument();
    expect(screen.queryByText(/Regulament intern/)).not.toBeInTheDocument();
    unmount();

    render(<MessageItem message={answer} readOnly />);
    expect(screen.getByText(/Regulament intern/)).toBeInTheDocument();
  });
});
