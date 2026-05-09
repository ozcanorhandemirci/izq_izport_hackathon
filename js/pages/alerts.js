/**
 * pages/alerts.js — Uyarı ve Öneriler / Alerts & Recommendations.
 *
 * The flagship page of PORT.IQ İzmir. Surfaces the rule-engine output as a
 * filterable feed, where every alert card carries one or more concrete
 * recommendations the operator can apply with one click. The page also
 * exposes:
 *   - 24h trend chart (stacked-by-severity)
 *   - rule-engine status panel
 *   - resolution-time histogram
 *   - top recommendations bar
 *   - manual alert authoring form
 *   - bulk dismiss/clear actions
 *
 * Subscribes to alerts, recommendations, vessels, shore_power, weather,
 * settings and ui slices. Re-renders on language and theme change.
 */

import store from '../store/state.js';
import { t, registerStrings, getLanguage } from '../i18n.js';
import * as fmt from '../utils/format.js';
import { lineChart, barChart, doughnutChart, radarChart, themePalette, hexAlpha, toneColor } from '../utils/charts.js';
import { openForm, openModal, confirm } from '../utils/modal.js';
import { required, compose } from '../utils/validate.js';
import { navigate } from '../router.js';

/* ============================================================
   i18n strings
   ============================================================ */
registerStrings({
  tr: {
    /* KPI strip */
    'alerts.kpi.open':              'Açık Uyarı',
    'alerts.kpi.critical':          'Kritik',
    'alerts.kpi.resolved_today':    'Bugün Çözülen',
    'alerts.kpi.avg_resolve_time':  'Ort. Çözüm Süresi',

    /* Filter rail */
    'alerts.filter.status.open':       'Açık',
    'alerts.filter.status.resolved':   'Çözüldü',
    'alerts.filter.status.dismissed':  'Yok sayıldı',
    'alerts.filter.status.snoozed':    'Ertelendi',
    'alerts.filter.status.all':        'Tümü',
    'alerts.filter.severity.label':    'Önem',
    'alerts.filter.category.label':    'Kategori',
    'alerts.filter.status.label':      'Durum',
    'alerts.filter.cat.all':           'Tümü',
    'alerts.filter.cat.emissions':     'Emisyon',
    'alerts.filter.cat.shore':         'Karadan Güç',
    'alerts.filter.cat.weather':       'Hava',
    'alerts.filter.cat.operations':    'Operasyon',
    'alerts.filter.sev.all':           'Tümü',
    'alerts.filter.sev.critical':      'Kritik',
    'alerts.filter.sev.warning':       'Uyarı',
    'alerts.filter.sev.info':          'Gözlem',
    'alerts.filter.sev.success':       'Başarı',
    'alerts.filter.searchbox':         'Uyarılarda ara…',

    /* Sections */
    'alerts.section.trend':           '24 Saatlik Eğilim',
    'alerts.section.rule_status':     'Kural Motoru',
    'alerts.section.feed':            'Uyarı Akışı',
    'alerts.section.applied_rec':     'En Çok Uygulanan Öneriler',
    'alerts.section.resolution_time': 'Çözüm Süresi Dağılımı',

    /* Empty state */
    'alerts.feed.empty.title':  'Açık uyarı yok',
    'alerts.feed.empty.body':   'Liman güvenli. Yeni bir kural tetiklendiğinde burada görünecek.',

    /* Card */
    'alerts.card.hits':             '×{n} tetik',
    'alerts.card.target_vessel':    'Gemi: {name}',
    'alerts.card.target_dock':      'Rıhtım: {name}',
    'alerts.card.target_aggregate': 'Liman geneli · {pollutant}',
    'alerts.card.applied':          'Uygulandı: {action}',
    'alerts.card.dismissed':        'Yok sayıldı',
    'alerts.card.snoozed_until':    '{time} tarihine ertelendi',
    'alerts.card.expand':           'Detay',
    'alerts.card.collapse':         'Gizle',
    'alerts.card.applied_at':       '{time}',
    'alerts.card.resolved_note':    'Not: {note}',
    'alerts.card.recs_label':       'Öneri',
    'alerts.card.no_recs':          'Tanımlı öneri yok',
    'alerts.card.id':               'ID',
    'alerts.card.signature':        'İmza',
    'alerts.card.sig_label':        'Sinyal',
    'alerts.card.detected_at':      'Algılandı',

    /* Actions */
    'alerts.action.resolve':            'Çöz',
    'alerts.action.resolve_with_action':'Manuel olarak çözüldü',
    'alerts.action.dismiss':            'Yok say',
    'alerts.action.snooze_15m':         '15 dk ertele',
    'alerts.action.snooze_1h':          '1 saat ertele',
    'alerts.action.open_target':        'Hedefe git',
    'alerts.action.apply_rec':          'Öneriyi uygula',
    'alerts.action.apply_confirm':      'Öneri uygulanacak — devam edilsin mi?',
    'alerts.action.dismiss_confirm':    'Bu uyarıyı yok saymak istediğinizden emin misiniz?',
    'alerts.action.add':                'Uyarı ekle',
    'alerts.action.engine_toggle':      'Motoru aç/kapat',
    'alerts.action.clear_resolved':     'Çözülenleri temizle',
    'alerts.action.snooze':             'Ertele',
    'alerts.action.note_label':         'Çözüm notu (opsiyonel)',
    'alerts.action.note_placeholder':   'Operatör notu yazabilirsiniz…',
    'alerts.action.expand_all':         'Tümünü aç',
    'alerts.action.collapse_all':       'Tümünü kapat',
    'alerts.action.bulk_dismiss':       'Filtre sonuçlarını yok say',

    /* Engine */
    'alerts.engine.on':       'Motor: AÇIK',
    'alerts.engine.off':      'Motor: KAPALI',
    'alerts.engine.status':   'Kural Motoru Durumu',
    'alerts.engine.rules':    'Aktif Kurallar',
    'alerts.engine.never':    '— hiç —',

    /* Rules */
    'alerts.rule.threshold':       'Liman geneli eşik aşımı',
    'alerts.rule.dispersion':      'Yetersiz dağılım koşulu',
    'alerts.rule.shore_avail':     'Karadan güç fırsatı',
    'alerts.rule.eta_conflict':    'Yanaşma çakışması',
    'alerts.rule.vessel_em':       'Gemi emisyon eşiği',
    'alerts.rule.dock_shore':      'Rıhtım karadan güç',
    'alerts.rule.last_triggered':  'Son tetik',
    'alerts.rule.total':           'Toplam',
    'alerts.rule.open':            'Açık',
    'alerts.rule.unknown':         'Diğer',

    /* Manual entry */
    'alerts.add.title':              'Manuel uyarı oluştur',
    'alerts.add.subtitle':           'Operatör tarafından serbest girilen uyarı kaydı',
    'alerts.add.recommendations':    'Öneriler',
    'alerts.add.recommendations.hint':'Operatöre sunulacak çözümleri seçin (çoklu seçim için Ctrl/⌘+tık)',
    'alerts.field.title':            'Başlık',
    'alerts.field.body':             'Açıklama',
    'alerts.field.severity':         'Önem',
    'alerts.field.category':         'Kategori',
    'alerts.field.target_kind':      'Hedef tipi',
    'alerts.field.target_id':        'Hedef',
    'alerts.field.target_none':      'Yok',

    /* Confirm */
    'alerts.clear_resolved.confirm': 'Tüm çözülmüş ve yok sayılmış uyarılar silinecek. Devam edilsin mi?',

    /* Resolution buckets */
    'alerts.resolution_buckets.<1m':    '< 1 dk',
    'alerts.resolution_buckets.1_5m':   '1 – 5 dk',
    'alerts.resolution_buckets.5_30m':  '5 – 30 dk',
    'alerts.resolution_buckets.30m_1h': '30 dk – 1 s',
    'alerts.resolution_buckets.gt_1h':  '> 1 s',
    'alerts.resolution_buckets.median': 'Medyan',
    'alerts.resolution_buckets.p90':    'P90',

    /* Most-applied */
    'alerts.most_applied.title':   'Sık uygulanan eylemler',
    'alerts.most_applied.empty':   'Henüz uygulanan öneri yok',
    'alerts.most_applied.times':   'kez',

    /* Engine action labels (display only) */
    'alerts.engine.fired_today':   '{n} tetik / 24s',
    'alerts.feed.count':           '{open} açık · {filtered} gösteriliyor',
    'alerts.feed.count_simple':    '{n} sonuç',

    /* Severity & category labels (lowercase) */
    'alerts.sev.critical':  'Kritik',
    'alerts.sev.warning':   'Uyarı',
    'alerts.sev.info':      'Gözlem',
    'alerts.sev.success':   'Başarı',
    'alerts.cat.emissions': 'Emisyon',
    'alerts.cat.shore':     'Karadan Güç',
    'alerts.cat.weather':   'Hava',
    'alerts.cat.operations':'Operasyon',

    'alerts.target.vessel':    'gemi',
    'alerts.target.dock':      'rıhtım',
    'alerts.target.aggregate': 'liman',

    'alerts.kpi.delta_24h':    'son 24 saat',
    'alerts.kpi.median_label': 'medyan {value}',

    /* Manual alert presets */
    'alerts.preset.critical_template':  'Manuel kritik durum',
    'alerts.preset.body_default':       'Operatör tarafından eklenen serbest tanım.',
  },

  en: {
    'alerts.kpi.open':              'Open',
    'alerts.kpi.critical':          'Critical',
    'alerts.kpi.resolved_today':    'Resolved (24h)',
    'alerts.kpi.avg_resolve_time':  'Avg resolution',

    'alerts.filter.status.open':       'Open',
    'alerts.filter.status.resolved':   'Resolved',
    'alerts.filter.status.dismissed':  'Dismissed',
    'alerts.filter.status.snoozed':    'Snoozed',
    'alerts.filter.status.all':        'All',
    'alerts.filter.severity.label':    'Severity',
    'alerts.filter.category.label':    'Category',
    'alerts.filter.status.label':      'Status',
    'alerts.filter.cat.all':           'All',
    'alerts.filter.cat.emissions':     'Emissions',
    'alerts.filter.cat.shore':         'Shore',
    'alerts.filter.cat.weather':       'Weather',
    'alerts.filter.cat.operations':    'Operations',
    'alerts.filter.sev.all':           'All',
    'alerts.filter.sev.critical':      'Critical',
    'alerts.filter.sev.warning':       'Warning',
    'alerts.filter.sev.info':          'Info',
    'alerts.filter.sev.success':       'Success',
    'alerts.filter.searchbox':         'Search alerts…',

    'alerts.section.trend':           '24h Trend',
    'alerts.section.rule_status':     'Rule Engine',
    'alerts.section.feed':            'Alert Feed',
    'alerts.section.applied_rec':     'Most-Applied Recommendations',
    'alerts.section.resolution_time': 'Resolution Time Distribution',

    'alerts.feed.empty.title':  'No open alerts',
    'alerts.feed.empty.body':   'Port operations are clean. New alerts will appear here as rules trigger.',

    'alerts.card.hits':             '×{n} fired',
    'alerts.card.target_vessel':    'Vessel: {name}',
    'alerts.card.target_dock':      'Berth: {name}',
    'alerts.card.target_aggregate': 'Port-wide · {pollutant}',
    'alerts.card.applied':          'Applied: {action}',
    'alerts.card.dismissed':        'Dismissed',
    'alerts.card.snoozed_until':    'Snoozed until {time}',
    'alerts.card.expand':           'Details',
    'alerts.card.collapse':         'Hide',
    'alerts.card.applied_at':       '{time}',
    'alerts.card.resolved_note':    'Note: {note}',
    'alerts.card.recs_label':       'Recommendation',
    'alerts.card.no_recs':          'No actions defined',
    'alerts.card.id':               'ID',
    'alerts.card.signature':        'Signature',
    'alerts.card.sig_label':        'Signal',
    'alerts.card.detected_at':      'Detected',

    'alerts.action.resolve':             'Resolve',
    'alerts.action.resolve_with_action': 'Manually resolved',
    'alerts.action.dismiss':             'Dismiss',
    'alerts.action.snooze_15m':          'Snooze 15m',
    'alerts.action.snooze_1h':           'Snooze 1h',
    'alerts.action.open_target':         'Open target',
    'alerts.action.apply_rec':           'Apply',
    'alerts.action.apply_confirm':       'Apply this recommendation — proceed?',
    'alerts.action.dismiss_confirm':     'Are you sure you want to dismiss this alert?',
    'alerts.action.add':                 'Add alert',
    'alerts.action.engine_toggle':       'Toggle engine',
    'alerts.action.clear_resolved':      'Clear resolved',
    'alerts.action.snooze':              'Snooze',
    'alerts.action.note_label':          'Resolution note (optional)',
    'alerts.action.note_placeholder':    'You may write an operator note…',
    'alerts.action.expand_all':          'Expand all',
    'alerts.action.collapse_all':        'Collapse all',
    'alerts.action.bulk_dismiss':        'Dismiss filtered',

    'alerts.engine.on':       'Engine: ON',
    'alerts.engine.off':      'Engine: OFF',
    'alerts.engine.status':   'Rule Engine Status',
    'alerts.engine.rules':    'Active Rules',
    'alerts.engine.never':    '— never —',

    'alerts.rule.threshold':       'Aggregate threshold',
    'alerts.rule.dispersion':      'Dispersion risk',
    'alerts.rule.shore_avail':     'Shore power opportunity',
    'alerts.rule.eta_conflict':    'ETA / berth conflict',
    'alerts.rule.vessel_em':       'Vessel emission threshold',
    'alerts.rule.dock_shore':      'Berth shore power',
    'alerts.rule.last_triggered':  'Last triggered',
    'alerts.rule.total':           'Total',
    'alerts.rule.open':            'Open',
    'alerts.rule.unknown':         'Other',

    'alerts.add.title':              'Author alert',
    'alerts.add.subtitle':           'Operator-authored manual alert entry',
    'alerts.add.recommendations':    'Recommendations',
    'alerts.add.recommendations.hint':'Pick the actions you want to expose (Ctrl/⌘+click for multi-select)',
    'alerts.field.title':            'Title',
    'alerts.field.body':             'Description',
    'alerts.field.severity':         'Severity',
    'alerts.field.category':         'Category',
    'alerts.field.target_kind':      'Target type',
    'alerts.field.target_id':        'Target',
    'alerts.field.target_none':      'None',

    'alerts.clear_resolved.confirm': 'All resolved and dismissed alerts will be removed. Continue?',

    'alerts.resolution_buckets.<1m':    '< 1m',
    'alerts.resolution_buckets.1_5m':   '1 – 5m',
    'alerts.resolution_buckets.5_30m':  '5 – 30m',
    'alerts.resolution_buckets.30m_1h': '30m – 1h',
    'alerts.resolution_buckets.gt_1h':  '> 1h',
    'alerts.resolution_buckets.median': 'Median',
    'alerts.resolution_buckets.p90':    'P90',

    'alerts.most_applied.title':   'Frequently applied actions',
    'alerts.most_applied.empty':   'No recommendations applied yet',
    'alerts.most_applied.times':   'times',

    'alerts.engine.fired_today':   '{n} fired / 24h',
    'alerts.feed.count':           '{open} open · {filtered} shown',
    'alerts.feed.count_simple':    '{n} results',

    'alerts.sev.critical':  'Critical',
    'alerts.sev.warning':   'Warning',
    'alerts.sev.info':      'Info',
    'alerts.sev.success':   'Success',
    'alerts.cat.emissions': 'Emissions',
    'alerts.cat.shore':     'Shore',
    'alerts.cat.weather':   'Weather',
    'alerts.cat.operations':'Operations',

    'alerts.target.vessel':    'vessel',
    'alerts.target.dock':      'berth',
    'alerts.target.aggregate': 'port',

    'alerts.kpi.delta_24h':    'last 24h',
    'alerts.kpi.median_label': 'median {value}',

    'alerts.preset.critical_template':  'Manual critical event',
    'alerts.preset.body_default':       'Manually authored alert by operator.',
  },
});

