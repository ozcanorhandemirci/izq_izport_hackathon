/**
 * kpiWidget.js — KPI cards with sparklines. Theme-aware: brand color is read
 * fresh from CSS variables on each render so charts swap palette when theme
 * changes.
 */

import store from '../store/state.js';
import { t, formatNumber } from '../i18n.js';

const STATIC_TONE_COLOR = {
  success:  '#1D9E75',
  warning:  '#BA7517',
  critical: '#E24B4A',
};

function brandColor() {
  /* Read --brand-primary at runtime so theme swap is reflected. */
  const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
  return v || '#009DC4';
}

function toneColor(tone) {
  if (tone === 'info') return brandColor();
  return STATIC_TONE_COLOR[tone] || brandColor();
}

function toneFor(ratio) {
  if (ratio >= 1.0)  return 'critical';
  if (ratio >= 0.85) return 'warning';
  if (ratio >= 0.55) return 'info';
  return 'success';
}

function deltaInfo(history) {
  if (history.length < 2) return { value: 0, direction: 'flat' };
  const cur = history[history.length - 1];
  const prev = history[history.length - 2];
  if (prev === 0) return { value: 0, direction: 'flat' };
  const pct = ((cur - prev) / prev) * 100;
  const direction = Math.abs(pct) < 0.4 ? 'flat' : pct > 0 ? 'up' : 'down';
  return { value: pct, direction };
}

const arrowFor = { up: '▲', down: '▼', flat: '◆' };

/* ------------------------------------------------------------------ */
const cards = {};

function buildEmissionCard(rootEl, key) {
  const card = { rootEl, chart: null, key };
  cards[key] = card;
  rootEl.classList.add('kpi-host');
  renderEmissionCard(card);
}

function renderEmissionCard(card) {
  const emissions = store.get('emissions');
  const slice = emissions[card.key];
  if (!slice) return;

  const ratio = slice.current / slice.threshold;
  const tone = toneFor(ratio);
  const delta = deltaInfo(slice.history);
  const color = toneColor(tone);

  card.rootEl.innerHTML = `
    <div class="kpi">
      <div class="kpi-head">
        <span class="kpi-label">${t('kpi.aggregate', { name: slice.label })}</span>
        <span class="kpi-status" data-tone="${tone}">${t('kpi.status.' + tone)}</span>
      </div>
      <div>
        <div class="kpi-value-row">
          <span class="kpi-value">${formatValue(slice.current)}</span>
          <span class="kpi-unit">${slice.unit}</span>
          <span class="kpi-delta" data-direction="${delta.direction}">
            ${arrowFor[delta.direction]} ${Math.abs(delta.value).toFixed(1)}%
          </span>
        </div>
        <div class="kpi-spark"><canvas></canvas></div>
      </div>
      <div class="kpi-foot">
        <span>${t('kpi.trend24')}</span>
        <span class="threshold">${t('kpi.threshold', { value: slice.threshold, unit: slice.unit })}</span>
      </div>
    </div>
  `;

  const canvas = card.rootEl.querySelector('canvas');
  if (!canvas || !window.Chart) return;

  /* Re-create the chart on every render — the host element is replaced and
   * the previous canvas is detached; preserving the chart instance would
   * leak. Cheap enough for 4 sparklines. */
  if (card.chart) { card.chart.destroy(); card.chart = null; }
  card.chart = createSparkline(canvas, slice.history, color);
}

function buildShoreCard(rootEl) {
  const card = { rootEl, key: 'shore' };
  cards.shore = card;
  renderShoreCard(card);
}

function renderShoreCard(card) {
  const sp = store.get('shore_power');
  const co2_saved = sp.total_co2_saved_kg;
  const total_kw = sp.total_kw;
  const active = sp.docks.filter((d) => d.shore_power_active).length;
  const tone = active > 0 ? 'success' : 'info';

  card.rootEl.innerHTML = `
    <div class="kpi kpi--shore">
      <div class="kpi-head">
        <span class="kpi-label">${t('kpi.shore.label')}</span>
        <span class="kpi-status" data-tone="${tone}">${t('kpi.shore.active', { n: active })}</span>
      </div>
      <div>
        <div class="kpi-value-row">
          <span class="kpi-value">${formatValue(co2_saved)}</span>
          <span class="kpi-unit">kg/h</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-top:var(--sp-3);font-size:var(--fs-xs);color:var(--text-tertiary)">
          <div class="bar-mini" data-tone="${tone}" style="width:120px">
            <div class="bar-mini-fill" style="width:${Math.min(100, (total_kw / sp.grid_capacity_kw) * 100).toFixed(1)}%"></div>
          </div>
          <span class="mono">${(total_kw / 1000).toFixed(1)} / ${(sp.grid_capacity_kw / 1000).toFixed(0)} MW</span>
        </div>
      </div>
      <div class="kpi-foot">
        <span>${active === 0 ? t('kpi.shore.empty') : t('kpi.shore.engaged', { n: active })}</span>
        <span class="threshold">${t('kpi.shore.target')}</span>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
function formatValue(n) {
  if (n >= 1000) return formatNumber(n, { maximumFractionDigits: 0 });
  if (n >= 100)  return n.toFixed(0);
  if (n >= 10)   return n.toFixed(1);
  return n.toFixed(2);
}

function makeGradient(canvas, color) {
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 56);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');
  return grad;
}

function createSparkline(canvas, data, color) {
  return new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: makeGradient(canvas, color),
        fill: true,
        borderWidth: 1.6,
        pointRadius: 0,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: false },
      },
      animation: { duration: 320 },
      elements: { line: { borderJoinStyle: 'round' } },
    },
  });
}

/* ------------------------------------------------------------------ */
export function init(hostMap) {
  if (hostMap.co2)   buildEmissionCard(hostMap.co2, 'co2');
  if (hostMap.nox)   buildEmissionCard(hostMap.nox, 'nox');
  if (hostMap.sox)   buildEmissionCard(hostMap.sox, 'sox');
  if (hostMap.shore) buildShoreCard(hostMap.shore);

  store.subscribe('emissions', () => {
    if (cards.co2) renderEmissionCard(cards.co2);
    if (cards.nox) renderEmissionCard(cards.nox);
    if (cards.sox) renderEmissionCard(cards.sox);
  });

  store.subscribe('shore_power', () => {
    if (cards.shore) renderShoreCard(cards.shore);
  });

  /* Re-render on language OR theme change — theme swap means brand color
   * for the 'info' tone changes, and labels need translation. */
  store.subscribe('ui', () => {
    if (cards.co2) renderEmissionCard(cards.co2);
    if (cards.nox) renderEmissionCard(cards.nox);
    if (cards.sox) renderEmissionCard(cards.sox);
    if (cards.shore) renderShoreCard(cards.shore);
  });
}
