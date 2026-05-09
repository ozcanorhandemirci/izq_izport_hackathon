/**
 * pages/reports.js — PDF report builder for the PORT.IQ İzmir platform.
 *
 * Two-column layout:
 *   LEFT  — Builder controls (template, range, sections, filters, cover, CTA)
 *   RIGHT — Live preview (mirrors what the PDF will contain)
 *
 * Source slices read on every render: vessels, manual_vessels, emissions,
 * shore_power, alerts, recommendations, manual_readings, weather, meta and
 * the persisted `report_config`. Persists user choices via `setReportConfig`.
 *
 * The PDF is generated on demand using the createPdf factory (jsPDF +
 * html2canvas hybrid). Charts that are embedded in the PDF are rendered to
 * an off-screen DOM host with explicit light-on-light colors so they match
 * the white PDF background.
 */

import store from '../store/state.js';
import { t, registerStrings, getLanguage } from '../i18n.js';
import * as fmt from '../utils/format.js';
import { lineChart, barChart, doughnutChart, themePalette, hexAlpha } from '../utils/charts.js';
import { openForm, openModal, confirm } from '../utils/modal.js';
import { createPdf, loadPdfLibs } from '../utils/pdf.js';
import { snapshot } from '../store/persistence.js';

/* ============================================================
 * i18n strings (registered once at module load)
 * ============================================================ */
registerStrings({
  tr: {
    'reports.builder':        'Rapor Oluşturucu',
    'reports.preview':        'Canlı Önizleme',
    'reports.default_title':  'İzmir Limanı Operasyon Raporu',

    'reports.template.title':        'Şablon',
    'reports.template.executive':    'Yönetici Özeti',
    'reports.template.compliance':   'Uyum Denetimi',
    'reports.template.operations':   'Operasyon Brifingi',
    'reports.template.shore':        'Karadan Güç ROI',
    'reports.template.alerts':       'Uyarı Özeti',
    'reports.template.custom':       'Özel',
    'reports.template.executive.desc':  'Kapak + KPI + ana eğilimler',
    'reports.template.compliance.desc': 'Aşımlar, zaman serisi, manuel okumalar',
    'reports.template.operations.desc': 'Gemi listesi, ETA, karadan güç, hava',
    'reports.template.shore.desc':      'Kapasite, tasarruf ve uygulanan öneriler',
    'reports.template.alerts.desc':     'Açık ve çözülmüş uyarılar, öneriler',
    'reports.template.custom.desc':     'Bölümleri tek tek seç',

    'reports.range.label':  'Tarih aralığı',
    'reports.range.from':   'Başlangıç',
    'reports.range.to':     'Bitiş',

    'reports.sections.label':       'Bölümler',
    'reports.section.cover':        'Kapak',
    'reports.section.summary':      'Yönetici Özeti',
    'reports.section.kpis':         'KPI Görünümü',
    'reports.section.vessels':      'Gemiler',
    'reports.section.emissions':    'Emisyonlar',
    'reports.section.shore':        'Karadan Güç',
    'reports.section.alerts':       'Uyarı ve Öneriler',
    'reports.section.timeseries':   'Zaman Serisi',
    'reports.section.compliance':   'Uyum Tablosu',
    'reports.section.appendix':     'Ek',
    'reports.section.contributors':       'En Yüksek Katkı',
    'reports.section.emissions.caption':  'Liman geneli CO₂ — son 24s',
    'reports.section.shore.caption':      'Rıhtım yük dağılımı (kW)',
    'reports.section.timeseries.caption': '{p} eğilimi — son 24s',

    'reports.section.summary.body':
      'Bu rapor seçilen aralıkta İzmir Limanı operasyon ve hava kalitesi performansını özetler. KPI değerleri, eşik aşımları, karadan güç kullanımı ve aktif öneriler aşağıdaki bölümlerde detaylandırılmıştır.',
    'reports.section.alerts.summary':
      '{open} açık, {resolved} çözülmüş uyarı tespit edildi. Operasyon ekibi tarafından {applied} öneri uygulandı.',

    'reports.section.appendix.glossary': 'Kısaltmalar',
    'reports.section.appendix.glossary.co2':       'CO₂ — Karbondioksit emisyonu (t/sa)',
    'reports.section.appendix.glossary.nox':       'NOₓ — Azot oksitler (kg/sa)',
    'reports.section.appendix.glossary.sox':       'SOₓ — Sülfür oksitler (kg/sa)',
    'reports.section.appendix.glossary.shore':     'Karadan güç — Yanaşan geminin yardımcı motor yerine şebekeden beslenmesi',
    'reports.section.appendix.glossary.dispersion':'Dağılım — Atmosferik koşulların kirleticileri seyreltme kapasitesi',
    'reports.section.appendix.glossary.eta':       'ETA — Tahmini varış zamanı',
    'reports.section.appendix.glossary.aux':       'Aux — Geminin yardımcı motoru',
    'reports.section.appendix.notes':              'Veri kaynakları: simülasyon motoru, kural tabanlı uyarı motoru, manuel girilen okumalar.',

    'reports.cover.author':       'Hazırlayan',
    'reports.cover.title.field':  'Başlık',
    'reports.cover.notes':        'Yönetici özeti notları (opsiyonel)',

    'reports.filters.pollutants':  'Kirleticiler',
    'reports.filters.severities':  'Önem Seviyesi',
    'reports.filters.severity.critical':  'Kritik',
    'reports.filters.severity.warning':   'Uyarı',
    'reports.filters.severity.info':      'Gözlem',

    'reports.cta.generate':    'PDF Oluştur',
    'reports.cta.generating':  'Oluşturuluyor…',
    'reports.cta.reset':       'Varsayılana dön',
    'reports.cta.snapshot':    'Yapılandırma kaydedildi',

    'reports.recent.title':         'Son Raporlar',
    'reports.recent.empty':         'Henüz oluşturulmuş rapor yok.',
    'reports.recent.clear':         'Listeyi temizle',
    'reports.recent.clear.confirm': 'Tüm geçmiş kayıtları silinecek. Devam edilsin mi?',
    'reports.recent.reload':        'Yapılandırmayı yükle',
    'reports.recent.sections':      '{n} bölüm',

    'reports.preview.empty.title':  'Hiç bölüm seçilmedi',
    'reports.preview.empty.body':   'Soldan en az bir bölüm seç. Önizleme burada belirecek.',
    'reports.preview.skipped':      '— bu bölümde gösterilecek veri yok',

    'reports.summary.vessels':    '{n} gemi izleme altında',
    'reports.summary.alerts':     '{open} açık · {resolved} çözülmüş uyarı',
    'reports.summary.shore':      '{n} rıhtım karadan güç çekiyor · {co2} kg CO₂/s tasarruf',
    'reports.summary.compliance': '%{p} uyum oranı (eşik bazlı)',

    'reports.col.vessel':       'Gemi',
    'reports.col.type':         'Tip',
    'reports.col.fuel':         'Yakıt',
    'reports.col.status':       'Durum',
    'reports.col.co2':          'CO₂',
    'reports.col.nox':          'NOₓ',
    'reports.col.sox':          'SOₓ',
    'reports.col.severity':     'Sev.',
    'reports.col.contributor':  'Kaynak',
    'reports.col.value':        'Değer',
    'reports.col.share':        'Pay',
    'reports.col.metric':       'Metrik',
    'reports.col.threshold':    'Limit',
    'reports.col.current':      'Anlık',
    'reports.col.status_short': 'Durum',
    'reports.col.berth':        'Rıhtım',
    'reports.col.kw':           'Yük (kW)',
    'reports.col.shore_state':  'Karadan Güç',

    'reports.preview.cover.subtitle': 'Liman Operasyonları Brifingi',
    'reports.preview.cover.author':   'Hazırlayan',
    'reports.preview.cover.gen':      'Üretildi',
    'reports.preview.cover.range':    'Aralık',
    'reports.preview.kpi.vessels':    'Gemi',
    'reports.preview.kpi.alerts':     'Açık Uyarı',
    'reports.preview.kpi.shore':      'Karadan Güç',
    'reports.preview.kpi.co2':        'CO₂ Anlık',
    'reports.preview.kpi.nox':        'NOₓ Anlık',
    'reports.preview.kpi.sox':        'SOₓ Anlık',
    'reports.preview.compliant':      'Uyumlu',
    'reports.preview.over_limit':     'Limit Üstü',
    'reports.preview.toggle':         'Bölümü gizle/göster',
  },
  en: {
    'reports.builder':        'Report Builder',
    'reports.preview':        'Live Preview',
    'reports.default_title':  'Port of İzmir Operations Report',

    'reports.template.title':        'Template',
    'reports.template.executive':    'Executive Summary',
    'reports.template.compliance':   'Compliance Audit',
    'reports.template.operations':   'Operations Brief',
    'reports.template.shore':        'Shore Power ROI',
    'reports.template.alerts':       'Alerts Digest',
    'reports.template.custom':       'Custom',
    'reports.template.executive.desc':  'Cover + KPI grid + key trends',
    'reports.template.compliance.desc': 'Exceedances, time series, manual readings',
    'reports.template.operations.desc': 'Vessels, ETA, shore power, weather',
    'reports.template.shore.desc':      'Capacity, savings & applied recommendations',
    'reports.template.alerts.desc':     'Open + resolved alerts with recommendations',
    'reports.template.custom.desc':     'Pick every section yourself',

    'reports.range.label':  'Date range',
    'reports.range.from':   'From',
    'reports.range.to':     'To',

    'reports.sections.label':       'Sections',
    'reports.section.cover':        'Cover',
    'reports.section.summary':      'Executive Summary',
    'reports.section.kpis':         'KPI Snapshot',
    'reports.section.vessels':      'Vessels',
    'reports.section.emissions':    'Emissions',
    'reports.section.shore':        'Shore Power',
    'reports.section.alerts':       'Alerts & Recommendations',
    'reports.section.timeseries':   'Time Series',
    'reports.section.compliance':   'Compliance',
    'reports.section.appendix':     'Appendix',
    'reports.section.contributors':       'Top Contributors',
    'reports.section.emissions.caption':  'Port-wide CO₂ — last 24h',
    'reports.section.shore.caption':      'Berth load distribution (kW)',
    'reports.section.timeseries.caption': '{p} trend — last 24h',

    'reports.section.summary.body':
      'This report summarizes İzmir Port operations and air quality performance for the selected range. KPI values, threshold breaches, shore-power utilization and active recommendations are detailed in the sections that follow.',
    'reports.section.alerts.summary':
      '{open} open and {resolved} resolved alerts were detected. The operations team applied {applied} recommendations.',

    'reports.section.appendix.glossary': 'Glossary',
    'reports.section.appendix.glossary.co2':       'CO₂ — Carbon dioxide emissions (t/h)',
    'reports.section.appendix.glossary.nox':       'NOₓ — Nitrogen oxides (kg/h)',
    'reports.section.appendix.glossary.sox':       'SOₓ — Sulfur oxides (kg/h)',
    'reports.section.appendix.glossary.shore':     'Shore power — Cold-ironing: vessel powered from grid instead of aux engine',
    'reports.section.appendix.glossary.dispersion':'Dispersion — Atmospheric capacity to dilute pollutants',
    'reports.section.appendix.glossary.eta':       'ETA — Estimated time of arrival',
    'reports.section.appendix.glossary.aux':       'Aux — Vessel auxiliary engine',
    'reports.section.appendix.notes':              'Data sources: simulation engine, rule-based alert engine, manually entered readings.',

    'reports.cover.author':       'Author',
    'reports.cover.title.field':  'Title',
    'reports.cover.notes':        'Executive summary notes (optional)',

    'reports.filters.pollutants':  'Pollutants',
    'reports.filters.severities':  'Severity',
    'reports.filters.severity.critical':  'Critical',
    'reports.filters.severity.warning':   'Warning',
    'reports.filters.severity.info':      'Info',

    'reports.cta.generate':    'Generate PDF',
    'reports.cta.generating':  'Generating…',
    'reports.cta.reset':       'Reset to defaults',
    'reports.cta.snapshot':    'Configuration saved',

    'reports.recent.title':         'Recent Reports',
    'reports.recent.empty':         'No reports generated yet.',
    'reports.recent.clear':         'Clear list',
    'reports.recent.clear.confirm': 'All history entries will be removed. Continue?',
    'reports.recent.reload':        'Load configuration',
    'reports.recent.sections':      '{n} sections',

    'reports.preview.empty.title':  'No sections selected',
    'reports.preview.empty.body':   'Pick at least one section on the left. The preview will populate here.',
    'reports.preview.skipped':      '— no data available for this section',

    'reports.summary.vessels':    '{n} vessels under watch',
    'reports.summary.alerts':     '{open} open · {resolved} resolved alerts',
    'reports.summary.shore':      '{n} berths drawing shore power · {co2} kg CO₂/h avoided',
    'reports.summary.compliance': '{p}% compliance vs. emission thresholds',

    'reports.col.vessel':       'Vessel',
    'reports.col.type':         'Type',
    'reports.col.fuel':         'Fuel',
    'reports.col.status':       'Status',
    'reports.col.co2':          'CO₂',
    'reports.col.nox':          'NOₓ',
    'reports.col.sox':          'SOₓ',
    'reports.col.severity':     'Sev.',
    'reports.col.contributor':  'Source',
    'reports.col.value':        'Value',
    'reports.col.share':        'Share',
    'reports.col.metric':       'Metric',
    'reports.col.threshold':    'Limit',
    'reports.col.current':      'Current',
    'reports.col.status_short': 'Status',
    'reports.col.berth':        'Berth',
    'reports.col.kw':           'Load (kW)',
    'reports.col.shore_state':  'Shore Power',

    'reports.preview.cover.subtitle': 'Port Operations Briefing',
    'reports.preview.cover.author':   'Author',
    'reports.preview.cover.gen':      'Generated',
    'reports.preview.cover.range':    'Range',
    'reports.preview.kpi.vessels':    'Vessels',
    'reports.preview.kpi.alerts':     'Open Alerts',
    'reports.preview.kpi.shore':      'Shore Power',
    'reports.preview.kpi.co2':        'CO₂ Now',
    'reports.preview.kpi.nox':        'NOₓ Now',
    'reports.preview.kpi.sox':        'SOₓ Now',
    'reports.preview.compliant':      'Compliant',
    'reports.preview.over_limit':     'Over limit',
    'reports.preview.toggle':         'Toggle section',
  },
});