/* ============================================================
   Constants
   ============================================================ */
const SEVERITY_TONES = {
  critical: 'critical',
  warning:  'warning',
  info:     'info',
  success:  'success',
};

const CATEGORIES = ['emissions', 'shore', 'weather', 'operations'];
const SEVERITIES = ['critical', 'warning', 'info', 'success'];

const RECOMMENDATION_PRESETS = [
  'engage_shore', 'reroute_berth', 'reduce_idle', 'throttle_inbound',
  'anchor_offshore', 'wait_for_wind', 'switch_fuel',
];

/* Map an alert signature prefix (regex) to a rule-family descriptor */
const RULE_FAMILIES = [
  { key: 'threshold',     match: /^agg:em:/,             tkey: 'alerts.rule.threshold',    cat: 'emissions' },
  { key: 'vessel_em',     match: /^vessel:.*:em:/,       tkey: 'alerts.rule.vessel_em',    cat: 'emissions' },
  { key: 'dispersion',    match: /^vessel:.*:disp$/,     tkey: 'alerts.rule.dispersion',   cat: 'weather' },
  { key: 'shore_avail',   match: /^dock:.*:shore$/,      tkey: 'alerts.rule.shore_avail',  cat: 'shore' },
  { key: 'eta_conflict',  match: /^vessel:.*:eta$/,      tkey: 'alerts.rule.eta_conflict', cat: 'operations' },
];

/* Recommendation icon glyphs (inline SVG) */
const REC_ICONS = {
  engage_shore:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 8c-3 0-5 2-5 5v3a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-3c0-3-2-5-5-5"/><path d="M12 19v3"/></svg>',
  reroute_berth:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7H8l-4 4 4 4h13"/><path d="M3 17h13l4-4-4-4H3"/></svg>',
  reduce_idle:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  throttle_inbound:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 4 4-4 4"/><path d="M16 6H8a4 4 0 0 0-4 4v8"/><path d="M12 22l-4-4 4-4"/></svg>',
  anchor_offshore: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
  wait_for_wind:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>',
  switch_fuel:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>',
  default:         '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>',
};

/* Severity icons */
const SEV_ICONS = {
  critical: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  warning:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  success:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
};

/* ============================================================
   CSS — injected once into <head>
   ============================================================ */
