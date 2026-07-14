/* Shared cache utilities placed under server/services to avoid creating new directories
   - openMeteoCache: Map for Open-Meteo responses
   - tmrCache: Map for Tomorrow.io responses
   - inFlightRequests: Map for Promise deduplication
   - makeCacheKey/getCacheEntry/setCacheEntry helpers
*/

export const openMeteoCache = new Map();
export const tmrCache = new Map();
export const inFlightRequests = new Map();

export function makeCacheKey(lat, lon) {
  return `${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
}

export function getCacheEntry(cacheMap, key, ttl) {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.time;
  if (ttl && age > ttl) {
    cacheMap.delete(key);
    return null;
  }
  return entry.data;
}

export function setCacheEntry(cacheMap, key, data) {
  cacheMap.set(key, { data, time: Date.now() });
}
