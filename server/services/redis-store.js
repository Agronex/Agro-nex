/* Redis-backed store with in-process fallback
   - If REDIS_URL provided, uses Redis for cache and distributed lock
   - Exposes: getCached(key), setCached(key, data, ttlMs), acquireLock(lockKey, ttlMs), releaseLock(lockKey), waitForKey(key, timeoutMs)
   - Keys are strings and values stored as JSON
*/

import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";
import logger from "./lib-logger.js";

const REDIS_URL = process.env.REDIS_URL;
let redis = null;
let usingRedis = false;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      // Reconnect strategy: retry with exponential backoff, cap at 5s
      retryStrategy(times) {
        if (times > 20) return null; // stop after 20 attempts
        return Math.min(times * 200, 5000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    usingRedis = true;
    redis.on("error", (e) => logger.warn("Redis error", { message: e.message }));
    redis.on("close", () => {
      logger.warn("Redis connection closed — falling back to in-memory");
      usingRedis = false;
    });
    redis.on("ready", () => {
      logger.info("Redis ready");
      usingRedis = true;
    });
    logger.info("Redis: connected", { url: REDIS_URL });
  } catch (e) {
    logger.warn("Redis init failed, falling back to in-memory", { message: e.message });
    redis = null;
    usingRedis = false;
  }
}

// In-memory fallback with LRU eviction
const MAX_MEMORY_CACHE_SIZE = 200;
const memCache = new Map();
const memLocks = new Map();

/** Evict oldest entries when memCache exceeds MAX_MEMORY_CACHE_SIZE */
function evictIfNeeded() {
  while (memCache.size > MAX_MEMORY_CACHE_SIZE) {
    const oldestKey = memCache.keys().next().value;
    memCache.delete(oldestKey);
  }
}

/** Periodic cleanup of expired in-memory entries (runs every 5 min) */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of memCache) {
    if (entry.ttlMs && now - entry.time > entry.ttlMs) {
      memCache.delete(key);
    }
  }
}
const _cleanupInterval = setInterval(cleanupExpired, 5 * 60 * 1000);
_cleanupInterval.unref(); // don't block process exit

export function isUsingRedis() {
  return usingRedis;
}

export async function getCached(key) {
  if (usingRedis) {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    } catch (e) {
      logger.warn("Redis getCached failed, falling back to in-memory", { key, message: e.message });
    }
  }

  const entry = memCache.get(key);
  if (!entry) return null;
  if (entry.ttlMs && Date.now() - entry.time > entry.ttlMs) {
    memCache.delete(key);
    return null;
  }
  // LRU: move accessed entry to the end (most recent)
  memCache.delete(key);
  memCache.set(key, entry);
  return entry.data;
}

export async function setCached(key, data, ttlMs) {
  const raw = JSON.stringify(data);
  if (usingRedis) {
    try {
      const seconds = Math.ceil((ttlMs || 600000) / 1000);
      await redis.set(key, raw, "EX", seconds);
      return;
    } catch (e) {
      logger.warn("Redis setCached failed, falling back to in-memory", { key, message: e.message });
    }
  }

  memCache.set(key, { data, time: Date.now(), ttlMs });
  evictIfNeeded();
}

export async function acquireLock(lockKey, ttlMs) {
  if (usingRedis) {
    const token = uuidv4();
    const ok = await redis.set(lockKey, token, "NX", "PX", Math.max(1000, ttlMs || 10000));
    return ok ? token : null;
  }

  if (memLocks.has(lockKey)) return null;
  const token = uuidv4();
  memLocks.set(lockKey, token);
  // auto-release
  setTimeout(() => {
    if (memLocks.get(lockKey) === token) memLocks.delete(lockKey);
  }, Math.max(1000, ttlMs || 10000));
  return token;
}

export async function releaseLock(lockKey, token) {
  if (usingRedis) {
    // Best-effort release (no Lua script for brevity)
    try {
      const val = await redis.get(lockKey);
      if (val === token) await redis.del(lockKey);
    } catch (e) {
      logger.warn("Failed to release redis lock", { lockKey, message: e.message });
    }
    return;
  }

  if (memLocks.get(lockKey) === token) memLocks.delete(lockKey);
}

export async function waitForKey(key, timeoutMs = 10000, pollMs = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await getCached(key);
    if (value != null) return value;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

export default {
  getCached,
  setCached,
  acquireLock,
  releaseLock,
  waitForKey,
  isUsingRedis,
};
