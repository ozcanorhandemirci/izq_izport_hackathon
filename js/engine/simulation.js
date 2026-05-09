/**
 * simulation.js — Mock data engine for İzmir Limanı.
 *
 * Drives the dashboard: seeds realistic-looking initial state and mutates it on
 * a 3.5s tick. Statuses and types use semantic IDs (translated at render time).
 */

import store from '../store/state.js';

const TICK_INTERVAL_MS = 3500;

/* ----------------------- Reference fixtures ----------------------- */
/* Mix of international shipping names + Aegean / İzmir-themed callsigns. */
const VESSEL_NAMES = [
  'MSC Olivia',     'Maersk Stellar',  'Evergreen Pacific', 'CMA Marseille',
  'COSCO Aurora',   'ONE Hesperus',    'HMM Algeciras',     'NYK Resolute',
  'Aegean Voyager', 'İzmir Express',   'Anadolu Star',      'Karaburun Pioneer',
];

/* Type IDs — translated via i18n keys `type.<id>`. */
const VESSEL_TYPES = ['container', 'tanker', 'bulk', 'roro', 'lng'];

const FUEL_TYPES = [
  { name: 'HFO',      clean: false, factor: 1.10 },
  { name: 'MGO',      clean: false, factor: 0.95 },
  { name: 'VLSFO',    clean: false, factor: 0.85 },
  { name: 'LNG',      clean: true,  factor: 0.55 },
  { name: 'Methanol', clean: true,  factor: 0.40 },
];

/* Status IDs — translated via i18n keys `status.<id>`. */
const STATUSES = [
  { id: 'approaching', tone: 'info'    },
  { id: 'docked',      tone: 'success' },
  { id: 'loading',     tone: 'success' },
  { id: 'departing',   tone: 'info'    },
  { id: 'anchored',    tone: 'warning' },
];

const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/* 4 major (top-row) ports + 17 specialty / industrial terminals around İzmir bay. */
const BERTH_DEFS = [
  /* === Top 4 — render in the main "Rıhtım Operasyonu" grid === */
  { name: 'İzmir Limanı',         tier: 'major',     category: 'general',       kw_capacity: 16000, kw_demand: 9500 },
  { name: 'Aliağa',               tier: 'major',     category: 'industrial',    kw_capacity: 14000, kw_demand: 8200 },
  { name: 'Çeşme',                tier: 'major',     category: 'cruise',        kw_capacity: 10000, kw_demand: 5400 },
  { name: 'Dikili',               tier: 'major',     category: 'general',       kw_capacity: 9000,  kw_demand: 4200 },

  /* === Specialty / industrial — surface in the directory === */
  { name: 'Petkim Limanı',        tier: 'specialty', category: 'petrochemical', kw_capacity: 18000, kw_demand: 12000 },
  { name: 'Tüpraş Limanı',        tier: 'specialty', category: 'refinery',      kw_capacity: 16000, kw_demand: 11000 },
  { name: 'Petrol Ofisi Limanı',  tier: 'specialty', category: 'fuel',          kw_capacity: 12000, kw_demand: 7500 },
  { name: 'Total Limanı',         tier: 'specialty', category: 'fuel',          kw_capacity: 10000, kw_demand: 6500 },
  { name: 'Alpet Limanı',         tier: 'specialty', category: 'fuel',          kw_capacity: 9000,  kw_demand: 5500 },
  { name: 'Socar Terminal',       tier: 'specialty', category: 'fuel',          kw_capacity: 12000, kw_demand: 7000 },
  { name: 'Ege Gaz Limanı',       tier: 'specialty', category: 'gas',           kw_capacity: 11000, kw_demand: 6800 },
  { name: 'Milangaz Limanı',      tier: 'specialty', category: 'gas',           kw_capacity: 8000,  kw_demand: 4500 },
  { name: 'Habaş Limanı',         tier: 'specialty', category: 'gas',           kw_capacity: 9500,  kw_demand: 5800 },
  { name: 'Ege Gübre Limanı',     tier: 'specialty', category: 'fertilizer',    kw_capacity: 10000, kw_demand: 6000 },
  { name: 'Ege Çelik Limanı',     tier: 'specialty', category: 'steel',         kw_capacity: 13000, kw_demand: 8500 },
  { name: 'IDÇ Limanı',           tier: 'specialty', category: 'steel',         kw_capacity: 12000, kw_demand: 7800 },
  { name: 'ETKİ Limanı',          tier: 'specialty', category: 'general',       kw_capacity: 8500,  kw_demand: 4800 },
  { name: 'Batıliman Limanı',     tier: 'specialty', category: 'general',       kw_capacity: 7000,  kw_demand: 4000 },
  { name: 'Nemport Limanı',       tier: 'specialty', category: 'container',     kw_capacity: 15000, kw_demand: 10000 },
  { name: 'TCDD İzmir Limanı',    tier: 'specialty', category: 'general',       kw_capacity: 11000, kw_demand: 6500 },
  { name: 'Çeşme Ulusoy Limanı',  tier: 'specialty', category: 'cruise',        kw_capacity: 8000,  kw_demand: 4500 },
];