const STYLES = `
/* ============================================================
   page-alerts
   ============================================================ */
.pg-alerts-engine-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast);
  letter-spacing: 0.05em;
}
.pg-alerts-engine-toggle:hover { color: var(--text-primary); border-color: var(--border-soft); }
.pg-alerts-engine-toggle .dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}
.pg-alerts-engine-toggle[data-on="true"] {
  border-color: rgba(29, 158, 117, 0.4);
  background: var(--status-success-soft);
  color: var(--status-success);
}
.pg-alerts-engine-toggle[data-on="true"] .dot {
  background: var(--status-success);
  box-shadow: var(--status-success-glow);
  animation: pulse 2.4s var(--ease-in-out) infinite;
}

.pg-alerts-feed-wrap {
  display: grid;
  gap: var(--sp-3);
}

.pg-alerts-feed-toolbar {
  display: flex; flex-wrap: wrap; gap: var(--sp-2);
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-2);
}
.pg-alerts-feed-toolbar small {
  color: var(--text-tertiary);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
}

/* Alert card */
.pg-alerts-card {
  position: relative;
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--sp-4) var(--sp-4) var(--sp-4) calc(var(--sp-4) + 4px);
  display: grid;
  gap: var(--sp-3);
  transition: border-color var(--dur-base) var(--ease-out), background var(--dur-base);
  overflow: hidden;
}
.pg-alerts-card::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--brand-primary);
  border-radius: 0 4px 4px 0;
}
.pg-alerts-card[data-severity="critical"]::before { background: var(--status-critical); box-shadow: 0 0 12px rgba(226, 75, 74, 0.40); }
.pg-alerts-card[data-severity="warning"]::before  { background: var(--status-warning);  }
.pg-alerts-card[data-severity="info"]::before     { background: var(--brand-primary);   }
.pg-alerts-card[data-severity="success"]::before  { background: var(--status-success);  }
.pg-alerts-card[data-severity="critical"] { border-color: rgba(226, 75, 74, 0.35); }
.pg-alerts-card:hover { border-color: var(--border-soft); }
.pg-alerts-card[data-state="resolved"],
.pg-alerts-card[data-state="dismissed"] {
  opacity: 0.62;
  background: var(--bg-1);
}
.pg-alerts-card[data-state="snoozed"] {
  opacity: 0.78;
  background: linear-gradient(90deg, var(--bg-2) 0%, rgba(186, 117, 23, 0.05) 100%);
}

.pg-alerts-card-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--sp-3);
  align-items: flex-start;
}
.pg-alerts-sev-badge {
  width: 32px; height: 32px;
  border-radius: var(--r-md);
  display: grid; place-items: center;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.pg-alerts-sev-badge[data-severity="critical"] { background: var(--status-critical-soft); color: var(--status-critical); border-color: rgba(226,75,74,0.35); }
.pg-alerts-sev-badge[data-severity="warning"]  { background: var(--status-warning-soft);  color: var(--status-warning);  border-color: rgba(186,117,23,0.35); }
.pg-alerts-sev-badge[data-severity="info"]     { background: var(--brand-primary-soft);   color: var(--brand-primary);   border-color: rgba(0,157,196,0.32); }
.pg-alerts-sev-badge[data-severity="success"]  { background: var(--status-success-soft);  color: var(--status-success);  border-color: rgba(29,158,117,0.35); }

.pg-alerts-card-titleblock { display: grid; gap: 2px; min-width: 0; }
.pg-alerts-card-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  letter-spacing: -0.005em;
  display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap;
}
.pg-alerts-card-meta {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  display: flex; gap: var(--sp-3); flex-wrap: wrap; align-items: center;
}
.pg-alerts-card-meta time { font-family: var(--font-mono); cursor: help; }
.pg-alerts-card-meta .pg-alerts-meta-dot { color: var(--text-muted); }
.pg-alerts-card-meta .pg-alerts-target {
  color: var(--text-secondary);
  font-weight: var(--fw-medium);
}

.pg-alerts-card-aside {
  display: flex; gap: var(--sp-2); align-items: center;
}

.pg-alerts-card-body {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}

/* Recommendation cards (sub-cards inside alert) */
.pg-alerts-recs {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--bg-1);
  border: 1px dashed var(--border-subtle);
  margin-left: var(--sp-3);
}
.pg-alerts-recs-label {
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-tertiary);
  font-weight: var(--fw-semibold);
  display: flex; align-items: center; gap: 6px;
}
.pg-alerts-recs-label::before {
  content: "→";
  color: var(--brand-primary);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}

.pg-alerts-rec {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  align-items: center;
  transition: border-color var(--dur-fast), background var(--dur-fast);
}
.pg-alerts-rec:hover { border-color: rgba(0, 157, 196, 0.45); background: var(--bg-3); }
.pg-alerts-rec-icon {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  border-radius: var(--r-sm);
  flex-shrink: 0;
}
.pg-alerts-rec-body {
  display: grid; gap: 2px;
  min-width: 0;
}
.pg-alerts-rec-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--text-primary);
}
.pg-alerts-rec-impact {
  font-size: var(--fs-2xs);
  font-family: var(--font-mono);
  color: var(--status-success);
  font-weight: var(--fw-medium);
}
.pg-alerts-rec-impact[data-zero="true"] { color: var(--text-tertiary); font-weight: normal; }

.pg-alerts-card-actions {
  display: flex; gap: var(--sp-2); flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--border-subtle);
  margin-top: var(--sp-1);
}
.pg-alerts-card-actions .pg-alerts-card-stamp {
  margin-right: auto;
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* expand row */
.pg-alerts-card-expand {
  padding: var(--sp-3);
  background: var(--bg-1);
  border-radius: var(--r-sm);
  border: 1px dashed var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  display: none;
  gap: 6px;
}
.pg-alerts-card[data-expanded="true"]  .pg-alerts-card-expand { display: grid; }
.pg-alerts-card-expand .row { display: flex; gap: var(--sp-2); }
.pg-alerts-card-expand .row strong { color: var(--text-secondary); min-width: 90px; }

/* Rule-family list */
.pg-alerts-rules-list {
  display: grid;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
.pg-alerts-rule-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  align-items: center;
}
.pg-alerts-rule-row .pg-alerts-rule-name {
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  font-size: var(--fs-sm);
}
.pg-alerts-rule-row .pg-alerts-rule-name small {
  display: block;
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  font-weight: var(--fw-regular);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 2px;
}
.pg-alerts-rule-row .pg-alerts-rule-stat {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  text-align: right;
  min-width: 64px;
}
.pg-alerts-rule-row .pg-alerts-rule-stat strong {
  display: block;
  color: var(--text-primary);
  font-size: var(--fs-sm);
}
.pg-alerts-rule-row .pg-alerts-rule-open {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  padding: 3px 8px;
  border-radius: var(--r-pill);
  background: var(--bg-3);
  color: var(--text-tertiary);
  border: 1px solid var(--border-subtle);
}
.pg-alerts-rule-row .pg-alerts-rule-open[data-active="true"] {
  background: var(--status-warning-soft);
  color: var(--status-warning);
  border-color: rgba(186,117,23,0.32);
}

/* Resolution histogram side stat */
.pg-alerts-reso-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--bg-1);
  border-radius: var(--r-md);
  border: 1px solid var(--border-subtle);
  margin-top: var(--sp-3);
}
.pg-alerts-reso-stat {
  display: grid; gap: 2px;
}
.pg-alerts-reso-stat-label {
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-tertiary);
}
.pg-alerts-reso-stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}

/* Manual entry form — rec checkbox grid */
.pg-alerts-rec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.pg-alerts-rec-grid label {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  cursor: pointer;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  transition: border-color var(--dur-fast), background var(--dur-fast);
}
.pg-alerts-rec-grid label:hover {
  border-color: var(--border-soft);
  background: var(--bg-4);
  color: var(--text-primary);
}
.pg-alerts-rec-grid input[type="checkbox"] {
  accent-color: var(--brand-primary);
  width: 14px; height: 14px;
}
.pg-alerts-rec-grid input[type="checkbox"]:checked + span {
  color: var(--brand-primary);
  font-weight: var(--fw-semibold);
}

/* Most-applied list */
.pg-alerts-applied-list {
  display: grid;
  gap: 6px;
  margin-top: var(--sp-3);
}
.pg-alerts-applied-row {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: var(--sp-2);
  padding: 6px 10px;
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  align-items: center;
}
.pg-alerts-applied-row .pg-alerts-applied-icon {
  width: 24px; height: 24px;
  display: grid; place-items: center;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  border-radius: var(--r-sm);
}
.pg-alerts-applied-row .pg-alerts-applied-name {
  color: var(--text-primary);
  font-weight: var(--fw-medium);
}
.pg-alerts-applied-row .pg-alerts-applied-count {
  font-family: var(--font-mono);
  color: var(--brand-primary);
  font-weight: var(--fw-semibold);
}

/* Engine status indicator */
.pg-alerts-engine-status {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
}
.pg-alerts-engine-orb {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--bg-3);
  display: grid; place-items: center;
  position: relative;
}
.pg-alerts-engine-orb::after {
  content: "";
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
}
.pg-alerts-engine-status[data-on="true"] .pg-alerts-engine-orb::after {
  background: var(--status-success);
  box-shadow: var(--status-success-glow);
  animation: pulse 1.8s var(--ease-in-out) infinite;
}
.pg-alerts-engine-status[data-on="true"] .pg-alerts-engine-orb {
  background: var(--status-success-soft);
}
.pg-alerts-engine-meta { display: grid; gap: 2px; }
.pg-alerts-engine-state {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}
.pg-alerts-engine-substate {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

/* Inline stat trio for engine */
.pg-alerts-engine-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
.pg-alerts-engine-stat {
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  display: grid; gap: 2px;
}
.pg-alerts-engine-stat-label {
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
}
.pg-alerts-engine-stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
}

/* tag/badge chips inside alert title */
.pg-alerts-tag {
  font-size: var(--fs-2xs);
  font-weight: var(--fw-medium);
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--bg-3);
  color: var(--text-tertiary);
  border: 1px solid var(--border-subtle);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.pg-alerts-tag[data-tone="critical"] { background: var(--status-critical-soft); color: var(--status-critical); border-color: rgba(226,75,74,0.32); }
.pg-alerts-tag[data-tone="warning"]  { background: var(--status-warning-soft);  color: var(--status-warning);  border-color: rgba(186,117,23,0.32); }
.pg-alerts-tag[data-tone="info"]     { background: var(--brand-primary-soft);   color: var(--brand-primary);   border-color: rgba(0,157,196,0.32); }
.pg-alerts-tag[data-tone="success"]  { background: var(--status-success-soft);  color: var(--status-success);  border-color: rgba(29,158,117,0.32); }

/* KPI strip (inherits .stat-card) — extra delta variant */
.pg-alerts-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-3);
}
@media (max-width: 1180px) {
  .pg-alerts-kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .pg-alerts-kpi-grid { grid-template-columns: 1fr; }
}

/* clickable card */
.pg-alerts-card[data-state="open"] { cursor: pointer; }
.pg-alerts-card .pg-alerts-card-actions button { pointer-events: auto; }

/* Loading */
.pg-alerts-loading {
  display: grid; place-items: center;
  padding: var(--sp-6);
  color: var(--text-tertiary);
  font-size: var(--fs-sm);
}

/* Bulk action bar */
.pg-alerts-bulk-bar {
  display: flex; gap: var(--sp-2); align-items: center; flex-wrap: wrap;
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}

/* Tight mobile */
@media (max-width: 720px) {
  .pg-alerts-card-head { grid-template-columns: auto 1fr; }
  .pg-alerts-card-aside { grid-column: 1 / -1; justify-content: flex-start; }
  .pg-alerts-rule-row { grid-template-columns: 1fr auto; }
  .pg-alerts-rule-row .pg-alerts-rule-stat:nth-child(3) { display: none; }
  .pg-alerts-recs { margin-left: 0; }
}
`;

