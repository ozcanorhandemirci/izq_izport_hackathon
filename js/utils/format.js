/**
 * format.js — Locale-aware formatters for numbers, dates, durations.
 */

import { getLanguage } from '../i18n.js';

function locale() { return getLanguage() === 'tr' ? 'tr-TR' : 'en-US'; }

export function num(n, opts = {}) {
  if (n == null || isNaN(n)) return '–';
  return new Intl.NumberFormat(locale(), opts).format(n);
}

export function compact(n) {
  if (n == null || isNaN(n)) return '–';
  return new Intl.NumberFormat(locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function pct(n, digits = 1) {
  if (n == null || isNaN(n)) return '–';
  return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function clock(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

export function hourMin(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

export function dateShort(d = new Date()) {
  return new Date(d).toLocaleDateString(locale(), { day: '2-digit', month: 'short' });
}

export function dateLong(d = new Date()) {
  return new Date(d).toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(d = new Date()) {
  const dt = new Date(d);
  return `${dateShort(dt)} ${hourMin(dt)}`;
}

export function ymd(d = new Date()) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function ymdhm(d = new Date()) {
  return `${ymd(d)} ${hourMin(d)}`;
}

export function relativeTime(ts, now = Date.now()) {
  const diffMs = ts - now;
  const abs = Math.abs(diffMs);
  const past = diffMs < 0;
  const lang = getLanguage();

  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (lang === 'tr') {
    if (minutes < 1) return 'şimdi';
    if (minutes < 60) return past ? `${minutes}d önce` : `${minutes}d sonra`;
    if (hours   < 24) return past ? `${hours}s ${minutes % 60}d önce` : `${hours}s ${minutes % 60}d sonra`;
    return past ? `${days}g önce` : `${days}g sonra`;
  } else {
    if (minutes < 1) return 'now';
    if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`;
    if (hours   < 24) return past ? `${hours}h ${minutes % 60}m ago` : `in ${hours}h ${minutes % 60}m`;
    return past ? `${days}d ago` : `in ${days}d`;
  }
}

export function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${pad2(m)}m`;
  if (m > 0) return `${m}m ${pad2(sec)}s`;
  return `${sec}s`;
}

export function rangeLabel(rangeId, custom) {
  const lang = getLanguage();
  const tr = lang === 'tr';
  const map = {
    '24h': tr ? 'Son 24 saat' : 'Last 24h',
    '7d':  tr ? 'Son 7 gün'   : 'Last 7d',
    '30d': tr ? 'Son 30 gün'  : 'Last 30d',
    'custom': tr ? 'Özel aralık' : 'Custom range',
  };
  if (rangeId === 'custom' && custom) {
    return `${dateShort(custom.start)} – ${dateShort(custom.end)}`;
  }
  return map[rangeId] || rangeId;
}

export function rangeBounds(rangeId, custom) {
  const now = Date.now();
  if (rangeId === '24h')   return { start: now - 24 * 3600_000, end: now };
  if (rangeId === '7d')    return { start: now - 7 * 24 * 3600_000, end: now };
  if (rangeId === '30d')   return { start: now - 30 * 24 * 3600_000, end: now };
  if (rangeId === 'custom' && custom) return { start: +new Date(custom.start), end: +new Date(custom.end) };
  return { start: now - 24 * 3600_000, end: now };
}
