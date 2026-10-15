// A Server-Sent Events parser for fetch bodies: feed it decoded text as it
// arrives, take the complete events out. Follows the SSE format: lines end in
// \n, \r\n or \r; a blank line ends an event; `data:` lines join with \n; a
// line starting with ":" is a comment. Data is JSON when it parses, otherwise
// the raw text.

export type SSEEvent = { event: string | null; data: unknown };

function toEvent(eventName: string | null, dataLines: string[]): SSEEvent {
  const raw = dataLines.join("\n");
  let data: unknown = raw;
  try {
    data = JSON.parse(raw);
  } catch {
    /* not JSON: keep the text */
  }
  return { event: eventName, data };
}

export function createSSEParser() {
  let buffer = "";
  let eventName: string | null = null;
  let dataLines: string[] = [];

  function takeLine(line: string, out: SSEEvent[]) {
    if (line === "") {
      if (dataLines.length) out.push(toEvent(eventName, dataLines));
      eventName = null;
      dataLines = [];
      return;
    }
    if (line.startsWith(":")) return;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
  }

  return {
    /** Feed the next chunk of text; returns the events it completed. */
    push(chunk: string): SSEEvent[] {
      buffer += chunk;
      // A trailing "\r" may be the first half of "\r\n": hold it back.
      const held = buffer.endsWith("\r") ? "\r" : "";
      const complete = held ? buffer.slice(0, -1) : buffer;
      const lines = complete.split(/\r\n|\r|\n/);
      // The last piece is a partial line (empty when the text ended a line).
      buffer = (lines.pop() ?? "") + held;
      const out: SSEEvent[] = [];
      for (const line of lines) takeLine(line, out);
      return out;
    },
    /** The stream ended: complete whatever is left, even without a blank line. */
    flush(): SSEEvent[] {
      const out: SSEEvent[] = [];
      const rest = buffer.replace(/\r$/, "");
      buffer = "";
      if (rest) takeLine(rest, out);
      takeLine("", out);
      return out;
    },
  };
}
