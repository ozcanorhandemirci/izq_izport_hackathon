/**
 * pages/emissions.js — Emissions analytics page.
 *
 * Power-BI-style emissions intelligence: multi-pollutant time-series, KPI
 * strip, compliance gauges, source attribution, heatmap, top contributors,
 * simple linear forecast, and manual reading entry.
 *
 * Theme- and language-aware: charts re-render on `ui` slice changes, and
 * all strings are pulled from the i18n layer.
 */

import store from '../store/state.js';
import { t, registerStrings, getLanguage } from '../i18n.js';
import * as fmt from '../utils/format.js';
import { lineChart, barChart, doughnutChart, radarChart, themePalette, drawHeatmap, hexAlpha, toneColor, gradient } from '../utils/charts.js';
import { openForm, openModal, confirm } from '../utils/modal.js';
import { required, minNumber, compose } from '../utils/validate.js';
import { navigate } from '../router.js';

/* =================================================================
 * i18n strings
 * ================================================================= */
registerStrings({
  tr: {
    'emissions.range.24h':     '24s',
    'emissions.range.7d':      '7g',
    'emissions.range.30d':     '30g',
    'emissions.range.custom':  'Özel',
    'emissions.poll.co2':      'CO₂',
    'emissions.poll.nox':      'NOₓ',
    'emissions.poll.sox':      'SOₓ',
    'emissions.threshold':     'Limit',
    'emissions.delta_prev':    'Δ önceki',
    'emissions.kpi.co2_total':       'CO₂ Toplam',
    'emissions.kpi.nox_total':       'NOₓ Toplam',
    'emissions.kpi.sox_total':       'SOₓ Toplam',
    'emissions.kpi.exceedance':      'Eşik Aşımı',
    'emissions.kpi.compliance_rate': 'Uyumluluk Oranı',
    'emissions.kpi.exceedance.body':      '{n} ölçüm noktası limit üstü',
    'emissions.kpi.compliance.body':      '{n} ölçümün %{pct}\'i limit içinde',
    'emissions.section.timeseries':   'Çoklu Kirletici Zaman Serisi',
    'emissions.section.timeseries_sub': 'Limit oranına göre normalize edilmiş eğilim',
    'emissions.section.attribution':  'Kaynak Dağılımı',
    'emissions.section.attribution_sub': 'Şu anki emisyon kaynaklarının payı',
    'emissions.section.heatmap':      'Yoğunluk Haritası',
    'emissions.section.compliance':   'Uyumluluk Göstergeleri',
    'emissions.section.forecast':     'Kısa Dönem Tahmin',
    'emissions.section.contributors': 'En Yoğun Kaynaklar',
    'emissions.section.manual':       'Manuel Ölçümler',
    'emissions.section.alerts':       'Aktif Emisyon Uyarıları',
    'emissions.attribution.vessels':     'Gemiler',
    'emissions.attribution.aux_engines': 'Yardımcı Motorlar',
    'emissions.attribution.baseline':    'Arka plan',
    'emissions.attribution.empty':       'Atfedilebilecek aktif kaynak yok',
    'emissions.heatmap.legend':       'Düşük → Yüksek (limit oranı)',
    'emissions.heatmap.caption':      'Son 24 saatin saat-bazlı kirletici yoğunluğu',
    'emissions.forecast.caption':     'Basit doğrusal ekstrapolasyon — yalnızca gösterge amaçlı',
    'emissions.forecast.next6h':      'Sonraki 6 saat (CO₂)',
    'emissions.forecast.projected_breach': 'Tahmini eşik aşımı: {time}',
    'emissions.forecast.no_breach':   'Önümüzdeki 6 saat içinde limit aşımı beklenmiyor',
    'emissions.compliance.compliant': 'Uyumlu',
    'emissions.compliance.warning':   'Eşik yakın',
    'emissions.compliance.violation': 'İhlal',
    'emissions.compliance.label.mean': 'Ortalama',
    'emissions.compliance.label.max':  'Maks',
    'emissions.compliance.label.exceedances': 'Aşım',
    'emissions.compliance.ratio':     '%{pct} limit',
    'emissions.contributors.title':     'Anlık katkı sıralaması',
    'emissions.contributors.show_all':  'Tümünü göster',
    'emissions.contributors.show_less': 'Daha az göster',
    'emissions.contributors.open_vessel': 'Gemilerde aç',
    'emissions.contributors.col.vessel': 'Gemi',
    'emissions.contributors.col.type':   'Tip',
    'emissions.contributors.col.fuel':   'Yakıt',
    'emissions.contributors.col.co2':    'CO₂ (kg/s)',
    'emissions.contributors.col.nox':    'NOₓ (kg/s)',
    'emissions.contributors.col.sox':    'SOₓ (kg/s)',
    'emissions.contributors.col.severity': 'Şiddet',
    'emissions.contributors.empty':      'Sıralanacak gemi yok',
    'emissions.manual.title':           'Manuel Ölçümler',
    'emissions.manual.add':             'Ölçüm ekle',
    'emissions.manual.empty.title':     'Manuel ölçüm yok',
    'emissions.manual.empty.body':      'Saha veya istasyon ölçümlerini bu listeye ekleyebilirsiniz.',
    'emissions.manual.confirm_delete':  'Bu ölçüm silinsin mi?',
    'emissions.manual.col.ts':       'Zaman',
    'emissions.manual.col.poll':     'Kirletici',
    'emissions.manual.col.value':    'Değer',
    'emissions.manual.col.source':   'Kaynak',
    'emissions.manual.col.vessel':   'Gemi',
    'emissions.manual.col.notes':    'Not',
    'emissions.manual.modal.title':  'Yeni Manuel Ölçüm',
    'emissions.manual.modal.subtitle': 'Saha veya istasyon ölçümünü kaydet',
    'emissions.field.timestamp':     'Zaman damgası',
    'emissions.field.pollutant':     'Kirletici',
    'emissions.field.value':         'Değer',
    'emissions.field.unit':          'Birim',
    'emissions.field.source':        'Kaynak türü',
    'emissions.field.vessel':        'İlgili gemi',
    'emissions.field.notes':         'Notlar',
    'emissions.field.source.vessel':  'Gemi',
    'emissions.field.source.dock':    'Rıhtım',
    'emissions.field.source.station': 'Ölçüm İstasyonu',
    'emissions.field.source.other':   'Diğer',
    'emissions.field.vessel.none':    '— seçim yok —',
    'emissions.alerts.empty':         'Açık emisyon uyarısı yok',
    'emissions.alerts.view':          'Uyarılarda aç',
    'emissions.alerts.severity.critical': 'kritik',
    'emissions.alerts.severity.warning':  'uyarı',
    'emissions.alerts.severity.info':     'gözlem',
    'emissions.delta.up':   'arttı',
    'emissions.delta.down': 'azaldı',
    'emissions.delta.flat': 'sabit',
  },
  en: {
    'emissions.range.24h':     '24h',
    'emissions.range.7d':      '7d',
    'emissions.range.30d':     '30d',
    'emissions.range.custom':  'Custom',
    'emissions.poll.co2':      'CO₂',
    'emissions.poll.nox':      'NOₓ',
    'emissions.poll.sox':      'SOₓ',
    'emissions.threshold':     'Limit',
    'emissions.delta_prev':    'Δ prev',
    'emissions.kpi.co2_total':       'CO₂ Aggregate',
    'emissions.kpi.nox_total':       'NOₓ Aggregate',
    'emissions.kpi.sox_total':       'SOₓ Aggregate',
    'emissions.kpi.exceedance':      'Threshold Breaches',
    'emissions.kpi.compliance_rate': 'Compliance Rate',
    'emissions.kpi.exceedance.body':      '{n} sample points above limit',
    'emissions.kpi.compliance.body':      '{pct}% of {n} samples within limit',
    'emissions.section.timeseries':   'Multi-Pollutant Time Series',
    'emissions.section.timeseries_sub': 'Threshold-normalized trend for direct comparison',
    'emissions.section.attribution':  'Source Attribution',
    'emissions.section.attribution_sub': 'Current emission breakdown by source',
    'emissions.section.heatmap':      'Intensity Heatmap',
    'emissions.section.compliance':   'Compliance Indicators',
    'emissions.section.forecast':     'Short-Term Forecast',
    'emissions.section.contributors': 'Top Contributors',
    'emissions.section.manual':       'Manual Readings',
    'emissions.section.alerts':       'Active Emission Alerts',
    'emissions.attribution.vessels':     'Vessels',
    'emissions.attribution.aux_engines': 'Auxiliary Engines',
    'emissions.attribution.baseline':    'Baseline',
    'emissions.attribution.empty':       'No active sources to attribute',
    'emissions.heatmap.legend':       'Low → High (ratio of limit)',
    'emissions.heatmap.caption':      'Last 24h hourly emission intensity',
    'emissions.forecast.caption':     'Simple linear extrapolation — illustrative only',
    'emissions.forecast.next6h':      'Next 6 hours (CO₂)',
    'emissions.forecast.projected_breach': 'Projected breach at: {time}',
    'emissions.forecast.no_breach':   'No threshold breach expected within 6 hours',
    'emissions.compliance.compliant': 'Compliant',
    'emissions.compliance.warning':   'Approaching limit',
    'emissions.compliance.violation': 'Violation',
    'emissions.compliance.label.mean': 'Mean',
    'emissions.compliance.label.max':  'Max',
    'emissions.compliance.label.exceedances': 'Breaches',
    'emissions.compliance.ratio':     '{pct}% of limit',
    'emissions.contributors.title':     'Live contribution ranking',
    'emissions.contributors.show_all':  'Show all',
    'emissions.contributors.show_less': 'Show less',
    'emissions.contributors.open_vessel': 'Open in Vessels',
    'emissions.contributors.col.vessel': 'Vessel',
    'emissions.contributors.col.type':   'Type',
    'emissions.contributors.col.fuel':   'Fuel',
    'emissions.contributors.col.co2':    'CO₂ (kg/h)',
    'emissions.contributors.col.nox':    'NOₓ (kg/h)',
    'emissions.contributors.col.sox':    'SOₓ (kg/h)',
    'emissions.contributors.col.severity': 'Severity',
    'emissions.contributors.empty':      'No vessels to rank',
    'emissions.manual.title':           'Manual Readings',
    'emissions.manual.add':             'Add reading',
    'emissions.manual.empty.title':     'No manual readings',
    'emissions.manual.empty.body':      'Add field or station measurements to keep them in the audit trail.',
    'emissions.manual.confirm_delete':  'Delete this reading?',
    'emissions.manual.col.ts':       'Time',
    'emissions.manual.col.poll':     'Pollutant',
    'emissions.manual.col.value':    'Value',
    'emissions.manual.col.source':   'Source',
    'emissions.manual.col.vessel':   'Vessel',
    'emissions.manual.col.notes':    'Notes',
    'emissions.manual.modal.title':  'New Manual Reading',
    'emissions.manual.modal.subtitle': 'Record a field or station measurement',
    'emissions.field.timestamp':     'Timestamp',
    'emissions.field.pollutant':     'Pollutant',
    'emissions.field.value':         'Value',
    'emissions.field.unit':          'Unit',
    'emissions.field.source':        'Source type',
    'emissions.field.vessel':        'Related vessel',
    'emissions.field.notes':         'Notes',
    'emissions.field.source.vessel':  'Vessel',
    'emissions.field.source.dock':    'Dock',
    'emissions.field.source.station': 'Measurement Station',
    'emissions.field.source.other':   'Other',
    'emissions.field.vessel.none':    '— none —',
    'emissions.alerts.empty':         'No open emission alerts',
    'emissions.alerts.view':          'Open in Alerts',
    'emissions.alerts.severity.critical': 'critical',
    'emissions.alerts.severity.warning':  'warning',
    'emissions.alerts.severity.info':     'watch',
    'emissions.delta.up':   'rising',
    'emissions.delta.down': 'falling',
    'emissions.delta.flat': 'flat',
  },
});

