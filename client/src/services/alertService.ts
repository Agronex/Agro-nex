import { Alert } from '../types';
import { BACKEND_URL } from '../config/backend';

const CACHE_KEY   = 'agronex_alerts_v2';   // versioned to bust stale caches
const CACHE_TTL   = 5 * 60 * 1000;         // 5 minutes

/**
 * Fetches real-time weather-based farm alerts from the backend.
 * - Uses geolocation (with timeout) if available.
 * - Falls back gracefully on every possible failure.
 * - Caches in sessionStorage (per-tab, auto-cleared on close).
 */
export async function getAlerts(): Promise<Alert[]> {
  // ── Session cache hit ────────────────────────────────────────────────────
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw) as { data: Alert[]; timestamp: number };
      if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Corrupt storage — ignore, fetch fresh
    sessionStorage.removeItem(CACHE_KEY);
  }

  // ── Fetch from backend (with one retry) ──────────────────────────────────
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let url = `${BACKEND_URL}/alerts`;

      // Try geolocation; on failure keep the base URL (backend returns static alerts)
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60_000,   // accept a 60-second-old cached position
          })
        );
        url += `?lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
      } catch {
        // Location denied or unavailable — continue without coordinates
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      let response: Response;
      try {
        response = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: Alert[] = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid alert response');

      // ── Cache the result ─────────────────────────────────────────────────
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {
        // Storage full — not critical
      }

      return data;
    } catch (err) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      console.warn('[AlertService] Falling back to static alerts:', err instanceof Error ? err.message : err);
      return getFallbackAlerts();
    }
  }

  return getFallbackAlerts();
}

/** Force the next call to getAlerts() to fetch fresh data. */
export function invalidateAlertCache(): void {
  sessionStorage.removeItem(CACHE_KEY);
}

function getFallbackAlerts(): Alert[] {
  return [
    {
      id: 'fallback-1',
      type: 'weather',
      severity: 'info',
      title: 'Alert Service Unavailable',
      message: 'Weather-based alerts could not be loaded. Check your internet connection.',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ];
}
