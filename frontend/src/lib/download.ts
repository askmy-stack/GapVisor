/** Client side file downloads built from data the app already has in memory. */

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, JSON.stringify(data, null, 2), "application/json");
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializes an array of flat objects to CSV, using the union of keys as the header. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const headers: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!headers.includes(key)) headers.push(key);
  }
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h])).join(","));
  return lines.join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  downloadBlob(filename, toCsv(rows), "text/csv;charset=utf-8");
}

/** Filesystem friendly slug for generated filenames. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