/* =================================================================
 * Local stylesheet (single injection)
 * ================================================================= */
const STYLES = `
.pg-emissions { display: grid; gap: var(--sp-5); }

.pg-emissions-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: var(--sp-4);
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--border-subtle);
}
.pg-emissions-header-left h2 {
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  letter-spacing: -0.01em;
  margin: 0 0 4px 0;
}
.pg-emissions-header-left p {
  font-size: var(--fs-sm);
  color: var(--text-tertiary);
  margin: 0;
}
.pg-emissions-header-right {
  display: flex; flex-wrap: wrap; gap: var(--sp-2); align-items: center;
}

.pg-emissions-panel {
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--sp-4);
  display: grid;
  gap: var(--sp-3);
}
.pg-emissions-panel-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--sp-3); flex-wrap: wrap;
}
.pg-emissions-panel-title {
  display: flex; flex-direction: column; gap: 2px;
}
.pg-emissions-panel-title h3 {
  margin: 0;
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.pg-emissions-panel-title small {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}
.pg-emissions-panel-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; align-items: center; }

.pg-emissions-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-3); }
@media (max-width: 1180px) { .pg-emissions-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px)  { .pg-emissions-kpis { grid-template-columns: repeat(2, 1fr); } }

.pg-emissions-kpi { padding: var(--sp-3); }
.pg-emissions-kpi-spark {
  height: 56px; margin-top: var(--sp-2); position: relative;
}
.pg-emissions-kpi-spark canvas { width: 100% !important; height: 100% !important; }
.pg-emissions-kpi-meta {
  display: flex; justify-content: space-between; align-items: center;
  font-size: var(--fs-xs); color: var(--text-tertiary);
  font-family: var(--font-mono);
}
.pg-emissions-kpi-delta {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  display: inline-flex; align-items: center; gap: 4px;
}
.pg-emissions-kpi-delta[data-direction="up"]   { color: var(--status-critical); }
.pg-emissions-kpi-delta[data-direction="down"] { color: var(--status-success); }
.pg-emissions-kpi-delta[data-direction="flat"] { color: var(--text-tertiary); }

.pg-emissions-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-5); }
@media (max-width: 1180px) { .pg-emissions-grid-2 { grid-template-columns: 1fr; } }

.pg-emissions-attribution-list {
  display: grid; gap: var(--sp-2);
  margin-top: var(--sp-2);
  font-size: var(--fs-sm);
}
.pg-emissions-attribution-row {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: 8px var(--sp-3);
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
}
.pg-emissions-attribution-swatch {
  width: 12px; height: 12px; border-radius: 3px;
  flex-shrink: 0;
}
.pg-emissions-attribution-label {
  flex: 1;
  color: var(--text-secondary);
}
.pg-emissions-attribution-value {
  font-family: var(--font-mono);
  color: var(--text-primary);
  font-weight: var(--fw-semibold);
}

.pg-emissions-heatmap-frame {
  position: relative;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--sp-3);
}
.pg-emissions-heatmap-grid {
  display: grid;
  grid-template-columns: 60px 1fr;
  align-items: center;
  gap: var(--sp-2);
}
.pg-emissions-heatmap-row-labels {
  display: grid; gap: 4px;
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}
.pg-emissions-heatmap-canvas {
  width: 100%;
  height: 120px;
  display: block;
}
.pg-emissions-heatmap-axis {
  display: flex;
  justify-content: space-between;
  margin-top: var(--sp-2);
  font-size: var(--fs-2xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
}
.pg-emissions-heatmap-legend {
  margin-top: var(--sp-3);
  display: flex; align-items: center; gap: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}
.pg-emissions-heatmap-legend-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg,
    var(--brand-primary-soft) 0%,
    var(--brand-primary) 40%,
    var(--status-warning) 70%,
    var(--status-critical) 100%);
}

.pg-emissions-compliance-row {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.pg-emissions-compliance-row:last-child { border-bottom: none; }
.pg-emissions-compliance-head {
  display: flex; justify-content: space-between; align-items: center;
  gap: var(--sp-3);
}
.pg-emissions-compliance-head-left {
  display: flex; align-items: center; gap: var(--sp-2);
}
.pg-emissions-compliance-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}
.pg-emissions-compliance-ratio {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}
.pg-emissions-compliance-bar {
  position: relative;
  height: 10px;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  overflow: hidden;
}
.pg-emissions-compliance-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 5px;
  transition: width 360ms var(--ease-out);
}
.pg-emissions-compliance-bar-mark {
  position: absolute;
  top: -2px; bottom: -2px;
  width: 2px;
  background: var(--text-primary);
  opacity: 0.4;
}
.pg-emissions-compliance-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}
.pg-emissions-compliance-stat {
  display: flex; flex-direction: column; gap: 2px;
}
.pg-emissions-compliance-stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

.pg-emissions-forecast-foot {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  display: flex; flex-direction: column; gap: 4px;
}
.pg-emissions-forecast-projection {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}
.pg-emissions-forecast-projection[data-tone="critical"] { color: var(--status-critical); }
.pg-emissions-forecast-projection[data-tone="success"]  { color: var(--status-success); }

.pg-emissions-contrib-table { width: 100%; }
.pg-emissions-contrib-imo {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}
.pg-emissions-contrib-cell-emit {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono);
}
.pg-emissions-contrib-cell-emit .bar-mini {
  flex: 1;
  min-width: 60px;
}
.pg-emissions-contrib-toggle {
  margin-top: var(--sp-2);
  display: flex; justify-content: center;
}

.pg-emissions-manual-table { width: 100%; }
.pg-emissions-manual-poll {
  font-family: var(--font-mono);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}
.pg-emissions-manual-notes {
  color: var(--text-tertiary);
  font-size: var(--fs-xs);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-emissions-manual-delete {
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  padding: 4px 8px;
  cursor: pointer;
  font-size: var(--fs-xs);
  transition: color var(--dur-fast), border-color var(--dur-fast);
}
.pg-emissions-manual-delete:hover {
  color: var(--status-critical);
  border-color: var(--status-critical);
}

.pg-emissions-alerts-strip {
  display: flex;
  gap: var(--sp-3);
  overflow-x: auto;
  padding-bottom: var(--sp-2);
  scroll-behavior: smooth;
}
.pg-emissions-alerts-strip::-webkit-scrollbar { height: 6px; }
.pg-emissions-alerts-strip::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
.pg-emissions-alert-card {
  flex: 0 0 320px;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-left: 3px solid var(--border-soft);
  border-radius: var(--r-md);
  padding: var(--sp-3);
  display: grid;
  gap: var(--sp-2);
}
.pg-emissions-alert-card[data-severity="critical"] { border-left-color: var(--status-critical); }
.pg-emissions-alert-card[data-severity="warning"]  { border-left-color: var(--status-warning); }
.pg-emissions-alert-card[data-severity="info"]     { border-left-color: var(--brand-primary); }
.pg-emissions-alert-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--sp-2);
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-tertiary);
}
.pg-emissions-alert-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}
.pg-emissions-alert-body {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  line-height: 1.5;
}
.pg-emissions-alert-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: var(--sp-1);
}
.pg-emissions-alert-ts {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--text-muted);
}

.pg-emissions-poll-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--bg-3);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}
.pg-emissions-poll-pill[data-poll="co2"]  { color: var(--brand-primary); border-color: rgba(0, 157, 196, 0.32); }
.pg-emissions-poll-pill[data-poll="nox"]  { color: var(--status-warning); border-color: rgba(186, 117, 23, 0.32); }
.pg-emissions-poll-pill[data-poll="sox"]  { color: var(--status-critical); border-color: rgba(226, 75, 74, 0.32); }
`;

