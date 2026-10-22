export const inFlightRequests = new Map();

export function makeCacheKey(lat, lon) {
  return `${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
}
