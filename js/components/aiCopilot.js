/**
 * aiCopilot.js — Floating Action Button + collapsible right drawer.
 *
 * Production-styled assistant: header shows an "online" presence indicator,
 * suggestion chips run real queries, and `composeReply()` reads the live
 * store (vessels, emissions, shore_power, alerts, weather) to produce
 * context-aware answers with formatted metrics. The reasoning layer is
 * deterministic but presented as a finished product.
 */

import store from '../store/state.js';
import { t } from '../i18n.js';

let mountEl = null;
let drawerEl = null;
let fabEl    = null;

/* ------------------------------------------------------------------ */
function buildShell() {
  mountEl.innerHTML = `
    <button class="copilot-fab" id="copilot-fab" aria-label="${t('copilot.fab.open')}" data-open="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2 14.5 9 22 12 14.5 15 12 22 9.5 15 2 12 9.5 9z"/>
      </svg>
      <span class="copilot-fab-ping" aria-hidden="true"></span>
    </button>

    <aside class="copilot-drawer" id="copilot-drawer" data-open="false" role="dialog" aria-modal="false" aria-label="${t('copilot.title')}">
      <header class="copilot-head">
        <div class="copilot-head-title">
          <span class="copilot-pro-badge">${t('copilot.badge')}</span>
          <div>
            <h3>${t('copilot.title')}</h3>
            <span class="subtitle">
              <span class="copilot-online-dot" aria-hidden="true"></span>
              ${t('copilot.subtitle')}
            </span>
          </div>
        </div>
        <button class="copilot-close" id="copilot-close" aria-label="${t('copilot.fab.close')}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <div class="copilot-body scroll-styled" id="copilot-body" aria-live="polite"></div>

      <footer class="copilot-foot">
        <form class="copilot-input-row" id="copilot-form" autocomplete="off">
          <input type="text" id="copilot-input" placeholder="${t('copilot.input.placeholder')}" aria-label="${t('copilot.input.aria')}" />
          <button type="submit" class="copilot-send" aria-label="${t('copilot.send.aria')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 2-20 9 8 3 3 8z"/>
              <path d="m22 2-11 11"/>
            </svg>
          </button>
        </form>
        <small>
          <span class="copilot-foot-lock" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 1 1 8 0v4"/>
            </svg>
          </span>
          ${t('copilot.foot.note')}
        </small>
      </footer>
    </aside>
  `;

  fabEl    = mountEl.querySelector('#copilot-fab');
  drawerEl = mountEl.querySelector('#copilot-drawer');

  fabEl.addEventListener('click', () => store.dispatch('toggleCopilot'));
  mountEl.querySelector('#copilot-close').addEventListener('click', () => store.dispatch('toggleCopilot', false));

  const form = mountEl.querySelector('#copilot-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = mountEl.querySelector('#copilot-input');
    const text = input.value.trim();
    if (!text) return;
    store.dispatch('pushCopilotMessage', { from: 'user', text });
    input.value = '';
    askAssistant(text);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && store.get('copilot').open) {
      store.dispatch('toggleCopilot', false);
    }
  });
}

/* ------------------------------------------------------------------
 * Context-aware reply composer.
 *
 * Deterministic pattern matcher over the live store — produces production-
 * grade looking answers without relying on a real LLM. Three fixed delays
 * (320 / 720 / 1100ms) give the typing indicator a natural cadence.
 * ------------------------------------------------------------------ */
function askAssistant(query) {
  store.dispatch('pushCopilotMessage', { from: 'assistant', _typing: true });
  const reply = composeReply(query);
  /* Slightly variable delay (~700-1100ms) so it feels live. */
  const delay = 600 + Math.floor(Math.random() * 500);
  setTimeout(() => {
    const messages = store.get('copilot').messages.filter((m) => !m._typing);
    store.set('copilot', {
      ...store.get('copilot'),
      messages: [...messages, { from: 'assistant', text: reply }],
    });
  }, delay);
}

function composeReply(query) {
  const q = String(query).toLowerCase();
  const state = store.getAll();

  /* Tag matchers — Turkish + English keywords. */
  const has = (...patterns) => patterns.some((p) => q.includes(p));

  if (has('co2', 'co₂', 'karbon', 'carbon')) return replyCO2(state);
  if (has('nox', 'nitrogen', 'azot'))         return replyNOx(state);
  if (has('sox', 'sulfur', 'kükürt'))          return replySOx(state);
  if (has('shore', 'karadan', 'rıhtım', 'berth', 'dock')) return replyShore(state);
  if (has('alert', 'uyarı', 'critical', 'kritik', 'incident')) return replyAlerts(state);
  if (has('vessel', 'gemi', 'fleet', 'filo', 'ship'))  return replyVessels(state);
  if (has('weather', 'hava', 'wind', 'rüzgar', 'rüzgâr', 'dispersion', 'dağılım')) return replyWeather(state);
  if (has('summary', 'özet', 'overview', 'genel', 'durum')) return replySummary(state);

  return t('copilot.reply.fallback');
}

/* ----- Reply builders ----- */
function replyCO2(state) {
  const e = state.emissions.co2;
  const ratio = e.threshold ? (e.current / e.threshold) * 100 : 0;
  const breaches = (e.history || []).filter((v) => v > e.threshold).length;
  const top = [...state.vessels].sort((a, b) => b.emissions.co2 - a.emissions.co2)[0];
  return t('copilot.reply.co2', {
    value: e.current.toFixed(1),
    unit: e.unit,
    threshold: e.threshold,
    pct: ratio.toFixed(0),
    breaches,
    topName: top ? top.name : '—',
    topVal: top ? top.emissions.co2.toFixed(1) : '—',
  });
}

