/**
 * alertEngine.js — Rule-based alert + recommendation generator.
 *
 * Subscribes to simulation tick events (via vessels/emissions/shore_power/
 * weather slices) and evaluates a small set of operational rules. Each rule
 * produces an alert with an embedded list of recommended actions; pages
 * surface those recommendations and dispatch them back through the store.
 *
 * Recommendations are descriptive — applying them is the page's job (e.g.,
 * the alerts page calls the relevant store action when the operator clicks
 * "Apply"). The engine only reasons about state.
 */

import store from '../store/state.js';

const TICK_THROTTLE_MS = 4500;
let _lastEval = 0;
let _attached = false;

const SIGS = {
  emissionExceedance: (vid, k) => `vessel:${vid}:em:${k}`,
  aggregateExceedance: (k)     => `agg:em:${k}`,
  dispersionRisk:     (vid)    => `vessel:${vid}:disp`,
  shoreAvailable:     (did)    => `dock:${did}:shore`,
  etaConflict:        (vid)    => `vessel:${vid}:eta`,
  badAnchorage:       (vid)    => `vessel:${vid}:anchor`,
};

const RECOMMENDATIONS = {
  ENGAGE_SHORE: (params) => ({
    id: 'engage_shore', tkey: 'rec.engage_shore', params,
    impact_kg_co2_h: params?.kw ? +(params.kw * 0.69).toFixed(0) : null,
    apply: { action: 'toggleShorePower', payload: params?.dock_id },
  }),
  REROUTE_BERTH: (params) => ({
    id: 'reroute_berth', tkey: 'rec.reroute_berth', params,
    impact_kg_co2_h: 4.5,
  }),
  REDUCE_IDLE: (params) => ({
    id: 'reduce_idle', tkey: 'rec.reduce_idle', params,
    impact_kg_co2_h: 5.2,
  }),
  THROTTLE_INBOUND: (params) => ({
    id: 'throttle_inbound', tkey: 'rec.throttle_inbound', params,
    impact_kg_co2_h: 12,
  }),
  ANCHOR_OFFSHORE: (params) => ({
    id: 'anchor_offshore', tkey: 'rec.anchor_offshore', params,
    impact_kg_co2_h: 2,
  }),
  WAIT_FOR_WIND: (params) => ({
    id: 'wait_for_wind', tkey: 'rec.wait_for_wind', params,
  }),
  SWITCH_FUEL: (params) => ({
    id: 'switch_fuel', tkey: 'rec.switch_fuel', params,
    impact_kg_co2_h: 8,
  }),
};

function ratio(value, threshold) { return threshold ? value / threshold : 0; }

/* ------------------------------------------------------------------
 * Rules
 * ------------------------------------------------------------------ */

function ruleAggregateExceedance(state) {
  const out = [];
  const E = state.emissions;
  for (const k of Object.keys(E)) {
    const e = E[k];
    const r = ratio(e.current, e.threshold);
    if (r >= 1.0) {
      out.push({
        signature: SIGS.aggregateExceedance(k),
        category: 'emissions',
        severity: 'critical',
        title_key: 'alert.agg_exceedance.title',
        body_key:  'alert.agg_exceedance.body',
        body_params: { pollutant: e.label, value: e.current.toFixed(1), unit: e.unit, threshold: e.threshold, pct: ((r - 1) * 100).toFixed(0) },
        target: { kind: 'aggregate', pollutant: k },
        recommendations: [
          RECOMMENDATIONS.THROTTLE_INBOUND({ pollutant: e.label }),
          RECOMMENDATIONS.ENGAGE_SHORE({ scope: 'all_occupied' }),
        ],
      });
    } else if (r >= 0.85) {
      out.push({
        signature: SIGS.aggregateExceedance(k),
        category: 'emissions',
        severity: 'warning',
        title_key: 'alert.agg_elevated.title',
        body_key:  'alert.agg_elevated.body',
        body_params: { pollutant: e.label, value: e.current.toFixed(1), unit: e.unit, threshold: e.threshold, pct: ((r) * 100).toFixed(0) },
        target: { kind: 'aggregate', pollutant: k },
        recommendations: [
          RECOMMENDATIONS.ENGAGE_SHORE({ scope: 'all_occupied' }),
          RECOMMENDATIONS.REDUCE_IDLE({ scope: 'all_anchored' }),
        ],
      });
    }
  }
  return out;
}

function ruleVesselEmission(state) {
  const out = [];
  for (const v of state.vessels) {
    const r = ratio(v.emissions.co2, 70);
    if (r >= 1.0) {
      out.push({
        signature: SIGS.emissionExceedance(v.id, 'co2'),
        category: 'emissions',
        severity: 'critical',
        title_key: 'alert.vessel_co2.title',
        body_key:  'alert.vessel_co2.body',
        body_params: { name: v.name, value: v.emissions.co2.toFixed(1), pct: ((r - 1) * 100).toFixed(0) },
        target: { kind: 'vessel', vessel_id: v.id },
        recommendations: [
          RECOMMENDATIONS.SWITCH_FUEL({ vessel_id: v.id, current: v.fuel }),
          RECOMMENDATIONS.REDUCE_IDLE({ vessel_id: v.id }),
        ],
      });
    }
  }
  return out;
}

