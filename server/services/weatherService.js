/*
  weatherService.js
  Centralized weather service that is the ONLY module to call Open-Meteo and Tomorrow.io.
  Responsibilities:
  - Single place for network calls
  - Shared caching with TTLs
  - Request deduplication by caching in-flight Promises
  - 429 handling (fall back to cache)
  - Timeout + retry with exponential backoff
  - Separate caching for Tomorrow.io (UV)

  Exported functions:
  - getWeatherSummary(lat, lon, { includeUV }) -> normalized response matching previous API shape
  - getOpenMeteoRaw(lat, lon) -> raw Open-Meteo response (used by alerts route)
  - getUV(lat, lon) -> tomorrow.io data (cached separately)
*/

import fetch from "node-fetch";
import logger from "./lib-logger.js";
import { makeCacheKey } from "./lib-cache.js";
import fetchWithRetry from "./lib-fetch.js";
import * as redisStore from "./redis-store.js";

const TOMORROW_KEY = process.env.TOMORROW_KEY;

const OPEN_CACHE_MS = Number(process.env.OPEN_CACHE_MS) || 1000 * 60 * 10; // 10m
const TMR_CACHE_MS = Number(process.env.TMR_CACHE_MS) || 1000 * 60 * 10; // 10m

// Local in-process dedupe map (fast path for single-instance)
const inFlightRequests = new Map();