/* ============================================================
 * Constants
 * ============================================================ */
const TEMPLATE_DEFAULTS = {
  executive:  ['cover', 'summary', 'kpis', 'emissions', 'appendix'],
  compliance: ['cover', 'kpis', 'compliance', 'timeseries', 'alerts', 'appendix'],
  operations: ['cover', 'summary', 'vessels', 'shore', 'alerts'],
  shore:      ['cover', 'kpis', 'shore', 'alerts', 'appendix'],
  alerts:     ['cover', 'alerts', 'kpis', 'appendix'],
  custom:     ['cover', 'summary', 'kpis', 'vessels', 'emissions', 'shore', 'alerts', 'timeseries', 'compliance', 'appendix'],
};

const TEMPLATES = ['executive', 'compliance', 'operations', 'shore', 'alerts', 'custom'];

const ALL_SECTIONS = [
  'cover', 'summary', 'kpis', 'vessels', 'emissions',
  'shore', 'alerts', 'timeseries', 'compliance', 'appendix',
];

const POLLUTANTS  = ['co2', 'nox', 'sox'];
const SEVERITIES  = ['critical', 'warning', 'info'];
const RANGES      = ['24h', '7d', '30d', 'custom'];

const POLLUTANT_LABEL = { co2: 'CO₂', nox: 'NOₓ', sox: 'SOₓ' };

const RECENT_KEY = 'portiq.recent_reports';
const RECENT_MAX = 8;

/* PDF-friendly palette (used when rendering off-screen charts that get
 * snapshotted into the PDF — the PDF background is white). */
const PDF_PALETTE = {
  brand:    '#009DC4',
  success:  '#1D9E75',
  warning:  '#BA7517',
  critical: '#E24B4A',
  text:     '#161E28',
  muted:    '#647484',
  grid:     '#E2E8EE',
  bg:       '#FFFFFF',
};

/* ============================================================
 * Styles (injected once)
 * ============================================================ */
