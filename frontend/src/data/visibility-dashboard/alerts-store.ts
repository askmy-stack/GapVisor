import { useSyncExternalStore } from "react";
import { alerts } from "./index";

/**
 * Read state for dashboard alerts, shared by the topbar notifications popover
 * and the Alerts panel. Persists to sessionStorage when it is available.
 */
const STORAGE_KEY = "gv_read_alert_ids";

function load(): Set<number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? new Set(ids.filter((n): n is number => typeof n === "number")) : new Set();
  } catch {
    return new Set();
  }
}

let readIds: Set<number> = load();
const listeners = new Set<() => void>();

function commit(next: Set<number>) {
  readIds = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* storage unavailable: keep in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return readIds;
}

export function markAlertRead(id: number) {
  if (readIds.has(id)) return;
  commit(new Set([...readIds, id]));
}

export function markAllAlertsRead() {
  commit(new Set(alerts.map((a) => a.id)));
}

export function useAlertReadState() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const unreadCount = alerts.filter((a) => !ids.has(a.id)).length;
  return {
    alerts,
    isRead: (id: number) => ids.has(id),
    unreadCount,
    markRead: markAlertRead,
    markAllRead: markAllAlertsRead,
  };
}
