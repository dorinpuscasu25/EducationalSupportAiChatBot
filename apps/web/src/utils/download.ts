// Browser-only helpers that hand a generated file to the user.

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadFile(
  content: BlobPart,
  type: string,
  fileName: string,
) {
  downloadBlob(new Blob([content], { type }), fileName);
}