// Build Open-Meteo URL for a conservative set of fields used by the app
function buildOpenMeteoUrl(lat, lon, days = 5) {
  return (
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&current_weather=true` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
    `&hourly=relative_humidity_2m` +
    `&forecast_days=${days}` +
    `&timezone=auto`
  );
}

// Build Tomorrow.io realtime URL for UV and realtime precipitation
function buildTomorrowUrl(lat, lon) {
  // We call the realtime endpoint for a small number of fields
  return `https://api.tomorrow.io/v4/weather/realtime?location=${encodeURIComponent(lat)},${encodeURIComponent(
    lon
  )}&apikey=${TOMORROW_KEY}`;
}

// Fetch Open-Meteo with shared cache + distributed dedupe (Redis) + in-process dedupe
export async function getOpenMeteoRaw(lat, lon, opts = {}) {
  const key = makeCacheKey(lat, lon);
  const openKey = `open:${key}`;
  const lockKey = `lock:open:${key}`;

  // Check fast in-memory / Redis cache
  const cached = await redisStore.getCached(openKey);
  if (cached) {
    logger.info("Cache hit", { key, provider: "open-meteo" });
    return { data: cached, fromCache: true };
  }

  logger.info("Cache miss", { key, provider: "open-meteo" });

  // Local in-process dedupe
  if (inFlightRequests.has(openKey)) {
    logger.info("Waiting for local in-flight Open-Meteo request", { key });
    try {
      const result = await inFlightRequests.get(openKey);
      return { data: result, fromCache: false };
    } catch (err) {
      logger.warn("Local in-flight Open-Meteo request failed", { key, err: err.message });
    }
  }

  // Try to acquire distributed lock (Redis) to be the single fetcher across instances
  const lockToken = await redisStore.acquireLock(lockKey, 15000);
  if (!lockToken) {
    // Someone else is fetching; wait for them to populate the cache
    logger.info("Another instance is fetching Open-Meteo; waiting for cache", { key });
    const waited = await redisStore.waitForKey(openKey, 10000, 200);
    if (waited) return { data: waited, fromCache: true };
    // timed out waiting — fall through to attempt a local fetch as last resort
    logger.warn("Timeout waiting for distributed fetch; attempting local fetch", { key });
  }

  const promise = (async () => {
    // if we acquired lockToken, ensure we release it in finally
    let acquiredHere = Boolean(lockToken);
    const url = buildOpenMeteoUrl(lat, lon, opts.days || 5);
    logger.info("Open-Meteo request", { key, url, acquiredHere });

    try {
      const res = await fetchWithRetry(url, { timeout: 5000, retries: 1 });

      // Handle 429 with single retry + honor Retry-After
      if (res.status === 429) {
        logger.warn("Open-Meteo returned 429 Too Many Requests", { key });

        const retryAfter = res.headers?.get?.("retry-after");
        let waitMs = 0;
        if (retryAfter) {
          const num = Number(retryAfter);
          if (!Number.isNaN(num)) {
            waitMs = Math.min(num * 1000, 10000);
          } else {
            const date = Date.parse(retryAfter);
            if (!Number.isNaN(date)) {
              waitMs = Math.min(Math.max(0, date - Date.now()), 10000);
            }
          }
        }

        if (waitMs > 0) {
          logger.info("Retry-After detected, waiting before a single retry", { key, waitMs });
          await new Promise((r) => setTimeout(r, waitMs));
        }

        logger.info("Attempting a single retry after 429", { key });
        const retryRes = await fetchWithRetry(url, { timeout: 7000, retries: 0 });
        if (retryRes.status === 429) {
          logger.warn("Retry also returned 429", { key });
          const stale = await redisStore.getCached(openKey);
          if (stale) {
            logger.warn("429 fallback: returning cached Open-Meteo data", { key });
            return stale;
          }
          logger.warn("429 no-cache: returning fallback Open-Meteo object", { key });
          return {
            current_weather: { temperature: 0, windspeed: 0, weathercode: 0 },
            daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], weathercode: [] },
            hourly: { time: [], relative_humidity_2m: [] },
          };
        }

        if (!retryRes.ok) {
          logger.error("Open-Meteo retry returned non-ok status", { key, status: retryRes.status });
          const stale = await redisStore.getCached(openKey);
          if (stale) return stale;
          throw new Error(`Open-Meteo retry failed with status ${retryRes.status}`);
        }

        const retryData = await retryRes.json();
        if (retryData && retryData.current_weather && retryData.daily) {
          await redisStore.setCached(openKey, retryData, OPEN_CACHE_MS);
          return retryData;
        }

        const stale = await redisStore.getCached(openKey);
        if (stale) return stale;
        throw new Error("Invalid Open-Meteo response on retry");
      }

      if (!res.ok) {
        logger.error("Open-Meteo returned non-ok status", { key, status: res.status });
        const stale = await redisStore.getCached(openKey);
        if (stale) return stale;
        throw new Error(`Open-Meteo failed with status ${res.status}`);
      }

      const data = await res.json();

      if (!data || !data.current_weather || !data.daily) {
        logger.warn("Open-Meteo returned unexpected shape", { key });
        const stale = await redisStore.getCached(openKey);
        if (stale) return stale;
        throw new Error("Invalid Open-Meteo response");
      }

      // Store fresh cache in Redis (or in-memory fallback)
      await redisStore.setCached(openKey, data, OPEN_CACHE_MS);

      return data;
    } catch (err) {
      logger.error("Open-Meteo fetch failed", { key, err: err.message });
      const stale = await redisStore.getCached(openKey);
      if (stale) {
        logger.warn("Returning stale Open-Meteo cache after fetch error", { key });
        return stale;
      }
      throw err;
    } finally {
      // release distributed lock if we held it
      if (acquiredHere) {
        try {
          await redisStore.releaseLock(lockKey, lockToken);
        } catch (e) {
          logger.warn("Failed to release lock", { lockKey, message: e.message });
        }
      }
    }
  })();

  inFlightRequests.set(openKey, promise);
  try {
    const result = await promise;
    return { data: result, fromCache: false };
  } finally {
    inFlightRequests.delete(openKey);
  }
}

// Fetch Tomorrow.io with Redis-backed cache + dedupe
export async function getUV(lat, lon) {
  if (!TOMORROW_KEY) {
    logger.info("Tomorrow.io key not configured; skipping UV fetch");
    return null;
  }

  const key = makeCacheKey(lat, lon);
  const tmrKey = `tmr:${key}`;
  const lockKey = `lock:tmr:${key}`;

  const cached = await redisStore.getCached(tmrKey);
  if (cached) {
    logger.info("Tomorrow.io cache hit", { key });
    return { data: cached, fromCache: true };
  }

  logger.info("Tomorrow.io cache miss", { key });

  if (inFlightRequests.has(tmrKey)) {
    logger.info("Waiting for local in-flight Tomorrow.io request", { key });
    try {
      const result = await inFlightRequests.get(tmrKey);
      return { data: result, fromCache: false };
    } catch (err) {
      logger.warn("Local in-flight Tomorrow.io request failed", { key, err: err.message });
    }
  }

  const lockToken = await redisStore.acquireLock(lockKey, 10000);
  if (!lockToken) {
    logger.info("Another instance is fetching Tomorrow.io; waiting for cache", { key });
    const waited = await redisStore.waitForKey(tmrKey, 8000, 200);
    if (waited) return { data: waited, fromCache: true };
    logger.warn("Timeout waiting for distributed Tomorrow.io fetch; attempting local fetch", { key });
  }

  const promise = (async () => {
    const acquiredHere = Boolean(lockToken);
    const url = buildTomorrowUrl(lat, lon);
    logger.info("Tomorrow.io request", { key, url, acquiredHere });

    try {
      const res = await fetchWithRetry(url, { timeout: 4000, retries: 1 });
      if (!res.ok) {
        logger.warn("Tomorrow.io returned non-ok", { key, status: res.status });
        const stale = await redisStore.getCached(tmrKey);
        if (stale) return stale;
        return null;
      }

      const data = await res.json();
      await redisStore.setCached(tmrKey, data, TMR_CACHE_MS);
      return data;
    } catch (err) {
      logger.warn("Tomorrow.io fetch failed", { key, err: err.message });
      const stale = await redisStore.getCached(tmrKey);
      if (stale) return stale;
      return null;
    } finally {
      if (acquiredHere) {
        try {
          await redisStore.releaseLock(lockKey, lockToken);
        } catch (e) {
          logger.warn("Failed to release Tomorrow.io lock", { lockKey, message: e.message });
        }
      }
    }
  })();

  inFlightRequests.set(tmrKey, promise);
  try {
    const result = await promise;
    return { data: result, fromCache: false };
  } finally {
    inFlightRequests.delete(tmrKey);
  }
}

// Map Open-Meteo weather codes to friendly strings (kept same as previous)
function mapWeatherCode(code) {
  const codes = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Rime Fog",
    51: "Light Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    71: "Snow",
    80: "Showers",
    95: "Thunderstorm",
  };

  return codes[code] ?? "Unknown";
}

// Public: Get normalized weather summary (keeps API response format from prior implementation)
export async function getWeatherSummary(lat, lon, { includeUV = false } = {}) {
  const start = Date.now();
  const openResult = await getOpenMeteoRaw(lat, lon, { days: 5 });
  const openRaw = openResult.data;
  const openHasForecast =
    Array.isArray(openRaw?.daily?.time) && openRaw.daily.time.length > 0;

  // Safe humidity extraction
  const now = new Date();
  const currentHourISO = now.toISOString().slice(0, 13);
  const hourlyTimes = openRaw?.hourly?.time || [];
  const humidityData = openRaw?.hourly?.relative_humidity_2m || [];
  const currentHourIndex = hourlyTimes.findIndex((t) => t.startsWith(currentHourISO));
  const currentHumidity = currentHourIndex >= 0 ? humidityData[currentHourIndex] : 0;

  const current = openRaw.current_weather || {};
  const daily = openRaw.daily || {};

  // Tomorrow.io (UV + precipitation intensity) — optional and cached separately
  let tmrValues = {};
  if (includeUV && TOMORROW_KEY) {
    try {
      const tmr = await getUV(lat, lon);
      if (tmr && tmr.data) tmrValues = tmr.data?.data?.values || {};
    } catch (err) {
      logger.warn("Failed to get Tomorrow.io values", { err: err.message });
    }
  }

  const forecast = (daily.time || []).map((date, i) => ({
    date,
    temperature: {
      max: daily.temperature_2m_max?.[i] ?? 0,
      min: daily.temperature_2m_min?.[i] ?? 0,
    },
    condition: mapWeatherCode(daily.weathercode?.[i]),
    rainfall: daily.precipitation_sum?.[i] ?? 0,
  }));

  const result = {
    temperature:
      openHasForecast && current.temperature != null
        ? current.temperature
        : tmrValues.temperature ?? 0,
    humidity:
      openHasForecast && currentHumidity != null && currentHumidity !== 0
        ? currentHumidity
        : tmrValues.humidity ?? 0,
    rainfall:
      tmrValues.precipitationIntensity ??
      daily.precipitation_sum?.[0] ??
      0,
    windSpeed:
      openHasForecast && current.windspeed != null
        ? current.windspeed
        : tmrValues.windSpeed ?? 0,
    uvIndex: tmrValues.uvIndex ?? 0,
    condition:
      openHasForecast
        ? mapWeatherCode(current.weathercode)
        : tmrValues.weatherCode != null
          ? mapWeatherCode(tmrValues.weatherCode)
          : "Unknown",
    forecast,
  };

  const took = Date.now() - start;
  logger.info("WeatherSummary response", { lat, lon, took });

  return result;
}

export default {
  getOpenMeteoRaw,
  getUV,
  getWeatherSummary,
};
