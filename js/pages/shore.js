/**
 * pages/shore.js — Karadan Güç / Shore Power orchestration page.
 *
 * Power-BI quality cold-ironing dashboard:
 *  - 5-card KPI strip (connected, grid load, today's kWh, today's CO₂, util)
 *  - Rich berth grid with cumulative session metrics + manual CRUD pencil
 *  - Stacked-area capacity chart (per-berth kw_used over a rolling 24-bucket buffer)
 *  - Activation heatmap (rows = berths, cols = 24 hourly buckets)
 *  - ROI / Savings panel with friendly equivalents (trees, households, highway km)
 *  - Optimizer panel (potential savings + engine-generated `category === 'shore'` alerts)
 *  - Activation history table merged from a module-local event log + applied recommendations
 *  - Manual berth Add / Edit / Delete via the form modal
 *
 * Module-local rolling buffer accumulates per-berth `kw_used` snapshots on each
 * `shore_power` slice update so the time-series visuals have history beyond the
 * single live tick the simulation exposes.
 */

import store from '../store/state.js';
import { t, registerStrings, getLanguage } from '../i18n.js';
import * as fmt from '../utils/format.js';
import { lineChart, barChart, doughnutChart, radarChart, themePalette, drawHeatmap, hexAlpha, toneColor } from '../utils/charts.js';
import { openForm, openModal, confirm } from '../utils/modal.js';
import { required, minNumber, compose } from '../utils/validate.js';
import { navigate } from '../router.js';

/* ============================================================
 *  i18n registration
 * ============================================================ */
registerStrings({
  tr: {
    /* page header */
    'shore.range.24h': '24s',
    'shore.range.7d':  '7g',
    'shore.range.30d': '30g',

    /* KPI strip */
    'shore.kpi.connected_now':  'Bağlı Rıhtım',
    'shore.kpi.connected_meta': '{n}/{total} dolu rıhtım · hedef ≥ 3',
    'shore.kpi.grid_load':      'Şebeke Yükü',
    'shore.kpi.grid_meta':      'kapasitenin %{pct}\'i · {cap} MW kurulu',
    'shore.kpi.today_kwh':      'Bugünkü Enerji',
    'shore.kpi.today_kwh_meta': 'oturum {dur} sürdü',
    'shore.kpi.today_co2':      'Önlenen CO₂ (Bugün)',
    'shore.kpi.today_co2_meta': 'kümülatif · 0,69 kg CO₂/kWh',
    'shore.kpi.utilization':    'Kullanım Oranı',
    'shore.kpi.util_meta':      'şebekenin etkin yüzdesi',

    /* sections */
    'shore.section.berths':    'Ana Liman Operasyonu',
    'shore.section.berths_sub':'En büyük 4 İzmir limanı · canlı karadan güç kontrolü',
    'shore.section.selected':       'Seçili Liman',
    'shore.section.selected_sub':   'Liman direktöründen bir liman seçince detaylar burada görünür',
    'shore.section.selected_sub_active':'{name} · canlı veriler',
    'shore.selected.empty.title':   'Henüz liman seçilmedi',
    'shore.selected.empty.body':    'Aşağıdaki liman direktöründen bir liman seçerek tüm verileri burada inceleyebilirsiniz.',
    'shore.selected.clear':         'Seçimi temizle',
    'shore.selected.summary':       '{cat} · Kapasite {cap} kW · Talep {demand} kW',
    'shore.selected.stat.session_kwh': 'Oturum kWh',
    'shore.selected.stat.session_co2': 'Önlenen CO₂',
    'shore.selected.stat.util':        'Kapasite Kullanımı',
    'shore.selected.stat.util_meta':   'kullanılan / toplam',
    'shore.selected.stat.fulfilled':   'Talep Karşılama',
    'shore.selected.stat.fulfilled_meta':'çekilen / talep',

    'shore.section.directory':     'Liman Direktörü',
    'shore.section.directory_sub': 'Tüm İzmir körfezi limanları · kategori filtreli',
    'shore.directory.search.placeholder': 'Liman adı ara…',
    'shore.directory.empty.title': 'Eşleşen liman yok',
    'shore.directory.empty.body':  'Filtreleri temizleyip tekrar deneyin.',
    'shore.dir.status.active':     'Karadan güç aktif · {kw} kW',
    'shore.dir.status.aux':        'Yardımcı motor çalışıyor',
    'shore.dir.status.empty':      'Boşta',
    'shore.dir.cta':               'Detayları gör',

    'shore.cat.all':           'Tümü',
    'shore.cat.general':       'Genel',
    'shore.cat.industrial':    'Endüstriyel',
    'shore.cat.petrochemical': 'Petrokimya',
    'shore.cat.refinery':      'Rafineri',
    'shore.cat.fuel':          'Akaryakıt',
    'shore.cat.gas':           'Gaz',
    'shore.cat.steel':         'Çelik',
    'shore.cat.fertilizer':    'Gübre',
    'shore.cat.container':     'Konteyner',
    'shore.cat.cruise':        'Cruise',
    'shore.section.capacity':  'Kapasite Analizi',
    'shore.section.capacity_sub': 'Rıhtım başına çekilen güç (yığılı alan)',
    'shore.section.heatmap':   'Aktivasyon Isı Haritası',
    'shore.section.heatmap_sub':'Son 24 saat · saatlik aktif/pasif kaydı',
    'shore.section.roi':       'Tasarruf ve Geri Dönüş',
    'shore.section.roi_sub':   'Önlenen CO₂ kümülatifi ve illüstratif eşdeğerler',
    'shore.section.optimizer': 'Akıllı Öneriler',
    'shore.section.optimizer_sub':'Otomatik tespit edilen karadan güç fırsatları',
    'shore.section.history':   'Aktivasyon Geçmişi',
    'shore.section.history_sub':'Etkinleştirme/bırakma kayıtları ve uygulanan öneriler',

    /* berth card */
    'shore.berth.cumulative_kwh':'oturum {kwh} kWh',
    'shore.berth.session_co2':   'oturum {kg} kg CO₂',
    'shore.berth.engaged_for':   'aktif {dur}',
    'shore.berth.demand':        'Talep',
    'shore.berth.capacity':      'Kapasite',
    'shore.berth.current':       'Anlık',
    'shore.berth.co2_per_hour':  '~{kg} kg CO₂/s tasarruf potansiyeli',
    'shore.berth.manual_tag':    'manuel',
    'shore.berth.edit':          'Manuel rıhtımı düzenle',
    'shore.berth.delete':        'Manuel rıhtımı sil',

    /* capacity chart */
    'shore.capacity.threshold':  'şebeke kapasitesi',
    'shore.capacity.legend.berth':'Rıhtım',
    'shore.capacity.empty':      'Henüz veri biriktirilmedi — bir rıhtımı etkinleştirin',
    'shore.capacity.axis_kw':    'kW',
    'shore.capacity.axis_time':  'saat',

    /* heatmap */
    'shore.heatmap.caption':     'Hücre koyuluğu rıhtımın o saatteki ortalama yükünü gösterir.',
    'shore.heatmap.legend.idle': 'boşta',
    'shore.heatmap.legend.active':'aktif',
    'shore.heatmap.empty':       'Henüz aktivasyon kaydı yok',

    /* ROI / equivalents */
    'shore.roi.cumulative_co2':  'Kümülatif Önlenen CO₂',
    'shore.roi.cum_axis':        'kg CO₂',
    'shore.roi.cum_label':       'oturum',
    'shore.roi.eq.trees':        'Eşdeğer Ağaç (yıllık)',
    'shore.roi.eq.trees_meta':   '~21 kg CO₂ / ağaç-yıl',
    'shore.roi.eq.households':   'Eşdeğer Hane (saatlik)',
    'shore.roi.eq.households_meta':'4 kWh/hane-saat varsayımı',
    'shore.roi.eq.highway':      'Otoyolda Sürüş Telafisi',
    'shore.roi.eq.highway_meta': 'binek araç ortalaması · 0,18 kg/km',
    'shore.roi.eq.note':         'Bu eşdeğerler operasyonel etkiyi anlatmak için verilmiştir; resmi hesap değildir.',

    /* optimizer */
    'shore.opt.title':           'Karadan güç fırsatı: {dock}',
    'shore.opt.body':            '{vessel} ({type}) · ~{kw} kW yardımcı motorda. Etkinleştirin, ~{co2} kg/s CO₂ önlensin.',
    'shore.opt.apply':           'Etkinleştir',
    'shore.opt.savings':         '~{co2} kg CO₂/s tasarruf',
    'shore.opt.empty':           'Aktif tüm dolu rıhtımlar zaten karadan güçte — fırsat yok.',
    'shore.opt.engine':          'Motor önerisi',

    /* history */
    'shore.history.col.ts':      'Zaman',
    'shore.history.col.berth':   'Rıhtım',
    'shore.history.col.action':  'İşlem',
    'shore.history.col.vessel':  'Gemi',
    'shore.history.col.kw':      'kW',
    'shore.history.col.co2':     'Önlenen CO₂',
    'shore.history.col.source':  'Kaynak',
    'shore.history.empty':       'Henüz aktivasyon kaydı yok',
    'shore.history.src.manual':  'manuel',
    'shore.history.src.engine':  'motor',
    'shore.history.src.applied': 'öneri',

    /* actions */
    'shore.action.engaged':      'Etkinleştirildi',
    'shore.action.released':     'Bırakıldı',

    /* manual CRUD */
    'shore.add.title':           'Yeni Rıhtım Ekle',
    'shore.edit.title':          'Rıhtımı Düzenle',
    'shore.add.cta':              'Rıhtım ekle',
    'shore.field.name':          'Rıhtım adı',
    'shore.field.name_hint':     'Örn. Alsancak F',
    'shore.field.capacity':      'Kapasite (kW)',
    'shore.field.demand':        'Talep (kW)',
    'shore.field.vessel_name':   'Yanaşan gemi (opsiyonel)',
    'shore.field.vessel_type':   'Gemi tipi',
    'shore.field.vessel_type_none':'(seçim yok)',

    'shore.delete.confirm':      '"{name}" rıhtımı silinecek. Bu işlem geri alınamaz.',
    'shore.delete.manual_only':  'Yalnızca manuel olarak eklenmiş rıhtımlar silinebilir.',

    /* misc */
    'shore.empty.opt':           'Tüm dolu rıhtımlar zaten karadan güçte',
    'shore.empty.history':       'Henüz aktivasyon yok',
    'shore.dock.no_vessel':      'Boş rıhtım',
    'shore.duration.session':    'oturum {dur}',
  },

  en: {
    /* page header */
    'shore.range.24h': '24h',
    'shore.range.7d':  '7d',
    'shore.range.30d': '30d',

    /* KPI strip */
    'shore.kpi.connected_now':  'Connected Now',
    'shore.kpi.connected_meta': '{n}/{total} occupied berths · target ≥ 3',
    'shore.kpi.grid_load':      'Grid Load',
    'shore.kpi.grid_meta':      '{pct}% of capacity · {cap} MW installed',
    'shore.kpi.today_kwh':      'Today\'s Energy',
    'shore.kpi.today_kwh_meta': 'session running for {dur}',
    'shore.kpi.today_co2':      'CO₂ Avoided (Today)',
    'shore.kpi.today_co2_meta': 'cumulative · 0.69 kg CO₂/kWh',
    'shore.kpi.utilization':    'Utilization',
    'shore.kpi.util_meta':      'effective grid share',

    /* sections */
    'shore.section.berths':    'Major Port Operations',
    'shore.section.berths_sub':'Top 4 İzmir bay ports · live shore-power control',
    'shore.section.selected':       'Selected Port',
    'shore.section.selected_sub':   'Pick a port from the directory to inspect its data here',
    'shore.section.selected_sub_active':'{name} · live data',
    'shore.selected.empty.title':   'No port selected',
    'shore.selected.empty.body':    'Choose any port from the directory below to inspect its full operational data here.',
    'shore.selected.clear':         'Clear selection',
    'shore.selected.summary':       '{cat} · Capacity {cap} kW · Demand {demand} kW',
    'shore.selected.stat.session_kwh': 'Session kWh',
    'shore.selected.stat.session_co2': 'CO₂ avoided',
    'shore.selected.stat.util':        'Capacity utilization',
    'shore.selected.stat.util_meta':   'used / total',
    'shore.selected.stat.fulfilled':   'Demand fulfilled',
    'shore.selected.stat.fulfilled_meta':'delivered / requested',

    'shore.section.directory':     'Port Directory',
    'shore.section.directory_sub': 'All İzmir bay terminals · category filtered',
    'shore.directory.search.placeholder': 'Search port name…',
    'shore.directory.empty.title': 'No matching ports',
    'shore.directory.empty.body':  'Try clearing the filters.',
    'shore.dir.status.active':     'Shore power active · {kw} kW',
    'shore.dir.status.aux':        'Auxiliary engine running',
    'shore.dir.status.empty':      'Idle',
    'shore.dir.cta':               'View details',

    'shore.cat.all':           'All',
    'shore.cat.general':       'General',
    'shore.cat.industrial':    'Industrial',
    'shore.cat.petrochemical': 'Petrochemical',
    'shore.cat.refinery':      'Refinery',
    'shore.cat.fuel':          'Fuel',
    'shore.cat.gas':           'Gas',
    'shore.cat.steel':         'Steel',
    'shore.cat.fertilizer':    'Fertilizer',
    'shore.cat.container':     'Container',
    'shore.cat.cruise':        'Cruise',
    'shore.section.capacity':  'Capacity Analysis',
    'shore.section.capacity_sub':'Power drawn per berth (stacked area)',
    'shore.section.heatmap':   'Activation Heatmap',
    'shore.section.heatmap_sub':'Last 24 hours · hourly active/idle ledger',
    'shore.section.roi':       'Savings & ROI',
    'shore.section.roi_sub':   'Cumulative CO₂ avoided + illustrative equivalents',
    'shore.section.optimizer': 'Smart Recommendations',
    'shore.section.optimizer_sub':'Auto-detected shore-power opportunities',
    'shore.section.history':   'Activation History',
    'shore.section.history_sub':'Engage / release events and applied recommendations',

    /* berth card */
    'shore.berth.cumulative_kwh':'session {kwh} kWh',
    'shore.berth.session_co2':   'session {kg} kg CO₂',
    'shore.berth.engaged_for':   'engaged {dur}',
    'shore.berth.demand':        'Demand',
    'shore.berth.capacity':      'Capacity',
    'shore.berth.current':       'Live',
    'shore.berth.co2_per_hour':  '~{kg} kg CO₂/h potential savings',
    'shore.berth.manual_tag':    'manual',
    'shore.berth.edit':          'Edit manual berth',
    'shore.berth.delete':        'Delete manual berth',

    /* capacity chart */
    'shore.capacity.threshold':  'grid capacity',
    'shore.capacity.legend.berth':'Berth',
    'shore.capacity.empty':      'No data accrued yet — engage a berth to start',
    'shore.capacity.axis_kw':    'kW',
    'shore.capacity.axis_time':  'hour',

    /* heatmap */
    'shore.heatmap.caption':     'Cell intensity reflects the average load on that berth during the hour.',
    'shore.heatmap.legend.idle': 'idle',
    'shore.heatmap.legend.active':'active',
    'shore.heatmap.empty':       'No activation recorded yet',

    /* ROI / equivalents */
    'shore.roi.cumulative_co2':  'Cumulative CO₂ Avoided',
    'shore.roi.cum_axis':        'kg CO₂',
    'shore.roi.cum_label':       'session',
    'shore.roi.eq.trees':        'Equivalent Trees (per year)',
    'shore.roi.eq.trees_meta':   '~21 kg CO₂ / tree-year',
    'shore.roi.eq.households':   'Equivalent Households (hourly)',
    'shore.roi.eq.households_meta':'4 kWh per household-hour assumption',
    'shore.roi.eq.highway':      'Highway-driving Offset',
    'shore.roi.eq.highway_meta': 'avg passenger car · 0.18 kg/km',
    'shore.roi.eq.note':         'These equivalents are illustrative — they describe the operational impact, not an audited footprint.',

    /* optimizer */
    'shore.opt.title':           'Shore-power opportunity: {dock}',
    'shore.opt.body':            '{vessel} ({type}) · ~{kw} kW on auxiliary. Engage to avoid ~{co2} kg/h CO₂.',
    'shore.opt.apply':           'Engage',
    'shore.opt.savings':         '~{co2} kg CO₂/h savings',
    'shore.opt.empty':           'All occupied berths already on shore power — no opportunities right now.',
    'shore.opt.engine':          'Engine recommendation',

    /* history */
    'shore.history.col.ts':      'Timestamp',
    'shore.history.col.berth':   'Berth',
    'shore.history.col.action':  'Action',
    'shore.history.col.vessel':  'Vessel',
    'shore.history.col.kw':      'kW',
    'shore.history.col.co2':     'CO₂ Saved',
    'shore.history.col.source':  'Source',
    'shore.history.empty':       'No activation events yet',
    'shore.history.src.manual':  'manual',
    'shore.history.src.engine':  'engine',
    'shore.history.src.applied': 'recommendation',

    /* actions */
    'shore.action.engaged':      'Engaged',
    'shore.action.released':     'Released',

    /* manual CRUD */
    'shore.add.title':           'Add new berth',
    'shore.edit.title':          'Edit berth',
    'shore.add.cta':              'Add berth',
    'shore.field.name':          'Berth name',
    'shore.field.name_hint':     'e.g. Alsancak F',
    'shore.field.capacity':      'Capacity (kW)',
    'shore.field.demand':        'Demand (kW)',
    'shore.field.vessel_name':   'Vessel docked (optional)',
    'shore.field.vessel_type':   'Vessel type',
    'shore.field.vessel_type_none':'(none)',

    'shore.delete.confirm':      'Berth "{name}" will be removed. This cannot be undone.',
    'shore.delete.manual_only':  'Only manually-added berths can be deleted.',

    /* misc */
    'shore.empty.opt':           'All occupied berths already on shore power',
    'shore.empty.history':       'No activations yet',
    'shore.dock.no_vessel':      'Empty berth',
    'shore.duration.session':    'session {dur}',
  },
});