function ensureStyles() {
  if (document.querySelector('style[data-page="emissions"]')) return;
  const tag = document.createElement('style');
  tag.dataset.page = 'emissions';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

/* =================================================================
 * Constants & helpers
 * ================================================================= */
const POLL_KEYS = ['co2', 'nox', 'sox'];
const POLL_TONES = { co2: 'brand', nox: 'warning', sox: 'critical' };
const POLL_TONE_VARS = { co2: 'info', nox: 'warning', sox: 'critical' };
const HOUR_MS = 3600 * 1000;

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function pollLabel(k) { return t(`emissions.poll.${k}`); }

function rangeBounds(rangeId) {
  const now = Date.now();
  if (rangeId === '24h') return { start: now - 24 * HOUR_MS, end: now };
  if (rangeId === '7d')  return { start: now - 7 * 24 * HOUR_MS, end: now };
  if (rangeId === '30d') return { start: now - 30 * 24 * HOUR_MS, end: now };
  return { start: now - 24 * HOUR_MS, end: now };
}

/**
 * Slice the 48-tick history (30-min spacing) into the visible window.
 * For ranges longer than 24h we synthesize an extended series by repeating
 * the last 24h pattern with mild noise — enough to drive UI for demo.
 */
function sliceHistory(history, rangeId) {
  if (!Array.isArray(history) || history.length === 0) return [];
  if (rangeId === '24h')   return history.slice();
  if (rangeId === '7d')    return repeatHistory(history, 7);
  if (rangeId === '30d')   return repeatHistory(history, 30);
  return history.slice();
}

function repeatHistory(history, days) {
  const out = [];
  for (let d = 0; d < days; d++) {
    const phase = (d * 0.13) % 1;
    for (let i = 0; i < history.length; i++) {
      const v = history[i];
      const noise = Math.sin((i / history.length) * Math.PI * 2 + phase * Math.PI) * (v * 0.04);
      out.push(+(v + noise).toFixed(2));
    }
  }
  return out;
}

function timeLabelsFor(count, rangeId) {
  const labels = [];
  const span = rangeId === '7d' ? 7 * 24 * HOUR_MS
              : rangeId === '30d' ? 30 * 24 * HOUR_MS
              : 24 * HOUR_MS;
  const stepMs = span / count;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const ts = now - span + i * stepMs;
    const d = new Date(ts);
    if (rangeId === '24h') {
      labels.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else if (rangeId === '7d') {
      labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`);
    } else {
      labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }
  return labels;
}

function severityFromRatio(r) {
  if (r >= 1) return 'critical';
  if (r >= 0.85) return 'warning';
  if (r >= 0.7) return 'info';
  return 'success';
}

/**
 * Linear regression on y[] (x = 0..n-1). Returns { slope, intercept }.
 */
function linReg(ys) {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += ys[i];
    sxy += i * ys[i];
    sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/* =================================================================
 * DOM templates
 * ================================================================= */
const TEMPLATE = () => `
  <div class="page pg-emissions">
    <header class="pg-emissions-header" data-region="header"></header>
    <section class="pg-emissions-kpis" data-region="kpis"></section>
    <section class="pg-emissions-panel" data-region="timeseries"></section>
    <section class="pg-emissions-grid-2">
      <div class="pg-emissions-panel" data-region="attribution"></div>
      <div class="pg-emissions-panel" data-region="heatmap"></div>
    </section>
    <section class="pg-emissions-grid-2">
      <div class="pg-emissions-panel" data-region="compliance"></div>
      <div class="pg-emissions-panel" data-region="forecast"></div>
    </section>
    <section class="pg-emissions-panel" data-region="contributors"></section>
    <section class="pg-emissions-panel" data-region="manual"></section>
    <section class="pg-emissions-panel" data-region="alerts"></section>
  </div>
`;

/* =================================================================
 * mount(rootEl)
 * ================================================================= */
export function mount(rootEl) {
  ensureStyles();
  rootEl.innerHTML = TEMPLATE();

  /* ----- Local view state ----- */
  const local = {
    range: '24h',
    polls: { co2: true, nox: true, sox: true },
    showAllContrib: false,
  };

  /* ----- Chart instances we must destroy ----- */
  const charts = {
    spark: { co2: null, nox: null, sox: null },
    series: null,
    attribution: null,
    forecast: null,
  };

  function destroyCharts() {
    for (const k of POLL_KEYS) {
      try { charts.spark[k]?.destroy(); } catch (_) {}
      charts.spark[k] = null;
    }
    try { charts.series?.destroy(); } catch (_) {}
    try { charts.attribution?.destroy(); } catch (_) {}
    try { charts.forecast?.destroy(); } catch (_) {}
    charts.series = null;
    charts.attribution = null;
    charts.forecast = null;
  }

  /* ============================================================
   * Render: header
   * ============================================================ */
  function renderHeader() {
    const el = rootEl.querySelector('[data-region="header"]');
    if (!el) return;
    const ranges = [
      { id: '24h', label: t('emissions.range.24h') },
      { id: '7d',  label: t('emissions.range.7d') },
      { id: '30d', label: t('emissions.range.30d') },
    ];
    el.innerHTML = `
      <div class="pg-emissions-header-left">
        <h2>${escapeHTML(t('page.emissions.title'))}</h2>
        <p>${escapeHTML(t('page.emissions.subtitle'))}</p>
      </div>
      <div class="pg-emissions-header-right">
        <div class="filter-rail-group" role="group" aria-label="${escapeHTML(t('common.range'))}">
          <span class="filter-rail-label">${escapeHTML(t('common.range'))}</span>
          ${ranges.map((r) => `
            <button class="chip range-chip ${r.id === local.range ? 'is-active' : ''}" data-range="${r.id}">${escapeHTML(r.label)}</button>
          `).join('')}
        </div>
        <div class="filter-rail-group" role="group" aria-label="Pollutants">
          ${POLL_KEYS.map((k) => `
            <button class="chip ${local.polls[k] ? 'is-active' : ''}" data-poll="${k}">${escapeHTML(pollLabel(k))}</button>
          `).join('')}
        </div>
        <button class="btn btn--primary" data-action="add-reading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          ${escapeHTML(t('emissions.manual.add'))}
        </button>
      </div>
    `;
    el.querySelectorAll('[data-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        local.range = btn.dataset.range;
        renderAll();
      });
    });
    el.querySelectorAll('[data-poll]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.poll;
        const remainingActive = POLL_KEYS.filter((p) => local.polls[p]).length;
        /* Don't allow deactivating last active toggle */
        if (local.polls[k] && remainingActive <= 1) return;
        local.polls[k] = !local.polls[k];
        renderHeader();
        renderTimeSeries();
      });
    });
    el.querySelector('[data-action="add-reading"]')?.addEventListener('click', openManualReadingForm);
  }

  /* ============================================================
   * Render: KPI strip
   * ============================================================ */
  function renderKpis() {
    const el = rootEl.querySelector('[data-region="kpis"]');
    if (!el) return;
    const E = store.get('emissions') || {};
    const range = local.range;

    /* Aggregate exceedance + compliance numbers across pollutants */
    let totalSamples = 0;
    let exceeded = 0;
    for (const k of POLL_KEYS) {
      const series = sliceHistory(E[k]?.history || [], range);
      const thr = E[k]?.threshold || 0;
      totalSamples += series.length;
      exceeded += series.filter((v) => v > thr).length;
    }
    const compliance = totalSamples ? 1 - exceeded / totalSamples : 1;
    const compliancePct = compliance * 100;
    let complianceTone = 'success';
    if (compliancePct < 80) complianceTone = 'critical';
    else if (compliancePct < 95) complianceTone = 'warning';

    const cards = [];
    for (const k of POLL_KEYS) {
      const e = E[k];
      if (!e) continue;
      const series = sliceHistory(e.history, range);
      const cur = e.current || 0;
      const prev = series.length >= 2 ? series[series.length - 2] : cur;
      const delta = cur - prev;
      const ratio = e.threshold ? cur / e.threshold : 0;
      const tone = severityFromRatio(ratio);
      cards.push({
        id: k,
        label: t(`emissions.kpi.${k}_total`),
        value: fmt.num(cur, { maximumFractionDigits: 1 }),
        unit: e.unit,
        tone,
        ratioPct: ratio * 100,
        delta,
        threshold: e.threshold,
      });
    }

    /* Exceedance card */
    cards.push({
      id: 'exceed',
      label: t('emissions.kpi.exceedance'),
      value: fmt.num(exceeded),
      tone: exceeded === 0 ? 'success' : (exceeded > totalSamples * 0.1 ? 'critical' : 'warning'),
      bodyText: t('emissions.kpi.exceedance.body', { n: exceeded }),
      isStat: true,
    });
    /* Compliance card */
    cards.push({
      id: 'comp',
      label: t('emissions.kpi.compliance_rate'),
      value: fmt.num(compliancePct, { maximumFractionDigits: 1 }) + '%',
      tone: complianceTone,
      bodyText: t('emissions.kpi.compliance.body', { n: totalSamples, pct: fmt.num(compliancePct, { maximumFractionDigits: 0 }) }),
      isStat: true,
    });

    el.innerHTML = cards.map((c) => {
      if (c.isStat) {
        return `
          <div class="stat-card pg-emissions-kpi" data-kpi="${c.id}">
            <div class="stat-card-label">${escapeHTML(c.label)}</div>
            <div class="stat-card-value" data-tone="${c.tone}">${escapeHTML(c.value)}</div>
            <div class="stat-card-meta">${escapeHTML(c.bodyText || '')}</div>
          </div>
        `;
      }
      const dir = Math.abs(c.delta) < 0.05 ? 'flat' : (c.delta > 0 ? 'up' : 'down');
      const deltaArrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '·';
      const deltaTxt = `${deltaArrow} ${fmt.num(Math.abs(c.delta), { maximumFractionDigits: 2 })} ${c.unit || ''}`;
      return `
        <div class="stat-card pg-emissions-kpi" data-kpi="${c.id}">
          <div class="stat-card-label">${escapeHTML(c.label)}</div>
          <div class="stat-card-value" data-tone="${c.tone}">${escapeHTML(c.value)}<span style="font-size: var(--fs-sm); color: var(--text-tertiary); font-weight: var(--fw-regular); margin-left: 4px;">${escapeHTML(c.unit || '')}</span></div>
          <div class="pg-emissions-kpi-meta">
            <span>${fmt.num(c.ratioPct, { maximumFractionDigits: 0 })}% ${escapeHTML(t('emissions.threshold').toLowerCase())}</span>
            <span class="pg-emissions-kpi-delta" data-direction="${dir}">${escapeHTML(deltaTxt)}</span>
          </div>
          <div class="pg-emissions-kpi-spark"><canvas data-spark="${c.id}"></canvas></div>
        </div>
      `;
    }).join('');

    /* Render sparklines */
    for (const k of POLL_KEYS) {
      const e = E[k];
      if (!e) continue;
      const canvas = el.querySelector(`canvas[data-spark="${k}"]`);
      if (!canvas) continue;
      const series = sliceHistory(e.history, local.range);
      const tone = severityFromRatio(e.threshold ? e.current / e.threshold : 0);
      const colorMap = {
        success: themePalette().success,
        info: themePalette().brand,
        warning: themePalette().warning,
        critical: themePalette().critical,
      };
      const color = colorMap[tone] || themePalette().brand;
      try { charts.spark[k]?.destroy(); } catch (_) {}
      charts.spark[k] = lineChart(canvas, [{
        label: e.label,
        data: series,
        color,
        tension: 0.45,
        borderWidth: 1.5,
      }], {
        labels: series.map((_, i) => i),
        options: {
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { point: { radius: 0 } },
        },
      });
    }
  }

  /* ============================================================
   * Render: multi-pollutant time series
   * ============================================================ */
  function renderTimeSeries() {
    const el = rootEl.querySelector('[data-region="timeseries"]');
    if (!el) return;
    const E = store.get('emissions') || {};
    const range = local.range;

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.timeseries'))}</h3>
          <small>${escapeHTML(t('emissions.section.timeseries_sub'))}</small>
        </div>
        <div class="pg-emissions-panel-actions">
          ${POLL_KEYS.map((k) => `<span class="pg-emissions-poll-pill" data-poll="${k}">${escapeHTML(pollLabel(k))} · ${escapeHTML(t('emissions.threshold'))} ${fmt.num(E[k]?.threshold || 0)} ${escapeHTML(E[k]?.unit || '')}</span>`).join('')}
        </div>
      </div>
      <div class="chart-frame" data-h="xl">
        <canvas data-chart="timeseries"></canvas>
      </div>
    `;

    const canvas = el.querySelector('canvas[data-chart="timeseries"]');
    if (!canvas) return;
    try { charts.series?.destroy(); } catch (_) {}

    /* Build normalized datasets (value / threshold) for direct comparison */
    const palette = themePalette();
    const colorByPoll = {
      co2: palette.brand,
      nox: palette.warning,
      sox: palette.critical,
    };
    const datasets = [];
    let series0 = [];
    for (const k of POLL_KEYS) {
      if (!local.polls[k]) continue;
      const e = E[k];
      if (!e) continue;
      const slice = sliceHistory(e.history, range);
      if (!series0.length) series0 = slice;
      const normalized = slice.map((v) => e.threshold ? +(v / e.threshold).toFixed(3) : 0);
      datasets.push({
        label: `${e.label} (${e.unit})`,
        data: normalized,
        color: colorByPoll[k],
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      });
    }
    /* Threshold reference line at ratio = 1 */
    if (datasets.length) {
      datasets.push({
        label: t('emissions.threshold'),
        data: new Array(series0.length).fill(1),
        color: palette.textMuted,
        fill: false,
        tension: 0,
        borderWidth: 1.2,
      });
    }

    const labels = timeLabelsFor(series0.length || 0, range);
    charts.series = lineChart(canvas, datasets, {
      labels,
      options: {
        scales: {
          x: { ticks: { color: palette.textSubtle, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { color: palette.grid } },
          y: {
            ticks: { color: palette.textSubtle, callback: (v) => `${Math.round(v * 100)}%` },
            grid: { color: palette.grid },
            suggestedMin: 0,
            suggestedMax: 1.4,
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: palette.textMuted, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const k = POLL_KEYS.filter((p) => local.polls[p])[ctx.datasetIndex];
                if (!k) return `${ctx.dataset.label}: ${fmt.num(ctx.parsed.y * 100, { maximumFractionDigits: 0 })}%`;
                const e = E[k];
                if (!e) return ctx.dataset.label;
                const raw = ctx.parsed.y * (e.threshold || 1);
                return `${e.label}: ${fmt.num(raw, { maximumFractionDigits: 1 })} ${e.unit} (${fmt.num(ctx.parsed.y * 100, { maximumFractionDigits: 0 })}% ${t('emissions.threshold').toLowerCase()})`;
              },
            },
          },
        },
      },
    });

    /* Re-style the threshold line: dashed and lighter */
    if (charts.series && charts.series.data.datasets.length) {
      const last = charts.series.data.datasets[charts.series.data.datasets.length - 1];
      last.borderDash = [6, 4];
      last.fill = false;
      last.pointRadius = 0;
      charts.series.update('none');
    }
  }

  /* ============================================================
   * Render: source attribution
   * ============================================================ */
  function renderAttribution() {
    const el = rootEl.querySelector('[data-region="attribution"]');
    if (!el) return;

    const E = store.get('emissions') || {};
    const vessels = store.get('vessels') || [];
    const docks = store.get('shore_power')?.docks || [];

    /* Sum per pollutant */
    const totalCurrent = (E.co2?.current || 0)
                       + (E.nox?.current || 0) / 1000  /* kg/h → t/h-ish for visual */
                       + (E.sox?.current || 0) / 1000;
    /* Vessel-emitted total (CO2 sum of fleet) */
    const vesselSum = vessels.reduce((acc, v) => acc + (v?.emissions?.co2 || 0) / 1000, 0);
    /* Auxiliary engines: estimate from non-shore-power-active occupied docks */
    const auxDocks = docks.filter((d) => d.occupied && !d.shore_power_active).length;
    const auxEst = auxDocks * 0.85; /* arbitrary unit */
    /* Background baseline: 5% of current */
    const baseline = totalCurrent * 0.05;
    const sumAttr = vesselSum + auxEst + baseline;

    const palette = themePalette();
    const segments = sumAttr > 0 ? [
      { id: 'vessels',  label: t('emissions.attribution.vessels'),     value: vesselSum, color: palette.brand },
      { id: 'aux',      label: t('emissions.attribution.aux_engines'), value: auxEst,    color: palette.warning },
      { id: 'baseline', label: t('emissions.attribution.baseline'),    value: baseline,  color: palette.success },
    ] : [];

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.attribution'))}</h3>
          <small>${escapeHTML(t('emissions.section.attribution_sub'))}</small>
        </div>
      </div>
      <div class="chart-frame" data-h="md">
        <canvas data-chart="attribution"></canvas>
      </div>
      <div class="pg-emissions-attribution-list" data-region="attr-list"></div>
    `;

    const canvas = el.querySelector('canvas[data-chart="attribution"]');
    try { charts.attribution?.destroy(); } catch (_) {}
    if (segments.length === 0 || sumAttr <= 0) {
      el.querySelector('[data-region="attr-list"]').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">${escapeHTML(t('emissions.attribution.empty'))}</div>
        </div>
      `;
      return;
    }

    charts.attribution = doughnutChart(canvas, segments, {
      cutout: '60%',
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: palette.textMuted, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed;
                const pct = sumAttr ? (v / sumAttr) * 100 : 0;
                return `${ctx.label}: ${fmt.num(v, { maximumFractionDigits: 2 })} (${fmt.num(pct, { maximumFractionDigits: 1 })}%)`;
              },
            },
          },
        },
      },
    });

    const list = el.querySelector('[data-region="attr-list"]');
    list.innerHTML = segments.map((s) => {
      const pct = sumAttr ? (s.value / sumAttr) * 100 : 0;
      return `
        <div class="pg-emissions-attribution-row">
          <span class="pg-emissions-attribution-swatch" style="background: ${s.color};"></span>
          <span class="pg-emissions-attribution-label">${escapeHTML(s.label)}</span>
          <span class="pg-emissions-attribution-value">${fmt.num(pct, { maximumFractionDigits: 1 })}%</span>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
   * Render: heatmap (pollutant rows × hour-of-day cols)
   * ============================================================ */
  function renderHeatmap() {
    const el = rootEl.querySelector('[data-region="heatmap"]');
    if (!el) return;
    const E = store.get('emissions') || {};

    /* Build 3 rows × 24 cols using last 24h history (48 ticks @ 30 min → 24 hourly buckets). */
    const rows = POLL_KEYS;
    const cols = 24;
    const values = rows.map((k) => {
      const hist = E[k]?.history || [];
      const thr = E[k]?.threshold || 1;
      const buckets = new Array(cols).fill(0);
      const counts = new Array(cols).fill(0);
      const ticks = hist.length;
      if (!ticks) return buckets;
      for (let i = 0; i < ticks; i++) {
        const hour = Math.floor(i / 2) % cols;
        buckets[hour] += hist[i];
        counts[hour] += 1;
      }
      for (let c = 0; c < cols; c++) {
        if (counts[c] > 0) buckets[c] = (buckets[c] / counts[c]) / thr;
      }
      return buckets;
    });

    let max = 0;
    for (const row of values) for (const v of row) if (v > max) max = v;
    if (max < 1) max = 1; /* keep limit ratio = 1 visible */

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.heatmap'))}</h3>
          <small>${escapeHTML(t('emissions.heatmap.caption'))}</small>
        </div>
      </div>
      <div class="pg-emissions-heatmap-frame">
        <div class="pg-emissions-heatmap-grid">
          <div class="pg-emissions-heatmap-row-labels">
            ${rows.map((k) => `<div>${escapeHTML(pollLabel(k))}</div>`).join('')}
          </div>
          <canvas class="pg-emissions-heatmap-canvas" data-chart="heatmap"></canvas>
        </div>
        <div class="pg-emissions-heatmap-axis">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
        <div class="pg-emissions-heatmap-legend">
          <span>${escapeHTML(t('emissions.heatmap.legend'))}</span>
          <span class="pg-emissions-heatmap-legend-bar"></span>
        </div>
      </div>
    `;

    const canvas = el.querySelector('canvas[data-chart="heatmap"]');
    if (canvas) {
      /* defer to next frame so canvas has a layout size */
      requestAnimationFrame(() => {
        try {
          drawHeatmap(canvas, { rows: rows.length, cols, values, min: 0, max, color: themePalette().critical });
        } catch (_) { /* canvas may have unmounted between rAF */ }
      });
    }
  }

  /* ============================================================
   * Render: compliance gauges
   * ============================================================ */
  function renderCompliance() {
    const el = rootEl.querySelector('[data-region="compliance"]');
    if (!el) return;
    const E = store.get('emissions') || {};
    const range = local.range;
    const palette = themePalette();
    const toneToColor = {
      success: palette.success, info: palette.brand, warning: palette.warning, critical: palette.critical,
    };

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.compliance'))}</h3>
          <small>${escapeHTML(fmt.rangeLabel(range))}</small>
        </div>
      </div>
      <div data-region="compliance-rows"></div>
    `;

    const rowsEl = el.querySelector('[data-region="compliance-rows"]');
    const rows = POLL_KEYS.map((k) => {
      const e = E[k];
      if (!e) return null;
      const series = sliceHistory(e.history, range);
      const cur = e.current;
      const thr = e.threshold;
      const ratio = thr ? cur / thr : 0;
      const tone = severityFromRatio(ratio);
      const exceedances = series.filter((v) => v > thr).length;
      const mean = series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0;
      const max = series.length ? Math.max(...series) : 0;
      let stateLabel;
      if (tone === 'critical') stateLabel = t('emissions.compliance.violation');
      else if (tone === 'warning') stateLabel = t('emissions.compliance.warning');
      else stateLabel = t('emissions.compliance.compliant');
      return { k, e, ratio, tone, exceedances, mean, max, stateLabel };
    }).filter(Boolean);

    rowsEl.innerHTML = rows.map((r) => {
      const widthPct = Math.max(2, Math.min(140, r.ratio * 100));
      const fillColor = toneToColor[r.tone];
      return `
        <div class="pg-emissions-compliance-row">
          <div class="pg-emissions-compliance-head">
            <div class="pg-emissions-compliance-head-left">
              <span class="pg-emissions-compliance-name">${escapeHTML(r.e.label)}</span>
              <span class="badge" data-tone="${r.tone}">${escapeHTML(r.stateLabel)}</span>
            </div>
            <span class="pg-emissions-compliance-ratio">
              ${fmt.num(r.e.current, { maximumFractionDigits: 1 })} / ${fmt.num(r.e.threshold)} ${escapeHTML(r.e.unit)}
            </span>
          </div>
          <div class="pg-emissions-compliance-bar" aria-label="${escapeHTML(t('emissions.compliance.ratio', { pct: fmt.num(r.ratio * 100, { maximumFractionDigits: 0 }) }))}">
            <div class="pg-emissions-compliance-bar-fill" style="width: ${Math.min(100, widthPct)}%; background: ${fillColor};"></div>
            <div class="pg-emissions-compliance-bar-mark" style="left: 100%;"></div>
          </div>
          <div class="pg-emissions-compliance-stats">
            <div class="pg-emissions-compliance-stat">
              <span>${escapeHTML(t('emissions.compliance.label.mean'))}</span>
              <span class="pg-emissions-compliance-stat-value">${fmt.num(r.mean, { maximumFractionDigits: 1 })} ${escapeHTML(r.e.unit)}</span>
            </div>
            <div class="pg-emissions-compliance-stat">
              <span>${escapeHTML(t('emissions.compliance.label.max'))}</span>
              <span class="pg-emissions-compliance-stat-value">${fmt.num(r.max, { maximumFractionDigits: 1 })} ${escapeHTML(r.e.unit)}</span>
            </div>
            <div class="pg-emissions-compliance-stat">
              <span>${escapeHTML(t('emissions.compliance.label.exceedances'))}</span>
              <span class="pg-emissions-compliance-stat-value" style="color: ${r.exceedances ? palette.critical : palette.success};">${fmt.num(r.exceedances)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
   * Render: forecast (next 6h, CO2)
   * ============================================================ */
  function renderForecast() {
    const el = rootEl.querySelector('[data-region="forecast"]');
    if (!el) return;
    const E = store.get('emissions') || {};
    const co2 = E.co2;
    const palette = themePalette();

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.forecast'))}</h3>
          <small>${escapeHTML(t('emissions.forecast.next6h'))}</small>
        </div>
      </div>
      <div class="chart-frame" data-h="md">
        <canvas data-chart="forecast"></canvas>
      </div>
      <div class="pg-emissions-forecast-foot">
        <span class="pg-emissions-forecast-projection" data-projection></span>
        <span>${escapeHTML(t('emissions.forecast.caption'))}</span>
      </div>
    `;
    if (!co2) return;

    /* Use the last 12 history points (most recent 6h at 30-min ticks) */
    const recent = (co2.history || []).slice(-12);
    const { slope, intercept } = linReg(recent);
    /* History points are at index 0..11, project 12..23 (next 6h, 30-min spacing) */
    const projected = [];
    for (let i = 0; i < 12; i++) {
      projected.push(+(intercept + slope * (recent.length + i)).toFixed(2));
    }

    /* Find first projected breach */
    let breachIdx = -1;
    for (let i = 0; i < projected.length; i++) {
      if (projected[i] > co2.threshold) { breachIdx = i; break; }
    }
    const breachTime = breachIdx >= 0 ? new Date(Date.now() + (breachIdx + 1) * 30 * 60 * 1000) : null;

    const totalCount = recent.length + projected.length;
    const histData = new Array(totalCount).fill(null);
    const projData = new Array(totalCount).fill(null);
    const thrData = new Array(totalCount).fill(co2.threshold);
    for (let i = 0; i < recent.length; i++) histData[i] = recent[i];
    /* connect last historical point */
    projData[recent.length - 1] = recent[recent.length - 1];
    for (let i = 0; i < projected.length; i++) projData[recent.length + i] = projected[i];

    const labels = [];
    for (let i = 0; i < totalCount; i++) {
      const offsetMin = (i - recent.length + 1) * 30;
      const ts = Date.now() + offsetMin * 60 * 1000;
      const d = new Date(ts);
      labels.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }

    const canvas = el.querySelector('canvas[data-chart="forecast"]');
    try { charts.forecast?.destroy(); } catch (_) {}
    charts.forecast = lineChart(canvas, [
      { label: `${co2.label} ${t('common.average').toLowerCase()}`, data: histData, color: palette.brand, fill: true, tension: 0.4 },
      { label: `${co2.label} · ${t('emissions.forecast.next6h')}`, data: projData, color: palette.brandBright, fill: false, tension: 0.4 },
      { label: t('emissions.threshold'), data: thrData, color: palette.warning, fill: false, tension: 0 },
    ], {
      labels,
      options: {
        scales: {
          x: {
            ticks: { color: palette.textSubtle, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { color: palette.grid },
          },
          y: {
            beginAtZero: false,
            ticks: { color: palette.textSubtle },
            grid: { color: palette.grid },
            suggestedMin: 0,
            suggestedMax: co2.threshold * 1.5,
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: palette.textMuted, font: { size: 11 } } },
        },
      },
    });

    /* Tweak per-dataset styling: dashed projection + dashed threshold */
    if (charts.forecast && charts.forecast.data.datasets.length >= 3) {
      charts.forecast.data.datasets[1].borderDash = [4, 4];
      charts.forecast.data.datasets[1].fill = false;
      charts.forecast.data.datasets[2].borderDash = [6, 4];
      charts.forecast.data.datasets[2].fill = false;
      charts.forecast.data.datasets[2].pointRadius = 0;
      charts.forecast.update('none');
    }

    const projEl = el.querySelector('[data-projection]');
    if (projEl) {
      if (breachTime) {
        projEl.dataset.tone = 'critical';
        projEl.textContent = t('emissions.forecast.projected_breach', { time: fmt.hourMin(breachTime) });
      } else {
        projEl.dataset.tone = 'success';
        projEl.textContent = t('emissions.forecast.no_breach');
      }
    }
  }

  /* ============================================================
   * Render: top contributors table
   * ============================================================ */
  function renderContributors() {
    const el = rootEl.querySelector('[data-region="contributors"]');
    if (!el) return;
    const vessels = (store.get('vessels') || []).slice();
    const palette = themePalette();
    /* Sort by current CO₂ */
    vessels.sort((a, b) => (b?.emissions?.co2 || 0) - (a?.emissions?.co2 || 0));
    const limit = local.showAllContrib ? vessels.length : 10;
    const visible = vessels.slice(0, limit);
    /* For severity bar, normalize CO2 to fleet max */
    const fleetMax = vessels.reduce((acc, v) => Math.max(acc, v?.emissions?.co2 || 0), 0) || 1;

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.contributors'))}</h3>
          <small>${escapeHTML(t('emissions.contributors.title'))}</small>
        </div>
        <div class="pg-emissions-panel-actions">
          <span class="badge" data-tone="info">${fmt.num(vessels.length)} ${escapeHTML(t('common.total').toLowerCase())}</span>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table compact pg-emissions-contrib-table">
          <thead>
            <tr>
              <th>${escapeHTML(t('emissions.contributors.col.vessel'))}</th>
              <th>${escapeHTML(t('emissions.contributors.col.type'))}</th>
              <th>${escapeHTML(t('emissions.contributors.col.fuel'))}</th>
              <th>${escapeHTML(t('emissions.contributors.col.co2'))}</th>
              <th>${escapeHTML(t('emissions.contributors.col.nox'))}</th>
              <th>${escapeHTML(t('emissions.contributors.col.sox'))}</th>
              <th>${escapeHTML(t('emissions.contributors.col.severity'))}</th>
              <th>${escapeHTML(t('common.actions'))}</th>
            </tr>
          </thead>
          <tbody data-region="contrib-body"></tbody>
        </table>
      </div>
      ${vessels.length > 10 ? `
        <div class="pg-emissions-contrib-toggle">
          <button class="btn btn--ghost btn--sm" data-action="toggle-all">
            ${escapeHTML(local.showAllContrib ? t('emissions.contributors.show_less') : t('emissions.contributors.show_all'))}
          </button>
        </div>
      ` : ''}
    `;

    const tbody = el.querySelector('[data-region="contrib-body"]');
    if (!tbody) return;
    if (vessels.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="empty-state-title">${escapeHTML(t('emissions.contributors.empty'))}</div>
          </div>
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = visible.map((v) => {
      const co2 = v?.emissions?.co2 || 0;
      const nox = v?.emissions?.nox || 0;
      const sox = v?.emissions?.sox || 0;
      const sev = v.severity || 'info';
      const ratio = co2 / fleetMax;
      const barTone = sev === 'success' ? 'info' : sev;
      return `
        <tr>
          <td>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-weight: var(--fw-semibold); color: var(--text-primary);">${escapeHTML(v.name || '–')}</span>
              <span class="pg-emissions-contrib-imo">${escapeHTML(v.id || '–')}</span>
            </div>
          </td>
          <td>${escapeHTML(t(`type.${v.type}`) || v.type || '–')}</td>
          <td>${escapeHTML(v.fuel || '–')}</td>
          <td>
            <div class="pg-emissions-contrib-cell-emit">
              <div class="bar-mini" data-tone="${barTone}" style="width: 80px;">
                <div class="bar-mini-fill" style="width: ${Math.max(2, ratio * 100)}%;"></div>
              </div>
              <span>${fmt.num(co2, { maximumFractionDigits: 1 })}</span>
            </div>
          </td>
          <td style="font-family: var(--font-mono);">${fmt.num(nox, { maximumFractionDigits: 1 })}</td>
          <td style="font-family: var(--font-mono);">${fmt.num(sox, { maximumFractionDigits: 1 })}</td>
          <td><span class="badge" data-tone="${sev}">${escapeHTML(t(`kpi.status.${sev}`) || sev)}</span></td>
          <td>
            <button class="btn btn--ghost btn--sm" data-action="open-vessel" data-id="${escapeHTML(v.id || '')}">
              ${escapeHTML(t('emissions.contributors.open_vessel'))}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    el.querySelector('[data-action="toggle-all"]')?.addEventListener('click', () => {
      local.showAllContrib = !local.showAllContrib;
      renderContributors();
    });
    tbody.querySelectorAll('[data-action="open-vessel"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (id) navigate('vessels', { id });
      });
    });
  }

  /* ============================================================
   * Manual reading form & list
   * ============================================================ */
  function openManualReadingForm() {
    const vessels = store.get('vessels') || [];
    const polls = [
      { value: 'co2', label: pollLabel('co2') },
      { value: 'nox', label: pollLabel('nox') },
      { value: 'sox', label: pollLabel('sox') },
    ];
    const sources = [
      { value: 'vessel',  label: t('emissions.field.source.vessel') },
      { value: 'dock',    label: t('emissions.field.source.dock') },
      { value: 'station', label: t('emissions.field.source.station') },
      { value: 'other',   label: t('emissions.field.source.other') },
    ];
    const units = [
      { value: 'kg/h',  label: 'kg/h' },
      { value: 't/h',   label: 't/h' },
      { value: 'µg/m³', label: 'µg/m³' },
      { value: 'ppm',   label: 'ppm' },
    ];
    const vesselOpts = [{ value: '', label: t('emissions.field.vessel.none') }]
      .concat(vessels.map((v) => ({ value: v.id, label: `${v.name || v.id} · ${v.id}` })));

    const now = new Date();
    /* datetime-local input format: YYYY-MM-DDTHH:MM */
    const dtDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    openForm({
      title: t('emissions.manual.modal.title'),
      subtitle: t('emissions.manual.modal.subtitle'),
      submitLabel: t('common.save'),
      fields: [
        { id: 'ts', label: t('emissions.field.timestamp'), type: 'datetime', value: dtDefault, required: true },
        { id: 'pollutant', label: t('emissions.field.pollutant'), type: 'select', value: 'co2', required: true, options: polls },
        { id: 'value', label: t('emissions.field.value'), type: 'number', step: '0.01', required: true, validate: compose(required, minNumber(0)) },
        { id: 'unit', label: t('emissions.field.unit'), type: 'select', value: 't/h', options: units },
        { id: 'source', label: t('emissions.field.source'), type: 'select', value: 'vessel', options: sources },
        { id: 'vessel_id', label: `${t('emissions.field.vessel')} ${t('common.optional')}`, type: 'select', value: '', options: vesselOpts },
        { id: 'notes', label: `${t('emissions.field.notes')} ${t('common.optional')}`, type: 'textarea', rows: 3 },
      ],
      onSubmit: (values) => {
        store.dispatch('addManualReading', {
          ts: +new Date(values.ts),
          pollutant: values.pollutant,
          value: Number(values.value),
          unit: values.unit,
          source: values.source,
          vessel_id: values.vessel_id || null,
          notes: values.notes || '',
        });
      },
    });
  }

  function renderManual() {
    const el = rootEl.querySelector('[data-region="manual"]');
    if (!el) return;
    const list = (store.get('manual_readings') || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const vessels = store.get('vessels') || [];
    const vesselById = new Map(vessels.map((v) => [v.id, v]));

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.manual'))}</h3>
          <small>${fmt.num(list.length)} ${escapeHTML(list.length === 1 ? 'kayıt' : 'kayıt')}</small>
        </div>
        <div class="pg-emissions-panel-actions">
          <button class="btn btn--primary btn--sm" data-action="add-reading">
            ${escapeHTML(t('emissions.manual.add'))}
          </button>
        </div>
      </div>
      <div data-region="manual-body"></div>
    `;
    el.querySelector('[data-action="add-reading"]')?.addEventListener('click', openManualReadingForm);

    const body = el.querySelector('[data-region="manual-body"]');
    if (!body) return;
    if (list.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-4"/><path d="M9 11V7a3 3 0 116 0v4"/></svg>
          </div>
          <div class="empty-state-title">${escapeHTML(t('emissions.manual.empty.title'))}</div>
          <div class="empty-state-body">${escapeHTML(t('emissions.manual.empty.body'))}</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="data-table compact pg-emissions-manual-table">
          <thead>
            <tr>
              <th>${escapeHTML(t('emissions.manual.col.ts'))}</th>
              <th>${escapeHTML(t('emissions.manual.col.poll'))}</th>
              <th>${escapeHTML(t('emissions.manual.col.value'))}</th>
              <th>${escapeHTML(t('emissions.manual.col.source'))}</th>
              <th>${escapeHTML(t('emissions.manual.col.vessel'))}</th>
              <th>${escapeHTML(t('emissions.manual.col.notes'))}</th>
              <th></th>
            </tr>
          </thead>
          <tbody data-region="manual-rows"></tbody>
        </table>
      </div>
    `;
    const rowsEl = body.querySelector('[data-region="manual-rows"]');
    rowsEl.innerHTML = list.map((r) => {
      const vessel = r.vessel_id ? vesselById.get(r.vessel_id) : null;
      const vesselTxt = vessel ? `${vessel.name || vessel.id}` : (r.vessel_id || '–');
      return `
        <tr data-id="${escapeHTML(r.id)}">
          <td style="font-family: var(--font-mono); font-size: var(--fs-xs);">${escapeHTML(fmt.dateTime(r.ts))}</td>
          <td><span class="pg-emissions-poll-pill" data-poll="${escapeHTML(r.pollutant)}">${escapeHTML(pollLabel(r.pollutant))}</span></td>
          <td class="pg-emissions-manual-poll">${fmt.num(r.value, { maximumFractionDigits: 2 })} <span style="color: var(--text-tertiary); font-weight: var(--fw-regular);">${escapeHTML(r.unit || '')}</span></td>
          <td>${escapeHTML(t(`emissions.field.source.${r.source}`) || r.source || '–')}</td>
          <td>${escapeHTML(vesselTxt)}</td>
          <td><div class="pg-emissions-manual-notes" title="${escapeHTML(r.notes || '')}">${escapeHTML(r.notes || '–')}</div></td>
          <td>
            <button class="pg-emissions-manual-delete" data-action="delete-reading" data-id="${escapeHTML(r.id)}" aria-label="${escapeHTML(t('common.delete'))}">
              ${escapeHTML(t('common.delete'))}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    rowsEl.querySelectorAll('[data-action="delete-reading"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirm({
          title: t('common.confirm'),
          body: t('emissions.manual.confirm_delete'),
          danger: true,
          confirmLabel: t('common.delete'),
        });
        if (ok) store.dispatch('removeManualReading', btn.dataset.id);
      });
    });
  }

  /* ============================================================
   * Render: active emission alerts strip
   * ============================================================ */
  function renderAlerts() {
    const el = rootEl.querySelector('[data-region="alerts"]');
    if (!el) return;
    const alerts = (store.get('alerts') || []).filter((a) => {
      if (!a) return false;
      if (a.resolved || a.dismissed) return false;
      return a.category === 'emissions';
    }).slice(0, 12);

    el.innerHTML = `
      <div class="pg-emissions-panel-head">
        <div class="pg-emissions-panel-title">
          <h3>${escapeHTML(t('emissions.section.alerts'))}</h3>
          <small>${fmt.num(alerts.length)} ${escapeHTML(t('common.total').toLowerCase())}</small>
        </div>
        <div class="pg-emissions-panel-actions">
          <button class="btn btn--ghost btn--sm" data-action="view-all-alerts">${escapeHTML(t('emissions.alerts.view'))}</button>
        </div>
      </div>
      <div data-region="alerts-body"></div>
    `;
    el.querySelector('[data-action="view-all-alerts"]')?.addEventListener('click', () => navigate('alerts'));

    const body = el.querySelector('[data-region="alerts-body"]');
    if (!body) return;
    if (alerts.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">${escapeHTML(t('emissions.alerts.empty'))}</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `<div class="pg-emissions-alerts-strip">${alerts.map((a) => {
      const sev = a.severity || 'info';
      const title = a.title_key ? t(a.title_key, a.body_params || {}) : (a.title || '');
      const bodyText = a.body_key ? t(a.body_key, a.body_params || {}) : (a.body || '');
      return `
        <div class="pg-emissions-alert-card" data-severity="${escapeHTML(sev)}" data-id="${escapeHTML(a.id || '')}">
          <div class="pg-emissions-alert-head">
            <span class="badge" data-tone="${escapeHTML(sev)}">${escapeHTML(t(`emissions.alerts.severity.${sev}`) || sev)}</span>
            <span class="pg-emissions-alert-ts">${escapeHTML(fmt.relativeTime(a.ts || Date.now()))}</span>
          </div>
          <div class="pg-emissions-alert-title">${escapeHTML(title)}</div>
          <div class="pg-emissions-alert-body">${escapeHTML(bodyText)}</div>
          <div class="pg-emissions-alert-foot">
            <button class="btn btn--ghost btn--sm" data-action="open-alert">${escapeHTML(t('emissions.alerts.view'))}</button>
          </div>
        </div>
      `;
    }).join('')}</div>`;

    body.querySelectorAll('[data-action="open-alert"]').forEach((btn) => {
      btn.addEventListener('click', () => navigate('alerts'));
    });
  }

  /* ============================================================
   * Master render
   * ============================================================ */
  function renderAll() {
    destroyCharts();
    renderHeader();
    renderKpis();
    renderTimeSeries();
    renderAttribution();
    renderHeatmap();
    renderCompliance();
    renderForecast();
    renderContributors();
    renderManual();
    renderAlerts();
  }

  /* ============================================================
   * Subscriptions
   * ============================================================ */
  const unsubs = [];
  let scheduled = false;
  function scheduleRender(partial) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (partial === 'kpi') {
        renderKpis();
        renderTimeSeries();
        renderCompliance();
        renderForecast();
        renderHeatmap();
        renderAttribution();
      } else if (partial === 'manual') {
        renderManual();
      } else if (partial === 'alerts') {
        renderAlerts();
      } else if (partial === 'vessels') {
        renderAttribution();
        renderContributors();
      } else {
        renderAll();
      }
    });
  }

  unsubs.push(store.subscribe('emissions', () => scheduleRender('kpi')));
  unsubs.push(store.subscribe('vessels',   () => scheduleRender('vessels')));
  unsubs.push(store.subscribe('alerts',    () => scheduleRender('alerts')));
  unsubs.push(store.subscribe('manual_readings', () => scheduleRender('manual')));
  unsubs.push(store.subscribe('weather',   () => scheduleRender('kpi')));
  unsubs.push(store.subscribe('shore_power', () => scheduleRender('vessels')));
  unsubs.push(store.subscribe('ui',        () => {
    /* theme or language change → full re-render */
    scheduleRender();
  }));

  /* Initial render */
  renderAll();

  return {
    unmount() {
      destroyCharts();
      unsubs.forEach((u) => { try { u(); } catch (_) {} });
      unsubs.length = 0;
      rootEl.innerHTML = '';
    },
  };
}
