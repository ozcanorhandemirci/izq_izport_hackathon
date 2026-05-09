/**
 * pages/vessels.js — Gemiler / Vessels page.
 *
 * Power-BI-quality detailed view: KPI strip, multi-axis filter rail, four
 * analytical charts, sortable list, drill-down detail panel and full manual
 * CRUD. All translations live next to the UI via registerStrings(); the page
 * is fully reactive to language and theme changes via the 'ui' slice.
 */

import store from '../store/state.js';
import { t, registerStrings } from '../i18n.js';
import * as fmt from '../utils/format.js';
import { lineChart, barChart, doughnutChart, themePalette, hexAlpha, toneColor } from '../utils/charts.js';
import { openForm, confirm } from '../utils/modal.js';
import { required, minNumber, imo, compose } from '../utils/validate.js';

/* ============================================================
 * i18n — TR + EN page dictionary
 * ============================================================ */
registerStrings({
  tr: {
    'vessels.kpi.total':           'Toplam Gemi',
    'vessels.kpi.total.sub':       '{live} canlı · {manual} manuel',
    'vessels.kpi.docked':          'Yanaşmış / Yükleme',
    'vessels.kpi.docked.sub':      '{n} aktif rıhtımda',
    'vessels.kpi.approaching':     'Yaklaşan (<12s)',
    'vessels.kpi.approaching.sub': '{imminent} yakında',
    'vessels.kpi.compliance':      'Uyum Oranı',
    'vessels.kpi.compliance.sub':  '{ok} / {total} eşik altında',
    'vessels.kpi.avg_speed':       'Ortalama Hız',
    'vessels.kpi.avg_speed.sub':   'maks. {max} kn',
    'vessels.kpi.delta_today':     '{n} bugün',
    'vessels.filter.type':         'Tip',
    'vessels.filter.status':       'Durum',
    'vessels.filter.fuel':         'Yakıt',
    'vessels.filter.severity':     'Uyumluluk',
    'vessels.filter.all':          'Tümü',
    'vessels.filter.clear':        'Filtreleri temizle',
    'vessels.search.placeholder':  'Gemi adı veya IMO ara…',
    'vessels.chart.type_dist':     'Tip Dağılımı',
    'vessels.chart.fuel_mix':      'Yakıt Karışımı',
    'vessels.chart.fuel.clean':    'Temiz yakıtlar',
    'vessels.chart.fuel.dirty':    'Konvansiyonel',
    'vessels.chart.severity':      'Uyumluluk Profili',
    'vessels.chart.speed_hist':    'Hız Dağılımı',
    'vessels.chart.speed_axis':    'Gemi sayısı',
    'vessels.chart.bucket.0':      '0–5 kn',
    'vessels.chart.bucket.1':      '5–10 kn',
    'vessels.chart.bucket.2':      '10–15 kn',
    'vessels.chart.bucket.3':      '15+ kn',
    'vessels.list.title':          'Gemi Listesi',
    'vessels.list.subtitle':       '{count} kayıt görüntüleniyor',
    'vessels.col.vessel':          'Gemi',
    'vessels.col.type_fuel':       'Tip · Yakıt',
    'vessels.col.status':          'Durum',
    'vessels.col.eta':             'ETA',
    'vessels.col.speed':           'Hız',
    'vessels.col.emissions':       'Emisyon Profili',
    'vessels.col.severity':        'Uyumluluk',
    'vessels.col.alerts':          'Uyarı',
    'vessels.col.actions':         'İşlemler',
    'vessels.detail.title':        'Gemi Detayı',
    'vessels.detail.profile':      'Profil',
    'vessels.detail.emissions':    '24 Saatlik Emisyon Eğilimi',
    'vessels.detail.alerts':       'Aktif Uyarılar',
    'vessels.detail.no_alerts':    'Bu gemiye dair açık uyarı yok.',
    'vessels.detail.field.eta':    'Tahmini Varış',
    'vessels.detail.field.speed':  'Hız',
    'vessels.detail.field.coords': 'Konum',
    'vessels.detail.field.dispersion': 'Dağılım Riski',
    'vessels.detail.field.fuel':   'Yakıt',
    'vessels.detail.field.imo':    'IMO',
    'vessels.detail.field.id':     'Kimlik',
    'vessels.detail.field.created':'Oluşturuldu',
    'vessels.detail.manual_tag':   'Manuel kayıt',
    'vessels.detail.live_tag':     'AIS canlı',
    'vessels.detail.close':        'Detayı kapat',
    'vessels.add.title':           'Yeni Gemi Ekle',
    'vessels.add.subtitle':        'Manuel kayıtlar AIS verisinin yanında listelenir',
    'vessels.edit.title':          'Gemiyi Düzenle',
    'vessels.edit.subtitle':       'Yalnızca manuel girilen kayıtlar düzenlenebilir',
    'vessels.field.name':          'Gemi Adı',
    'vessels.field.imo':           'IMO',
    'vessels.field.imo.hint':      'Örn. IMO-9456321',
    'vessels.field.type':          'Tip',
    'vessels.field.fuel':          'Yakıt',
    'vessels.field.status':        'Durum',
    'vessels.field.speed':         'Hız (kn)',
    'vessels.field.eta':           'ETA',
    'vessels.field.dispersion':    'Dağılım Riski',
    'vessels.field.emissions_co2': 'CO₂ (kg/s)',
    'vessels.field.emissions_nox': 'NOₓ (kg/s)',
    'vessels.field.emissions_sox': 'SOₓ (kg/s)',
    'vessels.field.lat':           'Enlem',
    'vessels.field.lon':           'Boylam',
    'vessels.action.detail':       'Detay',
    'vessels.action.edit':         'Düzenle',
    'vessels.action.delete':       'Sil',
    'vessels.empty.title':         'Eşleşen gemi yok',
    'vessels.empty.body':          'Filtreleri ya da arama metnini değiştirerek tekrar deneyin.',
    'vessels.delete.title':        'Gemiyi sil',
    'vessels.delete.body':         '{name} kalıcı olarak silinecek. Devam edilsin mi?',
    'vessels.unit.knots':          'kn',
    'vessels.unit.vessels':        'gemi',
    'vessels.severity.success':    'Uyumlu',
    'vessels.severity.info':       'Gözlem',
    'vessels.severity.warning':    'Uyarı',
    'vessels.severity.critical':   'Kritik',
    'vessels.alerts.badge':        '{n} uyarı',
    'vessels.alerts.singular':     '1 uyarı',
    'vessels.recent_added':        'Son eklenen',
  },
  en: {
    'vessels.kpi.total':           'Total Vessels',
    'vessels.kpi.total.sub':       '{live} live · {manual} manual',
    'vessels.kpi.docked':          'Docked / Loading',
    'vessels.kpi.docked.sub':      '{n} active berths',
    'vessels.kpi.approaching':     'Approaching (<12h)',
    'vessels.kpi.approaching.sub': '{imminent} imminent',
    'vessels.kpi.compliance':      'Compliance Rate',
    'vessels.kpi.compliance.sub':  '{ok} of {total} below threshold',
    'vessels.kpi.avg_speed':       'Average Speed',
    'vessels.kpi.avg_speed.sub':   'peak {max} kn',
    'vessels.kpi.delta_today':     '{n} today',
    'vessels.filter.type':         'Type',
    'vessels.filter.status':       'Status',
    'vessels.filter.fuel':         'Fuel',
    'vessels.filter.severity':     'Compliance',
    'vessels.filter.all':          'All',
    'vessels.filter.clear':        'Clear filters',
    'vessels.search.placeholder':  'Search by name or IMO…',
    'vessels.chart.type_dist':     'Type Distribution',
    'vessels.chart.fuel_mix':      'Fuel Mix',
    'vessels.chart.fuel.clean':    'Clean fuels',
    'vessels.chart.fuel.dirty':    'Conventional',
    'vessels.chart.severity':      'Compliance Profile',
    'vessels.chart.speed_hist':    'Speed Distribution',
    'vessels.chart.speed_axis':    'Vessel count',
    'vessels.chart.bucket.0':      '0–5 kn',
    'vessels.chart.bucket.1':      '5–10 kn',
    'vessels.chart.bucket.2':      '10–15 kn',
    'vessels.chart.bucket.3':      '15+ kn',
    'vessels.list.title':          'Vessel List',
    'vessels.list.subtitle':       '{count} records shown',
    'vessels.col.vessel':          'Vessel',
    'vessels.col.type_fuel':       'Type · Fuel',
    'vessels.col.status':          'Status',
    'vessels.col.eta':             'ETA',
    'vessels.col.speed':           'Speed',
    'vessels.col.emissions':       'Emission profile',
    'vessels.col.severity':        'Compliance',
    'vessels.col.alerts':          'Alerts',
    'vessels.col.actions':         'Actions',
    'vessels.detail.title':        'Vessel detail',
    'vessels.detail.profile':      'Profile',
    'vessels.detail.emissions':    '24 h Emission Trend',
    'vessels.detail.alerts':       'Active Alerts',
    'vessels.detail.no_alerts':    'No open alerts for this vessel.',
    'vessels.detail.field.eta':    'ETA',
    'vessels.detail.field.speed':  'Speed',
    'vessels.detail.field.coords': 'Position',
    'vessels.detail.field.dispersion': 'Dispersion risk',
    'vessels.detail.field.fuel':   'Fuel',
    'vessels.detail.field.imo':    'IMO',
    'vessels.detail.field.id':     'Identifier',
    'vessels.detail.field.created':'Created',
    'vessels.detail.manual_tag':   'Manual record',
    'vessels.detail.live_tag':     'AIS live',
    'vessels.detail.close':        'Close detail',
    'vessels.add.title':           'Add Vessel',
    'vessels.add.subtitle':        'Manual records appear alongside AIS feed',
    'vessels.edit.title':          'Edit Vessel',
    'vessels.edit.subtitle':       'Only manual records can be edited',
    'vessels.field.name':          'Vessel name',
    'vessels.field.imo':           'IMO',
    'vessels.field.imo.hint':      'e.g. IMO-9456321',
    'vessels.field.type':          'Type',
    'vessels.field.fuel':          'Fuel',
    'vessels.field.status':        'Status',
    'vessels.field.speed':         'Speed (kn)',
    'vessels.field.eta':           'ETA',
    'vessels.field.dispersion':    'Dispersion risk',
    'vessels.field.emissions_co2': 'CO₂ (kg/h)',
    'vessels.field.emissions_nox': 'NOₓ (kg/h)',
    'vessels.field.emissions_sox': 'SOₓ (kg/h)',
    'vessels.field.lat':           'Latitude',
    'vessels.field.lon':           'Longitude',
    'vessels.action.detail':       'Detail',
    'vessels.action.edit':         'Edit',
    'vessels.action.delete':       'Delete',
    'vessels.empty.title':         'No vessels match',
    'vessels.empty.body':          'Try adjusting filters or the search term.',
    'vessels.delete.title':        'Delete vessel',
    'vessels.delete.body':         '{name} will be permanently removed. Continue?',
    'vessels.unit.knots':          'kn',
    'vessels.unit.vessels':        'vessels',
    'vessels.severity.success':    'Compliant',
    'vessels.severity.info':       'Watch',
    'vessels.severity.warning':    'Warning',
    'vessels.severity.critical':   'Critical',
    'vessels.alerts.badge':        '{n} alerts',
    'vessels.alerts.singular':     '1 alert',
    'vessels.recent_added':        'Recently added',
  },
});

