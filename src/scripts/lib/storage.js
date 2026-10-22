/**
 * Safe localStorage wrapper. Storage can be missing or throw (private mode, blocked site data),
 * so every call is guarded and the site works without it.
 */
const PREFIX = 'gg-';

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key) {
  try { return localStorage.getItem(PREFIX + key); } catch { return null; }
}

export function writeRaw(key, value) {
  try { localStorage.setItem(PREFIX + key, value); return true; } catch { return false; }
}