/* ============================================================
 *  Module-local rolling state
 *
 *  Persists for the lifetime of the page session (across re-mounts during a
 *  single SPA visit). Re-instantiated on a hard reload.
 * ============================================================ */
const BUFFER_BUCKETS = 24;       /* heatmap + capacity chart cols */
const BUFFER_DEDUP_MS = 1500;    /* skip snapshots that arrive faster than this */

const moduleState = {
  /* timeseries: array of { ts, byDock: { dockId: kw }, total } */
  timeseries: [],
  /* hourly buckets: array of length 24, each { byDock: { dockId: { sum, n } } } */
  hourlyBuckets: makeEmptyHourly(),
  /* per-berth session totals tracked since first observation */
  sessionStats: {},  /* dockId -> { engagedSinceMs, totalEngagedMs, kwh, kg, lastTs, lastKw } */
  /* event log of engage/release transitions */
  events: [],        /* { ts, dockId, dockName, action: 'engaged'|'released', vessel, kw, co2_total } */
  /* last observed dock map for diffing */
  lastDocks: null,
  /* last snapshot ts (dedupe) */
  lastSnapshotTs: 0,
  /* selected range chip */
  range: '24h',
  /* directory state */
  selectedDockId:   null,    /* dock the user picked from the directory */
  directoryFilter:  'all',   /* category chip */
  directorySearch:  '',
};

function makeEmptyHourly() {
  return Array.from({ length: BUFFER_BUCKETS }, () => ({ byDock: {} }));
}

