type MergeableMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  server_id?: string;
  complete?: boolean;
};

/**
 * The server stores what the browser sent as multipart form data, where line
 * breaks become CRLF; the local copy has LF. Compare text, not encodings (S38).
 */
const sameText = (a: string, b: string) =>
  a.replace(/\r\n?/g, "\n").trim() === b.replace(/\r\n?/g, "\n").trim();

export function mergeHydratedMessages<T extends MergeableMessage>(
  current: T[],
  incoming: T[],
): T[] {
  if (current.length === 0) return incoming;
  if (incoming.length === 0) return current;

  const unmatchedCurrent = [...current];
  const mergedFrom = new Map<T, T>();
  const merged = incoming.map((serverMessage) => {
    let localIndex = unmatchedCurrent.findIndex(
      (message) =>
        message.id === serverMessage.id ||
        message.server_id === serverMessage.id,
    );
    if (localIndex === -1 && serverMessage.role === "user") {
      localIndex = unmatchedCurrent.findIndex(
        (message) =>
          message.role === "user" &&
          !message.server_id &&
          sameText(message.content, serverMessage.content),
      );
    }
    if (localIndex === -1) return serverMessage;

    const localMessage = unmatchedCurrent.splice(localIndex, 1)[0];
    const mergedMessage = {
      ...serverMessage,
      ...localMessage,
      server_id: serverMessage.id,
      complete: serverMessage.complete ?? localMessage.complete,
      // Local files show until the server has the attachments.
      files:
        "attachments" in serverMessage &&
        Array.isArray(serverMessage.attachments) &&
        serverMessage.attachments.length > 0
          ? undefined
          : "files" in localMessage
            ? localMessage.files
            : undefined,
      attachments:
        "attachments" in serverMessage ? serverMessage.attachments : undefined,
    } as T;
    mergedFrom.set(localMessage, mergedMessage);
    return mergedMessage;
  });

  // Messages only the client has (a failed attempt, a reply in flight) stay
  // after the message they followed, not after everything the server sent.
  const result = [...merged];
  let previous: T | undefined;
  for (const message of current) {
    const placed = mergedFrom.get(message);
    if (!placed) {
      result.splice(previous ? result.indexOf(previous) + 1 : 0, 0, message);
    }
    previous = placed ?? message;
  }
  return result;
}
