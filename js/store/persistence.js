/**
 * persistence.js — localStorage hydration + auto-save adapter.
 *
 * Persisted slices: ui, manual_vessels, manual_readings, report_config,
 * recommendations (history), settings, alerts (resolved/dismissed only).
 *
 * Live runtime slices (vessels, weather, emissions, shore_power, copilot,
 * meta, route) are NOT persisted — the simulation reseeds them on each load.
 */

import store from './state.js';

const NS = 'portiq';
const PERSISTED = [
  'ui',
  'manual_vessels',
  'manual_readings',
  'report_config',
  'recommendations',
  'settings',
  'accounts',
  'audit_log',
];

function key(slice) { return `${NS}.${slice}`; }

function safeGet(slice) {
  try { return JSON.parse(localStorage.getItem(key(slice))); }
  catch (_) { return null; }
}
function safeSet(slice, value) {
  try { localStorage.setItem(key(slice), JSON.stringify(value)); }
  catch (_) { /* private mode / quota */ }
}

/** Load persisted state and merge into store. Call once on boot. */
export function hydrate() {
  for (const slice of PERSISTED) {
    const stored = safeGet(slice);
    if (stored == null) continue;
    const current = store.get(slice);
    if (current && typeof current === 'object' && !Array.isArray(current) && typeof stored === 'object' && !Array.isArray(stored)) {
      /* shallow merge into the seeded shape */
      store.set(slice, { ...current, ...stored });
    } else {
      store.set(slice, stored);
    }
  }
}

/** Subscribe to slice changes and persist them. Call once after hydrate(). */
export function attach() {
  for (const slice of PERSISTED) {
    store.subscribe(slice, (value) => safeSet(slice, value));
  }
}

/** Drop all persisted PORT.IQ keys (used by the "reset" topbar action). */
export function clearAll() {
  for (const slice of PERSISTED) {
    try { localStorage.removeItem(key(slice)); } catch (_) {}
  }
}

/** Export a snapshot of all PORT.IQ state for offline backup / report bundles. */
export function snapshot() {
  const snap = {};
  for (const slice of PERSISTED) snap[slice] = store.get(slice);
  return snap;
}