const STYLE_TAG_ID = 'pg-reports-style';
const STYLES = `
.pg-reports-shell {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: var(--sp-5);
  align-items: start;
}
@media (max-width: 1180px) {
  .pg-reports-shell { grid-template-columns: 1fr; }
}

.pg-reports-builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}
.pg-reports-builder > .panel { min-width: 0; }
.pg-reports-builder .panel-head { margin-bottom: var(--sp-3); }
.pg-reports-builder input:not([type="checkbox"]):not([type="radio"]),
.pg-reports-builder select,
.pg-reports-builder textarea,
.pg-reports-builder .form-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.pg-reports-builder input[type="checkbox"],
.pg-reports-builder input[type="radio"] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.pg-reports-template-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-2);
}
.pg-reports-tpl { min-width: 0; }
.pg-reports-tpl {
  display: flex; flex-direction: column;
  gap: 4px;
  padding: var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-3);
  cursor: pointer;
  transition: border-color var(--dur-fast), background var(--dur-fast), transform var(--dur-fast);
  text-align: left;
  min-height: 64px;
  position: relative;
  font-family: inherit;
  color: inherit;
}
.pg-reports-tpl:hover { border-color: var(--border-soft); transform: translateY(-1px); }
.pg-reports-tpl.is-active {
  border-color: var(--brand-primary);
  background: var(--brand-primary-soft);
  box-shadow: inset 0 0 0 1px var(--brand-primary);
}
.pg-reports-tpl-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}
.pg-reports-tpl-desc {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  line-height: 1.35;
}
.pg-reports-tpl-check {
  position: absolute;
  top: var(--sp-2); right: var(--sp-2);
  width: 14px; height: 14px;
  color: var(--brand-primary);
  opacity: 0;
}
.pg-reports-tpl.is-active .pg-reports-tpl-check { opacity: 1; }

.pg-reports-row {
  display: flex; flex-wrap: wrap; gap: var(--sp-2);
}
.pg-reports-section-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.pg-reports-section-toggle {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: 6px 8px;
  border-radius: var(--r-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-3);
  cursor: pointer;
  font-size: var(--fs-xs);
  user-select: none;
  transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast);
  color: var(--text-secondary);
  font-family: inherit;
  min-width: 0;
}
.pg-reports-section-toggle span {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}
.pg-reports-section-toggle input { flex-shrink: 0; }
.pg-reports-section-toggle:hover { background: var(--bg-4); }
.pg-reports-section-toggle input { accent-color: var(--brand-primary); margin: 0; }
.pg-reports-section-toggle.is-on {
  background: var(--brand-primary-soft);
  border-color: rgba(0, 157, 196, 0.35);
  color: var(--brand-primary);
}

.pg-reports-range-row { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.pg-reports-range-custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}
.pg-reports-range-custom label { min-width: 0; }
.pg-reports-range-custom label {
  display: flex; flex-direction: column; gap: 4px;
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.pg-reports-range-custom input {
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  padding: 6px 8px;
  color: var(--text-primary);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
}
.pg-reports-range-custom input:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px var(--brand-primary-soft);
}

.pg-reports-cover-fields { display: grid; gap: var(--sp-3); }
.pg-reports-cover-fields .form-textarea { min-height: 80px; }

.pg-reports-cta-row {
  display: flex; gap: var(--sp-2); flex-wrap: wrap;
  margin-top: var(--sp-2);
}
.pg-reports-cta-row .btn { flex: 1; min-width: 130px; }
.pg-reports-status {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  margin-top: var(--sp-2);
  min-height: 14px;
}
.pg-reports-status[data-tone="success"] { color: var(--status-success); }
.pg-reports-status[data-tone="critical"] { color: var(--status-critical); }
.pg-reports-progress {
  height: 3px;
  background: var(--bg-3);
  border-radius: var(--r-pill);
  overflow: hidden;
  margin-top: 6px;
  display: none;
}
.pg-reports-progress.is-active { display: block; }
.pg-reports-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-primary-bright));
  transform-origin: left center;
  animation: pgReportsPulse 1.6s linear infinite;
  width: 35%;
}
@keyframes pgReportsPulse {
  0%   { margin-left: -35%; }
  100% { margin-left: 100%; }
}

/* ----- Recent reports list ----- */
.pg-reports-recent-list { display: flex; flex-direction: column; gap: var(--sp-2); }
.pg-reports-recent-item {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  transition: border-color var(--dur-fast);
}
.pg-reports-recent-item:hover { border-color: var(--border-soft); }
.pg-reports-recent-meta {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.pg-reports-recent-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pg-reports-recent-sub {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  display: flex; gap: var(--sp-2); flex-wrap: wrap;
}
.pg-reports-recent-tpl {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--r-pill);
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: var(--fs-2xs);
  letter-spacing: 0.06em;
  font-weight: var(--fw-semibold);
}

/* ----- Preview area ----- */
.pg-reports-preview {
  display: flex; flex-direction: column; gap: var(--sp-4);
  min-width: 0;
}
.pg-reports-preview-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--sp-3); flex-wrap: wrap;
}
.pg-reports-preview-page-stack {
  display: flex; flex-direction: column;
  gap: var(--sp-3);
}
.pg-reports-page {
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  overflow: hidden;
  position: relative;
}
.pg-reports-page-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--sp-2);
  padding: 8px var(--sp-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-3);
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-tertiary);
}
.pg-reports-page-body { padding: var(--sp-4); }

.pg-reports-page-toggle {
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  color: var(--text-tertiary);
  font-family: inherit;
  font-size: var(--fs-2xs);
  padding: 2px 8px;
  cursor: pointer;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pg-reports-page-toggle:hover { color: var(--text-primary); border-color: var(--border-soft); }
.pg-reports-page.is-collapsed .pg-reports-page-body { display: none; }

/* Cover preview block */
.pg-reports-cover {
  display: grid; gap: var(--sp-3);
  padding: var(--sp-5);
  position: relative;
  background:
    linear-gradient(135deg, rgba(0, 157, 196, 0.18) 0%, rgba(0, 107, 140, 0.05) 60%, transparent 100%),
    var(--bg-2);
  border-left: 4px solid var(--brand-primary);
  border-radius: var(--r-md);
}
.pg-reports-cover-tag {
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--brand-primary);
  font-weight: var(--fw-semibold);
}
.pg-reports-cover-title {
  font-size: var(--fs-2xl);
  font-weight: var(--fw-bold);
  color: var(--text-primary);
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.pg-reports-cover-sub {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  max-width: 540px;
}
.pg-reports-cover-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--sp-3);
  margin-top: var(--sp-2);
  padding-top: var(--sp-3);
  border-top: 1px dashed var(--border-subtle);
}
.pg-reports-cover-meta-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pg-reports-cover-meta-label {
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-tertiary);
}
.pg-reports-cover-meta-value {
  font-size: var(--fs-sm);
  color: var(--text-primary);
  font-family: var(--font-mono);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.pg-reports-summary-text { font-size: var(--fs-sm); line-height: 1.55; color: var(--text-secondary); }
.pg-reports-summary-text + ul { margin-top: var(--sp-3); padding-left: 18px; }
.pg-reports-summary-text + ul li {
  font-size: var(--fs-sm); color: var(--text-secondary);
  margin-bottom: 4px; line-height: 1.4;
}

.pg-reports-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-3);
}
@media (max-width: 720px) {
  .pg-reports-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.pg-reports-mini-table { font-size: var(--fs-sm); }
.pg-reports-mini-table th { font-size: var(--fs-2xs); }
.pg-reports-mini-table td.mono { font-family: var(--font-mono); }

.pg-reports-alerts-list { display: flex; flex-direction: column; gap: 8px; }
.pg-reports-alert-row {
  display: flex; gap: var(--sp-2); align-items: flex-start;
  padding: 8px var(--sp-3);
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
}
.pg-reports-alert-row[data-sev="critical"] { box-shadow: inset 3px 0 0 var(--status-critical); }
.pg-reports-alert-row[data-sev="warning"]  { box-shadow: inset 3px 0 0 var(--status-warning); }
.pg-reports-alert-row[data-sev="info"]     { box-shadow: inset 3px 0 0 var(--brand-primary); }
.pg-reports-alert-row[data-sev="success"]  { box-shadow: inset 3px 0 0 var(--status-success); }
.pg-reports-alert-meta { flex: 1; min-width: 0; }
.pg-reports-alert-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  overflow: hidden;
}
.pg-reports-alert-body {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.pg-reports-alert-time { font-size: var(--fs-2xs); color: var(--text-muted); }

.pg-reports-glossary { display: grid; gap: 6px; padding-left: 0; list-style: none; }
.pg-reports-glossary li {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  padding-left: 14px;
  position: relative;
  line-height: 1.45;
}
.pg-reports-glossary li::before {
  content: '◆';
  position: absolute; left: 0; top: 0;
  color: var(--brand-primary);
  font-size: 8px;
  top: 6px;
}

.pg-reports-timeseries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--sp-3);
}

.pg-reports-skipped {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-style: italic;
}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.dataset.page = 'reports';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

/* ============================================================
 * Helpers
 * ============================================================ */
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
  ));
}

function rangeBoundsFor(cfg) {
  return fmt.rangeBounds(cfg.range, { start: cfg.range_start, end: cfg.range_end });
}

function rangeLabelFor(cfg) {
  if (cfg.range === 'custom' && cfg.range_start && cfg.range_end) {
    return fmt.rangeLabel('custom', { start: new Date(cfg.range_start), end: new Date(cfg.range_end) });
  }
  return fmt.rangeLabel(cfg.range);
}

function rangeChipLabel(rangeId) {
  if (rangeId === '24h')    return t('common.last24h');
  if (rangeId === '7d')     return t('common.last7d');
  if (rangeId === '30d')    return t('common.last30d');
  if (rangeId === 'custom') return t('common.custom');
  return rangeId;
}

function dtLocalInputValue(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getAllVessels() {
  const live   = store.get('vessels')        || [];
  const manual = store.get('manual_vessels') || [];
  return [...live, ...manual];
}

function complianceForVessel(v) {
  if (!v.emissions) return { compliant: true, ratio: 0 };
  const co2 = v.emissions.co2 / 75;
  const nox = v.emissions.nox / 220;
  const sox = v.emissions.sox / 90;
  const max = Math.max(co2, nox, sox);
  return { compliant: max < 1, ratio: max };
}

function buildAutoBullets(cfg) {
  const vessels = getAllVessels();
  const alerts  = store.get('alerts') || [];
  const sp      = store.get('shore_power') || { docks: [], total_co2_saved_kg: 0 };
  const open    = alerts.filter((a) => !a.resolved && !a.dismissed).length;
  const resolved = alerts.filter((a) => a.resolved).length;
  const activeBerths = (sp.docks || []).filter((d) => d.shore_power_active).length;
  const compliantCount = vessels.filter((v) => complianceForVessel(v).compliant).length;
  const compliancePct  = vessels.length ? Math.round((compliantCount / vessels.length) * 100) : 100;

  return [
    t('reports.summary.vessels',   { n: vessels.length }),
    t('reports.summary.alerts',    { open, resolved }),
    t('reports.summary.shore',     { n: activeBerths, co2: fmt.num(Math.round(sp.total_co2_saved_kg || 0)) }),
    t('reports.summary.compliance',{ p: compliancePct }),
  ];
}

function buildAutoSummary(cfg) {
  return cfg.notes && cfg.notes.trim()
    ? cfg.notes.trim()
    : t('reports.section.summary.body');
}

/* ============================================================
 * KPI cards (used by both preview and PDF)
 * ============================================================ */
function getKPICards() {
  const vessels = getAllVessels();
  const alerts  = store.get('alerts') || [];
  const open    = alerts.filter((a) => !a.resolved && !a.dismissed).length;
  const sp      = store.get('shore_power') || { docks: [], total_kw: 0, total_co2_saved_kg: 0 };
  const E       = store.get('emissions')  || {};
  const active  = (sp.docks || []).filter((d) => d.shore_power_active).length;

  return [
    { id: 'vessels',  label: t('reports.preview.kpi.vessels'), value: fmt.num(vessels.length),                     unit: '',    tone: 'brand' },
    { id: 'alerts',   label: t('reports.preview.kpi.alerts'),  value: fmt.num(open),                                unit: '',    tone: open > 4 ? 'critical' : open > 0 ? 'warning' : 'success' },
    { id: 'shore',    label: t('reports.preview.kpi.shore'),   value: fmt.num(active),                              unit: '/ ' + (sp.docks || []).length, tone: 'success', note: fmt.num(Math.round(sp.total_co2_saved_kg || 0)) + ' kg CO₂' },
    { id: 'co2',      label: t('reports.preview.kpi.co2'),     value: E.co2 ? fmt.num(E.co2.current, { maximumFractionDigits: 1 }) : '–', unit: E.co2?.unit || '', tone: E.co2 && E.co2.current > E.co2.threshold ? 'critical' : 'brand' },
    { id: 'nox',      label: t('reports.preview.kpi.nox'),     value: E.nox ? fmt.num(E.nox.current, { maximumFractionDigits: 0 }) : '–', unit: E.nox?.unit || '', tone: E.nox && E.nox.current > E.nox.threshold ? 'critical' : 'brand' },
    { id: 'sox',      label: t('reports.preview.kpi.sox'),     value: E.sox ? fmt.num(E.sox.current, { maximumFractionDigits: 0 }) : '–', unit: E.sox?.unit || '', tone: E.sox && E.sox.current > E.sox.threshold ? 'critical' : 'brand' },
  ];
}

/* ============================================================
 * Recent reports persistence
 * ============================================================ */
function loadRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) { return []; }
}

function saveRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); }
  catch (_) {}
}

function appendRecentReport(entry) {
  const list = loadRecent();
  list.unshift(entry);
  saveRecent(list);
}

/* ============================================================
 * Off-screen chart host (for PDF chart rendering)
 * ============================================================ */
function makeOffscreenChartHost(width = 720, height = 360) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed; left:-99999px; top:0; width:${width}px; height:${height}px; background:white; padding:16px; box-sizing:border-box;`;
  host.dataset.pdfHost = 'true';
  document.body.appendChild(host);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = `width:${width - 32}px; height:${height - 32}px; display:block;`;
  host.appendChild(canvas);
  return { host, canvas };
}