function replyNOx(state) {
  const e = state.emissions.nox;
  const exceeders = state.vessels
    .filter((v) => v.emissions.nox > 200)
    .sort((a, b) => b.emissions.nox - a.emissions.nox)
    .slice(0, 4);
  return t('copilot.reply.nox', {
    value: e.current.toFixed(1),
    unit: e.unit,
    threshold: e.threshold,
    count: exceeders.length,
    names: exceeders.length ? exceeders.map((v) => v.name).join(', ') : t('copilot.reply.no_breach'),
  });
}

function replySOx(state) {
  const e = state.emissions.sox;
  const ratio = e.threshold ? (e.current / e.threshold) * 100 : 0;
  const save = (e.current * 0.35).toFixed(1);
  return t('copilot.reply.sox', {
    value: e.current.toFixed(1),
    unit: e.unit,
    threshold: e.threshold,
    pct: ratio.toFixed(0),
    save,
  });
}

function replyShore(state) {
  const sp = state.shore_power;
  const occupied = sp.docks.filter((d) => d.occupied).length;
  const active = sp.docks.filter((d) => d.shore_power_active).length;
  const opps = sp.docks.filter((d) => d.occupied && !d.shore_power_active);
  return t('copilot.reply.shore', {
    active, occupied,
    kw: Math.round(sp.total_kw),
    co2: sp.total_co2_saved_kg.toFixed(0),
    opportunities: opps.length,
    oppList: opps.length ? opps.map((d) => d.name).join(', ') : t('copilot.reply.no_opps'),
  });
}

function replyVessels(state) {
  const v = state.vessels;
  const docked = v.filter((x) => x.status === 'docked' || x.status === 'loading').length;
  const approaching = v.filter((x) => x.status === 'approaching').length;
  const anchored = v.filter((x) => x.status === 'anchored').length;
  const compliant = v.filter((x) => x.severity === 'success' || x.severity === 'info').length;
  const critical  = v.filter((x) => x.severity === 'critical').length;
  const compliance = v.length ? Math.round((compliant / v.length) * 100) : 0;
  return t('copilot.reply.vessels', {
    total: v.length,
    docked, approaching, anchored,
    compliance, critical,
  });
}

function replyAlerts(state) {
  const open = (state.alerts || []).filter((a) => !a.resolved && !a.dismissed);
  const critical = open.filter((a) => a.severity === 'critical').length;
  const warning  = open.filter((a) => a.severity === 'warning').length;
  const latest = open[0];
  const latestTitle = latest
    ? (latest.title_text || (latest.title_key ? t(latest.title_key, latest.body_params || {}) : '—'))
    : '—';
  return t('copilot.reply.alerts', {
    open: open.length,
    critical, warning,
    latestTitle,
  });
}

function replyWeather(state) {
  const w = state.weather;
  const recKey = w.dispersion_risk === 'high'
    ? 'copilot.reply.weather_crit'
    : w.dispersion_risk === 'medium'
      ? 'copilot.reply.weather_warn'
      : 'copilot.reply.weather_calm';
  return t('copilot.reply.weather', {
    wind: w.wind_speed.toFixed(1),
    dir:  w.wind_direction,
    temp: w.temperature.toFixed(0),
    risk: t('dispersion.' + w.dispersion_risk),
    recommendation: t(recKey),
  });
}

function replySummary(state) {
  const open = (state.alerts || []).filter((a) => !a.resolved && !a.dismissed).length;
  const shore = (state.shore_power.docks || []).filter((d) => d.shore_power_active).length;
  const co2 = state.emissions.co2;
  const co2pct = co2.threshold ? Math.round((co2.current / co2.threshold) * 100) : 0;
  return t('copilot.reply.summary', {
    vessels: state.vessels.length,
    alerts: open,
    shore,
    co2pct,
  });
}

/* ------------------------------------------------------------------ */
function renderBody() {
  const cp = store.get('copilot');
  drawerEl.dataset.open = String(cp.open);
  fabEl.dataset.open = String(cp.open);
  fabEl.setAttribute('aria-label', cp.open ? t('copilot.fab.close') : t('copilot.fab.open'));

  const body = mountEl.querySelector('#copilot-body');
  if (!body) return;

  body.innerHTML = `
    ${cp.messages.map(messageBubble).join('')}
    ${cp.suggestions && cp.suggestions.length
      ? `<div class="copilot-suggestions" id="copilot-suggestions">
           ${cp.suggestions.map((s) => `<button class="chip" data-suggestion-key="${s}">${escapeHTML(t(s))}</button>`).join('')}
         </div>`
      : ''}
  `;

  body.scrollTop = body.scrollHeight;

  body.querySelectorAll('[data-suggestion-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.suggestionKey;
      const text = t(key);
      store.dispatch('pushCopilotMessage', { from: 'user', text });
      askAssistant(text);
    });
  });
}

function messageBubble(m) {
  let html;
  if (m._typing) {
    html = `<span class="mono copilot-typing">${escapeHTML(t('copilot.thinking'))}</span>`;
  } else if (m.key) {
    html = renderMarkdownLite(t(m.key));
  } else {
    html = renderMarkdownLite(m.text ?? '');
  }
  return `<div class="copilot-msg" data-from="${m.from}">${html}</div>`;
}

/* Tiny markdown: bold (**text**) and code (`text`). Escapes the rest. */
function renderMarkdownLite(s) {
  return escapeHTML(String(s ?? ''))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------------ */
export function init(root) {
  mountEl = root;
  buildShell();
  renderBody();
  store.subscribe('copilot', renderBody);
  store.subscribe('ui', () => { buildShell(); renderBody(); });
}
