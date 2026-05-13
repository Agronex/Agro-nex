import { Alert } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const CACHE_KEY = 'agronex_alerts';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches real-time weather-based farm alerts from the backend.
 * Uses geolocation if available, caches in sessionStorage.
 */
export async function getAlerts(): Promise<Alert[]> {
  // Check session cache
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data as Alert[];
    }
  }

  try {
    // Try to get geolocation for location-specific alerts
    let url = `${BACKEND_URL}/alerts`;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      url += `?lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
    } catch {
      // Location unavailable — backend will return static alerts
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Alert fetch failed: ${response.status}`);

    const data: Alert[] = await response.json();

    // Cache result
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (err) {
    console.warn('Alert service error, using fallback:', err);
    return getFallbackAlerts();
  }
}

/** Invalidate alert cache (call after a disease detection scan) */
export function invalidateAlertCache(): void {
  sessionStorage.removeItem(CACHE_KEY);
}

function getFallbackAlerts(): Alert[] {
  return [
    {
      id: '1',
      type: 'weather',
      severity: 'info',
      title: 'Connecting to Alert Service',
      message: 'Unable to reach the alert service. Check your backend connection.',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ];
}
