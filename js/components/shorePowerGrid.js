/**
 * shorePowerGrid.js — Visual representation of the berths.
 * Reactive on shore_power + ui (language).
 */

import store from '../store/state.js';
import { t, formatNumber } from '../i18n.js';

let rootEl = null;

/* ------------------------------------------------------------------ */
function buildShell() {
  rootEl.innerHTML = `
    <div class="shore">
      <div class="section-head">
        <h2 class="section-title">
          ${t('shore.title')}
          <small>${t('shore.subtitle')}</small>
        </h2>
        <div class="section-actions">
          <button class="chip" id="shore-engage-all">${t('shore.engage_all')}</button>
          <button class="chip" id="shore-disengage-all">${t('shore.disengage_all')}</button>
        </div>
      </div>

      <div class="shore-summary" id="shore-summary"></div>
      <div class="docks-grid" id="docks-grid"></div>
    </div>
  `;

  rootEl.querySelector('#shore-engage-all').addEventListener('click', () => {
    const sp = store.get('shore_power');
    sp.docks.forEach((d) => {
      if (d.occupied && !d.shore_power_active) store.dispatch('toggleShorePower', d.id);
    });
  });
  rootEl.querySelector('#shore-disengage-all').addEventListener('click', () => {
    const sp = store.get('shore_power');
    sp.docks.forEach((d) => {
      if (d.shore_power_active) store.dispatch('toggleShorePower', d.id);
    });
  });
}

/* ------------------------------------------------------------------ */
function render() {
  const sp = store.get('shore_power');

  const summary = rootEl.querySelector('#shore-summary');
  if (summary) {
    const occupied = sp.docks.filter((d) => d.occupied).length;
    const active   = sp.docks.filter((d) => d.shore_power_active).length;
    summary.innerHTML = `
      <div class="stat">
        <span class="stat-label">${t('shore.summary.active')}</span>
        <span class="stat-value">${active} <small style="color:var(--text-tertiary);font-size:var(--fs-xs);font-weight:400">${t('shore.summary.occupied', { n: occupied })}</small></span>
      </div>
      <div class="stat">
        <span class="stat-label">${t('shore.summary.load')}</span>
        <span class="stat-value">${(sp.total_kw / 1000).toFixed(2)} MW</span>
      </div>
      <div class="stat">
        <span class="stat-label">${t('shore.summary.co2')}</span>
        <span class="stat-value" data-tone="success">${formatNumber(sp.total_co2_saved_kg, { maximumFractionDigits: 0 })} kg/h</span>
      </div>
      <div class="stat">
        <span class="stat-label">${t('shore.summary.capacity')}</span>
        <span class="stat-value">${((sp.total_kw / sp.grid_capacity_kw) * 100).toFixed(1)}%</span>
      </div>
    `;
  }

  const grid = rootEl.querySelector('#docks-grid');
  if (grid) grid.innerHTML = sp.docks.map(dockCard).join('');

  rootEl.querySelectorAll('.dock-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.dockId;
      if (id) store.dispatch('toggleShorePower', id);
    });
  });
}

function dockCard(d) {
  const fillPct = d.shore_power_active ? Math.min(100, (d.kw_used / d.kw_capacity) * 100) : 0;
  const co2Saved = d.shore_power_active ? +(d.kw_used * 0.69).toFixed(0) : 0;

  const vesselTypeLabel = d.vessel_type ? t('type.' + d.vessel_type) : '';

  const toggleLabel = d.shore_power_active
    ? t('shore.toggle.active', { n: co2Saved })
    : (d.occupied ? t('shore.toggle.aux') : t('shore.toggle.empty'));

  return `
    <div class="dock" data-active="${d.shore_power_active}">
      <div class="dock-head">
        <div>
          <div class="dock-name">${d.name}</div>
          <div class="dock-id mono">${d.id}</div>
        </div>
        <span class="badge" data-tone="${d.occupied ? 'info' : 'success'}">${d.occupied ? t('shore.dock.occupied') : t('shore.dock.empty')}</span>
      </div>

      ${d.occupied
        ? `<div class="dock-vessel">
             <span class="vessel-name">${d.vessel_name}</span>
             <span class="muted">${vesselTypeLabel} · ${d.vessel_id}</span>
           </div>`
        : `<div class="dock-empty">${t('shore.dock.available')}</div>`}

      <div class="dock-meter">
        <div class="dock-meter-bar">
          <div class="dock-meter-bar-fill" style="width:${fillPct.toFixed(1)}%"></div>
        </div>
        <span class="dock-meter-readout">
          ${d.shore_power_active
            ? `${formatNumber(d.kw_used)} kW`
            : t('shore.dock.idle', { n: formatNumber(d.kw_demand) })}
        </span>
      </div>

      <button
        class="dock-toggle"
        data-dock-id="${d.id}"
        aria-pressed="${d.shore_power_active}"
        ${d.occupied ? '' : 'disabled'}
        title="${d.occupied ? t('shore.toggle.tooltip') : t('shore.toggle.tooltip_empty')}"
      >
        <span>${toggleLabel}</span>
        <span class="switch" aria-hidden="true"></span>
      </button>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
export function init(root) {
  rootEl = root;
  buildShell();
  render();
  store.subscribe('shore_power', render);
  store.subscribe('ui', () => { buildShell(); render(); });
}