function ruleShoreAvailable(state) {
  const out = [];
  const sp = state.shore_power;
  for (const d of sp.docks) {
    if (d.occupied && !d.shore_power_active) {
      const co2 = +(d.kw_demand * 0.69).toFixed(0);
      out.push({
        signature: SIGS.shoreAvailable(d.id),
        category: 'shore',
        severity: 'info',
        title_key: 'alert.shore_available.title',
        body_key:  'alert.shore_available.body',
        body_params: { dock: d.name, vessel: d.vessel_name, kw: d.kw_demand, co2 },
        target: { kind: 'dock', dock_id: d.id },
        recommendations: [
          RECOMMENDATIONS.ENGAGE_SHORE({ dock_id: d.id, kw: d.kw_demand, dock: d.name }),
        ],
      });
    }
  }
  return out;
}

function ruleDispersionRisk(state) {
  const out = [];
  if (state.weather.dispersion_risk !== 'high') return out;
  for (const v of state.vessels) {
    if (v.status === 'anchored' || v.status === 'docked') {
      out.push({
        signature: SIGS.dispersionRisk(v.id),
        category: 'weather',
        severity: 'warning',
        title_key: 'alert.dispersion.title',
        body_key:  'alert.dispersion.body',
        body_params: { name: v.name, wind: state.weather.wind_speed.toFixed(1), dir: state.weather.wind_direction },
        target: { kind: 'vessel', vessel_id: v.id },
        recommendations: [
          RECOMMENDATIONS.WAIT_FOR_WIND({ vessel_id: v.id }),
          RECOMMENDATIONS.ANCHOR_OFFSHORE({ vessel_id: v.id }),
        ],
      });
    }
  }
  return out.slice(0, 3); // cap noise
}

function ruleETAImminent(state) {
  const out = [];
  const sp = state.shore_power;
  for (const v of state.vessels) {
    if (v.status !== 'approaching') continue;
    const minsUntil = (v.eta_ts - Date.now()) / 60_000;
    if (minsUntil < 0 || minsUntil > 60) continue;
    const freeBerths = sp.docks.filter((d) => !d.occupied);
    if (freeBerths.length === 0) {
      out.push({
        signature: SIGS.etaConflict(v.id),
        category: 'operations',
        severity: 'warning',
        title_key: 'alert.eta_conflict.title',
        body_key:  'alert.eta_conflict.body',
        body_params: { name: v.name, mins: Math.max(0, Math.round(minsUntil)) },
        target: { kind: 'vessel', vessel_id: v.id },
        recommendations: [
          RECOMMENDATIONS.REROUTE_BERTH({ vessel_id: v.id }),
          RECOMMENDATIONS.ANCHOR_OFFSHORE({ vessel_id: v.id }),
        ],
      });
    }
  }
  return out;
}

const RULES = [ruleAggregateExceedance, ruleVesselEmission, ruleShoreAvailable, ruleDispersionRisk, ruleETAImminent];

/* ------------------------------------------------------------------ */
function evaluate() {
  const enabled = store.get('settings')?.alert_engine_enabled !== false;
  if (!enabled) return;
  const now = Date.now();
  if (now - _lastEval < TICK_THROTTLE_MS) return;
  _lastEval = now;

  const state = store.getAll();
  const generated = [];
  for (const rule of RULES) {
    try { generated.push(...rule(state)); }
    catch (err) { console.error('[alertEngine] rule threw', err); }
  }

  for (const a of generated) {
    store.dispatch('pushAlert', {
      id: `eng-${a.signature}-${Math.floor(now / 30_000)}`,
      ts: now,
      ...a,
    });
  }

  /* Auto-resolve alerts whose target condition is no longer present */
  const open = (state.alerts || []).filter((x) => !x.resolved && !x.dismissed);
  for (const a of open) {
    if (!a.signature) continue;
    const stillActive = generated.some((g) => g.signature === a.signature);
    if (!stillActive && a.id.startsWith('eng-')) {
      store.dispatch('resolveAlert', { id: a.id, action_id: 'auto', note: 'Condition cleared' });
    }
  }
}

export function startAlertEngine() {
  if (_attached) return;
  _attached = true;
  store.subscribe('vessels',     evaluate);
  store.subscribe('emissions',   evaluate);
  store.subscribe('shore_power', evaluate);
  store.subscribe('weather',     evaluate);
  /* initial evaluation slightly after boot */
  setTimeout(evaluate, 800);
}

export const RECS = RECOMMENDATIONS;
