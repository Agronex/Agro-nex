/**
 * Activity Store — persists recent farm activity events to localStorage.
 * Used by disease detection scans, logbook entries, etc.
 * Dashboard reads from this to show real recent activity.
 */

export interface ActivityEvent {
  id: string;
  type: 'disease_scan' | 'logbook_add' | 'logbook_edit' | 'logbook_delete' | 'weather_check';
  title: string;
  detail: string;
  timestamp: string; // ISO string
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
}

const STORAGE_KEY = 'agronex_activity';
const MAX_EVENTS = 20;

export function getRecentActivity(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityEvent[];
  } catch {
    return [];
  }
}

export function addActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
  try {
    const events = getRecentActivity();
    const newEvent: ActivityEvent = {
      ...event,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEvent, ...events].slice(0, MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function clearActivity(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Helper to get a time-ago string from ISO timestamp */
export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
