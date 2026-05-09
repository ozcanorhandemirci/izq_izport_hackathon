/**
 * operationsMatrix.js — Unified vessel operations table.
 * Reactive on vessels, weather, ui (language).
 */

import store from '../store/state.js';
import { t, getLanguage } from '../i18n.js';

let rootEl = null;
let activeFilter = 'all';

const FILTER_IDS = ['all', 'critical', 'warning', 'info', 'success'];

/* ------------------------------------------------------------------ */
function fmtETA(ts) {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3_600_000);
  const mins = Math.floor((abs % 3_600_000) / 60_000);
  const sign = diff < 0 ? '+' : '−';
  if (hours === 0) return `${sign}${mins}m`;
  if (hours < 24) return `${sign}${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${sign}${days}d ${hours % 24}h`;
}

function fmtETAStatus(ts) {
  const diff = ts - Date.now();
  if (diff < 0) return { tkey: 'ops.eta.berth',     tone: 'success' };
  if (diff < 3_600_000) return { tkey: 'ops.eta.imminent', tone: 'warning' };
  return { tkey: 'ops.eta.scheduled', tone: 'info' };
}

function emissionMiniBar(value, threshold, tone) {
  const pct = Math.min(100, (value / threshold) * 100);
  return `
    <div class="bar-mini" data-tone="${tone}" title="${value.toFixed(1)} / ${threshold}">
      <div class="bar-mini-fill" style="width:${pct.toFixed(0)}%"></div>
    </div>
  `;
}

function severityForEmission(value, threshold) {
  const r = value / threshold;
  if (r >= 1.0)  return 'critical';
  if (r >= 0.85) return 'warning';
  if (r >= 0.55) return 'info';
  return 'success';
}

/* ------------------------------------------------------------------ */
function buildShell() {
  rootEl.innerHTML = `
    <div class="ops">
      <div class="section-head">
        <h2 class="section-title">
          ${t('ops.title')}
          <small id="ops-vessel-count">— ${t('ops.count.under', { count: 0 })}</small>
        </h2>
        <div class="section-actions" role="toolbar" aria-label="Filters">
          ${FILTER_IDS.map((id) => `<button class="chip ${id === activeFilter ? 'is-active' : ''}" data-filter="${id}">${t('ops.filter.' + id)}</button>`).join('')}
        </div>
      </div>

      <div class="ops-table-wrap scroll-styled">
        <table class="ops-table" role="table">
          <thead>
            <tr>
              <th scope="col">${t('ops.col.vessel')}</th>
              <th scope="col">${t('ops.col.type')}</th>
              <th scope="col">${t('ops.col.status')}</th>
              <th scope="col">${t('ops.col.eta')}</th>
              <th scope="col">${t('ops.col.fuel')}</th>
              <th scope="col">${t('ops.col.speed')}</th>
              <th scope="col">CO₂</th>
              <th scope="col">NOₓ</th>
              <th scope="col">SOₓ</th>
              <th scope="col">${t('ops.col.dispersion')}</th>
            </tr>
          </thead>
          <tbody id="ops-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  rootEl.querySelectorAll('.chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      rootEl.querySelectorAll('.chip[data-filter]').forEach((c) => {
        c.classList.toggle('is-active', c.dataset.filter === activeFilter);
      });
      renderRows();
    });
  });
}

function renderRows() {
  const vessels = store.get('vessels');
  const weather = store.get('weather');
  const tbody = rootEl.querySelector('#ops-table-body');
  const counter = rootEl.querySelector('#ops-vessel-count');
  if (!tbody) return;

  const weatherDispersion = weather.dispersion_risk;

  const filtered = activeFilter === 'all'
    ? vessels
    : vessels.filter((v) => v.severity === activeFilter);

  counter.textContent = activeFilter === 'all'
    ? '— ' + t('ops.count.under', { count: vessels.length })
    : '— ' + t('ops.count.filtered', {
        filtered: filtered.length,
        total: vessels.length,
        filter: t('ops.filter.' + activeFilter).toLowerCase(),
      });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:var(--sp-7);color:var(--text-tertiary);font-size:var(--fs-sm)">
          ${t('ops.empty', { filter: t('ops.filter.' + activeFilter).toLowerCase() })}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((v) => row(v, weatherDispersion)).join('');
}

function row(v, weatherDispersion) {
  const co2Sev = severityForEmission(v.emissions.co2, 75);
  const noxSev = severityForEmission(v.emissions.nox, 220);
  const soxSev = severityForEmission(v.emissions.sox, 90);

  const order = { low: 0, medium: 1, high: 2 };
  const baseRisk = v.dispersion_risk;
  const effective = order[weatherDispersion] > order[baseRisk] ? weatherDispersion : baseRisk;
  const dispTone = effective === 'high' ? 'critical' : effective === 'medium' ? 'warning' : 'success';

  const eta = fmtETAStatus(v.eta_ts);

  return `
    <tr data-severity="${v.severity}" data-vessel="${v.id}">
      <td>
        <div class="vessel-cell">
          <div>
            <div class="vessel-name">${v.name}</div>
            <div class="vessel-id mono">${v.id}</div>
          </div>
        </div>
      </td>
      <td><span class="muted">${t('type.' + v.type)}</span></td>
      <td><span class="badge" data-tone="${v.status_tone}">${t('status.' + v.status)}</span></td>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="mono">${fmtETA(v.eta_ts)}</span>
          <span class="badge" data-tone="${eta.tone}" style="font-size:9px;padding:1px 6px">${t(eta.tkey)}</span>
        </div>
      </td>
      <td><span class="fuel-pill" data-clean="${v.fuel_clean}">${v.fuel}</span></td>
      <td><span class="mono">${v.speed_kn.toFixed(1)} ${t('ops.unit.knots')}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:var(--sp-2)">
          ${emissionMiniBar(v.emissions.co2, 75, co2Sev)}
          <span class="mono" style="font-size:var(--fs-xs)">${v.emissions.co2.toFixed(0)}</span>
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:var(--sp-2)">
          ${emissionMiniBar(v.emissions.nox, 220, noxSev)}
          <span class="mono" style="font-size:var(--fs-xs)">${v.emissions.nox.toFixed(0)}</span>
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:var(--sp-2)">
          ${emissionMiniBar(v.emissions.sox, 90, soxSev)}
          <span class="mono" style="font-size:var(--fs-xs)">${v.emissions.sox.toFixed(0)}</span>
        </div>
      </td>
      <td><span class="badge" data-tone="${dispTone}">${t('dispersion.' + effective)}</span></td>
    </tr>
  `;
}

/* ------------------------------------------------------------------ */
export function init(root) {
  rootEl = root;
  buildShell();
  renderRows();

  store.subscribe('vessels', renderRows);
  store.subscribe('weather', renderRows);
  /* Language change requires re-rendering both shell (for header titles) and rows. */
  store.subscribe('ui', () => { buildShell(); renderRows(); });
}