/* ------------------------------ Helpers ------------------------------ */
const rand   = (min, max) => Math.random() * (max - min) + min;
const randI  = (min, max) => Math.floor(rand(min, max + 1));
const pick   = (arr)      => arr[Math.floor(Math.random() * arr.length)];
const clamp  = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const nudge  = (current, delta, lo = 0, hi = Infinity) => clamp(current + rand(-delta, delta), lo, hi);

function severityFor(emissionRatio) {
  if (emissionRatio >= 1.0) return 'critical';
  if (emissionRatio >= 0.85) return 'warning';
  if (emissionRatio >= 0.55) return 'info';
  return 'success';
}

/* ----------------------------- Seeding ----------------------------- */
function seedVessels() {
  const sample = [...VESSEL_NAMES].sort(() => Math.random() - 0.5).slice(0, 8);
  return sample.map((name) => {
    const fuel = pick(FUEL_TYPES);
    const status = pick(STATUSES);
    const co2 = rand(18, 78) * fuel.factor;
    const nox = rand(40, 220) * fuel.factor;
    const sox = rand(8, 90)  * fuel.factor;
    const sev = severityFor(co2 / 60);
    return {
      id: `IMO-${9100000 + randI(1000, 9999)}`,
      name,
      type: pick(VESSEL_TYPES),                       /* semantic id */
      fuel: fuel.name,
      fuel_clean: fuel.clean,
      status: status.id,                              /* semantic id */
      status_tone: status.tone,
      eta_ts: Date.now() + rand(-2, 24) * 3600 * 1000,
      speed_kn: rand(0, 18),
      /* İzmir Körfezi koordinatları (~38.45°N, 27.10°E) */
      lat: rand(38.40, 38.50),
      lon: rand(27.05, 27.20),
      emissions: { co2: +co2.toFixed(1), nox: +nox.toFixed(1), sox: +sox.toFixed(1) },
      severity: sev,
      dispersion_risk: pick(['low', 'low', 'medium', 'medium', 'high']),
    };
  });
}

function seedDocks(vessels) {
  const eligible = vessels.filter((v) => v.status === 'docked' || v.status === 'loading');
  let eligIdx = 0;
  return BERTH_DEFS.map((def, i) => {
    /* Top-4 majors are the most-likely populated; specialties are populated
     * with declining probability so the directory has both occupied and
     * empty entries to demo. */
    const occupied =
      def.tier === 'major'
        ? Math.random() > 0.15
        : Math.random() > 0.45;
    let occupant = null;
    if (occupied) {
      occupant = eligible[eligIdx % Math.max(1, eligible.length)] || pick(vessels);
      eligIdx++;
    }
    /* Slight noise on demand so identical defs don't all read identical. */
    const demandFuzz = def.kw_demand * rand(0.85, 1.05);
    return {
      id: `D-${i + 1}`,
      name: def.name,
      tier: def.tier,
      category: def.category,
      occupied: !!occupant,
      vessel_id: occupant ? occupant.id : null,
      vessel_name: occupant ? occupant.name : null,
      vessel_type: occupant ? occupant.type : null,
      shore_power_active: false,
      kw_capacity: def.kw_capacity,
      kw_demand: occupant ? Math.round(demandFuzz) : Math.round(def.kw_demand * 0.4),
      kw_used: 0,
      co2_saved: 0,
    };
  });
}