/* ============================================================
 * Reference data — option lists
 * ============================================================ */
const TYPE_IDS     = ['container', 'tanker', 'bulk', 'roro', 'lng'];
const STATUS_IDS   = ['approaching', 'docked', 'loading', 'departing', 'anchored'];
const FUEL_IDS     = ['HFO', 'MGO', 'VLSFO', 'LNG', 'Methanol'];
const SEVERITY_IDS = ['critical', 'warning', 'info', 'success'];
const DISPERSION_IDS = ['low', 'medium', 'high'];
const CLEAN_FUELS  = new Set(['LNG', 'Methanol']);
const STATUS_TONE  = {
  approaching: 'info',
  docked:      'success',
  loading:     'success',
  departing:   'info',
  anchored:    'warning',
};

const CO2_THRESHOLD = 70;
const NOX_THRESHOLD = 220;
const SOX_THRESHOLD = 90;

/* ============================================================
 * Module-scoped CSS
 * ============================================================ */
const STYLES = `
.pg-vessels { display: grid; gap: var(--sp-5); grid-auto-rows: min-content; }
.pg-vessels .pg-vessels-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); }
.pg-vessels .pg-vessels-search { min-width: 220px; }
.pg-vessels-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--sp-4); }
.pg-vessels-kpis .stat-card { min-height: 96px; }
.pg-vessels-kpis .stat-card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: var(--sp-2); font-size: var(--fs-2xs); color: var(--text-tertiary); }
.pg-vessels-kpis .stat-card-spark { width: 56px; height: 14px; background: linear-gradient(90deg, var(--brand-primary-soft), transparent); border-radius: 2px; }
@media (max-width: 1180px) { .pg-vessels-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px)  { .pg-vessels-kpis { grid-template-columns: repeat(2, 1fr); } }
.pg-vessels-charts { gap: var(--sp-4); }
.pg-vessels-charts .panel { padding: var(--sp-4); }
.pg-vessels-charts .panel-head { margin-bottom: var(--sp-3); }
.pg-vessels-charts .panel-title { font-size: var(--fs-md); }
.pg-vessels-list .panel-actions { font-size: var(--fs-xs); color: var(--text-tertiary); }
.pg-vessels-list .data-table th { cursor: pointer; user-select: none; }
.pg-vessels-list .data-table th[data-sortable] { white-space: nowrap; }
.pg-vessels-list .data-table th[data-sortable]:hover { color: var(--text-primary); }
.pg-vessels-list .data-table th[data-active] { color: var(--brand-primary); }
.pg-vessels-list .data-table th[data-active]::after { content: attr(data-arrow); margin-left: 4px; font-family: var(--font-mono); color: var(--brand-primary); }
.pg-vessels-list .data-table tbody tr { cursor: pointer; }
.pg-vessels-list .data-table tbody tr.is-selected { background: var(--brand-primary-soft); }
.pg-vessels-list .data-table tbody tr.is-manual td:first-child { box-shadow: inset 3px 0 0 var(--brand-primary-bright); }
.pg-vessels-list .data-table tbody tr.is-manual .vessel-id::after { content: " · M"; color: var(--brand-primary); font-weight: var(--fw-semibold); }
.pg-vessels-list .emit-stack { display: flex; flex-direction: column; gap: 3px; min-width: 120px; }
.pg-vessels-list .emit-row { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-2xs); color: var(--text-tertiary); }
.pg-vessels-list .emit-row .label { width: 22px; font-family: var(--font-mono); color: var(--text-tertiary); }
.pg-vessels-list .emit-row .bar-mini { width: 56px; }
.pg-vessels-list .emit-row .val { font-family: var(--font-mono); color: var(--text-secondary); margin-left: auto; font-variant-numeric: tabular-nums; }
.pg-vessels-list .alert-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--r-pill); font-size: var(--fs-2xs); font-weight: var(--fw-semibold); background: var(--bg-3); color: var(--text-tertiary); border: 1px solid var(--border-subtle); }
.pg-vessels-list .alert-pill[data-active="true"] { background: var(--status-warning-soft); color: var(--status-warning); border-color: rgba(186, 117, 23, 0.32); }
.pg-vessels-list .row-actions { display: inline-flex; gap: 4px; flex-wrap: nowrap; }
.pg-vessels-list .row-actions .btn--sm { padding: 4px 8px; font-size: var(--fs-2xs); }
.pg-vessels-list .relative-eta { font-size: var(--fs-2xs); color: var(--text-tertiary); display: block; }
.pg-vessels-detail { background: var(--bento-bg); border: 1px solid var(--border-soft); border-radius: var(--r-lg); padding: var(--sp-5); display: grid; gap: var(--sp-4); position: relative; }
.pg-vessels-detail::before { content: ""; position: absolute; inset: 0; background: var(--bento-overlay); pointer-events: none; border-radius: inherit; }
.pg-vessels-detail > * { position: relative; }
.pg-vessels-detail-head { display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: flex-start; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: var(--sp-3); }
.pg-vessels-detail-head h3 { font-size: var(--fs-xl); color: var(--text-primary); font-weight: var(--fw-semibold); letter-spacing: -0.01em; }
.pg-vessels-detail-head .pg-vessels-detail-id { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--text-tertiary); letter-spacing: 0.06em; }
.pg-vessels-detail-tags { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-2); }
.pg-vessels-detail-actions { display: inline-flex; gap: var(--sp-2); flex-wrap: wrap; }
.pg-vessels-detail-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--sp-4); }
@media (max-width: 1180px) { .pg-vessels-detail-grid { grid-template-columns: 1fr; } }
.pg-vessels-detail-section { background: var(--bg-2); border: 1px solid var(--border-subtle); border-radius: var(--r-md); padding: var(--sp-4); }
.pg-vessels-detail-section h4 { font-size: var(--fs-2xs); text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-tertiary); margin-bottom: var(--sp-3); font-weight: var(--fw-semibold); }
.pg-vessels-profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-3); }
.pg-vessels-profile-row { display: flex; flex-direction: column; gap: 2px; padding: var(--sp-2) var(--sp-3); background: var(--bg-1); border: 1px solid var(--border-subtle); border-radius: var(--r-sm); }
.pg-vessels-profile-row .label { font-size: var(--fs-2xs); text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-tertiary); }
.pg-vessels-profile-row .value { font-family: var(--font-mono); font-size: var(--fs-md); color: var(--text-primary); font-variant-numeric: tabular-nums; }
.pg-vessels-detail-alerts { display: flex; flex-direction: column; gap: var(--sp-2); max-height: 280px; overflow-y: auto; }
.pg-vessels-alert-item { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-3); padding: var(--sp-3); background: var(--bg-1); border: 1px solid var(--border-subtle); border-radius: var(--r-sm); border-left: 3px solid var(--border-soft); }
.pg-vessels-alert-item[data-severity="critical"] { border-left-color: var(--status-critical); }
.pg-vessels-alert-item[data-severity="warning"]  { border-left-color: var(--status-warning); }
.pg-vessels-alert-item[data-severity="info"]     { border-left-color: var(--brand-primary); }
.pg-vessels-alert-item[data-severity="success"]  { border-left-color: var(--status-success); }
.pg-vessels-alert-item .icon { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--bg-3); }
.pg-vessels-alert-item[data-severity="critical"] .icon { background: var(--status-critical-soft); color: var(--status-critical); }
.pg-vessels-alert-item[data-severity="warning"]  .icon { background: var(--status-warning-soft); color: var(--status-warning); }
.pg-vessels-alert-item[data-severity="info"]     .icon { background: var(--brand-primary-soft); color: var(--brand-primary); }
.pg-vessels-alert-item .body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pg-vessels-alert-item .alert-title { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-primary); }
.pg-vessels-alert-item .alert-desc { font-size: var(--fs-xs); color: var(--text-tertiary); line-height: 1.45; }
.pg-vessels-alert-item .alert-recs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.pg-vessels-alert-item .alert-rec { font-size: var(--fs-2xs); padding: 1px 8px; border-radius: var(--r-pill); background: var(--bg-3); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
.pg-vessels-detail-empty { display: grid; place-items: center; padding: var(--sp-6); font-size: var(--fs-sm); color: var(--text-tertiary); border: 1px dashed var(--border-subtle); border-radius: var(--r-sm); }
.pg-vessels-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: var(--r-pill); font-size: var(--fs-2xs); font-weight: var(--fw-semibold); letter-spacing: 0.04em; background: var(--bg-3); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
.pg-vessels-tag[data-tone="brand"] { background: var(--brand-primary-soft); color: var(--brand-primary); border-color: rgba(0, 157, 196, 0.28); }
`;