/* ============================================================
   Style injection (idempotent)
   ============================================================ */
function ensureStyles() {
  if (document.head.querySelector('style[data-page="alerts"]')) return;
  const el = document.createElement('style');
  el.dataset.page = 'alerts';
  el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ============================================================
   Helpers
   ============================================================ */
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function alertTitle(a) {
  if (a.title_key) return t(a.title_key, a.body_params || {});
  return a.title_text || '—';
}
function alertBody(a) {
  if (a.body_key) return t(a.body_key, a.body_params || {});
  return a.body_text || '';
}

function isOpen(a) {
  if (a.resolved || a.dismissed) return false;
  if (a.snoozed_until && a.snoozed_until > Date.now()) return false;
  return true;
}
function isSnoozed(a) {
  return !a.resolved && !a.dismissed && a.snoozed_until && a.snoozed_until > Date.now();
}

function targetLabel(a, vessels, docks) {
  const tg = a.target;
  if (!tg) return null;
  if (tg.kind === 'vessel') {
    const v = vessels.find((x) => x.id === tg.vessel_id);
    return t('alerts.card.target_vessel', { name: v?.name || tg.vessel_id || '—' });
  }
  if (tg.kind === 'dock') {
    const d = docks.find((x) => x.id === tg.dock_id);
    return t('alerts.card.target_dock', { name: d?.name || tg.dock_id || '—' });
  }
  if (tg.kind === 'aggregate') {
    const polLabel = tg.pollutant === 'co2' ? 'CO₂'
      : tg.pollutant === 'nox' ? 'NOₓ'
      : tg.pollutant === 'sox' ? 'SOₓ'
      : (tg.pollutant || '—');
    return t('alerts.card.target_aggregate', { pollutant: polLabel });
  }
  return null;
}

function categoryFor(a) { return a.category || 'operations'; }

function severityKey(a) { return a.severity || 'info'; }

function recImpact(rec) {
  if (rec.impact_kg_co2_h == null) return null;
  return `~${rec.impact_kg_co2_h} kg CO₂/h`;
}

function recIcon(id) {
  return REC_ICONS[id] || REC_ICONS.default;
}

function sevIcon(sev) { return SEV_ICONS[sev] || SEV_ICONS.info; }

function ruleKeyFor(a) {
  if (!a.signature) return 'unknown';
  for (const f of RULE_FAMILIES) if (f.match.test(a.signature)) return f.key;
  return 'unknown';
}

function svgIcon(name) {
  const lib = {
    plus:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    bell:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    search:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    arrow:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    snooze:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>',
    chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  };
  return lib[name] || '';
}

/* ============================================================
   Page state (per-mount)
   ============================================================ */
function defaultPageState() {
  return {
    statusFilter: 'open',                  /* open | resolved | dismissed | snoozed | all */
    sevFilter:    new Set(SEVERITIES),     /* multi-select */
    catFilter:    new Set(CATEGORIES),     /* multi-select */
    search: '',
    expanded: new Set(),                   /* alert ids that are expanded */
  };
}

/* ============================================================
   Mount
   ============================================================ */
export function mount(rootEl, _params) {
  ensureStyles();

  const pageState = defaultPageState();
  const unsubs = [];
  const charts = { trend: null, ruleRadar: null, applied: null, reso: null };

  rootEl.innerHTML = `
    <div class="page page-alerts">
      <header class="page-header">
        <div class="page-header-title">
          <h1 data-i18n-title>${escapeHTML(t('page.alerts.title'))}</h1>
          <p data-i18n-subtitle>${escapeHTML(t('page.alerts.subtitle'))}</p>
        </div>
        <div class="page-header-actions" data-role="header-actions"></div>
      </header>

      <section class="pg-alerts-kpi-grid" data-role="kpi-strip"></section>

      <section class="filter-rail" data-role="filter-rail"></section>

      <section class="page-grid-2">
        <article class="panel" data-role="trend-panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHTML(t('alerts.section.trend'))}</h2>
            <div class="panel-actions" data-role="trend-actions"></div>
          </div>
          <div class="chart-frame" data-h="md"><canvas data-role="trend-canvas"></canvas></div>
        </article>

        <article class="panel" data-role="rule-panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHTML(t('alerts.section.rule_status'))}</h2>
          </div>
          <div data-role="engine-status"></div>
          <div class="chart-frame" data-h="md" style="margin-top: var(--sp-3);"><canvas data-role="rule-canvas"></canvas></div>
          <div class="pg-alerts-rules-list" data-role="rules-list"></div>
        </article>
      </section>

      <section class="panel" data-role="feed-panel">
        <div class="panel-head">
          <h2 class="panel-title">
            ${escapeHTML(t('alerts.section.feed'))}
            <small data-role="feed-count"></small>
          </h2>
          <div class="panel-actions" data-role="feed-actions"></div>
        </div>
        <div class="pg-alerts-feed-wrap" data-role="feed-list"></div>
      </section>

      <section class="page-grid-2">
        <article class="panel" data-role="applied-panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHTML(t('alerts.section.applied_rec'))}</h2>
            <small class="muted" data-role="applied-count"></small>
          </div>
          <div class="chart-frame" data-h="md"><canvas data-role="applied-canvas"></canvas></div>
          <div class="pg-alerts-applied-list" data-role="applied-list"></div>
        </article>

        <article class="panel" data-role="reso-panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHTML(t('alerts.section.resolution_time'))}</h2>
          </div>
          <div class="chart-frame" data-h="md"><canvas data-role="reso-canvas"></canvas></div>
          <div class="pg-alerts-reso-stats" data-role="reso-stats"></div>
        </article>
      </section>
    </div>
  `;

  /* ------------------------------ Header actions ------------------------------ */
  function renderHeaderActions() {
    const wrap = rootEl.querySelector('[data-role="header-actions"]');
    const settings = store.get('settings') || {};
    const engineOn = settings.alert_engine_enabled !== false;
    wrap.innerHTML = `
      <button class="btn btn--ghost" data-action="clear-resolved" title="${escapeHTML(t('alerts.action.clear_resolved'))}">
        ${svgIcon('trash')} ${escapeHTML(t('alerts.action.clear_resolved'))}
      </button>
      <button class="pg-alerts-engine-toggle" data-on="${engineOn}" data-action="toggle-engine"
        title="${escapeHTML(t('alerts.action.engine_toggle'))}">
        <span class="dot"></span>
        ${escapeHTML(engineOn ? t('alerts.engine.on') : t('alerts.engine.off'))}
      </button>
      <button class="btn btn--primary" data-action="add-alert">
        ${svgIcon('plus')} ${escapeHTML(t('alerts.action.add'))}
      </button>
    `;
    wrap.querySelector('[data-action="clear-resolved"]').addEventListener('click', onClearResolved);
    wrap.querySelector('[data-action="toggle-engine"]').addEventListener('click', onToggleEngine);
    wrap.querySelector('[data-action="add-alert"]').addEventListener('click', openAddAlert);
  }

  /* ------------------------------ KPI strip ------------------------------ */
  function renderKpiStrip() {
    const el = rootEl.querySelector('[data-role="kpi-strip"]');
    const alerts = store.get('alerts') || [];
    const open       = alerts.filter(isOpen);
    const critical   = open.filter((a) => a.severity === 'critical');
    const dayAgo     = Date.now() - 24 * 60 * 60_000;
    const resolvedDay = alerts.filter((a) => a.resolved && a.resolved_at && a.resolved_at >= dayAgo);
    const resolvedAll = alerts.filter((a) => a.resolved && a.resolved_at && a.resolved_at - a.ts > 0);
    const avgResolveMs = resolvedAll.length
      ? resolvedAll.reduce((acc, a) => acc + (a.resolved_at - a.ts), 0) / resolvedAll.length
      : 0;
    const medianResolveMs = (() => {
      if (!resolvedAll.length) return 0;
      const arr = resolvedAll.map((a) => a.resolved_at - a.ts).sort((a, b) => a - b);
      return arr[Math.floor(arr.length / 2)];
    })();

    el.innerHTML = `
      <div class="stat-card">
        <span class="stat-card-label">${escapeHTML(t('alerts.kpi.open'))}</span>
        <span class="stat-card-value" data-tone="${open.length > 0 ? 'warning' : 'success'}">${fmt.num(open.length)}</span>
        <span class="stat-card-meta">${escapeHTML(t('alerts.engine.fired_today', { n: alerts.filter((a) => a.ts >= dayAgo).length }))}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">${escapeHTML(t('alerts.kpi.critical'))}</span>
        <span class="stat-card-value" data-tone="${critical.length > 0 ? 'critical' : 'success'}">${fmt.num(critical.length)}</span>
        <span class="stat-card-meta">
          ${critical.length > 0
            ? `<span class="pg-alerts-tag" data-tone="critical">${escapeHTML(t('alerts.sev.critical'))}</span>`
            : `<span class="muted">${escapeHTML(t('alerts.feed.empty.title'))}</span>`}
        </span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">${escapeHTML(t('alerts.kpi.resolved_today'))}</span>
        <span class="stat-card-value" data-tone="brand">${fmt.num(resolvedDay.length)}</span>
        <span class="stat-card-meta">${escapeHTML(t('alerts.kpi.delta_24h'))}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">${escapeHTML(t('alerts.kpi.avg_resolve_time'))}</span>
        <span class="stat-card-value">${avgResolveMs ? escapeHTML(fmt.duration(avgResolveMs)) : '—'}</span>
        <span class="stat-card-meta">${medianResolveMs ? escapeHTML(t('alerts.kpi.median_label', { value: fmt.duration(medianResolveMs) })) : '—'}</span>
      </div>
    `;
  }

  /* ------------------------------ Filter rail ------------------------------ */
  function renderFilterRail() {
    const el = rootEl.querySelector('[data-role="filter-rail"]');
    const statusOpts = ['open', 'resolved', 'dismissed', 'snoozed', 'all'];
    const sevOpts = ['critical', 'warning', 'info', 'success'];
    const catOpts = ['emissions', 'shore', 'weather', 'operations'];
    el.innerHTML = `
      <div class="filter-rail-group">
        <span class="filter-rail-label">${escapeHTML(t('alerts.filter.status.label'))}</span>
        ${statusOpts.map((s) => `<button class="chip ${pageState.statusFilter === s ? 'is-active' : ''}" data-status="${s}">${escapeHTML(t('alerts.filter.status.' + s))}</button>`).join('')}
      </div>
      <div class="filter-rail-group">
        <span class="filter-rail-label">${escapeHTML(t('alerts.filter.severity.label'))}</span>
        ${sevOpts.map((s) => `<button class="chip ${pageState.sevFilter.has(s) ? 'is-active' : ''}" data-sev="${s}">${escapeHTML(t('alerts.filter.sev.' + s))}</button>`).join('')}
      </div>
      <div class="filter-rail-group">
        <span class="filter-rail-label">${escapeHTML(t('alerts.filter.category.label'))}</span>
        ${catOpts.map((c) => `<button class="chip ${pageState.catFilter.has(c) ? 'is-active' : ''}" data-cat="${c}">${escapeHTML(t('alerts.filter.cat.' + c))}</button>`).join('')}
      </div>
      <div class="filter-rail-group" style="flex:1; justify-content: flex-end;">
        <label class="search-box" aria-label="${escapeHTML(t('alerts.filter.searchbox'))}">
          ${svgIcon('search')}
          <input type="search" data-role="search" value="${escapeHTML(pageState.search)}" placeholder="${escapeHTML(t('alerts.filter.searchbox'))}" />
        </label>
      </div>
    `;

    el.querySelectorAll('button[data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        pageState.statusFilter = btn.dataset.status;
        renderFilterRail();
        renderFeed();
      });
    });
    el.querySelectorAll('button[data-sev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.sev;
        if (pageState.sevFilter.has(s)) pageState.sevFilter.delete(s);
        else pageState.sevFilter.add(s);
        renderFilterRail();
        renderFeed();
      });
    });
    el.querySelectorAll('button[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const c = btn.dataset.cat;
        if (pageState.catFilter.has(c)) pageState.catFilter.delete(c);
        else pageState.catFilter.add(c);
        renderFilterRail();
        renderFeed();
      });
    });
    const search = el.querySelector('[data-role="search"]');
    let searchTo = null;
    search.addEventListener('input', (e) => {
      clearTimeout(searchTo);
      const v = e.target.value;
      searchTo = setTimeout(() => {
        pageState.search = v;
        renderFeed();
      }, 180);
    });
  }

  /* ------------------------------ Filter logic ------------------------------ */
  function applyFilters(alerts) {
    const search = (pageState.search || '').trim().toLowerCase();
    const vessels = store.get('vessels') || [];
    const docks = (store.get('shore_power') || {}).docks || [];

    const statusOk = (a) => {
      switch (pageState.statusFilter) {
        case 'open':      return isOpen(a);
        case 'resolved':  return !!a.resolved;
        case 'dismissed': return !!a.dismissed;
        case 'snoozed':   return isSnoozed(a);
        case 'all':       return true;
        default:          return true;
      }
    };

    return alerts.filter((a) => {
      if (!statusOk(a)) return false;
      if (!pageState.sevFilter.has(severityKey(a))) return false;
      if (!pageState.catFilter.has(categoryFor(a))) return false;
      if (search) {
        const text = [
          alertTitle(a),
          alertBody(a),
          targetLabel(a, vessels, docks) || '',
          a.signature || '',
        ].join(' ').toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }

  /* ------------------------------ Trend chart ------------------------------ */
  function renderTrendChart() {
    if (!window.Chart) return;
    const canvas = rootEl.querySelector('[data-role="trend-canvas"]');
    if (!canvas) return;

    if (charts.trend) { charts.trend.destroy(); charts.trend = null; }

    const alerts = store.get('alerts') || [];
    const now = Date.now();
    const buckets = 24;
    const oneHour = 3600_000;
    const labels = [];
    const data = { critical: [], warning: [], info: [], success: [] };
    for (let i = buckets - 1; i >= 0; i--) {
      const start = now - i * oneHour;
      const lblDate = new Date(start);
      labels.push(`${fmt.pad2(lblDate.getHours())}h`);
      const slot = { critical: 0, warning: 0, info: 0, success: 0 };
      for (const a of alerts) {
        if (a.ts < start - oneHour || a.ts > start) continue;
        if (slot[a.severity] != null) slot[a.severity] += 1;
      }
      data.critical.push(slot.critical);
      data.warning.push(slot.warning);
      data.info.push(slot.info);
      data.success.push(slot.success);
    }

    const p = themePalette();
    charts.trend = barChart(canvas, [
      { label: t('alerts.sev.critical'), data: data.critical, color: p.critical, stack: 's' },
      { label: t('alerts.sev.warning'),  data: data.warning,  color: p.warning,  stack: 's' },
      { label: t('alerts.sev.info'),     data: data.info,     color: p.info,     stack: 's' },
      { label: t('alerts.sev.success'),  data: data.success,  color: p.success,  stack: 's' },
    ], { labels, stacked: true });
  }

  /* ------------------------------ Rule status panel ------------------------------ */
  function renderRulePanel() {
    const alerts = store.get('alerts') || [];
    const settings = store.get('settings') || {};
    const engineOn = settings.alert_engine_enabled !== false;

    /* engine status indicator */
    const statusEl = rootEl.querySelector('[data-role="engine-status"]');
    const dayAgo = Date.now() - 24 * 60 * 60_000;
    const fired24 = alerts.filter((a) => a.ts >= dayAgo).length;
    const openCount = alerts.filter(isOpen).length;
    const resolved24 = alerts.filter((a) => a.resolved_at && a.resolved_at >= dayAgo).length;
    statusEl.innerHTML = `
      <div class="pg-alerts-engine-status" data-on="${engineOn}">
        <div class="pg-alerts-engine-orb"></div>
        <div class="pg-alerts-engine-meta">
          <div class="pg-alerts-engine-state">${escapeHTML(engineOn ? t('alerts.engine.on') : t('alerts.engine.off'))}</div>
          <div class="pg-alerts-engine-substate">${escapeHTML(t('alerts.engine.status'))}</div>
        </div>
      </div>
      <div class="pg-alerts-engine-stats">
        <div class="pg-alerts-engine-stat">
          <span class="pg-alerts-engine-stat-label">${escapeHTML(getLanguage() === 'tr' ? '24s tetik' : 'fired / 24h')}</span>
          <span class="pg-alerts-engine-stat-value">${fmt.num(fired24)}</span>
        </div>
        <div class="pg-alerts-engine-stat">
          <span class="pg-alerts-engine-stat-label">${escapeHTML(t('alerts.rule.open'))}</span>
          <span class="pg-alerts-engine-stat-value">${fmt.num(openCount)}</span>
        </div>
        <div class="pg-alerts-engine-stat">
          <span class="pg-alerts-engine-stat-label">${escapeHTML(t('alerts.kpi.resolved_today'))}</span>
          <span class="pg-alerts-engine-stat-value">${fmt.num(resolved24)}</span>
        </div>
      </div>
    `;

    /* rule families (radar) */
    const fam = computeRuleFamilies(alerts);
    if (window.Chart) {
      const canvas = rootEl.querySelector('[data-role="rule-canvas"]');
      if (canvas) {
        if (charts.ruleRadar) { charts.ruleRadar.destroy(); charts.ruleRadar = null; }
        const labels = fam.map((f) => t(RULE_FAMILIES.find((rf) => rf.key === f.key)?.tkey || 'alerts.rule.unknown'));
        const data = fam.map((f) => f.total);
        if (data.some((v) => v > 0)) {
          charts.ruleRadar = radarChart(canvas, [
            { label: t('alerts.engine.rules'), data, color: themePalette().brand },
          ], { labels });
        } else {
          /* clear canvas */
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    /* rule list */
    const list = rootEl.querySelector('[data-role="rules-list"]');
    list.innerHTML = fam.map((f) => {
      const rf = RULE_FAMILIES.find((x) => x.key === f.key);
      const labelKey = rf?.tkey || 'alerts.rule.unknown';
      const lastTriggered = f.lastTs
        ? `<time title="${escapeHTML(fmt.ymdhm(f.lastTs))}">${escapeHTML(fmt.relativeTime(f.lastTs))}</time>`
        : `<span class="muted">${escapeHTML(t('alerts.engine.never'))}</span>`;
      return `
        <div class="pg-alerts-rule-row">
          <div class="pg-alerts-rule-name">
            ${escapeHTML(t(labelKey))}
            <small>${escapeHTML(t('alerts.cat.' + (rf?.cat || 'operations')))}</small>
          </div>
          <div class="pg-alerts-rule-stat">
            <strong>${fmt.num(f.total)}</strong>
            ${escapeHTML(t('alerts.rule.total'))}
          </div>
          <div class="pg-alerts-rule-stat">
            <strong>${lastTriggered}</strong>
            ${escapeHTML(t('alerts.rule.last_triggered'))}
          </div>
          <div class="pg-alerts-rule-open" data-active="${f.open > 0}">${fmt.num(f.open)} ${escapeHTML(t('alerts.rule.open'))}</div>
        </div>
      `;
    }).join('');
  }

  function computeRuleFamilies(alerts) {
    const map = new Map();
    for (const f of RULE_FAMILIES) map.set(f.key, { key: f.key, total: 0, open: 0, lastTs: 0 });
    map.set('unknown', { key: 'unknown', total: 0, open: 0, lastTs: 0 });
    for (const a of alerts) {
      const k = ruleKeyFor(a);
      const slot = map.get(k);
      slot.total += 1;
      if (a.ts > slot.lastTs) slot.lastTs = a.ts;
      if (isOpen(a)) slot.open += 1;
    }
    return [...map.values()].filter((x) => x.key !== 'unknown' || x.total > 0);
  }

  /* ------------------------------ Feed ------------------------------ */
  function renderFeed() {
    const list = rootEl.querySelector('[data-role="feed-list"]');
    const countEl = rootEl.querySelector('[data-role="feed-count"]');
    const actionsEl = rootEl.querySelector('[data-role="feed-actions"]');
    const allAlerts = store.get('alerts') || [];
    const filtered = applyFilters(allAlerts);

    /* Order: open first (severity > ts), then snoozed/resolved/dismissed */
    const sevOrder = { critical: 0, warning: 1, info: 2, success: 3 };
    filtered.sort((a, b) => {
      const aOpen = isOpen(a), bOpen = isOpen(b);
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      const sa = sevOrder[a.severity] ?? 9;
      const sb = sevOrder[b.severity] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.ts || 0) - (a.ts || 0);
    });

    /* Counts */
    const openCount = allAlerts.filter(isOpen).length;
    countEl.textContent = ' · ' + t('alerts.feed.count', { open: openCount, filtered: filtered.length });

    /* Toolbar actions */
    actionsEl.innerHTML = `
      <button class="btn btn--sm btn--ghost" data-action="expand-all">${escapeHTML(t('alerts.action.expand_all'))}</button>
      <button class="btn btn--sm btn--ghost" data-action="collapse-all">${escapeHTML(t('alerts.action.collapse_all'))}</button>
    `;
    actionsEl.querySelector('[data-action="expand-all"]').addEventListener('click', () => {
      filtered.forEach((a) => pageState.expanded.add(a.id));
      renderFeed();
    });
    actionsEl.querySelector('[data-action="collapse-all"]').addEventListener('click', () => {
      pageState.expanded.clear();
      renderFeed();
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${svgIcon('bell')}</div>
          <div class="empty-state-title">${escapeHTML(t('alerts.feed.empty.title'))}</div>
          <div class="empty-state-body">${escapeHTML(t('alerts.feed.empty.body'))}</div>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(renderAlertCardHTML).join('');

    /* Wire up event handlers per card */
    list.querySelectorAll('.pg-alerts-card').forEach((card) => {
      const id = card.dataset.id;
      const a = allAlerts.find((x) => x.id === id);
      if (!a) return;

      /* expand toggle */
      card.querySelector('[data-action="toggle-expand"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pageState.expanded.has(id)) pageState.expanded.delete(id);
        else pageState.expanded.add(id);
        card.dataset.expanded = pageState.expanded.has(id) ? 'true' : 'false';
        const btn = card.querySelector('[data-action="toggle-expand"]');
        if (btn) btn.textContent = pageState.expanded.has(id)
          ? t('alerts.card.collapse')
          : t('alerts.card.expand');
      });

      /* card body click also toggles (but ignore button clicks) */
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        if (a.resolved || a.dismissed) return;
        if (pageState.expanded.has(id)) pageState.expanded.delete(id);
        else pageState.expanded.add(id);
        card.dataset.expanded = pageState.expanded.has(id) ? 'true' : 'false';
        const btn = card.querySelector('[data-action="toggle-expand"]');
        if (btn) btn.textContent = pageState.expanded.has(id)
          ? t('alerts.card.collapse')
          : t('alerts.card.expand');
      });

      /* action handlers */
      card.querySelector('[data-action="resolve"]')?.addEventListener('click', (e) => { e.stopPropagation(); openResolveModal(a); });
      card.querySelector('[data-action="dismiss"]')?.addEventListener('click', (e) => { e.stopPropagation(); doDismiss(a); });
      card.querySelector('[data-action="snooze-15"]')?.addEventListener('click', (e) => { e.stopPropagation(); doSnooze(a, 15); });
      card.querySelector('[data-action="snooze-60"]')?.addEventListener('click', (e) => { e.stopPropagation(); doSnooze(a, 60); });
      card.querySelector('[data-action="open-target"]')?.addEventListener('click', (e) => { e.stopPropagation(); openTarget(a); });

      /* recommendation buttons */
      card.querySelectorAll('[data-action="apply-rec"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const recId = btn.dataset.recId;
          const rec = (a.recommendations || []).find((r) => r.id === recId);
          if (rec) applyRecommendation(a, rec);
        });
      });
    });
  }

  /* ------------------------------ Card HTML ------------------------------ */
  function renderAlertCardHTML(a) {
    const vessels = store.get('vessels') || [];
    const docks = (store.get('shore_power') || {}).docks || [];
    const sev = severityKey(a);
    const cat = categoryFor(a);
    const tg = a.target;
    const tLabel = targetLabel(a, vessels, docks);
    const expanded = pageState.expanded.has(a.id);

    let state = 'open';
    if (a.resolved) state = 'resolved';
    else if (a.dismissed) state = 'dismissed';
    else if (isSnoozed(a)) state = 'snoozed';

    const tsAbs = a.ts ? fmt.ymdhm(a.ts) : '—';
    const tsRel = a.ts ? fmt.relativeTime(a.ts) : '—';

    const recsHTML = (a.recommendations && a.recommendations.length > 0)
      ? `
        <div class="pg-alerts-recs">
          <div class="pg-alerts-recs-label">${escapeHTML(t('alerts.card.recs_label'))}</div>
          ${a.recommendations.map((r) => renderRecHTML(r, state === 'open')).join('')}
        </div>
      `
      : '';

    /* Stamp shown when not open */
    let stamp = '';
    if (state === 'resolved') {
      const action = a.resolved_action ? actionLabelFor(a.resolved_action) : t('common.applied');
      const at = a.resolved_at ? fmt.relativeTime(a.resolved_at) : '';
      stamp = `<div class="pg-alerts-card-stamp">${escapeHTML(t('alerts.card.applied', { action }))} · ${escapeHTML(at)}</div>`;
    } else if (state === 'dismissed') {
      const at = a.dismissed_at ? fmt.relativeTime(a.dismissed_at) : '';
      stamp = `<div class="pg-alerts-card-stamp">${escapeHTML(t('alerts.card.dismissed'))} · ${escapeHTML(at)}</div>`;
    } else if (state === 'snoozed') {
      stamp = `<div class="pg-alerts-card-stamp">${escapeHTML(t('alerts.card.snoozed_until', { time: fmt.ymdhm(a.snoozed_until) }))}</div>`;
    }

    /* action buttons (only show on open) */
    const actionRow = state === 'open' ? `
      <div class="pg-alerts-card-actions">
        ${stamp}
        ${tg ? `<button class="btn btn--sm btn--ghost" data-action="open-target">${escapeHTML(t('alerts.action.open_target'))} ${svgIcon('arrow')}</button>` : ''}
        <button class="btn btn--sm btn--ghost" data-action="snooze-15" title="${escapeHTML(t('alerts.action.snooze_15m'))}">${svgIcon('snooze')} 15m</button>
        <button class="btn btn--sm btn--ghost" data-action="snooze-60" title="${escapeHTML(t('alerts.action.snooze_1h'))}">${svgIcon('snooze')} 1h</button>
        <button class="btn btn--sm btn--ghost" data-action="dismiss">${escapeHTML(t('alerts.action.dismiss'))}</button>
        <button class="btn btn--sm btn--primary" data-action="resolve">${escapeHTML(t('alerts.action.resolve'))}</button>
      </div>
    ` : `
      <div class="pg-alerts-card-actions">${stamp}</div>
    `;

    /* tags row */
    const tags = `
      <span class="pg-alerts-tag" data-tone="${SEVERITY_TONES[sev]}">${escapeHTML(t('alerts.sev.' + sev))}</span>
      <span class="pg-alerts-tag">${escapeHTML(t('alerts.cat.' + cat))}</span>
      ${tg && tg.kind ? `<span class="pg-alerts-tag">${escapeHTML(t('alerts.target.' + tg.kind))}</span>` : ''}
      ${a.hits && a.hits > 1 ? `<span class="pg-alerts-tag" data-tone="warning">${escapeHTML(t('alerts.card.hits', { n: a.hits }))}</span>` : ''}
    `;

    /* meta line */
    const meta = `
      <span class="pg-alerts-card-meta">
        <time title="${escapeHTML(tsAbs)}">${escapeHTML(tsRel)}</time>
        ${tLabel ? `<span class="pg-alerts-meta-dot">·</span><span class="pg-alerts-target">${escapeHTML(tLabel)}</span>` : ''}
        ${a._manual ? `<span class="pg-alerts-meta-dot">·</span><span class="pg-alerts-tag">manual</span>` : ''}
      </span>
    `;

    /* expand panel content */
    const recImpactSum = (a.recommendations || []).reduce((sum, r) => sum + (r.impact_kg_co2_h || 0), 0);
    const expandHTML = `
      <div class="pg-alerts-card-expand">
        <div class="row"><strong>${escapeHTML(t('alerts.card.id'))}:</strong> <span>${escapeHTML(a.id)}</span></div>
        ${a.signature ? `<div class="row"><strong>${escapeHTML(t('alerts.card.signature'))}:</strong> <span>${escapeHTML(a.signature)}</span></div>` : ''}
        <div class="row"><strong>${escapeHTML(t('alerts.card.detected_at'))}:</strong> <span>${escapeHTML(tsAbs)}</span></div>
        ${a.hits && a.hits > 1 ? `<div class="row"><strong>×</strong> <span>${a.hits}</span></div>` : ''}
        ${recImpactSum > 0 ? `<div class="row"><strong>Σ Impact:</strong> <span>~${fmt.num(recImpactSum)} kg CO₂/h</span></div>` : ''}
        ${a.resolved_note ? `<div class="row"><strong>${escapeHTML(getLanguage() === 'tr' ? 'Not' : 'Note')}:</strong> <span>${escapeHTML(a.resolved_note)}</span></div>` : ''}
      </div>
    `;

    return `
      <article class="pg-alerts-card" data-id="${escapeHTML(a.id)}" data-severity="${sev}" data-state="${state}" data-expanded="${expanded ? 'true' : 'false'}">
        <header class="pg-alerts-card-head">
          <div class="pg-alerts-sev-badge" data-severity="${sev}">${sevIcon(sev)}</div>
          <div class="pg-alerts-card-titleblock">
            <div class="pg-alerts-card-title">
              ${escapeHTML(alertTitle(a))}
              ${tags}
            </div>
            ${meta}
          </div>
          <div class="pg-alerts-card-aside">
            <button class="btn btn--sm btn--ghost" data-action="toggle-expand">${escapeHTML(expanded ? t('alerts.card.collapse') : t('alerts.card.expand'))}</button>
          </div>
        </header>
        <div class="pg-alerts-card-body">${escapeHTML(alertBody(a))}</div>
        ${recsHTML}
        ${expandHTML}
        ${actionRow}
      </article>
    `;
  }

  function renderRecHTML(rec, enabled) {
    const label = rec.tkey ? t(rec.tkey, rec.params || {}) : (rec.label || rec.id);
    const impact = recImpact(rec);
    return `
      <div class="pg-alerts-rec">
        <div class="pg-alerts-rec-icon">${recIcon(rec.id)}</div>
        <div class="pg-alerts-rec-body">
          <div class="pg-alerts-rec-title">${escapeHTML(label)}</div>
          ${impact ? `<div class="pg-alerts-rec-impact">${escapeHTML(impact)}</div>` : `<div class="pg-alerts-rec-impact" data-zero="true">—</div>`}
        </div>
        <button class="btn btn--sm ${enabled ? 'btn--primary' : 'btn--ghost'}"
          ${enabled ? '' : 'disabled'}
          data-action="apply-rec" data-rec-id="${escapeHTML(rec.id)}">
          ${escapeHTML(t('alerts.action.apply_rec'))} ${svgIcon('arrow')}
        </button>
      </div>
    `;
  }

  function actionLabelFor(actionId) {
    if (!actionId) return '—';
    const key = `rec.${actionId}`;
    const v = t(key);
    if (v && v !== key) return v;
    return actionId;
  }

  /* ------------------------------ Most-applied panel ------------------------------ */
  function renderAppliedPanel() {
    const recs = store.get('recommendations') || [];
    const counts = new Map();
    for (const r of recs) counts.set(r.action_id, (counts.get(r.action_id) || 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const countEl = rootEl.querySelector('[data-role="applied-count"]');
    countEl.textContent = recs.length > 0 ? `· ${fmt.num(recs.length)}` : '';

    const list = rootEl.querySelector('[data-role="applied-list"]');
    if (ranked.length === 0) {
      list.innerHTML = `<div class="muted" style="padding: var(--sp-2);">${escapeHTML(t('alerts.most_applied.empty'))}</div>`;
    } else {
      list.innerHTML = ranked.map(([actionId, count]) => `
        <div class="pg-alerts-applied-row">
          <span class="pg-alerts-applied-icon">${recIcon(actionId)}</span>
          <span class="pg-alerts-applied-name">${escapeHTML(actionLabelFor(actionId))}</span>
          <span class="pg-alerts-applied-count">${fmt.num(count)} ${escapeHTML(t('alerts.most_applied.times'))}</span>
        </div>
      `).join('');
    }

    /* chart */
    if (window.Chart) {
      const canvas = rootEl.querySelector('[data-role="applied-canvas"]');
      if (canvas) {
        if (charts.applied) { charts.applied.destroy(); charts.applied = null; }
        if (ranked.length > 0) {
          const labels = ranked.map(([id]) => actionLabelFor(id));
          const data = ranked.map(([, n]) => n);
          charts.applied = barChart(canvas, [
            { label: t('alerts.section.applied_rec'), data, color: themePalette().brand },
          ], { labels, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
        } else {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }

  /* ------------------------------ Resolution histogram ------------------------------ */
  function renderResoPanel() {
    const alerts = store.get('alerts') || [];
    const resolved = alerts.filter((a) => a.resolved && a.resolved_at && a.resolved_at - a.ts > 0);
    const buckets = { '<1m': 0, '1_5m': 0, '5_30m': 0, '30m_1h': 0, 'gt_1h': 0 };
    const durations = [];
    for (const a of resolved) {
      const dur = a.resolved_at - a.ts;
      durations.push(dur);
      if      (dur < 60_000)         buckets['<1m']++;
      else if (dur < 5 * 60_000)     buckets['1_5m']++;
      else if (dur < 30 * 60_000)    buckets['5_30m']++;
      else if (dur < 60 * 60_000)    buckets['30m_1h']++;
      else                            buckets['gt_1h']++;
    }
    const median = durations.length
      ? [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
      : 0;
    const p90 = durations.length
      ? [...durations].sort((a, b) => a - b)[Math.max(0, Math.floor(durations.length * 0.9) - 1)]
      : 0;

    const stats = rootEl.querySelector('[data-role="reso-stats"]');
    stats.innerHTML = `
      <div class="pg-alerts-reso-stat">
        <span class="pg-alerts-reso-stat-label">${escapeHTML(t('alerts.resolution_buckets.median'))}</span>
        <span class="pg-alerts-reso-stat-value">${median > 0 ? escapeHTML(fmt.duration(median)) : '—'}</span>
      </div>
      <div class="pg-alerts-reso-stat">
        <span class="pg-alerts-reso-stat-label">${escapeHTML(t('alerts.resolution_buckets.p90'))}</span>
        <span class="pg-alerts-reso-stat-value">${p90 > 0 ? escapeHTML(fmt.duration(p90)) : '—'}</span>
      </div>
    `;

    if (window.Chart) {
      const canvas = rootEl.querySelector('[data-role="reso-canvas"]');
      if (canvas) {
        if (charts.reso) { charts.reso.destroy(); charts.reso = null; }
        const labels = ['<1m', '1_5m', '5_30m', '30m_1h', 'gt_1h']
          .map((k) => t('alerts.resolution_buckets.' + k));
        const data = ['<1m', '1_5m', '5_30m', '30m_1h', 'gt_1h'].map((k) => buckets[k]);
        if (data.some((v) => v > 0)) {
          charts.reso = barChart(canvas, [
            { label: t('alerts.section.resolution_time'), data, color: themePalette().info },
          ], { labels, options: { plugins: { legend: { display: false } } } });
        } else {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }

  /* ------------------------------ Action handlers ------------------------------ */
  function onClearResolved() {
    confirm({
      title: t('alerts.action.clear_resolved'),
      body: t('alerts.clear_resolved.confirm'),
      danger: true,
      confirmLabel: t('common.confirm'),
    }).then((ok) => {
      if (ok) store.dispatch('clearResolvedAlerts');
    });
  }

  function onToggleEngine() {
    const cur = store.get('settings') || {};
    store.dispatch('setSetting', { alert_engine_enabled: !(cur.alert_engine_enabled !== false) });
  }

  function doDismiss(a) {
    confirm({
      title: t('alerts.action.dismiss'),
      body: t('alerts.action.dismiss_confirm'),
      danger: true,
      confirmLabel: t('alerts.action.dismiss'),
    }).then((ok) => {
      if (ok) store.dispatch('dismissAlert', a.id);
    });
  }

  function doSnooze(a, mins) {
    store.dispatch('snoozeAlert', { id: a.id, minutes: mins });
  }

  function openTarget(a) {
    const tg = a.target;
    if (!tg) return;
    if (tg.kind === 'vessel' && tg.vessel_id) navigate('vessels', { id: tg.vessel_id });
    else if (tg.kind === 'dock') navigate('shore', { id: tg.dock_id });
    else if (tg.kind === 'aggregate') navigate('emissions', { pollutant: tg.pollutant });
  }

  /* ------------------------------ Resolve modal (with note + action select) ------------------------------ */
  function openResolveModal(a) {
    const recOptions = (a.recommendations || []).map((r) => ({
      value: r.id, label: t(r.tkey, r.params || {}),
    }));
    const fields = [
      ...(recOptions.length > 0 ? [{
        id: 'action_id',
        label: t('common.actions'),
        type: 'select',
        value: recOptions[0].value,
        options: [{ value: '', label: t('alerts.action.resolve_with_action') }, ...recOptions],
      }] : []),
      {
        id: 'note',
        label: t('alerts.action.note_label'),
        type: 'textarea',
        value: '',
        placeholder: t('alerts.action.note_placeholder'),
      },
    ];
    openForm({
      title: t('alerts.action.resolve'),
      subtitle: alertTitle(a),
      fields,
      submitLabel: t('alerts.action.resolve'),
      cancelLabel: t('common.cancel'),
      onSubmit: (values) => {
        const action_id = values.action_id || 'manual';
        const note = (values.note || '').trim() || t('alerts.action.resolve_with_action');
        store.dispatch('resolveAlert', { id: a.id, action_id, note });
        return true;
      },
    });
  }

  /* ------------------------------ Apply recommendation ------------------------------ */
  function applyRecommendation(alert, rec) {
    const proceed = () => {
      if (rec.apply && rec.apply.action) {
        const act = rec.apply.action;
        if (act === 'toggleShorePower') {
          store.dispatch('toggleShorePower', rec.apply.payload);
          /* and resolve the alert */
          store.dispatch('resolveAlert', {
            id: alert.id,
            action_id: rec.id,
            note: t('alerts.action.resolve_with_action') + ' · ' + (rec.tkey ? t(rec.tkey, rec.params || {}) : rec.id),
          });
        } else if (act === 'addManualReading') {
          store.dispatch('addManualReading', rec.apply.payload);
          store.dispatch('resolveAlert', {
            id: alert.id, action_id: rec.id,
            note: rec.tkey ? t(rec.tkey, rec.params || {}) : rec.id,
          });
        } else {
          /* generic — just resolve */
          store.dispatch('resolveAlert', {
            id: alert.id, action_id: rec.id,
            note: 'operator manually applied ' + (rec.tkey ? t(rec.tkey, rec.params || {}) : rec.id),
          });
        }
      } else {
        store.dispatch('resolveAlert', {
          id: alert.id, action_id: rec.id,
          note: 'operator manually applied ' + (rec.tkey ? t(rec.tkey, rec.params || {}) : rec.id),
        });
      }
    };

    confirm({
      title: t('alerts.action.apply_rec'),
      body: `${t('alerts.action.apply_confirm')}\n\n→ ${rec.tkey ? t(rec.tkey, rec.params || {}) : rec.id}`,
      confirmLabel: t('common.apply'),
    }).then((ok) => { if (ok) proceed(); });
  }

  /* ------------------------------ Add-alert modal ------------------------------ */
  function openAddAlert() {
    const vessels = store.get('vessels') || [];
    const docks = (store.get('shore_power') || {}).docks || [];

    /* Build the form scaffolding that depends on target_kind. We use a custom
       approach: a plain modal with a manually-built form, since the form
       builder doesn't support dynamic option swapping mid-edit. */
    const formEl = document.createElement('form');
    formEl.className = 'form';
    formEl.noValidate = true;

    const titleField = textField('title', t('alerts.field.title'), '', { required: true });
    const bodyField = textareaField('body', t('alerts.field.body'), t('alerts.preset.body_default'), { required: true });
    const sevField = selectField('severity', t('alerts.field.severity'), 'warning', SEVERITIES.map((s) => ({ value: s, label: t('alerts.sev.' + s) })));
    const catField = selectField('category', t('alerts.field.category'), 'operations', CATEGORIES.map((c) => ({ value: c, label: t('alerts.cat.' + c) })));
    const targetKindField = selectField('target_kind', t('alerts.field.target_kind'), 'none', [
      { value: 'none',      label: t('alerts.field.target_none') },
      { value: 'vessel',    label: t('alerts.target.vessel') },
      { value: 'dock',      label: t('alerts.target.dock') },
      { value: 'aggregate', label: t('alerts.target.aggregate') },
    ]);
    const targetIdField = selectField('target_id', t('alerts.field.target_id'), '', []);

    formEl.appendChild(titleField);
    formEl.appendChild(bodyField);
    const sevCatRow = document.createElement('div');
    sevCatRow.className = 'form-grid-2';
    sevCatRow.appendChild(sevField);
    sevCatRow.appendChild(catField);
    formEl.appendChild(sevCatRow);
    const targetRow = document.createElement('div');
    targetRow.className = 'form-grid-2';
    targetRow.appendChild(targetKindField);
    targetRow.appendChild(targetIdField);
    formEl.appendChild(targetRow);

    /* Recommendation grid */
    const recsField = document.createElement('div');
    recsField.className = 'form-field';
    recsField.innerHTML = `
      <label class="form-label">${escapeHTML(t('alerts.add.recommendations'))}</label>
      <div class="pg-alerts-rec-grid">
        ${RECOMMENDATION_PRESETS.map((id) => `
          <label>
            <input type="checkbox" name="rec_${id}" />
            <span>${escapeHTML(t('rec.' + id))}</span>
          </label>
        `).join('')}
      </div>
      <div class="form-hint">${escapeHTML(t('alerts.add.recommendations.hint'))}</div>
    `;
    formEl.appendChild(recsField);

    /* dynamic target id select */
    const refreshTargetSelect = () => {
      const targetIdSelect = targetIdField.querySelector('select');
      const kind = targetKindField.querySelector('select').value;
      let opts = [];
      if (kind === 'vessel') opts = vessels.map((v) => ({ value: v.id, label: v.name }));
      else if (kind === 'dock') opts = docks.map((d) => ({ value: d.id, label: d.name }));
      else if (kind === 'aggregate') opts = [
        { value: 'co2', label: 'CO₂' },
        { value: 'nox', label: 'NOₓ' },
        { value: 'sox', label: 'SOₓ' },
      ];
      targetIdSelect.innerHTML = opts.map((o) => `<option value="${escapeHTML(o.value)}">${escapeHTML(o.label)}</option>`).join('');
      targetIdField.style.display = (kind === 'none') ? 'none' : '';
    };
    targetKindField.querySelector('select').addEventListener('change', refreshTargetSelect);
    refreshTargetSelect();

    const handle = openModal({
      title: t('alerts.add.title'),
      subtitle: t('alerts.add.subtitle'),
      body: formEl,
      size: 'lg',
      actions: [
        { label: t('common.cancel'), tone: 'ghost' },
        { label: t('common.save'), tone: 'primary',
          onClick: () => {
            const titleVal = formEl.querySelector('[name="title"]').value.trim();
            const bodyVal = formEl.querySelector('[name="body"]').value.trim();
            if (!titleVal) {
              const errEl = titleField.querySelector('.form-error');
              if (errEl) errEl.textContent = t('common.required');
              titleField.classList.add('has-error');
              return false;
            }
            if (!bodyVal) {
              const errEl = bodyField.querySelector('.form-error');
              if (errEl) errEl.textContent = t('common.required');
              bodyField.classList.add('has-error');
              return false;
            }
            const sevVal = formEl.querySelector('[name="severity"]').value;
            const catVal = formEl.querySelector('[name="category"]').value;
            const tkVal = formEl.querySelector('[name="target_kind"]').value;
            const tidVal = formEl.querySelector('[name="target_id"]').value;
            const selectedRecs = RECOMMENDATION_PRESETS
              .filter((id) => formEl.querySelector(`[name="rec_${id}"]`)?.checked)
              .map((id) => ({ id, tkey: 'rec.' + id }));
            const target = (tkVal === 'none' || !tkVal)
              ? null
              : { kind: tkVal, [tkVal + '_id']: tidVal };

            store.dispatch('pushAlert', {
              id: `manual-${Date.now()}`,
              ts: Date.now(),
              category: catVal,
              severity: sevVal,
              title_key: null,
              title_text: titleVal,
              body_key: null,
              body_text: bodyVal,
              body_params: {},
              target,
              recommendations: selectedRecs,
              _manual: true,
            });
            return true;
          },
        },
      ],
    });
    return handle;
  }

  /* tiny field helpers (so we don't need openForm's rigid building when we want
     dynamic select options) */
  function textField(id, label, value = '', opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    wrap.dataset.fieldId = id;
    wrap.innerHTML = `
      <label class="form-label" for="f-${id}">${escapeHTML(label)} ${opts.required ? '<span class="req">*</span>' : ''}</label>
      <input class="form-input" type="text" id="f-${id}" name="${id}" value="${escapeHTML(value)}" />
      <div class="form-error"></div>
    `;
    return wrap;
  }
  function textareaField(id, label, value = '', opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    wrap.dataset.fieldId = id;
    wrap.innerHTML = `
      <label class="form-label" for="f-${id}">${escapeHTML(label)} ${opts.required ? '<span class="req">*</span>' : ''}</label>
      <textarea class="form-input form-textarea" id="f-${id}" name="${id}" rows="3">${escapeHTML(value)}</textarea>
      <div class="form-error"></div>
    `;
    return wrap;
  }
  function selectField(id, label, value, options) {
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    wrap.dataset.fieldId = id;
    wrap.innerHTML = `
      <label class="form-label" for="f-${id}">${escapeHTML(label)}</label>
      <select class="form-input" id="f-${id}" name="${id}">
        ${options.map((o) => `<option value="${escapeHTML(o.value)}" ${String(value) === String(o.value) ? 'selected' : ''}>${escapeHTML(o.label)}</option>`).join('')}
      </select>
      <div class="form-error"></div>
    `;
    return wrap;
  }

  /* ------------------------------ Render orchestration ------------------------------ */
  function renderAll() {
    /* page header text (in case language changed) */
    const titleEl = rootEl.querySelector('[data-i18n-title]');
    const subEl = rootEl.querySelector('[data-i18n-subtitle]');
    if (titleEl) titleEl.textContent = t('page.alerts.title');
    if (subEl) subEl.textContent = t('page.alerts.subtitle');

    renderHeaderActions();
    renderKpiStrip();
    renderFilterRail();
    renderTrendChart();
    renderRulePanel();
    renderFeed();
    renderAppliedPanel();
    renderResoPanel();
  }

  renderAll();

  /* ------------------------------ Subscriptions ------------------------------ */
  /* alerts changes drive most of the page */
  unsubs.push(store.subscribe('alerts', renderAll));
  unsubs.push(store.subscribe('recommendations', () => {
    renderKpiStrip();
    renderAppliedPanel();
  }));
  unsubs.push(store.subscribe('settings', () => {
    renderHeaderActions();
    renderRulePanel();
  }));
  unsubs.push(store.subscribe('vessels',     renderFeed));
  unsubs.push(store.subscribe('shore_power', renderFeed));
  unsubs.push(store.subscribe('ui',          renderAll));

  /* ------------------------------ Unmount ------------------------------ */
  return {
    unmount() {
      for (const u of unsubs) {
        try { u(); } catch (_) { /* noop */ }
      }
      unsubs.length = 0;
      for (const k of Object.keys(charts)) {
        const c = charts[k];
        if (c && typeof c.destroy === 'function') {
          try { c.destroy(); } catch (_) { /* noop */ }
        }
        charts[k] = null;
      }
    },
  };
}