/* CSS injected once at module load. */
const STYLES = `
.page-shore { display: grid; gap: var(--sp-5); grid-auto-rows: min-content; }

/* ---- KPI strip ---- */
.pg-shore-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--sp-4); }
@media (max-width: 1180px) { .pg-shore-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px)  { .pg-shore-kpis { grid-template-columns: repeat(2, 1fr); } }

.pg-shore-kpi { position: relative; overflow: hidden; min-height: 116px; }
.pg-shore-kpi .pg-shore-kpi-spark {
  position: absolute; right: 8px; bottom: 8px;
  width: 96px; height: 38px; opacity: 0.85;
  pointer-events: none;
}
.pg-shore-kpi .pg-shore-kpi-spark canvas { width: 100% !important; height: 100% !important; }
.pg-shore-kpi-bar { height: 4px; border-radius: var(--r-pill); background: var(--bg-3); margin-top: var(--sp-2); overflow: hidden; }
.pg-shore-kpi-bar > i {
  display: block; height: 100%;
  background: linear-gradient(90deg, var(--status-success), var(--brand-primary));
  border-radius: inherit;
  transition: width var(--dur-base) var(--ease-out);
}

/* ---- Berth grid (richer than dashboard) ---- */
.pg-shore-berths { display: grid; gap: var(--sp-4); }
.pg-shore-berths .docks-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }

/* ============================================================
   Selected port detail panel
   ============================================================ */
.pg-shore-selected-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: var(--sp-4);
  align-items: start;
}
@media (max-width: 1100px) {
  .pg-shore-selected-grid { grid-template-columns: 1fr; }
}
.pg-shore-selected-card .dock { margin: 0; }
.pg-shore-selected-aside {
  display: grid;
  gap: var(--sp-3);
  align-content: start;
}
.pg-shore-selected-tag {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--sp-3);
}
.pg-shore-selected-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
}
.pg-shore-selected-summary {
  background: var(--bg-2);
  border: 1px dashed var(--border-soft);
  border-radius: var(--r-md);
  padding: var(--sp-3) var(--sp-4);
  display: grid; gap: 4px;
  font-size: var(--fs-sm);
}
.pg-shore-selected-summary strong { font-size: var(--fs-md); color: var(--text-primary); }
.pg-shore-selected-summary .muted { color: var(--text-tertiary); }

/* ============================================================
   Port directory (specialty terminals)
   ============================================================ */
.pg-shore-directory { display: grid; gap: var(--sp-4); }
.pg-shore-dir-filters {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.pg-shore-dir-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--sp-3);
}
.pg-shore-dir-card {
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--sp-3);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  display: grid;
  gap: var(--sp-2);
  position: relative;
  transition: border-color var(--dur-fast), background var(--dur-fast), transform var(--dur-fast);
  min-width: 0;
}
.pg-shore-dir-card:hover {
  border-color: var(--brand-primary);
  background: var(--bg-3);
  transform: translateY(-1px);
}
.pg-shore-dir-card.is-selected {
  border-color: var(--brand-primary);
  box-shadow: inset 0 0 0 1px var(--brand-primary), var(--brand-glow);
  background: var(--brand-primary-soft);
}
.pg-shore-dir-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: var(--sp-2);
}
.pg-shore-dir-name {
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0;
  flex: 1;
}
.pg-shore-dir-name span:first-child {
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-shore-dir-name .badge { align-self: flex-start; }
.pg-shore-dir-active-mark {
  font-size: 14px;
  color: var(--brand-primary);
  flex-shrink: 0;
  text-shadow: var(--brand-glow);
}
.pg-shore-dir-vessel {
  display: flex; flex-direction: column; gap: 1px;
  font-size: var(--fs-xs);
  min-width: 0;
}
.pg-shore-dir-vessel .vessel-name { color: var(--text-primary); font-weight: var(--fw-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pg-shore-dir-vessel .muted { font-size: var(--fs-2xs); }

.pg-shore-dir-bar {
  display: grid;
  gap: 4px;
}
.pg-shore-dir-bar-track {
  position: relative;
  height: 6px;
  background: var(--bg-3);
  border-radius: var(--r-pill);
  overflow: hidden;
}
.pg-shore-dir-bar-fill {
  position: absolute; top: 0; left: 0; bottom: 0;
  background: var(--text-muted);
  border-radius: inherit;
  transition: width var(--dur-base);
  z-index: 2;
}
.pg-shore-dir-bar-fill[data-active="true"] {
  background: linear-gradient(90deg, var(--status-success), var(--brand-primary));
}
.pg-shore-dir-bar-demand {
  position: absolute; top: 0; left: 0; bottom: 0;
  background: var(--brand-primary-soft);
  border-radius: inherit;
  z-index: 1;
}
.pg-shore-dir-bar-label {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
}

.pg-shore-dir-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px dashed var(--border-subtle);
}
.pg-shore-dir-status {
  font-size: var(--fs-2xs);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.pg-shore-dir-status[data-tone="success"]  { color: var(--status-success); }
.pg-shore-dir-status[data-tone="warning"]  { color: var(--status-warning); }
.pg-shore-dir-status[data-tone="info"]     { color: var(--text-tertiary); }
.pg-shore-dir-cta {
  font-size: var(--fs-2xs);
  font-weight: var(--fw-semibold);
  color: var(--brand-primary);
  letter-spacing: 0.04em;
}
.pg-shore-dir-card:hover .pg-shore-dir-cta { transform: translateX(2px); }
.pg-shore-berth-meta {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
  padding: var(--sp-2) 0;
  border-top: 1px dashed var(--border-subtle);
  border-bottom: 1px dashed var(--border-subtle);
}
.pg-shore-berth-meta .cell {
  display: flex; flex-direction: column; gap: 1px; min-width: 0;
}
.pg-shore-berth-meta .cell-label {
  font-size: var(--fs-2xs); text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--text-tertiary);
}
.pg-shore-berth-meta .cell-value {
  font-family: var(--font-mono); font-size: var(--fs-md);
  color: var(--text-primary); font-variant-numeric: tabular-nums;
}
.pg-shore-berth-session {
  display: flex; gap: var(--sp-3); flex-wrap: wrap;
  font-size: var(--fs-xs); color: var(--text-tertiary);
}
.pg-shore-berth-session strong { color: var(--text-secondary); font-weight: var(--fw-semibold); font-family: var(--font-mono); }
.pg-shore-berth-actions {
  position: absolute; top: 10px; right: 10px;
  display: inline-flex; gap: 4px; opacity: 0; transition: opacity var(--dur-fast);
}
.dock:hover .pg-shore-berth-actions { opacity: 1; }
.pg-shore-icon-btn {
  width: 26px; height: 26px;
  display: grid; place-items: center;
  border-radius: var(--r-sm);
  color: var(--text-tertiary);
  background: var(--bg-3);
  border: 1px solid var(--border-subtle);
  transition: color var(--dur-fast), background var(--dur-fast);
}
.pg-shore-icon-btn:hover { color: var(--text-primary); background: var(--bg-4); }
.pg-shore-icon-btn--danger:hover { color: var(--status-critical); }
.pg-shore-icon-btn svg { width: 13px; height: 13px; }

.pg-shore-manual-tag {
  position: absolute; top: 10px; left: 10px;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-primary);
  background: var(--brand-primary-soft);
  padding: 2px 6px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(0, 157, 196, 0.25);
  font-weight: var(--fw-semibold);
}

/* ---- Two-up grid (capacity + heatmap) ---- */
.pg-shore-two-up { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--sp-5); }
@media (max-width: 1180px) { .pg-shore-two-up { grid-template-columns: 1fr; } }

.pg-shore-heatmap-frame {
  position: relative;
  width: 100%; height: 240px;
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--sp-3);
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: var(--sp-3);
}
.pg-shore-heatmap-rows {
  display: grid;
  grid-template-rows: repeat(var(--rows, 5), 1fr);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
}
.pg-shore-heatmap-rows .row-label {
  display: flex; align-items: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  padding-right: var(--sp-2);
}
.pg-shore-heatmap-canvas { width: 100%; height: 100%; }
.pg-shore-heatmap-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: var(--sp-3);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
}
.pg-shore-heatmap-legend {
  display: inline-flex; gap: var(--sp-3); align-items: center;
  font-family: var(--font-mono);
}
.pg-shore-heatmap-legend .swatch {
  display: inline-block; width: 56px; height: 8px;
  border-radius: var(--r-pill);
  background: linear-gradient(90deg,
    var(--brand-primary-soft) 0%,
    var(--brand-primary) 100%);
}

/* ---- ROI / equivalents ---- */
.pg-shore-roi { display: grid; grid-template-columns: 2fr 1fr; gap: var(--sp-4); align-items: stretch; }
@media (max-width: 1180px) { .pg-shore-roi { grid-template-columns: 1fr; } }

.pg-shore-eq-grid { display: grid; gap: var(--sp-3); }
.pg-shore-eq {
  display: grid; grid-template-columns: 44px 1fr;
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-3) var(--sp-4);
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  position: relative;
  overflow: hidden;
}
.pg-shore-eq-icon {
  width: 44px; height: 44px;
  border-radius: var(--r-md);
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  display: grid; place-items: center;
  flex-shrink: 0;
}
.pg-shore-eq-icon svg { width: 20px; height: 20px; }
.pg-shore-eq[data-tone="success"] .pg-shore-eq-icon { background: var(--status-success-soft); color: var(--status-success); }
.pg-shore-eq[data-tone="warning"] .pg-shore-eq-icon { background: var(--status-warning-soft); color: var(--status-warning); }

.pg-shore-eq-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pg-shore-eq-value {
  font-family: var(--font-mono);
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.pg-shore-eq-label {
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
}
.pg-shore-eq-meta { font-size: var(--fs-2xs); color: var(--text-muted); }

.pg-shore-eq-note {
  font-size: var(--fs-2xs);
  color: var(--text-muted);
  text-align: left;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--bg-2);
  border: 1px dashed var(--border-subtle);
  line-height: 1.5;
  font-style: italic;
}

/* ---- Optimizer cards ---- */
.pg-shore-opt-list { display: grid; gap: var(--sp-3); }
.pg-shore-opt {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  border-left: 3px solid var(--brand-primary);
  transition: border-color var(--dur-base);
}
.pg-shore-opt[data-severity="warning"]  { border-left-color: var(--status-warning); }
.pg-shore-opt[data-severity="critical"] { border-left-color: var(--status-critical); }
.pg-shore-opt[data-severity="success"]  { border-left-color: var(--status-success); }

.pg-shore-opt:hover { border-color: var(--border-soft); }

.pg-shore-opt-body { display: flex; flex-direction: column; gap: var(--sp-1); min-width: 0; }
.pg-shore-opt-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  display: flex; align-items: center; gap: var(--sp-2);
}
.pg-shore-opt-title .badge { font-size: 9px; }
.pg-shore-opt-desc {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}
.pg-shore-opt-savings {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--status-success);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
}
.pg-shore-opt-cta { display: inline-flex; gap: var(--sp-2); align-items: center; }

/* ---- Activation history ---- */
.pg-shore-history-table { width: 100%; }
.pg-shore-history-table tbody td.action-cell {
  font-weight: var(--fw-semibold);
  font-size: var(--fs-xs);
}
.pg-shore-history-table tbody td.action-cell[data-action="engaged"]  { color: var(--status-success); }
.pg-shore-history-table tbody td.action-cell[data-action="released"] { color: var(--text-tertiary); }

/* ---- Range chip group ---- */
.pg-shore-range { display: inline-flex; gap: 4px; }

/* light theme tweak: stronger borders on ROI cards */
:root[data-theme="light"] .pg-shore-eq,
:root[data-theme="light"] .pg-shore-opt { box-shadow: var(--shadow-1); }
`;

/* ============================================================
 *  Inline SVG icons
 * ============================================================ */
const ICONS = {
  plug:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 22v-4M15 22v-4M5 8h14l-1 6a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/><path d="M9 8V4M15 8V4"/></svg>`,
  bolt:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4M10 10v4"/></svg>`,
  leaf:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4c-3 0-13 1-15 13 0 0 1 3 4 3 9 0 11-12 11-16Z"/><path d="M5 17c0-3 4-7 11-9"/></svg>`,
  gauge:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M3.5 17a9 9 0 1 1 17 0"/><path d="m13.4 11.4 4-4"/></svg>`,
  tree:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 5 11h4l-3 6h6m0-15 7 9h-4l3 6h-6m0-15v21"/></svg>`,
  home:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>`,
  road:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22 8 2"/><path d="M20 22 16 2"/><path d="M12 6v3M12 13v3M12 19v3"/></svg>`,
  edit:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  trash:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  alert:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
  empty:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5-2 4-2 4 2 4 2"/><path d="M9 9h.01M15 9h.01"/></svg>`,
};

/* ============================================================
 *  Helpers
 * ============================================================ */
const ENERGY_FACTOR_KG_PER_KWH = 0.69;
const TICK_INTERVAL_MS = 3500;
const HIGHWAY_KG_PER_KM = 0.18;
const TREE_KG_PER_YEAR = 21;
const HOUSEHOLD_KW_PER_HOUR = 4;

function escHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
  ));
}

function formatNum(n, opts = {}) { return fmt.num(n, opts); }
function formatCompact(n) { return fmt.compact(n); }

function vesselTypeLabel(typeId) {
  if (!typeId) return '';
  return t('type.' + typeId);
}

function durationStr(ms) {
  if (!ms || ms <= 0) return getLanguage() === 'tr' ? '0d' : '0m';
  return fmt.duration(ms);
}

function tToneClass(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning')  return 'warning';
  if (severity === 'success')  return 'success';
  return 'info';
}

/* ============================================================
 *  Buffer / event ledger
 *
 *  Called on every shore_power slice update. Builds the rolling timeseries,
 *  hourly aggregation, per-berth session stats, and an event log.
 * ============================================================ */