/* ============================================================
 * Helpers
 * ============================================================ */
function injectStyles() {
  if (document.querySelector('style[data-page="vessels"]')) return;
  const el = document.createElement('style');
  el.setAttribute('data-page', 'vessels');
  el.textContent = STYLES;
  document.head.appendChild(el);
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function severityForCO2(co2) {
  const r = co2 / CO2_THRESHOLD;
  if (r >= 1.0)  return 'critical';
  if (r >= 0.85) return 'warning';
  if (r >= 0.55) return 'info';
  return 'success';
}

function severityForEmission(value, threshold) {
  const r = value / threshold;
  if (r >= 1.0)  return 'critical';
  if (r >= 0.85) return 'warning';
  if (r >= 0.55) return 'info';
  return 'success';
}

function deriveVesselDefaults(v) {
  const fuel = v.fuel || 'HFO';
  const co2  = v.emissions?.co2 ?? 32;
  const nox  = v.emissions?.nox ?? 110;
  const sox  = v.emissions?.sox ?? 28;
  const status = v.status || 'approaching';
  return {
    ...v,
    fuel,
    fuel_clean:  CLEAN_FUELS.has(fuel),
    status,
    status_tone: STATUS_TONE[status] || 'info',
    severity:    severityForCO2(co2),
    emissions: { co2: +co2, nox: +nox, sox: +sox },
    eta_ts: v.eta_ts ?? Date.now() + 2 * 3600_000,
    speed_kn: v.speed_kn ?? 0,
    lat: v.lat ?? 38.45,
    lon: v.lon ?? 27.10,
    dispersion_risk: v.dispersion_risk || 'low',
  };
}

function getMergedVessels() {
  const live   = store.get('vessels')        || [];
  const manual = store.get('manual_vessels') || [];
  return [...manual.map((v) => ({ ...v, _manual: true })), ...live];
}

function alertCountFor(vesselId, alerts) {
  return alerts.filter((a) => !a.resolved && !a.dismissed && a.target?.kind === 'vessel' && a.target.vessel_id === vesselId).length;
}

function bucketSpeed(kn) {
  if (kn < 5)  return 0;
  if (kn < 10) return 1;
  if (kn < 15) return 2;
  return 3;
}

/* Synthesize 24h history from current emissions for the detail trend chart. */
function synthEmissionHistory(v, points = 24) {
  const out = { co2: [], nox: [], sox: [] };
  const seed = (v.id || 'x').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const noise = (i, base, amp) => {
    const r = Math.sin((seed + i) * 0.71) * 0.5 + Math.cos((seed + i * 1.3) * 0.41) * 0.3;
    return Math.max(0, base * (1 + r * amp));
  };
  for (let i = 0; i < points; i++) {
    out.co2.push(+noise(i, v.emissions.co2, 0.22).toFixed(1));
    out.nox.push(+noise(i + 7,  v.emissions.nox, 0.18).toFixed(1));
    out.sox.push(+noise(i + 13, v.emissions.sox, 0.20).toFixed(1));
  }
  return out;
}

function severityToneClass(sev) {
  if (sev === 'critical') return 'critical';
  if (sev === 'warning')  return 'warning';
  if (sev === 'success')  return 'success';
  return 'info';
}

function ymdhmLocalInput(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============================================================
 * Mount
 * ============================================================ */
export function mount(rootEl, params = {}) {
  injectStyles();

  /* ---------- Page-local state ---------- */
  const pageState = {
    filters: {
      type:     new Set(['all']),
      status:   new Set(['all']),
      fuel:     new Set(['all']),
      severity: new Set(['all']),
    },
    search: '',
    sortKey: 'severity',
    sortDir: 'desc',
    selectedId: params.vessel || null,
  };

  /* ---------- Chart instance registry ---------- */
  const charts = {
    typeDist: null,
    fuelMix:  null,
    severity: null,
    speedHist:null,
    detail:   null,
  };

  /* ---------- DOM scaffold ---------- */
  rootEl.innerHTML = `
    <div class="page pg-vessels">
      <header class="page-header">
        <div class="page-header-title">
          <h1>${escapeHTML(t('page.vessels.title'))}</h1>
          <p>${escapeHTML(t('page.vessels.subtitle'))}</p>
        </div>
        <div class="page-header-actions pg-vessels-toolbar">
          <label class="search-box pg-vessels-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="pg-vessels-search-input" type="text" placeholder="${escapeHTML(t('vessels.search.placeholder'))}" />
          </label>
          <button class="btn btn--ghost" id="pg-vessels-clear-filters">${escapeHTML(t('vessels.filter.clear'))}</button>
          <button class="btn btn--primary" id="pg-vessels-add-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            ${escapeHTML(t('common.add_new'))}
          </button>
        </div>
      </header>

      <section class="pg-vessels-kpis" id="pg-vessels-kpis"></section>

      <section class="filter-rail" id="pg-vessels-filters" role="toolbar" aria-label="Vessel filters"></section>

      <section class="page-grid-4 pg-vessels-charts">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">${escapeHTML(t('vessels.chart.type_dist'))}</div>
          </div>
          <div class="chart-frame" data-h="md"><canvas id="pg-vessels-chart-type"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">${escapeHTML(t('vessels.chart.fuel_mix'))}</div>
          </div>
          <div class="chart-frame" data-h="md"><canvas id="pg-vessels-chart-fuel"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">${escapeHTML(t('vessels.chart.severity'))}</div>
          </div>
          <div class="chart-frame" data-h="md"><canvas id="pg-vessels-chart-severity"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">${escapeHTML(t('vessels.chart.speed_hist'))}</div>
          </div>
          <div class="chart-frame" data-h="md"><canvas id="pg-vessels-chart-speed"></canvas></div>
        </div>
      </section>

      <section class="panel pg-vessels-list">
        <div class="panel-head">
          <div class="panel-title">
            ${escapeHTML(t('vessels.list.title'))}
            <small id="pg-vessels-list-subtitle"></small>
          </div>
          <div class="panel-actions" id="pg-vessels-list-meta"></div>
        </div>
        <div class="table-wrap scroll-styled">
          <table class="data-table">
            <thead><tr id="pg-vessels-thead"></tr></thead>
            <tbody id="pg-vessels-tbody"></tbody>
          </table>
        </div>
      </section>

      <section id="pg-vessels-detail-mount"></section>
    </div>
  `;

  /* ---------- Wire toolbar ---------- */
  const searchInput = rootEl.querySelector('#pg-vessels-search-input');
  searchInput.addEventListener('input', () => {
    pageState.search = searchInput.value.trim().toLowerCase();
    renderListAndCharts();
  });
  rootEl.querySelector('#pg-vessels-clear-filters').addEventListener('click', () => {
    for (const k of Object.keys(pageState.filters)) {
      pageState.filters[k] = new Set(['all']);
    }
    pageState.search = '';
    searchInput.value = '';
    renderFilters();
    renderListAndCharts();
  });
  rootEl.querySelector('#pg-vessels-add-btn').addEventListener('click', () => openVesselForm(null));

  /* ============================================================
   * Filter rail
   * ============================================================ */
  function renderFilters() {
    const host = rootEl.querySelector('#pg-vessels-filters');
    const groups = [
      { key: 'type',     label: t('vessels.filter.type'),     ids: TYPE_IDS,     prefix: 'type.' },
      { key: 'status',   label: t('vessels.filter.status'),   ids: STATUS_IDS,   prefix: 'status.' },
      { key: 'fuel',     label: t('vessels.filter.fuel'),     ids: FUEL_IDS,     prefix: null },
      { key: 'severity', label: t('vessels.filter.severity'), ids: SEVERITY_IDS, prefix: 'vessels.severity.' },
    ];

    host.innerHTML = groups.map((g) => {
      const set = pageState.filters[g.key];
      const all = set.has('all');
      const chips = [
        `<button class="chip ${all ? 'is-active' : ''}" data-group="${g.key}" data-value="all">${escapeHTML(t('vessels.filter.all'))}</button>`,
        ...g.ids.map((id) => {
          const label = g.prefix ? t(g.prefix + id) : id;
          const on = !all && set.has(id);
          return `<button class="chip ${on ? 'is-active' : ''}" data-group="${g.key}" data-value="${escapeHTML(id)}">${escapeHTML(label)}</button>`;
        }),
      ].join('');
      return `
        <div class="filter-rail-group">
          <span class="filter-rail-label">${escapeHTML(g.label)}</span>
          ${chips}
        </div>
      `;
    }).join('');

    host.querySelectorAll('.chip[data-group]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const group = chip.dataset.group;
        const value = chip.dataset.value;
        const set = pageState.filters[group];
        if (value === 'all') {
          pageState.filters[group] = new Set(['all']);
        } else {
          set.delete('all');
          if (set.has(value)) set.delete(value);
          else set.add(value);
          if (set.size === 0) set.add('all');
        }
        renderFilters();
        renderListAndCharts();
      });
    });
  }

  function passesFilters(v) {
    const f = pageState.filters;
    const matchSet = (set, key) => set.has('all') || set.has(v[key]);
    if (!matchSet(f.type, 'type'))     return false;
    if (!matchSet(f.status, 'status')) return false;
    if (!matchSet(f.fuel, 'fuel'))     return false;
    if (!matchSet(f.severity, 'severity')) return false;
    if (pageState.search) {
      const hay = (v.name + ' ' + v.id).toLowerCase();
      if (!hay.includes(pageState.search)) return false;
    }
    return true;
  }

  /* ============================================================
   * KPI strip
   * ============================================================ */
  function renderKpis() {
    const all     = getMergedVessels();
    const live    = store.get('vessels') || [];
    const manual  = store.get('manual_vessels') || [];
    const host    = rootEl.querySelector('#pg-vessels-kpis');

    const docked     = all.filter((v) => v.status === 'docked' || v.status === 'loading').length;
    const approaching= all.filter((v) => {
      const dt = v.eta_ts - Date.now();
      return dt > 0 && dt < 12 * 3600_000;
    }).length;
    const imminent   = all.filter((v) => {
      const dt = v.eta_ts - Date.now();
      return dt > 0 && dt < 1 * 3600_000;
    }).length;
    const compliant  = all.filter((v) => v.severity === 'success' || v.severity === 'info').length;
    const compRate   = all.length ? compliant / all.length : 0;
    const speeds     = all.map((v) => v.speed_kn || 0);
    const avgSpeed   = speeds.length ? (speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;
    const maxSpeed   = speeds.length ? Math.max(...speeds) : 0;
    const todayCount = manual.filter((v) => {
      const created = v._created_at || 0;
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      return created >= +startToday;
    }).length;

    const compTone = compRate >= 0.8 ? 'success' : compRate >= 0.6 ? 'warning' : 'critical';
    const speedDirection = avgSpeed > 8 ? 'up' : avgSpeed < 4 ? 'down' : 'flat';

    const cards = [
      {
        label: t('vessels.kpi.total'),
        value: fmt.num(all.length),
        unit:  t('vessels.unit.vessels'),
        sub:   t('vessels.kpi.total.sub', { live: live.length, manual: manual.length }),
        delta: todayCount > 0 ? `+${todayCount} ${t('vessels.kpi.delta_today', { n: todayCount }).split(' ').slice(1).join(' ')}` : '',
        deltaDirection: 'up',
      },
      {
        label: t('vessels.kpi.docked'),
        value: fmt.num(docked),
        unit:  t('vessels.unit.vessels'),
        sub:   t('vessels.kpi.docked.sub', { n: docked }),
        tone:  'success',
      },
      {
        label: t('vessels.kpi.approaching'),
        value: fmt.num(approaching),
        unit:  '<12h',
        sub:   t('vessels.kpi.approaching.sub', { imminent }),
        tone:  imminent > 0 ? 'warning' : 'brand',
      },
      {
        label: t('vessels.kpi.compliance'),
        value: fmt.pct(compRate, 0),
        unit:  '',
        sub:   t('vessels.kpi.compliance.sub', { ok: compliant, total: all.length }),
        tone:  compTone,
      },
      {
        label: t('vessels.kpi.avg_speed'),
        value: fmt.num(avgSpeed, { maximumFractionDigits: 1 }),
        unit:  t('vessels.unit.knots'),
        sub:   t('vessels.kpi.avg_speed.sub', { max: maxSpeed.toFixed(1) }),
        delta: avgSpeed.toFixed(1),
        deltaDirection: speedDirection,
      },
    ];

    host.innerHTML = cards.map((c) => `
      <div class="stat-card">
        <div class="stat-card-label">${escapeHTML(c.label)}</div>
        <div style="display:flex;align-items:baseline;gap:6px;">
          <span class="stat-card-value" ${c.tone ? `data-tone="${c.tone}"` : ''}>${c.value}</span>
          ${c.unit ? `<span class="stat-card-meta">${escapeHTML(c.unit)}</span>` : ''}
        </div>
        <div class="stat-card-foot">
          <span class="stat-card-meta">${escapeHTML(c.sub)}</span>
          ${c.delta ? `<span class="stat-card-trend" data-direction="${c.deltaDirection || 'flat'}">${escapeHTML(c.delta)}</span>` : '<span class="stat-card-spark" aria-hidden="true"></span>'}
        </div>
      </div>
    `).join('');
  }

  /* ============================================================
   * Charts
   * ============================================================ */
  function destroyCharts() {
    for (const k of Object.keys(charts)) {
      if (charts[k]) { try { charts[k].destroy(); } catch (_) {} charts[k] = null; }
    }
  }

  function renderCharts(filtered) {
    if (!window.Chart) return;
    const palette = themePalette();

    /* Always destroy existing instances first to avoid leaks. */
    if (charts.typeDist)  { charts.typeDist.destroy();  charts.typeDist  = null; }
    if (charts.fuelMix)   { charts.fuelMix.destroy();   charts.fuelMix   = null; }
    if (charts.severity)  { charts.severity.destroy();  charts.severity  = null; }
    if (charts.speedHist) { charts.speedHist.destroy(); charts.speedHist = null; }

    /* ---- Type distribution doughnut ---- */
    const typeCounts = TYPE_IDS.map((id) => ({
      label: t('type.' + id),
      value: filtered.filter((v) => v.type === id).length,
      color: palette.series[TYPE_IDS.indexOf(id) % palette.series.length],
    })).filter((d) => d.value > 0);
    const typeCanvas = rootEl.querySelector('#pg-vessels-chart-type');
    if (typeCanvas && typeCounts.length) {
      charts.typeDist = doughnutChart(typeCanvas, typeCounts, {
        cutout: '60%',
        options: {
          plugins: {
            legend: { position: 'bottom', labels: { color: palette.textMuted, boxWidth: 8, boxHeight: 8, padding: 10, font: { size: 10 } } },
          },
        },
      });
    }

    /* ---- Fuel mix stacked bar ---- */
    const fuelCanvas = rootEl.querySelector('#pg-vessels-chart-fuel');
    if (fuelCanvas) {
      const cleanCounts = FUEL_IDS.map((f) => filtered.filter((v) => v.fuel === f && CLEAN_FUELS.has(f)).length);
      const dirtyCounts = FUEL_IDS.map((f) => filtered.filter((v) => v.fuel === f && !CLEAN_FUELS.has(f)).length);
      charts.fuelMix = barChart(fuelCanvas, [
        { label: t('vessels.chart.fuel.dirty'), data: dirtyCounts, color: palette.warning, stack: 'fuels' },
        { label: t('vessels.chart.fuel.clean'), data: cleanCounts, color: palette.success, stack: 'fuels' },
      ], {
        labels: FUEL_IDS,
        stacked: true,
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: palette.textMuted, boxWidth: 8, boxHeight: 8, padding: 10, font: { size: 10 } } } },
          scales: {
            x: { stacked: true, ticks: { color: palette.textSubtle, font: { size: 10 } }, grid: { color: palette.grid } },
            y: { stacked: true, beginAtZero: true, ticks: { color: palette.textSubtle, font: { size: 10 }, precision: 0 }, grid: { color: palette.grid } },
          },
        },
      });
    }

    /* ---- Severity bar ---- */
    const sevCanvas = rootEl.querySelector('#pg-vessels-chart-severity');
    if (sevCanvas) {
      const labels = SEVERITY_IDS.map((id) => t('vessels.severity.' + id));
      const sevCounts = SEVERITY_IDS.map((id) => filtered.filter((v) => v.severity === id).length);
      const sevColors = SEVERITY_IDS.map((id) => toneColor(id));
      charts.severity = barChart(sevCanvas, [
        { label: t('vessels.col.severity'), data: sevCounts, color: palette.brand },
      ], {
        labels,
        options: {
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.y}` } },
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: palette.textSubtle, font: { size: 10 }, precision: 0 }, grid: { color: palette.grid } },
            x: { ticks: { color: palette.textSubtle, font: { size: 10 } }, grid: { color: palette.grid } },
          },
        },
      });
      /* Per-bar coloring — Chart.js accepts an array on backgroundColor. */
      if (charts.severity) {
        charts.severity.data.datasets[0].backgroundColor = sevColors.map((c) => hexAlpha(c, 0.85));
        charts.severity.data.datasets[0].borderColor     = sevColors;
        charts.severity.update('none');
      }
    }

    /* ---- Speed histogram ---- */
    const speedCanvas = rootEl.querySelector('#pg-vessels-chart-speed');
    if (speedCanvas) {
      const buckets = [0, 0, 0, 0];
      filtered.forEach((v) => { buckets[bucketSpeed(v.speed_kn || 0)]++; });
      charts.speedHist = barChart(speedCanvas, [
        { label: t('vessels.chart.speed_axis'), data: buckets, color: palette.brand },
      ], {
        labels: [
          t('vessels.chart.bucket.0'),
          t('vessels.chart.bucket.1'),
          t('vessels.chart.bucket.2'),
          t('vessels.chart.bucket.3'),
        ],
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: palette.textSubtle, font: { size: 10 }, precision: 0 }, grid: { color: palette.grid } },
            x: { ticks: { color: palette.textSubtle, font: { size: 10 } }, grid: { color: palette.grid } },
          },
        },
      });
    }
  }

  /* ============================================================
   * Table
   * ============================================================ */
  function renderTableHead() {
    const head = rootEl.querySelector('#pg-vessels-thead');
    const cols = [
      { key: 'name',     label: t('vessels.col.vessel'),     sortable: true },
      { key: 'type',     label: t('vessels.col.type_fuel'),  sortable: true },
      { key: 'status',   label: t('vessels.col.status'),     sortable: true },
      { key: 'eta',      label: t('vessels.col.eta'),        sortable: true },
      { key: 'speed',    label: t('vessels.col.speed'),      sortable: true },
      { key: 'co2',      label: t('vessels.col.emissions'),  sortable: true },
      { key: 'severity', label: t('vessels.col.severity'),   sortable: true },
      { key: 'alerts',   label: t('vessels.col.alerts'),     sortable: false },
      { key: 'actions',  label: t('vessels.col.actions'),    sortable: false },
    ];
    head.innerHTML = cols.map((c) => {
      const isActive = pageState.sortKey === c.key;
      const arrow = pageState.sortDir === 'asc' ? '↑' : '↓';
      return `<th scope="col"
        ${c.sortable ? `data-sortable="true" data-key="${c.key}"` : ''}
        ${isActive && c.sortable ? `data-active="true" data-arrow="${arrow}"` : ''}
      >${escapeHTML(c.label)}</th>`;
    }).join('');

    head.querySelectorAll('th[data-sortable]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (pageState.sortKey === key) {
          pageState.sortDir = pageState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          pageState.sortKey = key;
          pageState.sortDir = key === 'name' ? 'asc' : 'desc';
        }
        renderTableHead();
        renderListBody();
      });
    });
  }

  function compareVessels(a, b) {
    const dir = pageState.sortDir === 'asc' ? 1 : -1;
    const k = pageState.sortKey;
    const sevOrder = { critical: 4, warning: 3, info: 2, success: 1 };
    let av, bv;
    switch (k) {
      case 'name':     av = a.name?.toLowerCase() || ''; bv = b.name?.toLowerCase() || ''; break;
      case 'type':     av = a.type || ''; bv = b.type || ''; break;
      case 'status':   av = a.status || ''; bv = b.status || ''; break;
      case 'eta':      av = a.eta_ts || 0; bv = b.eta_ts || 0; break;
      case 'speed':    av = a.speed_kn || 0; bv = b.speed_kn || 0; break;
      case 'co2':      av = a.emissions?.co2 || 0; bv = b.emissions?.co2 || 0; break;
      case 'severity': av = sevOrder[a.severity] || 0; bv = sevOrder[b.severity] || 0; break;
      default:         return 0;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return  1 * dir;
    return 0;
  }

  function renderListBody() {
    const tbody = rootEl.querySelector('#pg-vessels-tbody');
    const meta  = rootEl.querySelector('#pg-vessels-list-meta');
    const subt  = rootEl.querySelector('#pg-vessels-list-subtitle');
    if (!tbody) return;

    const all = getMergedVessels();
    const alerts = store.get('alerts') || [];
    const filtered = all.filter(passesFilters).slice().sort(compareVessels);

    subt.textContent = '— ' + t('vessels.list.subtitle', { count: filtered.length });
    meta.textContent = `${filtered.length} / ${all.length}`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="9" style="padding:0;border-bottom:none">
          <div class="empty-state" style="margin: var(--sp-3) 0;">
            <div class="empty-state-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <div class="empty-state-title">${escapeHTML(t('vessels.empty.title'))}</div>
            <div class="empty-state-body">${escapeHTML(t('vessels.empty.body'))}</div>
          </div>
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((v) => rowTemplate(v, alerts)).join('');

    /* Row click -> detail */
    tbody.querySelectorAll('tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;  /* let action buttons do their thing */
        pageState.selectedId = tr.dataset.id;
        tbody.querySelectorAll('tr.is-selected').forEach((r) => r.classList.remove('is-selected'));
        tr.classList.add('is-selected');
        renderDetail();
      });
    });

    /* Action buttons */
    tbody.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'detail') {
          pageState.selectedId = id;
          renderDetail();
          tbody.querySelectorAll('tr.is-selected').forEach((r) => r.classList.remove('is-selected'));
          tbody.querySelector(`tr[data-id="${id}"]`)?.classList.add('is-selected');
          rootEl.querySelector('#pg-vessels-detail-mount')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (action === 'edit') {
          const v = getMergedVessels().find((x) => x.id === id);
          if (v) openVesselForm(v);
        } else if (action === 'delete') {
          const v = getMergedVessels().find((x) => x.id === id);
          if (v) handleDelete(v);
        }
      });
    });
  }

  function rowTemplate(v, alerts) {
    const co2Sev = severityForEmission(v.emissions.co2, CO2_THRESHOLD);
    const noxSev = severityForEmission(v.emissions.nox, NOX_THRESHOLD);
    const soxSev = severityForEmission(v.emissions.sox, SOX_THRESHOLD);
    const co2Pct = Math.min(100, (v.emissions.co2 / CO2_THRESHOLD) * 100);
    const noxPct = Math.min(100, (v.emissions.nox / NOX_THRESHOLD) * 100);
    const soxPct = Math.min(100, (v.emissions.sox / SOX_THRESHOLD) * 100);
    const alertCount = alertCountFor(v.id, alerts);
    const isSelected = pageState.selectedId === v.id;
    const isManual = !!v._manual;

    const etaAbs = fmt.dateTime(v.eta_ts);
    const etaRel = fmt.relativeTime(v.eta_ts);

    const actions = [
      `<button class="btn btn--ghost btn--sm" data-action="detail" data-id="${escapeHTML(v.id)}" title="${escapeHTML(t('vessels.action.detail'))}">${escapeHTML(t('vessels.action.detail'))}</button>`,
    ];
    if (isManual) {
      actions.push(`<button class="btn btn--outline btn--sm" data-action="edit" data-id="${escapeHTML(v.id)}" title="${escapeHTML(t('vessels.action.edit'))}">${escapeHTML(t('vessels.action.edit'))}</button>`);
      actions.push(`<button class="btn btn--danger btn--sm" data-action="delete" data-id="${escapeHTML(v.id)}" title="${escapeHTML(t('vessels.action.delete'))}">${escapeHTML(t('vessels.action.delete'))}</button>`);
    }

    return `
      <tr data-severity="${v.severity}" data-id="${escapeHTML(v.id)}" class="${isSelected ? 'is-selected' : ''} ${isManual ? 'is-manual' : ''}">
        <td>
          <div class="vessel-cell">
            <div>
              <div class="vessel-name">${escapeHTML(v.name)}</div>
              <div class="vessel-id mono">${escapeHTML(v.id)}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:4px">
            <span class="muted" style="font-size:var(--fs-sm)">${escapeHTML(t('type.' + v.type))}</span>
            <span class="fuel-pill" data-clean="${v.fuel_clean}">${escapeHTML(v.fuel)}</span>
          </div>
        </td>
        <td><span class="badge" data-tone="${v.status_tone}">${escapeHTML(t('status.' + v.status))}</span></td>
        <td>
          <div style="display:flex;flex-direction:column;gap:1px">
            <span class="mono" style="font-size:var(--fs-sm)">${escapeHTML(etaAbs)}</span>
            <span class="relative-eta">${escapeHTML(etaRel)}</span>
          </div>
        </td>
        <td><span class="mono">${fmt.num(v.speed_kn || 0, { maximumFractionDigits: 1 })} <small class="muted">${escapeHTML(t('vessels.unit.knots'))}</small></span></td>
        <td>
          <div class="emit-stack">
            <div class="emit-row">
              <span class="label">CO₂</span>
              <div class="bar-mini" data-tone="${co2Sev}" title="${v.emissions.co2.toFixed(1)} / ${CO2_THRESHOLD}"><div class="bar-mini-fill" style="width:${co2Pct.toFixed(0)}%"></div></div>
              <span class="val">${v.emissions.co2.toFixed(0)}</span>
            </div>
            <div class="emit-row">
              <span class="label">NOₓ</span>
              <div class="bar-mini" data-tone="${noxSev}" title="${v.emissions.nox.toFixed(1)} / ${NOX_THRESHOLD}"><div class="bar-mini-fill" style="width:${noxPct.toFixed(0)}%"></div></div>
              <span class="val">${v.emissions.nox.toFixed(0)}</span>
            </div>
            <div class="emit-row">
              <span class="label">SOₓ</span>
              <div class="bar-mini" data-tone="${soxSev}" title="${v.emissions.sox.toFixed(1)} / ${SOX_THRESHOLD}"><div class="bar-mini-fill" style="width:${soxPct.toFixed(0)}%"></div></div>
              <span class="val">${v.emissions.sox.toFixed(0)}</span>
            </div>
          </div>
        </td>
        <td><span class="badge" data-tone="${severityToneClass(v.severity)}">${escapeHTML(t('vessels.severity.' + v.severity))}</span></td>
        <td>
          <span class="alert-pill" data-active="${alertCount > 0}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            ${alertCount}
          </span>
        </td>
        <td><div class="row-actions">${actions.join('')}</div></td>
      </tr>
    `;
  }

  /* ============================================================
   * Detail panel
   * ============================================================ */
  function renderDetail() {
    const host = rootEl.querySelector('#pg-vessels-detail-mount');
    if (!host) return;

    /* Destroy any prior detail chart so we don't leak. */
    if (charts.detail) { try { charts.detail.destroy(); } catch (_) {} charts.detail = null; }

    if (!pageState.selectedId) {
      host.innerHTML = `
        <div class="pg-vessels-detail-empty">
          <div>
            <strong style="display:block;color:var(--text-secondary);font-size:var(--fs-md);margin-bottom:4px">${escapeHTML(t('vessels.detail.title'))}</strong>
            <span>${escapeHTML(t('common.empty.body'))}</span>
          </div>
        </div>
      `;
      return;
    }

    const all = getMergedVessels();
    const v = all.find((x) => x.id === pageState.selectedId);
    if (!v) {
      pageState.selectedId = null;
      host.innerHTML = '';
      return;
    }

    const alerts = (store.get('alerts') || [])
      .filter((a) => !a.resolved && !a.dismissed && a.target?.kind === 'vessel' && a.target.vessel_id === v.id);

    const isManual = !!v._manual;

    host.innerHTML = `
      <div class="pg-vessels-detail">
        <div class="pg-vessels-detail-head">
          <div>
            <h3>${escapeHTML(v.name)}</h3>
            <span class="pg-vessels-detail-id">${escapeHTML(v.id)}</span>
            <div class="pg-vessels-detail-tags">
              <span class="pg-vessels-tag">${escapeHTML(t('type.' + v.type))}</span>
              <span class="fuel-pill" data-clean="${v.fuel_clean}">${escapeHTML(v.fuel)}</span>
              <span class="badge" data-tone="${v.status_tone}">${escapeHTML(t('status.' + v.status))}</span>
              <span class="badge" data-tone="${severityToneClass(v.severity)}">${escapeHTML(t('vessels.severity.' + v.severity))}</span>
              <span class="pg-vessels-tag" data-tone="${isManual ? 'brand' : ''}">${escapeHTML(isManual ? t('vessels.detail.manual_tag') : t('vessels.detail.live_tag'))}</span>
            </div>
          </div>
          <div class="pg-vessels-detail-actions">
            ${isManual ? `<button class="btn btn--outline btn--sm" data-detail-action="edit">${escapeHTML(t('vessels.action.edit'))}</button>` : ''}
            ${isManual ? `<button class="btn btn--danger btn--sm" data-detail-action="delete">${escapeHTML(t('vessels.action.delete'))}</button>` : ''}
            <button class="btn btn--ghost btn--sm" data-detail-action="close">${escapeHTML(t('vessels.detail.close'))}</button>
          </div>
        </div>

        <div class="pg-vessels-detail-grid">
          <div class="pg-vessels-detail-section">
            <h4>${escapeHTML(t('vessels.detail.emissions'))}</h4>
            <div class="chart-frame" data-h="md" style="border:none;padding:0;background:transparent">
              <canvas id="pg-vessels-detail-chart"></canvas>
            </div>
          </div>

          <div class="pg-vessels-detail-section">
            <h4>${escapeHTML(t('vessels.detail.profile'))}</h4>
            <div class="pg-vessels-profile-grid">
              <div class="pg-vessels-profile-row">
                <span class="label">${escapeHTML(t('vessels.detail.field.eta'))}</span>
                <span class="value">${escapeHTML(fmt.dateTime(v.eta_ts))}</span>
                <span class="label" style="text-transform:none;letter-spacing:0;color:var(--text-tertiary);font-size:var(--fs-2xs)">${escapeHTML(fmt.relativeTime(v.eta_ts))}</span>
              </div>
              <div class="pg-vessels-profile-row">
                <span class="label">${escapeHTML(t('vessels.detail.field.speed'))}</span>
                <span class="value">${fmt.num(v.speed_kn || 0, { maximumFractionDigits: 1 })} ${escapeHTML(t('vessels.unit.knots'))}</span>
              </div>
              <div class="pg-vessels-profile-row">
                <span class="label">${escapeHTML(t('vessels.detail.field.fuel'))}</span>
                <span class="value">${escapeHTML(v.fuel)}</span>
              </div>
              <div class="pg-vessels-profile-row">
                <span class="label">${escapeHTML(t('vessels.detail.field.dispersion'))}</span>
                <span class="value">${escapeHTML(t('dispersion.' + v.dispersion_risk))}</span>
              </div>
              <div class="pg-vessels-profile-row" style="grid-column: span 2">
                <span class="label">${escapeHTML(t('vessels.detail.field.coords'))}</span>
                <span class="value">${(v.lat ?? 0).toFixed(4)}°N · ${(v.lon ?? 0).toFixed(4)}°E</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pg-vessels-detail-section">
          <h4>${escapeHTML(t('vessels.detail.alerts'))} <span style="float:right;color:var(--text-tertiary);font-weight:var(--fw-regular);font-size:var(--fs-2xs)">${alerts.length}</span></h4>
          ${alerts.length === 0
            ? `<div class="pg-vessels-detail-empty" style="padding:var(--sp-4)"><span>${escapeHTML(t('vessels.detail.no_alerts'))}</span></div>`
            : `<div class="pg-vessels-detail-alerts scroll-styled">${alerts.map(alertItemTemplate).join('')}</div>`}
        </div>
      </div>
    `;

    /* Detail chart: synthesized 24h emission history. */
    const detailCanvas = host.querySelector('#pg-vessels-detail-chart');
    if (detailCanvas && window.Chart) {
      const hist = synthEmissionHistory(v, 24);
      const labels = Array.from({ length: 24 }, (_, i) => `${(i - 23 + new Date().getHours() + 24) % 24}:00`);
      const palette = themePalette();
      charts.detail = lineChart(detailCanvas, [
        { label: 'CO₂', data: hist.co2, color: palette.brand },
        { label: 'NOₓ', data: hist.nox, color: palette.warning, fill: false },
        { label: 'SOₓ', data: hist.sox, color: palette.critical, fill: false },
      ], {
        labels,
        options: {
          plugins: {
            legend: { position: 'bottom', labels: { color: palette.textMuted, boxWidth: 8, boxHeight: 8, padding: 10, font: { size: 10 } } },
          },
          scales: {
            x: { ticks: { color: palette.textSubtle, font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: palette.grid } },
            y: { beginAtZero: true, ticks: { color: palette.textSubtle, font: { size: 10 } }, grid: { color: palette.grid } },
          },
        },
      });
    }

    /* Wire detail header buttons */
    host.querySelectorAll('button[data-detail-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.detailAction;
        if (a === 'close') {
          pageState.selectedId = null;
          rootEl.querySelectorAll('#pg-vessels-tbody tr.is-selected').forEach((r) => r.classList.remove('is-selected'));
          renderDetail();
        } else if (a === 'edit') {
          openVesselForm(v);
        } else if (a === 'delete') {
          handleDelete(v);
        }
      });
    });
  }

  function alertItemTemplate(a) {
    const sev = a.severity || 'info';
    const titleRaw = a.title_key ? t(a.title_key, a.body_params || {}) : (a.title || '');
    const bodyRaw  = a.body_key  ? t(a.body_key,  a.body_params || {}) : (a.body  || '');
    const recs = (a.recommendations || []).map((r) => {
      const tk = r.tkey || r.title_key;
      const label = tk ? t(tk) : (r.label || r.action_id || '');
      return `<span class="alert-rec">${escapeHTML(label)}</span>`;
    }).join('');
    return `
      <div class="pg-vessels-alert-item" data-severity="${sev}">
        <div class="icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <div class="body">
          <div class="alert-title">${escapeHTML(titleRaw)}</div>
          <div class="alert-desc">${escapeHTML(bodyRaw)}</div>
          ${recs ? `<div class="alert-recs">${recs}</div>` : ''}
        </div>
      </div>
    `;
  }

  /* ============================================================
   * CRUD helpers
   * ============================================================ */
  function openVesselForm(existing) {
    const isEdit = !!existing;
    const seed = existing || {
      id: undefined,
      name: '',
      type: 'container',
      fuel: 'HFO',
      status: 'approaching',
      speed_kn: 0,
      eta_ts: Date.now() + 2 * 3600_000,
      emissions: { co2: 32, nox: 110, sox: 28 },
      dispersion_risk: 'low',
      lat: 38.45,
      lon: 27.10,
    };

    const fields = [
      {
        id: 'name', label: t('vessels.field.name'), type: 'text',
        value: seed.name || '', required: true, validate: required,
        placeholder: 'MSC Olivia',
      },
      {
        id: 'imo', label: t('vessels.field.imo'), type: 'text',
        value: seed.id || '', required: true, validate: compose(required, imo),
        placeholder: 'IMO-9456321', hint: t('vessels.field.imo.hint'),
      },
      {
        id: 'type', label: t('vessels.field.type'), type: 'select',
        value: seed.type, required: true,
        options: TYPE_IDS.map((id) => ({ value: id, label: t('type.' + id) })),
      },
      {
        id: 'fuel', label: t('vessels.field.fuel'), type: 'select',
        value: seed.fuel, required: true,
        options: FUEL_IDS.map((id) => ({ value: id, label: id })),
      },
      {
        id: 'status', label: t('vessels.field.status'), type: 'select',
        value: seed.status, required: true,
        options: STATUS_IDS.map((id) => ({ value: id, label: t('status.' + id) })),
      },
      {
        id: 'speed_kn', label: t('vessels.field.speed'), type: 'number',
        value: seed.speed_kn ?? 0, min: 0, max: 25, step: 0.1,
        validate: compose(minNumber(0)),
      },
      {
        id: 'eta_ts', label: t('vessels.field.eta'), type: 'datetime',
        value: ymdhmLocalInput(seed.eta_ts || Date.now() + 2 * 3600_000),
      },
      {
        id: 'emissions_co2', label: t('vessels.field.emissions_co2'), type: 'number',
        value: seed.emissions?.co2 ?? 32, min: 0, step: 0.1,
        validate: minNumber(0),
      },
      {
        id: 'emissions_nox', label: t('vessels.field.emissions_nox'), type: 'number',
        value: seed.emissions?.nox ?? 110, min: 0, step: 0.1,
        validate: minNumber(0),
      },
      {
        id: 'emissions_sox', label: t('vessels.field.emissions_sox'), type: 'number',
        value: seed.emissions?.sox ?? 28, min: 0, step: 0.1,
        validate: minNumber(0),
      },
      {
        id: 'dispersion_risk', label: t('vessels.field.dispersion'), type: 'select',
        value: seed.dispersion_risk, required: true,
        options: DISPERSION_IDS.map((id) => ({ value: id, label: t('dispersion.' + id) })),
      },
      {
        id: 'lat', label: t('vessels.field.lat'), type: 'number',
        value: seed.lat ?? 38.45, step: 0.0001,
      },
      {
        id: 'lon', label: t('vessels.field.lon'), type: 'number',
        value: seed.lon ?? 27.10, step: 0.0001,
      },
    ];

    openForm({
      title:    isEdit ? t('vessels.edit.title') : t('vessels.add.title'),
      subtitle: isEdit ? t('vessels.edit.subtitle') : t('vessels.add.subtitle'),
      fields,
      submitLabel: isEdit ? t('common.save') : t('common.add'),
      onSubmit: (values) => {
        const co2 = Number(values.emissions_co2) || 0;
        const nox = Number(values.emissions_nox) || 0;
        const sox = Number(values.emissions_sox) || 0;
        const fuel = String(values.fuel || 'HFO');
        const status = String(values.status || 'approaching');
        const etaTs = values.eta_ts ? +new Date(values.eta_ts) : Date.now() + 2 * 3600_000;

        const payload = deriveVesselDefaults({
          id: String(values.imo).trim().toUpperCase(),
          name: String(values.name).trim(),
          type: values.type,
          fuel,
          status,
          speed_kn: Number(values.speed_kn) || 0,
          eta_ts: etaTs,
          emissions: { co2, nox, sox },
          dispersion_risk: values.dispersion_risk,
          lat: Number(values.lat) || 38.45,
          lon: Number(values.lon) || 27.10,
        });

        if (isEdit) {
          store.dispatch('updateVessel', { id: existing.id, patch: payload });
        } else {
          store.dispatch('addVessel', payload);
          pageState.selectedId = payload.id;
        }
        return true;
      },
    });
  }

  async function handleDelete(v) {
    const ok = await confirm({
      title: t('vessels.delete.title'),
      body:  t('vessels.delete.body', { name: v.name }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    store.dispatch('removeVessel', v.id);
    if (pageState.selectedId === v.id) pageState.selectedId = null;
  }

  /* ============================================================
   * Composite re-renderers
   * ============================================================ */
  function renderListAndCharts() {
    const all = getMergedVessels();
    const filtered = all.filter(passesFilters);
    renderCharts(filtered);
    renderListBody();
  }

  function renderAll() {
    renderKpis();
    renderFilters();
    renderTableHead();
    renderListAndCharts();
    renderDetail();
  }

  /* ---------- Initial render ---------- */
  renderAll();

  /* ============================================================
   * Subscriptions
   * ============================================================ */
  const unsubs = [];

  /* Re-render whole page on language/theme change. */
  unsubs.push(store.subscribe('ui', () => {
    destroyCharts();
    renderAll();
  }));

  /* Vessel feed updates. */
  unsubs.push(store.subscribe('vessels', () => {
    renderKpis();
    renderListAndCharts();
    if (pageState.selectedId) renderDetail();
  }));

  unsubs.push(store.subscribe('manual_vessels', () => {
    renderKpis();
    renderListAndCharts();
    renderDetail();  /* also handles selected vessel deletion */
  }));

  unsubs.push(store.subscribe('alerts', () => {
    renderListBody();
    if (pageState.selectedId) renderDetail();
  }));

  unsubs.push(store.subscribe('weather', () => {
    /* Weather affects derived dispersion display in some implementations;
       a list re-render keeps badges accurate cheaply. */
    renderListBody();
  }));

  /* ============================================================
   * Unmount
   * ============================================================ */
  return {
    unmount() {
      destroyCharts();
      unsubs.forEach((fn) => { try { fn(); } catch (_) {} });
      unsubs.length = 0;
      rootEl.innerHTML = '';
    },
  };
}
