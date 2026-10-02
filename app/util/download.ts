/** Save content as a file in the browser. A Uint8Array is copied so the blob owns a plain ArrayBuffer. */
export function downloadFile(
  content: string | Uint8Array | Blob,
  filename: string,
  mimeType: string,
): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content instanceof Uint8Array ? content.slice() : content], {
          type: mimeType,
        });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}