function ingestSnapshot() {
  const sp = store.get('shore_power');
  if (!sp || !Array.isArray(sp.docks)) return;

  const now = Date.now();
  if (now - moduleState.lastSnapshotTs < BUFFER_DEDUP_MS) {
    /* still update last/active flags so reactivity stays smooth, but skip
       writing a new buffer point. */
    diffEvents(sp, now);
    accumulateSession(sp, now);
    moduleState.lastDocks = sp.docks;
    return;
  }
  moduleState.lastSnapshotTs = now;

  /* timeseries point */
  const byDock = {};
  let total = 0;
  for (const d of sp.docks) {
    const kw = d.shore_power_active ? d.kw_used : 0;
    byDock[d.id] = kw;
    total += kw;
  }
  moduleState.timeseries.push({ ts: now, byDock, total });
  while (moduleState.timeseries.length > 360) moduleState.timeseries.shift();

  /* hourly bucket: index by hour-of-day modulo 24 — gives a rolling matrix */
  const hour = new Date(now).getHours();
  const bucket = moduleState.hourlyBuckets[hour];
  for (const [id, kw] of Object.entries(byDock)) {
    if (!bucket.byDock[id]) bucket.byDock[id] = { sum: 0, n: 0 };
    bucket.byDock[id].sum += kw;
    bucket.byDock[id].n   += 1;
  }

  diffEvents(sp, now);
  accumulateSession(sp, now);
  moduleState.lastDocks = sp.docks;
}

function diffEvents(sp, now) {
  const prev = moduleState.lastDocks;
  if (!prev) return; /* first snapshot — no transitions to detect */

  const prevById = Object.fromEntries(prev.map((d) => [d.id, d]));

  for (const d of sp.docks) {
    const p = prevById[d.id];
    if (!p) continue;

    if (!p.shore_power_active && d.shore_power_active) {
      const stats = ensureSession(d.id);
      stats.engagedSinceMs = now;
      moduleState.events.unshift({
        ts: now, dockId: d.id, dockName: d.name,
        action: 'engaged',
        vessel: d.vessel_name,
        kw: d.kw_used || d.kw_demand,
        co2_total: stats.kg,
        source: 'manual',
      });
    } else if (p.shore_power_active && !d.shore_power_active) {
      const stats = ensureSession(d.id);
      if (stats.engagedSinceMs) {
        stats.totalEngagedMs += now - stats.engagedSinceMs;
      }
      stats.engagedSinceMs = null;
      moduleState.events.unshift({
        ts: now, dockId: d.id, dockName: d.name,
        action: 'released',
        vessel: p.vessel_name,
        kw: 0,
        co2_total: stats.kg,
        source: 'manual',
      });
    }
  }

  /* trim oldest */
  while (moduleState.events.length > 240) moduleState.events.pop();
}

function ensureSession(dockId) {
  if (!moduleState.sessionStats[dockId]) {
    moduleState.sessionStats[dockId] = {
      engagedSinceMs: null,
      totalEngagedMs: 0,
      kwh: 0,
      kg: 0,
      lastTs: null,
      lastKw: 0,
    };
  }
  return moduleState.sessionStats[dockId];
}

function accumulateSession(sp, now) {
  for (const d of sp.docks) {
    const s = ensureSession(d.id);
    if (s.lastTs && d.shore_power_active && s.lastKw > 0) {
      const dtH = (now - s.lastTs) / 3_600_000;
      const energy = s.lastKw * dtH;          /* kWh from previous tick's load */
      s.kwh += energy;
      s.kg  += energy * ENERGY_FACTOR_KG_PER_KWH;
    }
    s.lastTs = now;
    s.lastKw = d.shore_power_active ? d.kw_used : 0;
  }
}

function aggregateHourlyMatrix(docks) {
  /* returns { rows, cols, values, max } where rows align to docks order */
  const cols = BUFFER_BUCKETS;
  const rows = docks.length;
  const values = Array.from({ length: rows }, () => Array(cols).fill(0));
  let max = 0;
  for (let r = 0; r < rows; r++) {
    const id = docks[r].id;
    for (let c = 0; c < cols; c++) {
      const cell = moduleState.hourlyBuckets[c]?.byDock?.[id];
      const avg = cell && cell.n > 0 ? cell.sum / cell.n : 0;
      values[r][c] = avg;
      if (avg > max) max = avg;
    }
  }
  return { rows, cols, values, max };
}

/* ============================================================
 *  Page mount
 * ============================================================ */
const STYLE_TAG_ID = 'page-shore-styles';

function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.dataset.page = 'shore';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

