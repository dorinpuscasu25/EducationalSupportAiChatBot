import { describe, expect, test } from "vitest";
import { createSSEParser, type SSEEvent } from "./sse";

/** Feed chunks one by one, then end the stream; every event, in order. */
function parse(...chunks: string[]): SSEEvent[] {
  const parser = createSSEParser();
  return [...chunks.flatMap((chunk) => parser.push(chunk)), ...parser.flush()];
}

// The backend's wire format, as recorded from the e2e stack: named events with
// one-line JSON, and the answer as an unnamed event whose data is a JSON string.
const BACKEND = [
  'event: chat_created\ndata: {"chat_id":"c1"}\n\n',
  'data: "Primul rând\\nal doilea"\n\n',
  'event: done\ndata: {"sources":null,"user_message_id":"m1"}\n\n',
].join("");

describe("CHAT-01 the answer stream is read as the backend writes it", () => {
  test("named JSON events and an unnamed text event", () => {
    expect(parse(BACKEND)).toEqual([
      { event: "chat_created", data: { chat_id: "c1" } },
      { event: null, data: "Primul rând\nal doilea" },
      { event: "done", data: { sources: null, user_message_id: "m1" } },
    ]);
  });

  test("however the body is cut into chunks", () => {
    const oneByOne = [...BACKEND];
    expect(parse(...oneByOne)).toEqual(parse(BACKEND));
  });
});

describe("S2 framing the old parser lost", () => {
  test("CRLF line endings, including a chunk cut between \\r and \\n", () => {
    const crlf = BACKEND.replaceAll("\n", "\r\n");
    expect(parse(crlf)).toEqual(parse(BACKEND));
    const cut = crlf.indexOf("\r\n") + 1;
    expect(parse(crlf.slice(0, cut), crlf.slice(cut))).toEqual(parse(BACKEND));
  });

  test("a last event without the closing blank line is not dropped", () => {
    expect(parse('event: done\ndata: {"ok":true}')).toEqual([
      { event: "done", data: { ok: true } },
    ]);
  });

  test("several data lines join with a newline; comments are ignored", () => {
    expect(parse(": keep-alive\ndata: a\ndata: b\n\n")).toEqual([
      { event: null, data: "a\nb" },
    ]);
  });

  test("data that is not JSON stays text", () => {
    expect(parse("data: Eroare de rețea\n\n")).toEqual([
      { event: null, data: "Eroare de rețea" },
    ]);
  });
});
