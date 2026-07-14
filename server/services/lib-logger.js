/* Minimal structured logger
   - Avoids leaking stack traces in production
   - Exports: info, warn, error with consistent shape
*/

const isProd = process.env.NODE_ENV === "production";

function timestamp() {
  return new Date().toISOString();
}

function safePayload(payload) {
  try {
    return JSON.stringify(payload);
  } catch (e) {
    return String(payload);
  }
}

export default {
  info: (msg, payload = {}) => {
    console.log(`[INFO] ${timestamp()} - ${msg} ${safePayload(payload)}`);
  },
  warn: (msg, payload = {}) => {
    console.warn(`[WARN] ${timestamp()} - ${msg} ${safePayload(payload)}`);
  },
  error: (msg, payload = {}) => {
    // In production, avoid printing stack or full error objects
    if (isProd) {
      console.error(`[ERROR] ${timestamp()} - ${msg} ${safePayload({ message: payload?.message || "" })}`);
    } else {
      console.error(`[ERROR] ${timestamp()} - ${msg} ${safePayload(payload)}`);
    }
  },
};
