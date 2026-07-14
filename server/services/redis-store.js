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
    redis = new Redis(REDIS_URL);
    usingRedis = true;
    redis.on("error", (e) => logger.warn("Redis error", { message: e.message }));
    logger.info("Redis: connected", { url: REDIS_URL });
  } catch (e) {
    logger.warn("Redis init failed, falling back to in-memory", { message: e.message });
    redis = null;
    usingRedis = false;
  }
}

// In-memory fallback
const memCache = new Map();
const memLocks = new Map();

export function isUsingRedis() {
  return usingRedis;
}

export async function getCached(key) {
  if (usingRedis) {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  const entry = memCache.get(key);
  if (!entry) return null;
  if (entry.ttlMs && Date.now() - entry.time > entry.ttlMs) {
    memCache.delete(key);
    return null;
  }
  return entry.data;
}

export async function setCached(key, data, ttlMs) {
  const raw = JSON.stringify(data);
  if (usingRedis) {
    const seconds = Math.ceil((ttlMs || 600000) / 1000);
    await redis.set(key, raw, "EX", seconds);
    return;
  }

  memCache.set(key, { data, time: Date.now(), ttlMs });
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
