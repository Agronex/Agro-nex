/* fetchWithRetry
   - timeout via AbortController
   - retry once with exponential backoff for transient failures
   - logs via logger
*/

import fetch from "node-fetch";
import logger from "./lib-logger.js";

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Add random jitter (0–50% extra) to prevent thundering herd on retries */
function jitter(baseMs) {
  return baseMs + Math.floor(Math.random() * baseMs * 0.5);
}

export default async function fetchWithRetry(url, { timeout = 5000, retries = 1, fetchOptions = {} } = {}) {
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { signal: controller.signal, ...fetchOptions });
      clearTimeout(timer);

      // Treat 502/503/504 as retryable
      if ((res.status >= 500 && res.status < 600) && attempt < retries) {
        logger.warn("Retrying fetch due to server error", { url, status: res.status, attempt });
        await delay(jitter(100 * 2 ** attempt));
        attempt++;
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;

      if (err.name === "AbortError") {
        logger.warn("Fetch timeout", { url, attempt, timeout });
      } else {
        logger.warn("Fetch error", { url, attempt, msg: err.message });
      }

      if (attempt < retries) {
        logger.info("Retrying fetch", { url, attempt });
        await delay(jitter(150 * 2 ** attempt));
        attempt++;
        continue;
      }

      // No more retries
      throw lastErr;
    }
  }

  throw lastErr || new Error("Failed to fetch");
}