function seedEmissions(currentEmissions) {
  const out = {};
  for (const k of Object.keys(currentEmissions)) {
    const e = currentEmissions[k];
    const history = Array.from({ length: 48 }, (_, i) => {
      const wave = Math.sin((i / 48) * Math.PI * 2) * (e.threshold * 0.18);
      const noise = rand(-e.threshold * 0.1, e.threshold * 0.1);
      return +clamp(e.threshold * 0.65 + wave + noise, 0, e.threshold * 1.4).toFixed(2);
    });
    out[k] = { ...e, history, current: history[history.length - 1] };
  }
  return out;
}

/* ------------------------------ Tick ------------------------------ */
function tick() {
  const now = Date.now();

  const vessels = store.get('vessels').map((v) => {
    const co2 = nudge(v.emissions.co2, 2.5, 0, 200);
    const nox = nudge(v.emissions.nox, 6,   0, 600);
    const sox = nudge(v.emissions.sox, 3,   0, 250);
    return {
      ...v,
      speed_kn: nudge(v.speed_kn, 0.6, 0, 22),
      lat: v.lat + rand(-0.0015, 0.0015),
      lon: v.lon + rand(-0.0015, 0.0015),
      emissions: { co2: +co2.toFixed(1), nox: +nox.toFixed(1), sox: +sox.toFixed(1) },
      severity: severityFor(co2 / 60),
    };
  });
  store.set('vessels', vessels);

  const emissions = store.get('emissions');
  const next = {};
  for (const k of Object.keys(emissions)) {
    const e = emissions[k];
    const summed = vessels.reduce((acc, v) => acc + v.emissions[k], 0);
    const scaled = k === 'co2' ? summed / 1000 : summed;
    const current = +nudge(scaled, e.threshold * 0.04, 0, e.threshold * 1.8).toFixed(2);
    next[k] = { ...e, current, history: [...e.history.slice(1), current] };
  }
  store.set('emissions', next);

  const w = store.get('weather');
  const wind_speed = +nudge(w.wind_speed, 1.4, 0, 38).toFixed(1);
  const dispersion_risk =
    wind_speed < 4  ? 'high'   :
    wind_speed < 10 ? 'medium' : 'low';
  store.set('weather', {
    ...w,
    wind_speed,
    wind_direction: Math.random() < 0.18 ? pick(WIND_DIRS) : w.wind_direction,
    humidity:    +nudge(w.humidity, 1.2, 30, 95).toFixed(1),
    temperature: +nudge(w.temperature, 0.4, -5, 38).toFixed(1),
    visibility_km: +nudge(w.visibility_km, 0.3, 0.5, 14).toFixed(1),
    dispersion_risk,
    last_updated: now,
  });

  const sp = store.get('shore_power');
  const docks = sp.docks.map((d) => {
    if (!d.occupied || !d.shore_power_active) return { ...d, kw_used: d.shore_power_active ? d.kw_used : 0 };
    return { ...d, kw_used: Math.round(nudge(d.kw_used || d.kw_demand, 220, d.kw_demand * 0.7, d.kw_demand * 1.05)) };
  });
  const total_kw = docks.reduce((acc, d) => acc + (d.shore_power_active ? d.kw_used : 0), 0);
  store.set('shore_power', {
    ...sp,
    docks,
    total_kw,
    total_co2_saved_kg: +(total_kw * 0.69).toFixed(1),
  });

  const meta = store.get('meta');
  store.set('meta', { ...meta, last_tick: now, tick_count: meta.tick_count + 1, sim_status: 'live' });
}

/* ----------------------------- Bootstrap ----------------------------- */
let _intervalId = null;

export function startSimulation() {
  if (_intervalId) return;

  const vessels = seedVessels();
  const docks   = seedDocks(vessels);
  store.set('vessels', vessels);
  store.set('shore_power', { ...store.get('shore_power'), docks });
  store.set('emissions', seedEmissions(store.get('emissions')));
  store.set('meta', { ...store.get('meta'), sim_status: 'live', started_at: Date.now() });

  _intervalId = setInterval(tick, TICK_INTERVAL_MS);
}

export function stopSimulation() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
    store.patch('meta', { sim_status: 'paused' });
  }
}