export function mount(rootEl, params = {}) {
  injectStyles();

  /* track resources for unmount */
  const unsubs = [];
  let charts = {};        /* id -> Chart instance */
  let heatmapCanvas = null;

  const docksRefForRange = { current: store.get('shore_power')?.docks || [] };

  /* Populate buffer with at least the first snapshot before paint. */
  ingestSnapshot();

  /* ----------- Render scaffold ----------- */
  rootEl.innerHTML = `
    <div class="page page-shore">
      <header class="page-header" data-region="header">
        <div class="page-header-title">
          <h1 data-i18n="page.shore.title">${escHTML(t('page.shore.title'))}</h1>
          <p data-i18n="page.shore.subtitle">${escHTML(t('page.shore.subtitle'))}</p>
        </div>
        <div class="page-header-actions" data-region="header-actions"></div>
      </header>

      <section class="pg-shore-kpis" data-region="kpis"></section>

      <section class="panel pg-shore-berths" data-region="berths">
        <div class="panel-head">
          <div class="panel-title">
            <span data-i18n="shore.section.berths">${escHTML(t('shore.section.berths'))}</span>
            <small data-i18n="shore.section.berths_sub">${escHTML(t('shore.section.berths_sub'))}</small>
          </div>
          <div class="panel-actions" data-region="berths-actions"></div>
        </div>
        <div class="docks-grid" data-region="docks-grid"></div>
      </section>

      <section class="panel pg-shore-selected" data-region="selected-panel">
        <div class="panel-head">
          <div class="panel-title">
            <span>${escHTML(t('shore.section.selected'))}</span>
            <small data-region="selected-sub">${escHTML(t('shore.section.selected_sub'))}</small>
          </div>
          <div class="panel-actions" data-region="selected-actions"></div>
        </div>
        <div data-region="selected-body"></div>
      </section>

      <section class="panel pg-shore-directory" data-region="directory-panel">
        <div class="panel-head">
          <div class="panel-title">
            <span>${escHTML(t('shore.section.directory'))}</span>
            <small>${escHTML(t('shore.section.directory_sub'))}</small>
          </div>
          <div class="panel-actions" data-region="directory-search"></div>
        </div>
        <div class="pg-shore-dir-filters" data-region="directory-filters"></div>
        <div class="pg-shore-dir-grid" data-region="directory-grid"></div>
      </section>

      <section class="pg-shore-two-up">
        <div class="panel" data-region="capacity-panel">
          <div class="panel-head">
            <div class="panel-title">
              <span>${escHTML(t('shore.section.capacity'))}</span>
              <small>${escHTML(t('shore.section.capacity_sub'))}</small>
            </div>
          </div>
          <div class="chart-frame" data-h="lg">
            <canvas data-chart="capacity"></canvas>
          </div>
          <div class="pg-shore-heatmap-foot">
            <span class="muted" data-region="capacity-empty"></span>
          </div>
        </div>

        <div class="panel" data-region="heatmap-panel">
          <div class="panel-head">
            <div class="panel-title">
              <span>${escHTML(t('shore.section.heatmap'))}</span>
              <small>${escHTML(t('shore.section.heatmap_sub'))}</small>
            </div>
          </div>
          <div class="pg-shore-heatmap-frame">
            <div class="pg-shore-heatmap-rows" data-region="heatmap-rows" style="--rows:5"></div>
            <canvas class="pg-shore-heatmap-canvas" data-chart="heatmap"></canvas>
          </div>
          <div class="pg-shore-heatmap-foot">
            <span class="muted">${escHTML(t('shore.heatmap.caption'))}</span>
            <span class="pg-shore-heatmap-legend">
              <span>${escHTML(t('shore.heatmap.legend.idle'))}</span>
              <span class="swatch"></span>
              <span>${escHTML(t('shore.heatmap.legend.active'))}</span>
            </span>
          </div>
        </div>
      </section>

      <section class="panel" data-region="roi-panel">
        <div class="panel-head">
          <div class="panel-title">
            <span>${escHTML(t('shore.section.roi'))}</span>
            <small>${escHTML(t('shore.section.roi_sub'))}</small>
          </div>
        </div>
        <div class="pg-shore-roi">
          <div class="chart-frame" data-h="lg">
            <canvas data-chart="cumulative"></canvas>
          </div>
          <div class="pg-shore-eq-grid" data-region="eq-grid"></div>
        </div>
        <p class="pg-shore-eq-note" style="margin-top:var(--sp-3)">${escHTML(t('shore.roi.eq.note'))}</p>
      </section>

      <section class="panel" data-region="optimizer-panel">
        <div class="panel-head">
          <div class="panel-title">
            <span>${escHTML(t('shore.section.optimizer'))}</span>
            <small>${escHTML(t('shore.section.optimizer_sub'))}</small>
          </div>
        </div>
        <div class="pg-shore-opt-list" data-region="opt-list"></div>
      </section>

      <section class="panel" data-region="history-panel">
        <div class="panel-head">
          <div class="panel-title">
            <span>${escHTML(t('shore.section.history'))}</span>
            <small>${escHTML(t('shore.section.history_sub'))}</small>
          </div>
        </div>
        <div class="table-wrap scroll-styled" data-region="history-wrap"></div>
      </section>
    </div>
  `;

  /* Region selectors */
  const regions = {
    headerActions: rootEl.querySelector('[data-region="header-actions"]'),
    berthsActions: rootEl.querySelector('[data-region="berths-actions"]'),
    kpis:          rootEl.querySelector('[data-region="kpis"]'),
    docksGrid:     rootEl.querySelector('[data-region="docks-grid"]'),
    capacityCanvas:rootEl.querySelector('canvas[data-chart="capacity"]'),
    capacityEmpty: rootEl.querySelector('[data-region="capacity-empty"]'),
    heatmapRows:   rootEl.querySelector('[data-region="heatmap-rows"]'),
    heatmapCanvas: rootEl.querySelector('canvas[data-chart="heatmap"]'),
    cumulativeCanvas: rootEl.querySelector('canvas[data-chart="cumulative"]'),
    eqGrid:        rootEl.querySelector('[data-region="eq-grid"]'),
    optList:       rootEl.querySelector('[data-region="opt-list"]'),
    historyWrap:   rootEl.querySelector('[data-region="history-wrap"]'),
    /* directory + selected detail */
    selectedSub:      rootEl.querySelector('[data-region="selected-sub"]'),
    selectedActions:  rootEl.querySelector('[data-region="selected-actions"]'),
    selectedBody:     rootEl.querySelector('[data-region="selected-body"]'),
    directorySearch:  rootEl.querySelector('[data-region="directory-search"]'),
    directoryFilters: rootEl.querySelector('[data-region="directory-filters"]'),
    directoryGrid:    rootEl.querySelector('[data-region="directory-grid"]'),
  };

  /* ----------- Header & berth-panel actions ----------- */
  function renderHeaderActions() {
    regions.headerActions.innerHTML = `
      <div class="pg-shore-range" role="group" aria-label="${escHTML(t('common.range'))}">
        ${['24h','7d','30d'].map((id) => `
          <button class="chip range-chip ${moduleState.range === id ? 'is-active' : ''}" data-range="${id}">
            ${escHTML(t('shore.range.' + id))}
          </button>
        `).join('')}
      </div>
      <button class="btn btn--ghost btn--sm" data-action="engage-all">${escHTML(t('shore.engage_all'))}</button>
      <button class="btn btn--ghost btn--sm" data-action="disengage-all">${escHTML(t('shore.disengage_all'))}</button>
      <button class="btn btn--primary btn--sm" data-action="add-berth">
        ${ICONS.plus} <span>${escHTML(t('shore.add.cta'))}</span>
      </button>
    `;

    regions.headerActions.querySelectorAll('.chip[data-range]').forEach((chip) => {
      chip.addEventListener('click', () => {
        moduleState.range = chip.dataset.range;
        renderHeaderActions();
        renderCumulativeChart();
        renderEquivalents();
      });
    });

    regions.headerActions.querySelector('[data-action="engage-all"]')?.addEventListener('click', engageAll);
    regions.headerActions.querySelector('[data-action="disengage-all"]')?.addEventListener('click', disengageAll);
    regions.headerActions.querySelector('[data-action="add-berth"]')?.addEventListener('click', () => openBerthForm());
  }

  function renderBerthsActions() {
    regions.berthsActions.innerHTML = `
      <button class="chip" data-action="berths-engage-all">${escHTML(t('shore.engage_all'))}</button>
      <button class="chip" data-action="berths-disengage-all">${escHTML(t('shore.disengage_all'))}</button>
    `;
    regions.berthsActions.querySelector('[data-action="berths-engage-all"]')?.addEventListener('click', engageAll);
    regions.berthsActions.querySelector('[data-action="berths-disengage-all"]')?.addEventListener('click', disengageAll);
  }

  /* ----------- KPI strip ----------- */
  function renderKPIs() {
    const sp = store.get('shore_power');
    const meta = store.get('meta') || {};
    const docks = sp?.docks || [];

    const occupied = docks.filter((d) => d.occupied).length;
    const active   = docks.filter((d) => d.occupied && d.shore_power_active).length;
    const totalKw  = sp?.total_kw || 0;
    const cap      = sp?.grid_capacity_kw || 60000;
    const utilPct  = cap > 0 ? (totalKw / cap) * 100 : 0;
    const todayCO2 = sumSessionKg();
    const todayKwh = sumSessionKwh();
    const sessionMs = meta.started_at ? (Date.now() - meta.started_at) : 0;

    /* derive sparkline from rolling timeseries (total) */
    const totals = moduleState.timeseries.slice(-24).map((p) => p.total);
    const co2Series = moduleState.timeseries.slice(-24).map((p) => p.total * ENERGY_FACTOR_KG_PER_KWH);

    const cards = [
      {
        id: 'connected',
        label: t('shore.kpi.connected_now'),
        value: `${active}<small style="font-family:var(--font-sans);font-size:var(--fs-md);color:var(--text-tertiary);font-weight:400;margin-left:6px"> / ${docks.length}</small>`,
        meta: t('shore.kpi.connected_meta', { n: occupied, total: docks.length }),
        tone: active >= 3 ? 'success' : (active > 0 ? 'info' : 'warning'),
        bar: docks.length > 0 ? (active / docks.length) * 100 : 0,
        spark: null,
      },
      {
        id: 'grid',
        label: t('shore.kpi.grid_load'),
        value: `${(totalKw / 1000).toFixed(2)}<small style="font-family:var(--font-mono);font-size:var(--fs-sm);color:var(--text-tertiary);font-weight:400;margin-left:6px">MW</small>`,
        meta: t('shore.kpi.grid_meta', { pct: utilPct.toFixed(0), cap: (cap / 1000).toFixed(0) }),
        tone: utilPct > 75 ? 'warning' : 'info',
        bar: Math.min(100, utilPct),
        spark: totals,
      },
      {
        id: 'kwh',
        label: t('shore.kpi.today_kwh'),
        value: formatNum(todayKwh, { maximumFractionDigits: 0 }),
        meta: t('shore.kpi.today_kwh_meta', { dur: durationStr(sessionMs) }),
        tone: todayKwh > 0 ? 'info' : 'subtle',
        bar: 0,
        spark: totals,
      },
      {
        id: 'co2',
        label: t('shore.kpi.today_co2'),
        value: `${formatNum(todayCO2, { maximumFractionDigits: 0 })}<small style="font-family:var(--font-mono);font-size:var(--fs-sm);color:var(--text-tertiary);font-weight:400;margin-left:6px">kg</small>`,
        meta: t('shore.kpi.today_co2_meta'),
        tone: 'success',
        bar: 0,
        spark: co2Series,
      },
      {
        id: 'util',
        label: t('shore.kpi.utilization'),
        value: `${utilPct.toFixed(1)}<small style="font-family:var(--font-mono);font-size:var(--fs-sm);color:var(--text-tertiary);font-weight:400;margin-left:6px">%</small>`,
        meta: t('shore.kpi.util_meta'),
        tone: utilPct >= 60 ? 'success' : (utilPct >= 30 ? 'info' : 'warning'),
        bar: Math.min(100, utilPct),
        spark: null,
      },
    ];

    regions.kpis.innerHTML = cards.map((c) => `
      <div class="stat-card pg-shore-kpi" data-kpi-id="${c.id}">
        <div class="stat-card-label">${escHTML(c.label)}</div>
        <div class="stat-card-value" data-tone="${c.tone === 'subtle' ? '' : c.tone}">${c.value}</div>
        <div class="stat-card-meta">${escHTML(c.meta)}</div>
        ${c.bar > 0 ? `<div class="pg-shore-kpi-bar"><i style="width:${c.bar.toFixed(1)}%"></i></div>` : ''}
        ${c.spark && c.spark.length >= 2 ? `<div class="pg-shore-kpi-spark"><canvas data-spark="${c.id}"></canvas></div>` : ''}
      </div>
    `).join('');

    /* destroy previous sparklines */
    for (const k of Object.keys(charts)) {
      if (k.startsWith('spark-')) { try { charts[k].destroy(); } catch (_) {} delete charts[k]; }
    }

    if (window.Chart) {
      cards.forEach((c) => {
        if (!c.spark || c.spark.length < 2) return;
        const canvas = regions.kpis.querySelector(`canvas[data-spark="${c.id}"]`);
        if (!canvas) return;
        const palette = themePalette();
        const color = c.tone === 'success' ? palette.success
                    : c.tone === 'warning' ? palette.warning
                    : palette.brand;
        const inst = lineChart(canvas, [{ data: c.spark, color, fill: true, tension: 0.4, borderWidth: 1.4 }], {
          options: {
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
          },
        });
        if (inst) charts['spark-' + c.id] = inst;
      });
    }
  }

  function sumSessionKg() {
    return Object.values(moduleState.sessionStats).reduce((acc, s) => acc + (s.kg || 0), 0);
  }
  function sumSessionKwh() {
    return Object.values(moduleState.sessionStats).reduce((acc, s) => acc + (s.kwh || 0), 0);
  }

  /* ----------- Berth grid ----------- */
  function renderBerthGrid() {
    const sp = store.get('shore_power');
    const docks = sp?.docks || [];
    docksRefForRange.current = docks;

    /* Major (top-4) tier renders here. Specialty terminals show in the
     * directory panel below; manual berths (no tier) also surface here so
     * users see what they added. */
    const featuredDocks = docks.filter((d) => d.tier === 'major' || !d.tier);

    if (featuredDocks.length === 0) {
      regions.docksGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">${ICONS.plug}</div>
          <div class="empty-state-title">${escHTML(t('common.empty.title'))}</div>
          <div class="empty-state-body">${escHTML(t('common.empty.body'))}</div>
        </div>
      `;
      return;
    }

    regions.docksGrid.innerHTML = featuredDocks.map((d) => berthCard(d)).join('');

    regions.docksGrid.querySelectorAll('.dock-toggle[data-dock-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dockId;
        if (id) store.dispatch('toggleShorePower', id);
      });
    });

    regions.docksGrid.querySelectorAll('[data-action="edit-berth"]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.dockId;
        const dock = (store.get('shore_power')?.docks || []).find((x) => x.id === id);
        if (dock) openBerthForm(dock);
      });
    });

    regions.docksGrid.querySelectorAll('[data-action="delete-berth"]').forEach((b) => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = b.dataset.dockId;
        const dock = (store.get('shore_power')?.docks || []).find((x) => x.id === id);
        if (!dock) return;
        if (!dock._manual) {
          await confirm({ title: t('common.delete'), body: t('shore.delete.manual_only'), confirmLabel: t('common.close') });
          return;
        }
        const ok = await confirm({
          title: t('common.delete'),
          body: t('shore.delete.confirm', { name: dock.name }),
          danger: true,
          confirmLabel: t('common.delete'),
        });
        if (!ok) return;
        deleteBerth(id);
      });
    });
  }

  function berthCard(d) {
    const session = ensureSession(d.id);
    const fillPct = d.shore_power_active ? Math.min(100, (d.kw_used / d.kw_capacity) * 100) : 0;
    const co2HourPotential = d.occupied
      ? Math.round((d.kw_used > 0 ? d.kw_used : d.kw_demand) * ENERGY_FACTOR_KG_PER_KWH)
      : 0;
    const co2Saved = d.shore_power_active ? +(d.kw_used * ENERGY_FACTOR_KG_PER_KWH).toFixed(0) : 0;
    const typeLabel = vesselTypeLabel(d.vessel_type);

    const toggleLabel = d.shore_power_active
      ? t('shore.toggle.active', { n: co2Saved })
      : (d.occupied ? t('shore.toggle.aux') : t('shore.toggle.empty'));

    const engagedSince = d.shore_power_active && session.engagedSinceMs
      ? t('shore.berth.engaged_for', { dur: durationStr(Date.now() - session.engagedSinceMs) })
      : '';

    const sessionLine = `
      <div class="pg-shore-berth-session">
        <span>${escHTML(t('shore.berth.cumulative_kwh', { kwh: formatNum(session.kwh, { maximumFractionDigits: 0 }) }))}</span>
        <span>${escHTML(t('shore.berth.session_co2', { kg: formatNum(session.kg, { maximumFractionDigits: 0 }) }))}</span>
        ${engagedSince ? `<span>${escHTML(engagedSince)}</span>` : ''}
      </div>
    `;

    const editButtons = d._manual ? `
      <div class="pg-shore-berth-actions">
        <button class="pg-shore-icon-btn" data-action="edit-berth" data-dock-id="${escHTML(d.id)}" title="${escHTML(t('shore.berth.edit'))}" aria-label="${escHTML(t('shore.berth.edit'))}">
          ${ICONS.edit}
        </button>
        <button class="pg-shore-icon-btn pg-shore-icon-btn--danger" data-action="delete-berth" data-dock-id="${escHTML(d.id)}" title="${escHTML(t('shore.berth.delete'))}" aria-label="${escHTML(t('shore.berth.delete'))}">
          ${ICONS.trash}
        </button>
      </div>
    ` : '';

    const manualTag = d._manual ? `<span class="pg-shore-manual-tag">${escHTML(t('shore.berth.manual_tag'))}</span>` : '';

    const occupiedBlock = d.occupied
      ? `<div class="dock-vessel">
           <span class="vessel-name">${escHTML(d.vessel_name || t('shore.dock.no_vessel'))}</span>
           <span class="muted">${escHTML(typeLabel)}${d.vessel_id ? ' · ' + escHTML(d.vessel_id) : ''}</span>
         </div>`
      : `<div class="dock-empty">${escHTML(t('shore.dock.available'))}</div>`;

    const potentialLine = d.occupied && !d.shore_power_active
      ? `<div class="muted" style="font-size:var(--fs-2xs)">${escHTML(t('shore.berth.co2_per_hour', { kg: formatNum(co2HourPotential, { maximumFractionDigits: 0 }) }))}</div>`
      : '';

    return `
      <div class="dock" data-active="${d.shore_power_active}" data-dock-id="${escHTML(d.id)}">
        ${manualTag}
        ${editButtons}
        <div class="dock-head">
          <div>
            <div class="dock-name">${escHTML(d.name)}</div>
            <div class="dock-id mono">${escHTML(d.id)}</div>
          </div>
          <span class="badge" data-tone="${d.occupied ? 'info' : 'success'}">${escHTML(d.occupied ? t('shore.dock.occupied') : t('shore.dock.empty'))}</span>
        </div>

        ${occupiedBlock}

        <div class="pg-shore-berth-meta">
          <div class="cell">
            <span class="cell-label">${escHTML(t('shore.berth.current'))}</span>
            <span class="cell-value">${formatNum(d.kw_used, { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="cell">
            <span class="cell-label">${escHTML(t('shore.berth.demand'))}</span>
            <span class="cell-value">${formatNum(d.kw_demand, { maximumFractionDigits: 0 })}</span>
          </div>
          <div class="cell">
            <span class="cell-label">${escHTML(t('shore.berth.capacity'))}</span>
            <span class="cell-value">${formatNum(d.kw_capacity, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div class="dock-meter">
          <div class="dock-meter-bar">
            <div class="dock-meter-bar-fill" style="width:${fillPct.toFixed(1)}%"></div>
          </div>
          <span class="dock-meter-readout">
            ${d.shore_power_active
              ? `${formatNum(d.kw_used)} kW`
              : escHTML(t('shore.dock.idle', { n: formatNum(d.kw_demand) }))}
          </span>
        </div>

        ${sessionLine}
        ${potentialLine}

        <button
          class="dock-toggle"
          data-dock-id="${escHTML(d.id)}"
          aria-pressed="${d.shore_power_active}"
          ${d.occupied ? '' : 'disabled'}
          title="${escHTML(d.occupied ? t('shore.toggle.tooltip') : t('shore.toggle.tooltip_empty'))}"
        >
          <span>${escHTML(toggleLabel)}</span>
          <span class="switch" aria-hidden="true"></span>
        </button>
      </div>
    `;
  }

  /* ============================================================
   *  Selected port detail panel
   * ============================================================ */
  function renderSelected() {
    if (!regions.selectedBody) return;
    const sp = store.get('shore_power');
    const docks = (sp?.docks || []);
    const selected = moduleState.selectedDockId
      ? docks.find((d) => d.id === moduleState.selectedDockId)
      : null;

    /* If selectedDock was removed (e.g. manual delete), reset. */
    if (moduleState.selectedDockId && !selected) {
      moduleState.selectedDockId = null;
    }

    if (!selected) {
      regions.selectedSub.textContent = t('shore.section.selected_sub');
      regions.selectedActions.innerHTML = '';
      regions.selectedBody.innerHTML = `
        <div class="empty-state" style="margin:var(--sp-2) 0">
          <div class="empty-state-icon">${ICONS.plug}</div>
          <div class="empty-state-title">${escHTML(t('shore.selected.empty.title'))}</div>
          <div class="empty-state-body">${escHTML(t('shore.selected.empty.body'))}</div>
        </div>
      `;
      return;
    }

    /* When something is selected, surface the same berthCard at full
     * fidelity, plus an "extras" stat strip (category, bay coordinates,
     * cumulative session, capacity utilization). */
    regions.selectedSub.textContent = t('shore.section.selected_sub_active', { name: selected.name });

    regions.selectedActions.innerHTML = `
      <button class="btn btn--ghost btn--sm" data-action="clear-selection">
        ${escHTML(t('shore.selected.clear'))}
      </button>
    `;
    regions.selectedActions.querySelector('[data-action="clear-selection"]').addEventListener('click', () => {
      moduleState.selectedDockId = null;
      renderSelected();
      renderDirectory();
    });

    const session = moduleState.sessionStats[selected.id] || { kwh: 0, kg: 0 };
    const utilPct = selected.kw_capacity ? (selected.kw_used / selected.kw_capacity) * 100 : 0;
    const demandFulfilledPct = selected.kw_demand ? Math.min(100, (selected.kw_used / selected.kw_demand) * 100) : 0;
    const catLabel = t('shore.cat.' + (selected.category || 'general'));
    const tonalCo2 = +(session.kg / 1000).toFixed(2);

    regions.selectedBody.innerHTML = `
      <div class="pg-shore-selected-grid">
        <div class="pg-shore-selected-card">${berthCard(selected)}</div>
        <div class="pg-shore-selected-aside">
          <div class="pg-shore-selected-tag">
            <span class="badge" data-tone="info">${escHTML(catLabel)}</span>
            <span class="muted mono" style="font-size:var(--fs-2xs)">ID: ${escHTML(selected.id)}</span>
          </div>
          <div class="pg-shore-selected-stats">
            <div class="stat-card">
              <span class="stat-card-label">${escHTML(t('shore.selected.stat.session_kwh'))}</span>
              <span class="stat-card-value">${formatNum(session.kwh, { maximumFractionDigits: 0 })}</span>
              <span class="stat-card-meta">kWh</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">${escHTML(t('shore.selected.stat.session_co2'))}</span>
              <span class="stat-card-value" data-tone="success">${formatNum(tonalCo2, { maximumFractionDigits: 2 })}</span>
              <span class="stat-card-meta">tCO₂</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">${escHTML(t('shore.selected.stat.util'))}</span>
              <span class="stat-card-value" data-tone="${utilPct > 90 ? 'warning' : 'brand'}">${utilPct.toFixed(0)}%</span>
              <span class="stat-card-meta">${escHTML(t('shore.selected.stat.util_meta'))}</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">${escHTML(t('shore.selected.stat.fulfilled'))}</span>
              <span class="stat-card-value">${demandFulfilledPct.toFixed(0)}%</span>
              <span class="stat-card-meta">${escHTML(t('shore.selected.stat.fulfilled_meta'))}</span>
            </div>
          </div>
          <div class="pg-shore-selected-summary">
            <strong>${escHTML(selected.name)}</strong>
            <span class="muted">${escHTML(t('shore.selected.summary', { cat: catLabel, cap: formatNum(selected.kw_capacity), demand: formatNum(selected.kw_demand) }))}</span>
          </div>
        </div>
      </div>
    `;

    /* Wire the cloned berthCard's buttons (toggle + edit/delete). */
    regions.selectedBody.querySelectorAll('.dock-toggle[data-dock-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dockId;
        if (id) store.dispatch('toggleShorePower', id);
      });
    });
    regions.selectedBody.querySelectorAll('[data-action="edit-berth"]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.dockId;
        const dock = (store.get('shore_power')?.docks || []).find((x) => x.id === id);
        if (dock) openBerthForm(dock);
      });
    });
    regions.selectedBody.querySelectorAll('[data-action="delete-berth"]').forEach((b) => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = b.dataset.dockId;
        const dock = (store.get('shore_power')?.docks || []).find((x) => x.id === id);
        if (!dock) return;
        if (!dock._manual) {
          await confirm({ title: t('common.delete'), body: t('shore.delete.manual_only'), confirmLabel: t('common.close') });
          return;
        }
        const ok = await confirm({
          title: t('common.delete'),
          body: t('shore.delete.confirm', { name: dock.name }),
          danger: true,
          confirmLabel: t('common.delete'),
        });
        if (!ok) return;
        deleteBerth(id);
        moduleState.selectedDockId = null;
        renderSelected();
        renderDirectory();
      });
    });
  }

  /* ============================================================
   *  Port directory (all specialty terminals)
   * ============================================================ */
  const DIRECTORY_CATS = ['all','petrochemical','refinery','fuel','gas','steel','fertilizer','container','cruise','general','industrial'];

  function renderDirectory() {
    if (!regions.directoryGrid) return;
    const sp = store.get('shore_power');
    const docks = (sp?.docks || []).filter((d) => d.tier && d.tier !== 'major');

    /* Filters bar */
    const cats = ['all', ...new Set(DIRECTORY_CATS.filter((c) =>
      c === 'all' || docks.some((d) => d.category === c)
    ).slice(0, DIRECTORY_CATS.length))];

    regions.directoryFilters.innerHTML = cats.map((c) => `
      <button class="chip ${moduleState.directoryFilter === c ? 'is-active' : ''}" data-cat-filter="${escHTML(c)}">
        ${escHTML(t('shore.cat.' + c))}
      </button>
    `).join('');
    regions.directoryFilters.querySelectorAll('[data-cat-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        moduleState.directoryFilter = btn.dataset.catFilter;
        renderDirectory();
      });
    });

    /* Search box */
    regions.directorySearch.innerHTML = `
      <div class="search-box">
        ${ICONS.search || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>'}
        <input type="text" placeholder="${escHTML(t('shore.directory.search.placeholder'))}" value="${escHTML(moduleState.directorySearch)}" data-region="directory-search-input" />
      </div>
    `;
    const searchInput = regions.directorySearch.querySelector('[data-region="directory-search-input"]');
    searchInput.addEventListener('input', () => {
      moduleState.directorySearch = searchInput.value;
      renderDirectory();
    });

    /* Filter + search docks */
    const term = moduleState.directorySearch.trim().toLowerCase();
    const filtered = docks.filter((d) => {
      if (moduleState.directoryFilter !== 'all' && d.category !== moduleState.directoryFilter) return false;
      if (term && !d.name.toLowerCase().includes(term)) return false;
      return true;
    });

    if (filtered.length === 0) {
      regions.directoryGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; margin:var(--sp-2) 0">
          <div class="empty-state-icon">${ICONS.empty}</div>
          <div class="empty-state-title">${escHTML(t('shore.directory.empty.title'))}</div>
          <div class="empty-state-body">${escHTML(t('shore.directory.empty.body'))}</div>
        </div>
      `;
      return;
    }

    regions.directoryGrid.innerHTML = filtered.map((d) => directoryCard(d)).join('');

    regions.directoryGrid.querySelectorAll('[data-action="select-port"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        moduleState.selectedDockId = btn.dataset.dockId;
        renderSelected();
        renderDirectory();
        /* scroll to selected detail */
        const target = rootEl.querySelector('[data-region="selected-panel"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    regions.directoryGrid.querySelectorAll('[data-action="quick-toggle"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.dockId;
        if (id) store.dispatch('toggleShorePower', id);
      });
    });
  }

  function directoryCard(d) {
    const isSelected = moduleState.selectedDockId === d.id;
    const fillPct = d.kw_capacity ? Math.min(100, (d.kw_used / d.kw_capacity) * 100) : 0;
    const demandPct = d.kw_capacity ? Math.min(100, (d.kw_demand / d.kw_capacity) * 100) : 0;
    const catLabel = t('shore.cat.' + (d.category || 'general'));

    /* Status text */
    let statusLine;
    if (d.shore_power_active) {
      statusLine = `<span class="pg-shore-dir-status" data-tone="success">${escHTML(t('shore.dir.status.active', { kw: formatNum(d.kw_used, { maximumFractionDigits: 0 }) }))}</span>`;
    } else if (d.occupied) {
      statusLine = `<span class="pg-shore-dir-status" data-tone="warning">${escHTML(t('shore.dir.status.aux'))}</span>`;
    } else {
      statusLine = `<span class="pg-shore-dir-status" data-tone="info">${escHTML(t('shore.dir.status.empty'))}</span>`;
    }

    return `
      <button class="pg-shore-dir-card ${isSelected ? 'is-selected' : ''}" data-action="select-port" data-dock-id="${escHTML(d.id)}" type="button">
        <div class="pg-shore-dir-head">
          <div class="pg-shore-dir-name">
            <span>${escHTML(d.name)}</span>
            <span class="badge" data-tone="info">${escHTML(catLabel)}</span>
          </div>
          ${isSelected ? '<span class="pg-shore-dir-active-mark" aria-hidden="true">●</span>' : ''}
        </div>

        <div class="pg-shore-dir-vessel">
          ${d.occupied
            ? `<span class="vessel-name">${escHTML(d.vessel_name || '—')}</span><span class="muted">${escHTML(vesselTypeLabel(d.vessel_type))}</span>`
            : `<span class="muted">${escHTML(t('shore.dock.empty'))}</span>`}
        </div>

        <div class="pg-shore-dir-bar">
          <div class="pg-shore-dir-bar-track">
            <div class="pg-shore-dir-bar-fill" data-active="${d.shore_power_active}" style="width:${fillPct.toFixed(1)}%"></div>
            <div class="pg-shore-dir-bar-demand" style="width:${demandPct.toFixed(1)}%"></div>
          </div>
          <span class="pg-shore-dir-bar-label mono">
            ${formatNum(d.kw_used, { maximumFractionDigits: 0 })} / ${formatNum(d.kw_capacity, { maximumFractionDigits: 0 })} kW
          </span>
        </div>

        <div class="pg-shore-dir-foot">
          ${statusLine}
          <span class="pg-shore-dir-cta">${escHTML(t('shore.dir.cta'))} →</span>
        </div>
      </button>
    `;
  }

  /* ----------- Capacity (stacked area) ----------- */
  function renderCapacityChart() {
    if (charts.capacity) { try { charts.capacity.destroy(); } catch (_) {} charts.capacity = null; }

    const series = moduleState.timeseries;
    const sp = store.get('shore_power');
    const docks = sp?.docks || [];
    const palette = themePalette();

    if (series.length < 2 || docks.length === 0) {
      regions.capacityEmpty.textContent = t('shore.capacity.empty');
      return;
    }
    regions.capacityEmpty.textContent = '';

    /* build labels (HH:MM) and per-berth dataset arrays */
    const labels = series.map((p) => fmt.hourMin(new Date(p.ts)));
    const datasets = docks.map((d, i) => ({
      label: d.name,
      data: series.map((p) => p.byDock[d.id] || 0),
      color: palette.series[i % palette.series.length],
      fill: true,
      tension: 0.35,
      borderWidth: 1.4,
    }));

    const cap = sp.grid_capacity_kw || 60000;

    charts.capacity = lineChart(regions.capacityCanvas, datasets, {
      labels,
      options: {
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: palette.textMuted, font: { size: 11 }, boxWidth: 10, boxHeight: 10 } },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatNum(ctx.parsed.y, { maximumFractionDigits: 0 })} kW`,
            },
          },
        },
        scales: {
          x: { stacked: false, ticks: { color: palette.textSubtle, autoSkip: true, maxTicksLimit: 8 }, grid: { color: palette.grid } },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: palette.textSubtle, callback: (v) => `${(v / 1000).toFixed(1)}k` },
            grid: { color: palette.grid },
            title: { display: true, text: t('shore.capacity.axis_kw'), color: palette.textMuted, font: { size: 10 } },
            suggestedMax: cap,
          },
        },
        interaction: { mode: 'nearest', intersect: false },
      },
    });

    /* annotation-free threshold: paint a dashed line via the chart's afterDraw hook
       — simulated by adding a transparent dataset that mimics the cap. Skip if Chart.js lacks plugins.
       For our case we visually approximate via suggestedMax. */
  }

  /* ----------- Heatmap ----------- */
  function renderHeatmap() {
    const sp = store.get('shore_power');
    const docks = sp?.docks || [];
    if (docks.length === 0) return;

    /* build row labels */
    regions.heatmapRows.style.setProperty('--rows', docks.length);
    regions.heatmapRows.innerHTML = docks.map((d) => `
      <div class="row-label" title="${escHTML(d.name)}">${escHTML(d.name)}</div>
    `).join('');

    const matrix = aggregateHourlyMatrix(docks);
    if (matrix.max === 0) {
      /* still draw an empty grid so users know the chart exists */
      const palette = themePalette();
      const ctx = regions.heatmapCanvas.getContext('2d');
      ctx.clearRect(0, 0, regions.heatmapCanvas.width, regions.heatmapCanvas.height);
      drawHeatmap(regions.heatmapCanvas, {
        rows: matrix.rows, cols: matrix.cols, values: matrix.values,
        min: 0, max: 1, color: palette.brand,
      });
      return;
    }

    drawHeatmap(regions.heatmapCanvas, {
      rows: matrix.rows,
      cols: matrix.cols,
      values: matrix.values,
      min: 0,
      max: matrix.max,
      color: themePalette().brand,
    });
    heatmapCanvas = regions.heatmapCanvas;
  }

  /* ----------- ROI / cumulative chart + equivalents ----------- */
  function renderCumulativeChart() {
    if (charts.cumulative) { try { charts.cumulative.destroy(); } catch (_) {} charts.cumulative = null; }

    const range = moduleState.range;
    /* Slice timeseries to the visible window. Since we only have rolling bucket
       ~360 points (~21 minutes at one snapshot per ~3.5s), we present whatever
       is available and label it according to range. */
    const fullSeries = moduleState.timeseries;
    let slice;
    if (range === '24h')      slice = fullSeries.slice(-Math.min(fullSeries.length, 240));
    else if (range === '7d')  slice = fullSeries.slice(-Math.min(fullSeries.length, 320));
    else                      slice = fullSeries.slice(-fullSeries.length);

    const palette = themePalette();
    const labels = [];
    const cumulative = [];
    let runningKg = 0;
    for (let i = 0; i < slice.length; i++) {
      const p = slice[i];
      const prev = slice[i - 1];
      if (prev) {
        const dtH = (p.ts - prev.ts) / 3_600_000;
        const energyKwh = ((p.total + prev.total) / 2) * dtH;
        runningKg += energyKwh * ENERGY_FACTOR_KG_PER_KWH;
      }
      labels.push(fmt.hourMin(new Date(p.ts)));
      cumulative.push(+runningKg.toFixed(2));
    }

    /* If we don't have enough history yet, reflect the current cumulative
       session totals as a single trailing point so the user sees something. */
    if (cumulative.length < 2) {
      const totalKg = sumSessionKg();
      labels.push(fmt.hourMin(new Date()));
      cumulative.push(+totalKg.toFixed(2));
    }

    charts.cumulative = lineChart(regions.cumulativeCanvas, [{
      label: t('shore.roi.cum_label'),
      data: cumulative,
      color: palette.success,
      fill: true,
      tension: 0.35,
      borderWidth: 2,
    }], {
      labels,
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${formatNum(ctx.parsed.y, { maximumFractionDigits: 1 })} kg CO₂`,
            },
          },
        },
        scales: {
          x: { ticks: { color: palette.textSubtle, autoSkip: true, maxTicksLimit: 8 }, grid: { color: palette.grid } },
          y: {
            beginAtZero: true,
            ticks: { color: palette.textSubtle, callback: (v) => formatCompact(v) },
            grid: { color: palette.grid },
            title: { display: true, text: t('shore.roi.cum_axis'), color: palette.textMuted, font: { size: 10 } },
          },
        },
      },
    });
  }

  function renderEquivalents() {
    const totalKg  = sumSessionKg();
    const totalKwh = sumSessionKwh();

    const trees      = totalKg / TREE_KG_PER_YEAR;
    const households = totalKwh / HOUSEHOLD_KW_PER_HOUR;
    const km         = totalKg / HIGHWAY_KG_PER_KM;

    const eqs = [
      {
        icon: ICONS.tree,
        tone: 'success',
        value: formatNum(trees, { maximumFractionDigits: 1 }),
        label: t('shore.roi.eq.trees'),
        meta:  t('shore.roi.eq.trees_meta'),
      },
      {
        icon: ICONS.home,
        tone: 'info',
        value: formatNum(households, { maximumFractionDigits: 1 }),
        label: t('shore.roi.eq.households'),
        meta:  t('shore.roi.eq.households_meta'),
      },
      {
        icon: ICONS.road,
        tone: 'warning',
        value: formatNum(km, { maximumFractionDigits: 0 }),
        label: t('shore.roi.eq.highway'),
        meta:  t('shore.roi.eq.highway_meta'),
      },
    ];

    regions.eqGrid.innerHTML = eqs.map((e) => `
      <div class="pg-shore-eq" data-tone="${e.tone}">
        <div class="pg-shore-eq-icon">${e.icon}</div>
        <div class="pg-shore-eq-body">
          <span class="pg-shore-eq-value">${e.value}</span>
          <span class="pg-shore-eq-label">${escHTML(e.label)}</span>
          <span class="pg-shore-eq-meta">${escHTML(e.meta)}</span>
        </div>
      </div>
    `).join('');
  }

  /* ----------- Optimizer / recommendations ----------- */
  function renderOptimizer() {
    const sp = store.get('shore_power');
    const docks = sp?.docks || [];
    const alerts = (store.get('alerts') || []).filter((a) =>
      a.category === 'shore' && !a.resolved && !a.dismissed
    );

    /* compute potential opportunities from current dock state */
    const opportunities = docks
      .filter((d) => d.occupied && !d.shore_power_active)
      .map((d) => {
        const co2 = +(d.kw_demand * ENERGY_FACTOR_KG_PER_KWH).toFixed(0);
        return {
          source: 'derived',
          severity: 'info',
          dockId: d.id,
          dockName: d.name,
          vessel: d.vessel_name || t('shore.dock.no_vessel'),
          type:   vesselTypeLabel(d.vessel_type) || '—',
          kw: d.kw_demand,
          co2,
        };
      });

    /* fold engine-generated alerts that target a dock as deeper, primary cards */
    const engineCards = alerts.map((a) => {
      const dockId = a.target?.dock_id || a.body_params?.dock || null;
      const params = a.body_params || {};
      return {
        source: 'engine',
        severity: a.severity || 'info',
        dockId,
        dockName: params.dock || dockId || '—',
        vessel: params.vessel || '—',
        type: '—',
        kw: params.kw || 0,
        co2: params.co2 || +((params.kw || 0) * ENERGY_FACTOR_KG_PER_KWH).toFixed(0),
        title: a.title_key ? t(a.title_key, params) : t('shore.opt.title', { dock: params.dock }),
        body:  a.body_key  ? t(a.body_key, params)  : '',
        recs:  a.recommendations || [],
        alertId: a.id,
      };
    });

    /* prefer engine cards first, then derived */
    const merged = [...engineCards, ...opportunities];

    if (merged.length === 0) {
      regions.optList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.leaf}</div>
          <div class="empty-state-title">${escHTML(t('shore.empty.opt'))}</div>
          <div class="empty-state-body">${escHTML(t('shore.opt.empty'))}</div>
        </div>
      `;
      return;
    }

    regions.optList.innerHTML = merged.map((o, idx) => optCard(o, idx)).join('');

    regions.optList.querySelectorAll('[data-action="apply-opt"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dockId = btn.dataset.dockId;
        const alertId = btn.dataset.alertId;
        if (dockId) store.dispatch('toggleShorePower', dockId);
        if (alertId) store.dispatch('resolveAlert', { id: alertId, action_id: 'engage_shore' });
      });
    });
  }

  function optCard(o, idx) {
    const title = o.title || t('shore.opt.title', { dock: o.dockName });
    const body  = o.body  || t('shore.opt.body', { vessel: o.vessel, type: o.type, kw: formatNum(o.kw), co2: o.co2 });
    const sourceBadge = o.source === 'engine'
      ? `<span class="badge" data-tone="${tToneClass(o.severity)}">${escHTML(t('shore.opt.engine'))}</span>`
      : '';

    return `
      <div class="pg-shore-opt" data-severity="${escHTML(o.severity)}" data-idx="${idx}">
        <div class="pg-shore-opt-body">
          <div class="pg-shore-opt-title">
            ${ICONS.alert}
            <span>${escHTML(title)}</span>
            ${sourceBadge}
          </div>
          <div class="pg-shore-opt-desc">${escHTML(body)}</div>
          <div class="pg-shore-opt-savings">${escHTML(t('shore.opt.savings', { co2: formatNum(o.co2, { maximumFractionDigits: 0 }) }))}</div>
        </div>
        <div class="pg-shore-opt-cta">
          <button class="btn btn--primary btn--sm" data-action="apply-opt"
                  ${o.dockId ? `data-dock-id="${escHTML(o.dockId)}"` : ''}
                  ${o.alertId ? `data-alert-id="${escHTML(o.alertId)}"` : ''}>
            ${escHTML(t('shore.opt.apply'))}
          </button>
        </div>
      </div>
    `;
  }

  /* ----------- Activation history ----------- */
  function renderHistory() {
    /* compose: module-local events + applied recommendations history (filtered to shore) */
    const moduleEvents = moduleState.events.map((e) => ({
      ts: e.ts,
      berth: e.dockName,
      action: e.action,
      vessel: e.vessel || '—',
      kw: e.kw || 0,
      co2: e.co2_total || 0,
      source: e.source || 'manual',
    }));

    const recs = (store.get('recommendations') || [])
      .filter((r) => r.action_id === 'engage_shore')
      .map((r) => ({
        ts: r.ts,
        berth: r.note || '—',
        action: 'engaged',
        vessel: '—',
        kw: 0,
        co2: 0,
        source: 'applied',
      }));

    const all = [...moduleEvents, ...recs].sort((a, b) => b.ts - a.ts).slice(0, 60);

    if (all.length === 0) {
      regions.historyWrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.empty}</div>
          <div class="empty-state-title">${escHTML(t('shore.history.empty'))}</div>
          <div class="empty-state-body">${escHTML(t('common.empty.body'))}</div>
        </div>
      `;
      return;
    }

    regions.historyWrap.innerHTML = `
      <table class="data-table compact pg-shore-history-table">
        <thead>
          <tr>
            <th>${escHTML(t('shore.history.col.ts'))}</th>
            <th>${escHTML(t('shore.history.col.berth'))}</th>
            <th>${escHTML(t('shore.history.col.action'))}</th>
            <th>${escHTML(t('shore.history.col.vessel'))}</th>
            <th>${escHTML(t('shore.history.col.kw'))}</th>
            <th>${escHTML(t('shore.history.col.co2'))}</th>
            <th>${escHTML(t('shore.history.col.source'))}</th>
          </tr>
        </thead>
        <tbody>
          ${all.map((e) => `
            <tr>
              <td class="mono" style="white-space:nowrap">${escHTML(fmt.dateTime(e.ts))}</td>
              <td>${escHTML(e.berth || '—')}</td>
              <td class="action-cell" data-action="${escHTML(e.action)}">
                ${escHTML(e.action === 'engaged' ? t('shore.action.engaged') : t('shore.action.released'))}
              </td>
              <td>${escHTML(e.vessel || '—')}</td>
              <td class="mono">${e.kw ? formatNum(e.kw, { maximumFractionDigits: 0 }) : '—'}</td>
              <td class="mono">${e.co2 ? `${formatNum(e.co2, { maximumFractionDigits: 0 })} kg` : '—'}</td>
              <td><span class="badge">${escHTML(t('shore.history.src.' + (e.source || 'manual')))}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /* ============================================================
   *  Action helpers
   * ============================================================ */
  function engageAll() {
    const sp = store.get('shore_power');
    if (!sp) return;
    sp.docks.forEach((d) => {
      if (d.occupied && !d.shore_power_active) store.dispatch('toggleShorePower', d.id);
    });
  }

  function disengageAll() {
    const sp = store.get('shore_power');
    if (!sp) return;
    sp.docks.forEach((d) => {
      if (d.shore_power_active) store.dispatch('toggleShorePower', d.id);
    });
  }

  function deleteBerth(id) {
    const sp = store.get('shore_power');
    if (!sp) return;
    const next = sp.docks.filter((d) => d.id !== id);
    const total_kw = next.reduce((acc, d) => acc + (d.shore_power_active ? d.kw_used : 0), 0);
    store.set('shore_power', {
      ...sp,
      docks: next,
      total_kw,
      total_co2_saved_kg: +(total_kw * ENERGY_FACTOR_KG_PER_KWH).toFixed(1),
    });
  }

  /* ----------- Form ----------- */
  function openBerthForm(existing) {
    const isEdit = !!existing;
    const types = [
      { value: '',           label: t('shore.field.vessel_type_none') },
      { value: 'container',  label: t('type.container') },
      { value: 'tanker',     label: t('type.tanker') },
      { value: 'bulk',       label: t('type.bulk') },
      { value: 'roro',       label: t('type.roro') },
      { value: 'lng',        label: t('type.lng') },
    ];

    openForm({
      title: isEdit ? t('shore.edit.title') : t('shore.add.title'),
      submitLabel: t('common.save'),
      cancelLabel: t('common.cancel'),
      fields: [
        {
          id: 'name',
          label: t('shore.field.name'),
          type: 'text',
          value: existing?.name || '',
          required: true,
          placeholder: t('shore.field.name_hint'),
          hint: t('shore.field.name_hint'),
          validate: required,
        },
        {
          id: 'kw_capacity',
          label: t('shore.field.capacity'),
          type: 'number',
          value: existing?.kw_capacity ?? 12000,
          required: true,
          min: 1000,
          step: 100,
          validate: compose(required, minNumber(1000)),
        },
        {
          id: 'kw_demand',
          label: t('shore.field.demand'),
          type: 'number',
          value: existing?.kw_demand ?? 6000,
          required: true,
          min: 0,
          step: 100,
          validate: compose(required, minNumber(0)),
        },
        {
          id: 'vessel_name',
          label: t('shore.field.vessel_name'),
          type: 'text',
          value: existing?.vessel_name || '',
        },
        {
          id: 'vessel_type',
          label: t('shore.field.vessel_type'),
          type: 'select',
          value: existing?.vessel_type || '',
          options: types,
        },
      ],
      onSubmit: (values) => {
        const sp = store.get('shore_power');
        if (!sp) return;

        if (isEdit) {
          const next = sp.docks.map((d) => {
            if (d.id !== existing.id) return d;
            return {
              ...d,
              name: values.name,
              kw_capacity: Math.max(1000, Number(values.kw_capacity) || d.kw_capacity),
              kw_demand:   Math.max(0,    Number(values.kw_demand)   || 0),
              vessel_name: values.vessel_name?.trim() || null,
              vessel_type: values.vessel_type || null,
              occupied: !!(values.vessel_name && values.vessel_name.trim()),
            };
          });
          const total_kw = next.reduce((acc, d) => acc + (d.shore_power_active ? d.kw_used : 0), 0);
          store.set('shore_power', {
            ...sp,
            docks: next,
            total_kw,
            total_co2_saved_kg: +(total_kw * ENERGY_FACTOR_KG_PER_KWH).toFixed(1),
          });
        } else {
          const id = `D-MAN-${Date.now()}`;
          const newDock = {
            id,
            name: values.name,
            occupied: !!(values.vessel_name && values.vessel_name.trim()),
            vessel_id: null,
            vessel_name: values.vessel_name?.trim() || null,
            vessel_type: values.vessel_type || null,
            shore_power_active: false,
            kw_capacity: Math.max(1000, Number(values.kw_capacity) || 12000),
            kw_demand:   Math.max(0,    Number(values.kw_demand)   || 0),
            kw_used: 0,
            co2_saved: 0,
            _manual: true,
          };
          store.set('shore_power', {
            ...sp,
            docks: [...sp.docks, newDock],
          });
        }
      },
    });
  }

  /* ============================================================
   *  Master render + subscriptions
   * ============================================================ */
  function renderAll() {
    renderHeaderActions();
    renderBerthsActions();
    renderKPIs();
    renderBerthGrid();
    renderSelected();
    renderDirectory();
    renderCapacityChart();
    renderHeatmap();
    renderCumulativeChart();
    renderEquivalents();
    renderOptimizer();
    renderHistory();
  }

  /* lightweight render that doesn't rebuild the chart instances unless needed */
  function softRender() {
    renderKPIs();
    renderBerthGrid();
    renderSelected();
    renderDirectory();
    renderOptimizer();
    renderHistory();
  }

  function reactiveRender() {
    /* full re-render of charts only every Nth update — but Chart.js destroy/create is cheap enough at this scale */
    renderKPIs();
    renderBerthGrid();
    renderSelected();
    renderDirectory();
    renderCapacityChart();
    renderHeatmap();
    renderCumulativeChart();
    renderEquivalents();
    renderOptimizer();
    renderHistory();
  }

  /* initial paint */
  renderAll();

  /* subscriptions */
  unsubs.push(store.subscribe('shore_power', () => {
    ingestSnapshot();
    reactiveRender();
  }));
  unsubs.push(store.subscribe('alerts',          softRender));
  unsubs.push(store.subscribe('recommendations', softRender));
  unsubs.push(store.subscribe('vessels',         () => renderOptimizer()));
  unsubs.push(store.subscribe('meta',            () => renderKPIs()));
  unsubs.push(store.subscribe('ui', () => {
    /* full rebuild because labels + chart palette swap on theme/lang change */
    renderAll();
  }));

  /* periodic redraw of session timer in the connected/today_kwh KPIs and
     berth "engaged for" line, since those depend on Date.now() and don't
     necessarily get a fresh slice update every second. Lightweight. */
  const timerId = setInterval(() => {
    renderKPIs();
    /* refresh "engaged for" durations on berth cards without rebuilding charts */
    rootEl.querySelectorAll('.dock').forEach((el) => {
      const id = el.dataset.dockId;
      if (!id) return;
      const session = moduleState.sessionStats[id];
      if (!session?.engagedSinceMs) return;
      const span = el.querySelector('.pg-shore-berth-session span:nth-child(3)');
      if (span) {
        span.textContent = t('shore.berth.engaged_for', { dur: durationStr(Date.now() - session.engagedSinceMs) });
      }
    });
  }, 5000);

  /* ----------- Unmount ----------- */
  return {
    unmount() {
      clearInterval(timerId);
      for (const u of unsubs) { try { u(); } catch (_) {} }
      for (const k of Object.keys(charts)) {
        try { charts[k]?.destroy(); } catch (_) {}
      }
      charts = {};
      heatmapCanvas = null;
    },
  };
}