/* ============================================================
 * Main mount
 * ============================================================ */
export function mount(rootEl, params) {
  ensureStyles();

  const unsubs = [];
  const charts = []; /* track preview chart instances for destroy on rerender */

  function trackChart(c) { if (c) charts.push(c); return c; }
  function destroyCharts() {
    while (charts.length) {
      const c = charts.pop();
      try { c.destroy(); } catch (_) {}
    }
  }

  /* Status pill state for the Generate button */
  let isGenerating = false;
  let statusMessage = '';
  let statusTone = '';

  /* ----------------------------------------------------------------
   * Render — top-level
   * ---------------------------------------------------------------- */
  function render() {
    destroyCharts();

    const cfg = store.get('report_config') || {};

    rootEl.innerHTML = `
      <div class="page page-reports">
        <header class="page-header">
          <div class="page-header-title">
            <h1>${escapeHTML(t('page.reports.title'))}</h1>
            <p>${escapeHTML(t('page.reports.subtitle'))}</p>
          </div>
        </header>

        <div class="pg-reports-shell">
          <aside class="pg-reports-builder" id="pg-reports-builder"></aside>
          <section class="pg-reports-preview" id="pg-reports-preview"></section>
        </div>

        <section class="panel" id="pg-reports-recent-panel"></section>
      </div>
    `;

    renderBuilder();
    renderPreview();
    renderRecent();
  }

  /* ----------------------------------------------------------------
   * LEFT — Builder
   * ---------------------------------------------------------------- */
  function renderBuilder() {
    const host = rootEl.querySelector('#pg-reports-builder');
    if (!host) return;
    const cfg = store.get('report_config') || {};

    host.innerHTML = `
      <section class="panel">
        <header class="panel-head">
          <h2 class="panel-title">${escapeHTML(t('reports.builder'))}</h2>
        </header>
        ${renderTemplateBlock(cfg)}
      </section>

      <section class="panel">
        ${renderRangeBlock(cfg)}
      </section>

      <section class="panel">
        ${renderSectionsBlock(cfg)}
      </section>

      <section class="panel">
        ${renderFiltersBlock(cfg)}
      </section>

      <section class="panel">
        ${renderCoverFieldsBlock(cfg)}
      </section>

      <section class="panel">
        ${renderCtaBlock(cfg)}
      </section>
    `;

    bindBuilderEvents(host);
  }

  function renderTemplateBlock(cfg) {
    return `
      <div>
        <div class="filter-rail-label">${escapeHTML(t('reports.template.title'))}</div>
        <div class="pg-reports-template-grid" role="radiogroup">
          ${TEMPLATES.map((id) => {
            const active = cfg.template === id;
            return `
              <button type="button" class="pg-reports-tpl ${active ? 'is-active' : ''}" data-tpl="${id}" role="radio" aria-checked="${active}">
                <span class="pg-reports-tpl-name">${escapeHTML(t('reports.template.' + id))}</span>
                <span class="pg-reports-tpl-desc">${escapeHTML(t('reports.template.' + id + '.desc'))}</span>
                <svg class="pg-reports-tpl-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderRangeBlock(cfg) {
    const showCustom = cfg.range === 'custom';
    return `
      <div>
        <div class="filter-rail-label">${escapeHTML(t('reports.range.label'))}</div>
        <div class="pg-reports-range-row">
          ${RANGES.map((r) => `
            <button type="button" class="chip range-chip ${cfg.range === r ? 'is-active' : ''}" data-range="${r}">${escapeHTML(rangeChipLabel(r))}</button>
          `).join('')}
        </div>
        ${showCustom ? `
          <div class="pg-reports-range-custom">
            <label>
              <span>${escapeHTML(t('reports.range.from'))}</span>
              <input type="datetime-local" data-range-bound="start" value="${dtLocalInputValue(cfg.range_start)}">
            </label>
            <label>
              <span>${escapeHTML(t('reports.range.to'))}</span>
              <input type="datetime-local" data-range-bound="end" value="${dtLocalInputValue(cfg.range_end)}">
            </label>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderSectionsBlock(cfg) {
    const sel = new Set(cfg.sections || []);
    return `
      <div>
        <div class="filter-rail-label">${escapeHTML(t('reports.sections.label'))}</div>
        <div class="pg-reports-section-list">
          ${ALL_SECTIONS.map((id) => {
            const on = sel.has(id);
            return `
              <label class="pg-reports-section-toggle ${on ? 'is-on' : ''}" data-section-toggle="${id}">
                <input type="checkbox" data-section="${id}" ${on ? 'checked' : ''}>
                <span>${escapeHTML(t('reports.section.' + id))}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderFiltersBlock(cfg) {
    const pollSel = new Set(cfg.pollutants || []);
    const sevSel  = new Set(cfg.severities || []);
    return `
      <div style="display:grid;gap:var(--sp-3)">
        <div>
          <div class="filter-rail-label">${escapeHTML(t('reports.filters.pollutants'))}</div>
          <div class="pg-reports-row">
            ${POLLUTANTS.map((p) => `
              <button type="button" class="chip ${pollSel.has(p) ? 'is-active' : ''}" data-pollutant="${p}">${POLLUTANT_LABEL[p]}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="filter-rail-label">${escapeHTML(t('reports.filters.severities'))}</div>
          <div class="pg-reports-row">
            ${SEVERITIES.map((s) => `
              <button type="button" class="chip ${sevSel.has(s) ? 'is-active' : ''}" data-severity="${s}">${escapeHTML(t('reports.filters.severity.' + s))}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderCoverFieldsBlock(cfg) {
    return `
      <div class="pg-reports-cover-fields">
        <div class="form-field">
          <label class="form-label" for="pgr-title">${escapeHTML(t('reports.cover.title.field'))}</label>
          <input id="pgr-title" class="form-input" type="text" value="${escapeHTML(cfg.title || '')}" placeholder="${escapeHTML(t('reports.default_title'))}" data-field="title">
        </div>
        <div class="form-field">
          <label class="form-label" for="pgr-author">${escapeHTML(t('reports.cover.author'))} <small style="opacity:0.6">${escapeHTML(t('common.optional'))}</small></label>
          <input id="pgr-author" class="form-input" type="text" value="${escapeHTML(cfg.author || '')}" data-field="author">
        </div>
        <div class="form-field">
          <label class="form-label" for="pgr-notes">${escapeHTML(t('reports.cover.notes'))}</label>
          <textarea id="pgr-notes" class="form-input form-textarea" data-field="notes" rows="3" placeholder="${escapeHTML(t('reports.section.summary.body'))}">${escapeHTML(cfg.notes || '')}</textarea>
        </div>
      </div>
    `;
  }

  function renderCtaBlock(cfg) {
    return `
      <div>
        <div class="pg-reports-cta-row">
          <button type="button" class="btn btn--primary" data-action="generate" ${isGenerating ? 'disabled' : ''}>
            ${isGenerating ? `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ${escapeHTML(t('reports.cta.generating'))}
            ` : `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              ${escapeHTML(t('reports.cta.generate'))}
            `}
          </button>
          <button type="button" class="btn btn--ghost" data-action="reset" ${isGenerating ? 'disabled' : ''}>
            ${escapeHTML(t('reports.cta.reset'))}
          </button>
        </div>
        <div class="pg-reports-progress ${isGenerating ? 'is-active' : ''}">
          <div class="pg-reports-progress-bar"></div>
        </div>
        <div class="pg-reports-status" data-tone="${escapeHTML(statusTone)}">${escapeHTML(statusMessage)}</div>
      </div>
    `;
  }

  function bindBuilderEvents(host) {
    /* Template selection */
    host.querySelectorAll('[data-tpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tpl;
        const sections = TEMPLATE_DEFAULTS[id] ? [...TEMPLATE_DEFAULTS[id]] : [];
        store.dispatch('setReportConfig', { template: id, sections });
      });
    });

    /* Range chips */
    host.querySelectorAll('[data-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.range;
        const patch = { range: r };
        if (r === 'custom') {
          const cur = store.get('report_config') || {};
          if (!cur.range_start) patch.range_start = Date.now() - 7 * 24 * 3600_000;
          if (!cur.range_end)   patch.range_end   = Date.now();
        }
        store.dispatch('setReportConfig', patch);
      });
    });

    host.querySelectorAll('[data-range-bound]').forEach((input) => {
      input.addEventListener('change', () => {
        const which = input.dataset.rangeBound;
        const ts = input.value ? +new Date(input.value) : null;
        const patch = which === 'start' ? { range_start: ts } : { range_end: ts };
        store.dispatch('setReportConfig', patch);
      });
    });

    /* Section toggles */
    host.querySelectorAll('[data-section]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.section;
        const cur = store.get('report_config') || {};
        const set = new Set(cur.sections || []);
        if (cb.checked) set.add(id); else set.delete(id);
        const sections = ALL_SECTIONS.filter((s) => set.has(s));
        store.dispatch('setReportConfig', { sections });
      });
    });

    /* Pollutant chips */
    host.querySelectorAll('[data-pollutant]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.pollutant;
        const cur = store.get('report_config') || {};
        const set = new Set(cur.pollutants || []);
        if (set.has(id)) set.delete(id); else set.add(id);
        const pollutants = POLLUTANTS.filter((p) => set.has(p));
        store.dispatch('setReportConfig', { pollutants });
      });
    });

    /* Severity chips */
    host.querySelectorAll('[data-severity]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.severity;
        const cur = store.get('report_config') || {};
        const set = new Set(cur.severities || []);
        if (set.has(id)) set.delete(id); else set.add(id);
        const severities = SEVERITIES.filter((s) => set.has(s));
        store.dispatch('setReportConfig', { severities });
      });
    });

    /* Cover field text inputs (debounced via blur + input) */
    host.querySelectorAll('[data-field]').forEach((input) => {
      let timer = null;
      const commit = () => {
        const patch = {};
        patch[input.dataset.field] = input.value;
        store.dispatch('setReportConfig', patch);
      };
      input.addEventListener('input', () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(commit, 250);
      });
      input.addEventListener('blur', commit);
    });

    /* CTA */
    host.querySelector('[data-action="generate"]')?.addEventListener('click', () => {
      generatePDF().catch((err) => {
        console.error('[reports] generation failed', err);
        statusMessage = err && err.message ? err.message : 'Error';
        statusTone = 'critical';
        isGenerating = false;
        renderBuilder();
      });
    });
    host.querySelector('[data-action="reset"]')?.addEventListener('click', resetConfig);
  }

  function resetConfig() {
    store.dispatch('setReportConfig', {
      range: '24h',
      range_start: null,
      range_end: null,
      template: 'executive',
      sections: [...TEMPLATE_DEFAULTS.executive],
      pollutants: [...POLLUTANTS],
      severities: [...SEVERITIES],
      title: '',
      author: '',
      notes: '',
      format: 'pdf',
    });
    statusMessage = t('reports.cta.snapshot');
    statusTone = 'success';
    setTimeout(() => { statusMessage = ''; statusTone = ''; renderBuilder(); }, 2200);
  }

  /* ----------------------------------------------------------------
   * RIGHT — Live preview
   * ---------------------------------------------------------------- */
  function renderPreview() {
    const host = rootEl.querySelector('#pg-reports-preview');
    if (!host) return;
    const cfg = store.get('report_config') || {};
    const enabled = new Set(cfg.sections || []);

    if (enabled.size === 0) {
      host.innerHTML = `
        <section class="panel">
          <header class="panel-head">
            <h2 class="panel-title">${escapeHTML(t('reports.preview'))}</h2>
          </header>
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="empty-state-title">${escapeHTML(t('reports.preview.empty.title'))}</div>
            <div class="empty-state-body">${escapeHTML(t('reports.preview.empty.body'))}</div>
          </div>
        </section>
      `;
      return;
    }

    /* Build the page mock-up stack */
    host.innerHTML = `
      <section class="panel">
        <div class="pg-reports-preview-head">
          <h2 class="panel-title">${escapeHTML(t('reports.preview'))} <small>${escapeHTML(rangeLabelFor(cfg))}</small></h2>
          <div class="badge" data-tone="info">${escapeHTML(t('reports.template.' + cfg.template))}</div>
        </div>
        <div class="pg-reports-preview-page-stack" id="pg-reports-pages"></div>
      </section>
    `;

    const stack = host.querySelector('#pg-reports-pages');
    const sectionsInOrder = ALL_SECTIONS.filter((s) => enabled.has(s));
    sectionsInOrder.forEach((id) => stack.appendChild(buildPreviewSection(id, cfg)));
  }

  function buildPreviewSection(id, cfg) {
    const wrap = document.createElement('article');
    wrap.className = 'pg-reports-page';
    wrap.dataset.section = id;

    wrap.innerHTML = `
      <header class="pg-reports-page-head">
        <span>${escapeHTML(t('reports.section.' + id))}</span>
        <button type="button" class="pg-reports-page-toggle" data-toggle-section="${id}" aria-label="${escapeHTML(t('reports.preview.toggle'))}">${escapeHTML(t('common.hide'))}</button>
      </header>
      <div class="pg-reports-page-body" data-preview-body="${id}"></div>
    `;

    const body = wrap.querySelector(`[data-preview-body="${id}"]`);
    try {
      switch (id) {
        case 'cover':       renderCoverPreview(body, cfg); break;
        case 'summary':     renderSummaryPreview(body, cfg); break;
        case 'kpis':        renderKpisPreview(body, cfg); break;
        case 'vessels':     renderVesselsPreview(body, cfg); break;
        case 'emissions':   renderEmissionsPreview(body, cfg); break;
        case 'shore':       renderShorePreview(body, cfg); break;
        case 'alerts':      renderAlertsPreview(body, cfg); break;
        case 'timeseries':  renderTimeseriesPreview(body, cfg); break;
        case 'compliance':  renderCompliancePreview(body, cfg); break;
        case 'appendix':    renderAppendixPreview(body, cfg); break;
        default:            body.innerHTML = '';
      }
    } catch (err) {
      console.error('[reports] preview render', id, err);
      body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`;
    }

    /* Toggle (hide section by removing it from cfg.sections) */
    wrap.querySelector(`[data-toggle-section="${id}"]`)?.addEventListener('click', () => {
      const cur = store.get('report_config') || {};
      const set = new Set(cur.sections || []);
      set.delete(id);
      const sections = ALL_SECTIONS.filter((s) => set.has(s));
      store.dispatch('setReportConfig', { sections });
    });

    return wrap;
  }

  function renderCoverPreview(body, cfg) {
    const title  = cfg.title || t('reports.default_title');
    const author = cfg.author || '—';
    const range  = rangeLabelFor(cfg);
    const generated = fmt.ymdhm(new Date());

    body.innerHTML = `
      <div class="pg-reports-cover">
        <div class="pg-reports-cover-tag">İZPORT</div>
        <h3 class="pg-reports-cover-title">${escapeHTML(title)}</h3>
        <p class="pg-reports-cover-sub">${escapeHTML(t('reports.preview.cover.subtitle'))}</p>
        <div class="pg-reports-cover-meta">
          <div class="pg-reports-cover-meta-item">
            <span class="pg-reports-cover-meta-label">${escapeHTML(t('reports.preview.cover.author'))}</span>
            <span class="pg-reports-cover-meta-value">${escapeHTML(author)}</span>
          </div>
          <div class="pg-reports-cover-meta-item">
            <span class="pg-reports-cover-meta-label">${escapeHTML(t('reports.preview.cover.gen'))}</span>
            <span class="pg-reports-cover-meta-value">${escapeHTML(generated)}</span>
          </div>
          <div class="pg-reports-cover-meta-item">
            <span class="pg-reports-cover-meta-label">${escapeHTML(t('reports.preview.cover.range'))}</span>
            <span class="pg-reports-cover-meta-value">${escapeHTML(range)}</span>
          </div>
          <div class="pg-reports-cover-meta-item">
            <span class="pg-reports-cover-meta-label">${escapeHTML(t('reports.template.title'))}</span>
            <span class="pg-reports-cover-meta-value">${escapeHTML(t('reports.template.' + cfg.template))}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSummaryPreview(body, cfg) {
    const summary = buildAutoSummary(cfg);
    const bullets = buildAutoBullets(cfg);
    body.innerHTML = `
      <p class="pg-reports-summary-text">${escapeHTML(summary)}</p>
      <ul>
        ${bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join('')}
      </ul>
    `;
  }

  function renderKpisPreview(body, cfg) {
    const cards = getKPICards();
    body.innerHTML = `
      <div class="pg-reports-kpi-grid">
        ${cards.map((c) => `
          <div class="stat-card">
            <div class="stat-card-label">${escapeHTML(c.label)}</div>
            <div class="stat-card-value" data-tone="${escapeHTML(c.tone || '')}">${escapeHTML(String(c.value))}</div>
            <div class="stat-card-meta">
              ${c.unit ? `<span>${escapeHTML(c.unit)}</span>` : ''}
              ${c.note ? `<span style="opacity:0.7">${escapeHTML(c.note)}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderVesselsPreview(body, cfg) {
    const vessels = getAllVessels().slice(0, 8);
    if (!vessels.length) { body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`; return; }
    body.innerHTML = `
      <div class="table-wrap">
        <table class="data-table compact pg-reports-mini-table">
          <thead>
            <tr>
              <th>${escapeHTML(t('reports.col.vessel'))}</th>
              <th>${escapeHTML(t('reports.col.type'))}</th>
              <th>${escapeHTML(t('reports.col.fuel'))}</th>
              <th>${escapeHTML(t('reports.col.status'))}</th>
              <th>${escapeHTML(t('reports.col.co2'))}</th>
              <th>${escapeHTML(t('reports.col.severity'))}</th>
            </tr>
          </thead>
          <tbody>
            ${vessels.map((v) => {
              const sev = v.severity || 'info';
              return `
                <tr data-severity="${escapeHTML(sev)}">
                  <td><span class="vessel-name">${escapeHTML(v.name)}</span></td>
                  <td>${escapeHTML(t('type.' + v.type))}</td>
                  <td><span class="mono">${escapeHTML(v.fuel || '–')}</span></td>
                  <td><span class="badge" data-tone="${escapeHTML(v.status_tone || 'info')}">${escapeHTML(t('status.' + v.status))}</span></td>
                  <td class="mono">${v.emissions ? fmt.num(v.emissions.co2, { maximumFractionDigits: 1 }) : '–'}</td>
                  <td><span class="badge" data-tone="${escapeHTML(sev)}">${escapeHTML(t('kpi.status.' + sev))}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderEmissionsPreview(body, cfg) {
    const E = store.get('emissions') || {};
    const co2 = E.co2;
    if (!co2 || !co2.history || !co2.history.length) {
      body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`;
      return;
    }
    const labels = co2.history.map((_, i) => `${(i - co2.history.length + 1)}h`);
    body.innerHTML = `
      <div class="chart-frame" data-h="md" data-emissions-chart></div>
      <div style="margin-top:var(--sp-3)">
        <div class="filter-rail-label">${escapeHTML(t('reports.section.contributors'))}</div>
        <div class="table-wrap" style="margin-top:8px">
          <table class="data-table compact pg-reports-mini-table">
            <thead><tr>
              <th>${escapeHTML(t('reports.col.contributor'))}</th>
              <th>${escapeHTML(t('reports.col.value'))}</th>
              <th>${escapeHTML(t('reports.col.share'))}</th>
            </tr></thead>
            <tbody>${topContributorRows().map((r) => `
              <tr>
                <td>${escapeHTML(r[0])}</td>
                <td class="mono">${escapeHTML(r[1])}</td>
                <td class="mono">${escapeHTML(r[2])}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>
      </div>
    `;

    const frame = body.querySelector('[data-emissions-chart]');
    const canvas = document.createElement('canvas');
    frame.appendChild(canvas);
    const palette = themePalette();
    trackChart(lineChart(canvas, [{
      label: 'CO₂',
      data: co2.history,
      color: palette.brand,
    }], { labels, options: { plugins: { legend: { display: false } } } }));
  }

  function topContributorRows() {
    const vessels = getAllVessels();
    const total = vessels.reduce((sum, v) => sum + (v.emissions?.co2 || 0), 0);
    const sorted = [...vessels].sort((a, b) => (b.emissions?.co2 || 0) - (a.emissions?.co2 || 0)).slice(0, 5);
    return sorted.map((v) => {
      const c = v.emissions?.co2 || 0;
      return [
        v.name,
        fmt.num(c, { maximumFractionDigits: 1 }) + ' kg/h',
        total > 0 ? fmt.num(c / total, { style: 'percent', maximumFractionDigits: 0 }) : '–',
      ];
    });
  }

  function renderShorePreview(body, cfg) {
    const sp = store.get('shore_power') || { docks: [] };
    const docks = sp.docks || [];
    if (!docks.length) {
      body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`;
      return;
    }
    body.innerHTML = `<div class="chart-frame" data-h="sm" data-shore-chart></div>`;
    const frame = body.querySelector('[data-shore-chart]');
    const canvas = document.createElement('canvas');
    frame.appendChild(canvas);
    const palette = themePalette();
    trackChart(barChart(canvas, [{
      label: 'kW',
      data: docks.map((d) => d.kw_used || d.kw_demand || 0),
      color: palette.brand,
    }], {
      labels: docks.map((d) => d.name),
      options: { plugins: { legend: { display: false } } },
    }));
  }

  function renderAlertsPreview(body, cfg) {
    const alerts = (store.get('alerts') || []).slice(0, 5);
    if (!alerts.length) {
      body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`;
      return;
    }
    body.innerHTML = `
      <div class="pg-reports-alerts-list">
        ${alerts.map((a) => {
          const sev = a.severity || 'info';
          const title = a.title_key ? t(a.title_key, a.body_params || {}) : (a.title || '');
          const bodyTxt = a.body_key ? t(a.body_key, a.body_params || {}) : (a.body || '');
          return `
            <div class="pg-reports-alert-row" data-sev="${escapeHTML(sev)}">
              <span class="badge" data-tone="${escapeHTML(sev)}" style="font-size:9px">${escapeHTML(t('kpi.status.' + sev))}</span>
              <div class="pg-reports-alert-meta">
                <div class="pg-reports-alert-title">${escapeHTML(title)}</div>
                <div class="pg-reports-alert-body">${escapeHTML(bodyTxt)}</div>
              </div>
              <span class="pg-reports-alert-time">${escapeHTML(a.ts ? fmt.relativeTime(a.ts) : '')}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderTimeseriesPreview(body, cfg) {
    const E = store.get('emissions') || {};
    const polls = (cfg.pollutants && cfg.pollutants.length ? cfg.pollutants : POLLUTANTS).filter((p) => E[p]);
    if (!polls.length) {
      body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`;
      return;
    }
    body.innerHTML = `<div class="pg-reports-timeseries-grid"></div>`;
    const grid = body.querySelector('.pg-reports-timeseries-grid');
    const palette = themePalette();
    polls.forEach((p, idx) => {
      const e = E[p];
      const frame = document.createElement('div');
      frame.className = 'chart-frame';
      frame.dataset.h = 'sm';
      frame.innerHTML = `<div style="position:absolute;top:6px;left:8px;font-size:10px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.12em;z-index:1">${POLLUTANT_LABEL[p]}</div>`;
      const c = document.createElement('canvas');
      frame.appendChild(c);
      grid.appendChild(frame);
      const labels = e.history.map((_, i) => `${(i - e.history.length + 1)}h`);
      const color = idx === 0 ? palette.brand : idx === 1 ? palette.warning : palette.critical;
      trackChart(lineChart(c, [{ label: e.label, data: e.history, color }], {
        labels,
        options: { plugins: { legend: { display: false } } },
      }));
    });
  }

  function renderCompliancePreview(body, cfg) {
    const E = store.get('emissions') || {};
    const polls = (cfg.pollutants && cfg.pollutants.length ? cfg.pollutants : POLLUTANTS).filter((p) => E[p]);
    if (!polls.length) {
      body.innerHTML = `<div class="pg-reports-skipped">${escapeHTML(t('reports.preview.skipped'))}</div>`;
      return;
    }
    body.innerHTML = `
      <div class="table-wrap">
        <table class="data-table compact pg-reports-mini-table">
          <thead><tr>
            <th>${escapeHTML(t('reports.col.metric'))}</th>
            <th>${escapeHTML(t('reports.col.current'))}</th>
            <th>${escapeHTML(t('reports.col.threshold'))}</th>
            <th>${escapeHTML(t('reports.col.status_short'))}</th>
          </tr></thead>
          <tbody>
            ${polls.map((p) => {
              const e = E[p];
              const ok = e.current <= e.threshold;
              return `
                <tr>
                  <td><strong>${POLLUTANT_LABEL[p]}</strong></td>
                  <td class="mono">${escapeHTML(fmt.num(e.current, { maximumFractionDigits: 1 }))} ${escapeHTML(e.unit)}</td>
                  <td class="mono">${escapeHTML(fmt.num(e.threshold))} ${escapeHTML(e.unit)}</td>
                  <td><span class="badge" data-tone="${ok ? 'success' : 'critical'}">${escapeHTML(ok ? t('reports.preview.compliant') : t('reports.preview.over_limit'))}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAppendixPreview(body, cfg) {
    const terms = ['co2', 'nox', 'sox', 'shore', 'dispersion', 'eta', 'aux'];
    body.innerHTML = `
      <div class="filter-rail-label" style="margin-bottom:var(--sp-2)">${escapeHTML(t('reports.section.appendix.glossary'))}</div>
      <ul class="pg-reports-glossary">
        ${terms.map((k) => `<li>${escapeHTML(t('reports.section.appendix.glossary.' + k))}</li>`).join('')}
      </ul>
      <p class="pg-reports-summary-text" style="margin-top:var(--sp-3); font-size: var(--fs-xs);">${escapeHTML(t('reports.section.appendix.notes'))}</p>
    `;
  }

  /* ----------------------------------------------------------------
   * Recent reports
   * ---------------------------------------------------------------- */
  function renderRecent() {
    const host = rootEl.querySelector('#pg-reports-recent-panel');
    if (!host) return;
    const items = loadRecent();
    host.innerHTML = `
      <header class="panel-head">
        <h2 class="panel-title">${escapeHTML(t('reports.recent.title'))} <small>${escapeHTML(items.length ? '· ' + items.length : '')}</small></h2>
        ${items.length ? `
          <div class="panel-actions">
            <button type="button" class="btn btn--ghost btn--sm" data-action="clear-recent">${escapeHTML(t('reports.recent.clear'))}</button>
          </div>
        ` : ''}
      </header>
      ${items.length ? `
        <div class="pg-reports-recent-list">
          ${items.map((r) => `
            <div class="pg-reports-recent-item">
              <div class="pg-reports-recent-meta">
                <span class="pg-reports-recent-title">${escapeHTML(r.title || t('reports.default_title'))}</span>
                <div class="pg-reports-recent-sub">
                  <span class="pg-reports-recent-tpl">${escapeHTML(t('reports.template.' + (r.template || 'custom')))}</span>
                  <span>${escapeHTML(t('reports.recent.sections', { n: (r.sections || []).length }))}</span>
                  <span>${escapeHTML(fmt.ymdhm(r.ts))}</span>
                </div>
              </div>
              <button type="button" class="btn btn--outline btn--sm" data-reload="${escapeHTML(r.id)}">
                ${escapeHTML(t('reports.recent.reload'))}
              </button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="empty-state-title">${escapeHTML(t('reports.recent.empty'))}</div>
        </div>
      `}
    `;

    host.querySelector('[data-action="clear-recent"]')?.addEventListener('click', async () => {
      const ok = await confirm({
        title: t('reports.recent.clear'),
        body: t('reports.recent.clear.confirm'),
        danger: true,
      });
      if (!ok) return;
      saveRecent([]);
      renderRecent();
    });

    host.querySelectorAll('[data-reload]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reload;
        const item = loadRecent().find((r) => r.id === id);
        if (!item || !item.config) return;
        store.dispatch('setReportConfig', item.config);
      });
    });
  }

  /* ----------------------------------------------------------------
   * PDF Generation
   * ---------------------------------------------------------------- */
  async function generatePDF() {
    if (isGenerating) return;
    isGenerating = true;
    statusMessage = t('reports.cta.generating');
    statusTone = '';
    renderBuilder();

    /* Allow a paint pass so the loading state shows. */
    await new Promise((r) => requestAnimationFrame(r));

    let cleanupHosts = [];
    try {
      await loadPdfLibs();
      const cfg = store.get('report_config') || {};
      const enabled = new Set(cfg.sections || []);
      const rangeLbl = rangeLabelFor(cfg);

      const pdf = await createPdf({
        title: cfg.title || t('reports.default_title'),
        author: cfg.author || '',
        subtitle: t('topbar.subtitle'),
        meta: { template: t('reports.template.' + cfg.template), brandLine: t('brand.attribution') },
      });

      /* COVER (page 1). If the user disabled it we still rely on the implicit
       * first page from jsPDF so subsequent sections start on a clean page. */
      if (enabled.has('cover')) {
        pdf.cover({
          range: rangeLbl,
          summary: cfg.notes && cfg.notes.trim() ? cfg.notes.trim() : null,
        });
      }

      /* Begin a new page if cover was rendered. jsPDF starts on page 1 and
       * we always want subsequent sections on page 2+. */
      if (enabled.has('cover')) pdf.pageBreak();

      /* SUMMARY */
      if (enabled.has('summary')) {
        pdf.heading(t('reports.section.summary'));
        pdf.paragraph(buildAutoSummary(cfg));
        pdf.bullet(buildAutoBullets(cfg));
      }

      /* KPIS */
      if (enabled.has('kpis')) {
        pdf.heading(t('reports.section.kpis'));
        const cards = getKPICards().map((c) => ({
          label: c.label,
          value: String(c.value ?? '–'),
          unit: c.unit || '',
          tone: c.tone === 'critical' ? 'critical' : c.tone === 'warning' ? 'warning' : c.tone === 'success' ? 'success' : null,
          note: c.note || '',
        }));
        pdf.kpiGrid(cards, { columns: 3 });
      }

      /* VESSELS */
      if (enabled.has('vessels')) {
        const vessels = getAllVessels();
        pdf.heading(t('reports.section.vessels'));
        if (vessels.length === 0) {
          pdf.paragraph('—');
        } else {
          const headers = [
            t('reports.col.vessel'),
            t('reports.col.type'),
            t('reports.col.fuel'),
            t('reports.col.status'),
            t('reports.col.co2'),
            t('reports.col.nox'),
            t('reports.col.sox'),
          ];
          const rows = vessels.slice(0, 30).map((v) => ([
            v.name,
            t('type.' + v.type),
            v.fuel || '–',
            t('status.' + v.status),
            fmt.num(v.emissions?.co2 ?? 0, { maximumFractionDigits: 1 }),
            fmt.num(v.emissions?.nox ?? 0, { maximumFractionDigits: 0 }),
            fmt.num(v.emissions?.sox ?? 0, { maximumFractionDigits: 0 }),
          ]));
          pdf.table({ headers, rows });
        }
      }

      /* EMISSIONS */
      if (enabled.has('emissions')) {
        pdf.heading(t('reports.section.emissions'));
        const E = store.get('emissions') || {};
        if (E.co2 && E.co2.history && E.co2.history.length) {
          const { host, canvas } = makeOffscreenChartHost(720, 320);
          cleanupHosts.push(host);
          const labels = E.co2.history.map((_, i) => `${(i - E.co2.history.length + 1)}h`);
          const chart = lineChart(canvas, [{
            label: 'CO₂',
            data: E.co2.history,
            color: PDF_PALETTE.brand,
          }], {
            labels,
            options: {
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
              },
              scales: {
                x: { ticks: { color: PDF_PALETTE.muted }, grid: { color: PDF_PALETTE.grid } },
                y: { ticks: { color: PDF_PALETTE.muted }, grid: { color: PDF_PALETTE.grid }, beginAtZero: true },
              },
              animation: false,
            },
          });
          await new Promise((r) => setTimeout(r, 150));
          await pdf.snapshot(host, { caption: t('reports.section.emissions.caption') });
          try { chart && chart.destroy(); } catch (_) {}
        }

        /* Top contributors table */
        const contribRows = topContributorRows();
        if (contribRows.length) {
          pdf.subheading(t('reports.section.contributors'));
          pdf.table({
            headers: [t('reports.col.contributor'), t('reports.col.value'), t('reports.col.share')],
            rows: contribRows,
          });
        }
      }

      /* SHORE */
      if (enabled.has('shore')) {
        pdf.heading(t('reports.section.shore'));
        const sp = store.get('shore_power') || { docks: [] };
        const docks = sp.docks || [];
        if (docks.length) {
          const { host, canvas } = makeOffscreenChartHost(720, 320);
          cleanupHosts.push(host);
          const chart = barChart(canvas, [{
            label: 'kW',
            data: docks.map((d) => d.kw_used || d.kw_demand || 0),
            color: PDF_PALETTE.brand,
          }], {
            labels: docks.map((d) => d.name),
            options: {
              plugins: { legend: { display: false }, tooltip: { enabled: false } },
              scales: {
                x: { ticks: { color: PDF_PALETTE.muted }, grid: { color: PDF_PALETTE.grid } },
                y: { ticks: { color: PDF_PALETTE.muted }, grid: { color: PDF_PALETTE.grid }, beginAtZero: true },
              },
              animation: false,
            },
          });
          await new Promise((r) => setTimeout(r, 150));
          await pdf.snapshot(host, { caption: t('reports.section.shore.caption') });
          try { chart && chart.destroy(); } catch (_) {}

          /* Berth state table */
          pdf.subheading(t('reports.section.shore'));
          const headers = [t('reports.col.berth'), t('reports.col.kw'), t('reports.col.shore_state'), t('reports.col.vessel')];
          const rows = docks.map((d) => [
            d.name,
            fmt.num(d.kw_used || 0),
            d.shore_power_active ? t('common.yes') : t('common.no'),
            d.vessel_name || '—',
          ]);
          pdf.table({ headers, rows });
        }
      }

      /* ALERTS */
      if (enabled.has('alerts')) {
        pdf.heading(t('reports.section.alerts'));
        const alerts = store.get('alerts') || [];
        const filtered = alerts.filter((a) => !cfg.severities || cfg.severities.includes(a.severity));
        const open = filtered.filter((a) => !a.resolved && !a.dismissed);
        const resolved = filtered.filter((a) => a.resolved);
        const recs = store.get('recommendations') || [];
        pdf.paragraph(t('reports.section.alerts.summary', {
          open: open.length, resolved: resolved.length, applied: recs.length,
        }));

        if (filtered.length) {
          const headers = [t('reports.col.severity'), t('common.preview'), t('common.range')];
          const rows = filtered.slice(0, 25).map((a) => {
            const title = a.title_key ? t(a.title_key, a.body_params || {}) : (a.title || '');
            return [
              t('kpi.status.' + (a.severity || 'info')),
              title,
              a.ts ? fmt.dateTime(a.ts) : '–',
            ];
          });
          pdf.table({ headers, rows });
        }
      }

      /* TIMESERIES */
      if (enabled.has('timeseries')) {
        pdf.heading(t('reports.section.timeseries'));
        const E = store.get('emissions') || {};
        const polls = (cfg.pollutants && cfg.pollutants.length ? cfg.pollutants : POLLUTANTS).filter((p) => E[p]);
        for (const p of polls) {
          const e = E[p];
          if (!e || !e.history || !e.history.length) continue;
          const { host, canvas } = makeOffscreenChartHost(720, 260);
          cleanupHosts.push(host);
          const labels = e.history.map((_, i) => `${(i - e.history.length + 1)}h`);
          const color = p === 'co2' ? PDF_PALETTE.brand : p === 'nox' ? PDF_PALETTE.warning : PDF_PALETTE.critical;
          const chart = lineChart(canvas, [{
            label: e.label, data: e.history, color,
          }], {
            labels,
            options: {
              plugins: { legend: { display: false }, tooltip: { enabled: false } },
              scales: {
                x: { ticks: { color: PDF_PALETTE.muted }, grid: { color: PDF_PALETTE.grid } },
                y: { ticks: { color: PDF_PALETTE.muted }, grid: { color: PDF_PALETTE.grid }, beginAtZero: true },
              },
              animation: false,
            },
          });
          await new Promise((r) => setTimeout(r, 120));
          await pdf.snapshot(host, { caption: t('reports.section.timeseries.caption', { p: POLLUTANT_LABEL[p] }) });
          try { chart && chart.destroy(); } catch (_) {}
        }
      }

      /* COMPLIANCE */
      if (enabled.has('compliance')) {
        pdf.heading(t('reports.section.compliance'));
        const E = store.get('emissions') || {};
        const polls = (cfg.pollutants && cfg.pollutants.length ? cfg.pollutants : POLLUTANTS).filter((p) => E[p]);
        if (polls.length) {
          const headers = [t('reports.col.metric'), t('reports.col.current'), t('reports.col.threshold'), t('reports.col.status_short')];
          const rows = polls.map((p) => {
            const e = E[p];
            const ok = e.current <= e.threshold;
            return [
              POLLUTANT_LABEL[p],
              `${fmt.num(e.current, { maximumFractionDigits: 1 })} ${e.unit}`,
              `${fmt.num(e.threshold)} ${e.unit}`,
              ok ? t('reports.preview.compliant') : t('reports.preview.over_limit'),
            ];
          });
          pdf.table({ headers, rows });
        }
      }

      /* APPENDIX */
      if (enabled.has('appendix')) {
        pdf.heading(t('reports.section.appendix'));
        pdf.subheading(t('reports.section.appendix.glossary'));
        const terms = ['co2', 'nox', 'sox', 'shore', 'dispersion', 'eta', 'aux'];
        pdf.bullet(terms.map((k) => t('reports.section.appendix.glossary.' + k)));
        pdf.paragraph(t('reports.section.appendix.notes'));
      }

      const filename = `izport-${cfg.template}-${fmt.ymd(new Date())}.pdf`;
      pdf.download(filename);

      /* Log to recents */
      appendRecentReport({
        id: 'rp-' + Date.now(),
        ts: Date.now(),
        template: cfg.template,
        title: cfg.title || t('reports.default_title'),
        sections: [...(cfg.sections || [])],
        config: { ...cfg },
        filename,
      });

      statusMessage = t('reports.cta.snapshot');
      statusTone = 'success';
    } finally {
      cleanupHosts.forEach((h) => { try { document.body.removeChild(h); } catch (_) {} });
      isGenerating = false;
      renderBuilder();
      renderRecent();
      setTimeout(() => {
        if (statusTone === 'success') { statusMessage = ''; statusTone = ''; renderBuilder(); }
      }, 2400);
    }
  }

  /* ----------------------------------------------------------------
   * Subscriptions
   * ---------------------------------------------------------------- */
  /* Full re-render when report config changes. */
  unsubs.push(store.subscribe('report_config', () => {
    /* Builder may already reflect the change if change came from inputs;
     * but template/section toggles need DOM updates. Easiest: re-render
     * the parts that depend on cfg. */
    renderBuilder();
    renderPreview();
  }));

  /* Source slices feed the preview. */
  ['vessels', 'manual_vessels', 'emissions', 'shore_power', 'alerts',
   'recommendations', 'manual_readings', 'weather', 'meta', 'ui',
  ].forEach((slice) => {
    unsubs.push(store.subscribe(slice, () => {
      /* Language change requires rebuilding the entire shell so all
       * static labels update. Otherwise just refresh preview + recent. */
      if (slice === 'ui') { render(); return; }
      renderPreview();
    }));
  });

  /* Initial paint */
  render();

  return {
    unmount() {
      destroyCharts();
      for (const u of unsubs) {
        try { u(); } catch (_) {}
      }
      /* Remove any orphaned offscreen hosts */
      document.querySelectorAll('div[data-pdf-host="true"]').forEach((el) => {
        try { el.remove(); } catch (_) {}
      });
    },
  };
}
