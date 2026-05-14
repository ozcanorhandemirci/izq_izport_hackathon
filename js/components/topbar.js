/**
 * topbar.js — Header strip: port label, weather pill, sim status, theme +
 * language toggles, reset button, clock.
 */

import store from '../store/state.js';
import { t, getLanguage, getTheme, setLanguage, toggleTheme, formatDate } from '../i18n.js';
import { clearAll } from '../store/persistence.js';
import { confirm } from '../utils/modal.js';

let rootEl = null;
let clockHandle = null;

const SUN_ICON  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const RESET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
const AUDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>';

function pad(n) { return String(n).padStart(2, '0'); }
function formatClock(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }

function aqiTone(emissions) {
  const ratios = ['co2', 'nox', 'sox'].map((k) => emissions[k].current / emissions[k].threshold);
  const max = Math.max(...ratios);
  if (max >= 1.0)  return { tone: 'critical', tkey: 'topbar.aqi.critical' };
  if (max >= 0.85) return { tone: 'warning',  tkey: 'topbar.aqi.elevated' };
  if (max >= 0.55) return { tone: 'info',     tkey: 'topbar.aqi.nominal'  };
  return { tone: 'success', tkey: 'topbar.aqi.optimal' };
}

function render() {
  const weather   = store.get('weather');
  const meta      = store.get('meta');
  const emissions = store.get('emissions');
  const aqi       = aqiTone(emissions);
  const lang      = getLanguage();
  const theme     = getTheme();

  const simTone = meta.sim_status === 'live' ? 'success' : meta.sim_status === 'paused' ? 'warning' : 'info';
  const simLabel = meta.sim_status === 'live'
    ? t('topbar.sim.live', { count: meta.tick_count })
    : meta.sim_status === 'paused'
      ? t('topbar.sim.paused')
      : t('topbar.sim.idle');

  const now = new Date();

  rootEl.innerHTML = `
    <span class="topbar-demo-badge" title="${t('disclaimer.footer.text')}" aria-label="${t('disclaimer.footer.text')}">${t('disclaimer.badge')}</span>

    <div class="topbar-title">
      <span>${t('topbar.port')}</span>
      <span class="topbar-title-sub">· ${t('topbar.subtitle')}</span>
    </div>

    <div class="topbar-spacer"></div>

    <div class="topbar-cluster" role="group" aria-label="Live indicators">
      <div class="topbar-pill" data-tone="${aqi.tone}" title="${t('topbar.aqi')}">
        <span class="dot"></span>
        <span>${t('topbar.aqi')}</span>
        <strong style="color:var(--text-primary);font-weight:600;margin-left:4px">${t(aqi.tkey)}</strong>
      </div>

      <div class="topbar-pill" data-tone="info" title="${t('topbar.weather')}">
        <span class="dot"></span>
        <span class="mono">${weather.wind_speed.toFixed(1)} m/s ${weather.wind_direction}</span>
        <span class="muted" style="color:var(--text-tertiary);margin-left:4px">${weather.temperature.toFixed(0)}°C · ${weather.humidity.toFixed(0)}%</span>
      </div>

      <div class="topbar-pill" data-tone="${simTone}">
        <span class="dot"></span>
        <span class="mono">${simLabel}</span>
      </div>

      <button id="audit-btn" class="topbar-icon-btn" title="${t('audit.title')}" aria-label="${t('audit.aria.open')}">
        ${AUDIT_ICON}
      </button>

      <button id="reset-btn" class="topbar-icon-btn" title="${t('topbar.reset')}" aria-label="${t('topbar.reset')}">
        ${RESET_ICON}
      </button>

      <button id="theme-toggle" class="topbar-icon-btn" title="${t('topbar.theme.toggle')}" aria-label="${theme === 'dark' ? t('topbar.theme.light') : t('topbar.theme.dark')}">
        ${theme === 'dark' ? SUN_ICON : MOON_ICON}
      </button>

      <div class="topbar-segmented" role="group" aria-label="${t('topbar.lang.aria')}">
        <button data-lang="tr" class="${lang === 'tr' ? 'is-active' : ''}" type="button">TR</button>
        <button data-lang="en" class="${lang === 'en' ? 'is-active' : ''}" type="button">EN</button>
      </div>

      <div class="topbar-clock" aria-label="UTC clock">
        <strong>${formatClock(now)}</strong>
        <span class="muted">${formatDate(now)}</span>
      </div>
    </div>
  `;

  rootEl.querySelector('#audit-btn').addEventListener('click', () => {
    store.patch('ui', { audit_open: !store.get('ui')?.audit_open });
  });
  rootEl.querySelector('#theme-toggle').addEventListener('click', toggleTheme);
  rootEl.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
  rootEl.querySelector('#reset-btn').addEventListener('click', async () => {
    const ok = await confirm({ title: t('topbar.reset'), body: t('topbar.reset.confirm'), danger: true });
    if (!ok) return;
    clearAll();
    location.reload();
  });
}

export function init(root) {
  rootEl = root;
  render();

  store.subscribe('weather',   render);
  store.subscribe('meta',      render);
  store.subscribe('emissions', render);
  store.subscribe('ui',        render);

  if (clockHandle) clearInterval(clockHandle);
  clockHandle = setInterval(render, 1000);
}
