import { downloadBlob, downloadCsv } from "@/lib/download";
import { kpis, competitorSov, alerts, shareOverTime } from "@/data/visibility-dashboard";
import { recommendations } from "@/data/content-recommendations";

export type ReportId = "monthly-summary" | "competitor-benchmark" | "board-deck";

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * Builds a report from the sample data on the client and downloads it.
 * Returns the filename so callers can list it under recent exports.
 */
export function generateReport(id: string): string {
  if (id === "competitor-benchmark") {
    const filename = `competitor-benchmark-${stamp()}.csv`;
    downloadCsv(
      filename,
      competitorSov.map((c) => ({ competitor: c.name, share_of_voice_pct: c.share })),
    );
    return filename;
  }
  if (id === "board-deck") {
    const filename = `board-summary-${stamp()}.md`;
    const lines = [
      `# GapVisor board summary (${stamp()})`,
      "",
      "## Headline metrics",
      ...kpis.map((k) => `- ${k.title}: ${k.value} (${k.change > 0 ? "+" : ""}${k.change} vs last period)`),
      "",
      "## Share of voice",
      ...competitorSov.map((c) => `- ${c.name}: ${c.share}%`),
      "",
      "## Alerts to know about",
      ...alerts.slice(0, 5).map((a) => `- [${a.severity}] ${a.title}`),
      "",
      "## Top content actions",
      ...recommendations.slice(0, 5).map((r) => `- ${r.title} (${r.priority}, ${r.impact})`),
      "",
    ];
    downloadBlob(filename, lines.join("\n"), "text/markdown;charset=utf-8");
    return filename;
  }
  const filename = `visibility-summary-${stamp()}.csv`;
  downloadCsv(
    filename,
    kpis.map((k) => ({ metric: k.title, value: k.value, change: k.change, trend: k.trend })),
  );
  return filename;
}

/** Share over time as CSV, limited to the chosen series and trailing days. */
export function exportShareOverTime(series: string[], days: number) {
  const rows = shareOverTime.slice(-days).map((row) => {
    const out: Record<string, unknown> = { day: row.name };
    for (const s of series) out[s] = row[s];
    return out;
  });
  const filename = `visibility-report-${days}d-${stamp()}.csv`;
  downloadCsv(filename, rows);
  return { filename, rowCount: rows.length };
}
