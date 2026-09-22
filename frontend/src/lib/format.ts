import { formatDistanceToNow, parseISO } from "date-fns";

/** Formatters for raw API values (Finding 1 — never store display strings in the API). */

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatScore(value: number, outOf = 100): string {
  return `${Math.round(value)}/${outOf}`;
}

export function formatPosition(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export function formatMoney(amountMinor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function formatRelativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatChange(change: number, digits = 1): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(digits)}`;
}
