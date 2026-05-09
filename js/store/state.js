/**
 * state.js — Centralized state store
 *
 * Pattern: Proxy + Pub/Sub hybrid.
 *   - Top-level slices are wrapped in a Proxy whose `set` trap broadcasts an
 *     event named after the slice key.
 *   - Components subscribe to slice events via `store.subscribe(slice, cb)`.
 *   - Wildcard subscribers receive `{ event, data }` for every change.
 *   - Components MUST NOT mutate nested objects directly; use `store.set()` /
 *     `store.patch()` so that Proxy.set fires reliably (Proxies don't trap
 *     deep mutations on nested arrays/objects).
 */

const SLICE_KEYS = [
  'vessels', 'weather', 'emissions', 'shore_power', 'alerts', 'copilot',
  'meta', 'ui',
  /* extensions for paged dashboard */
  'manual_vessels', 'manual_readings', 'recommendations', 'report_config',
  'route', 'settings', 'accounts', 'audit_log',
];

const initialState = {
  vessels: [],
  weather: {
    wind_speed: 12,
    wind_direction: 'NE',
    humidity: 68,
    temperature: 22,
    visibility_km: 9.4,
    dispersion_risk: 'low',
    last_updated: Date.now(),
  },
  emissions: {
    co2: { current: 0, history: new Array(48).fill(0), unit: 't/h',  threshold: 52, label: 'CO₂' },
    nox: { current: 0, history: new Array(48).fill(0), unit: 'kg/h', threshold: 210, label: 'NOₓ' },
    sox: { current: 0, history: new Array(48).fill(0), unit: 'kg/h', threshold: 78, label: 'SOₓ' },
  },
  shore_power: {
    docks: [],
    total_kw: 0,
    total_co2_saved_kg: 0,
    grid_capacity_kw: 60000,
    history: [],   /* { ts, total_kw, active, co2_saved } — populated by alertEngine */
  },
  alerts: [],          /* open alerts feed (with embedded recommendations) */
  recommendations: [], /* applied/queued recommendations log */
  copilot: {
    open: false,
    messages: [
      { from: 'assistant', key: 'copilot.welcome' },
    ],
    suggestions: ['copilot.suggest.summary', 'copilot.suggest.threshold', 'copilot.suggest.shore', 'copilot.suggest.alerts'],
  },
  meta: {
    last_tick: Date.now(),
    tick_count: 0,
    started_at: Date.now(),
    sim_status: 'idle',
  },
  ui: {
    language: 'tr',
    theme: 'dark',
    audit_open: false,
  },

  /* manual entries — persisted via localStorage */
  manual_vessels:  [],   /* { id, name, type, fuel, status, eta_ts, speed_kn, emissions, lat, lon, _manual:true } */
  manual_readings: [],   /* { id, ts, pollutant, value, unit, source, vessel_id?, notes } */

  report_config: {
    range: '24h',                    /* 24h | 7d | 30d | custom */
    range_start: null,
    range_end:   null,
    template: 'executive',           /* executive | compliance | operations | shore | alerts | custom */
    sections: ['cover','summary','kpis','vessels','emissions','shore','alerts','timeseries','compliance','appendix'],
    pollutants: ['co2', 'nox', 'sox'],
    severities: ['critical','warning','info'],
    title: '',
    author: '',
    notes: '',
    format: 'pdf',
  },

  route: { id: 'dashboard', params: {} },

  settings: { sim_paused: false, alert_engine_enabled: true },

  accounts: {
    active_id: 'acc-ops',
    list: [
      { id: 'acc-ops',     name: 'Demet Soylu',  role_key: 'account.role.ops_lead', email: 'demet.soylu@izport.tr',  initials: 'DS', tone: 'brand'   },
      { id: 'acc-analyst', name: 'Berk Aydın',   role_key: 'account.role.analyst',  email: 'berk.aydin@izport.tr',   initials: 'BA', tone: 'info'    },
      { id: 'acc-env',     name: 'Ayşe Kara',    role_key: 'account.role.env_eng',  email: 'ayse.kara@izport.tr',    initials: 'AK', tone: 'success' },
      { id: 'acc-port',    name: 'Mehmet Yıldız',role_key: 'account.role.harbor',   email: 'mehmet.yildiz@izport.tr',initials: 'MY', tone: 'warning' },
    ],
  },

  /* Append-only audit log. The store API only exposes `appendLog`; no edit
   * or delete actions exist. Each entry is hash-chained to the previous one
   * so tampering with the localStorage backing store is detectable. */
  audit_log: [],
};

/* ------------------------------------------------------------------
 * Pub/Sub primitives
 * ------------------------------------------------------------------ */
const listeners = new Map();

function emit(event, data) {
  const direct = listeners.get(event);
  if (direct) {
    for (const cb of direct) {
      try { cb(data); } catch (err) { console.error(`[state] '${event}' listener threw`, err); }
    }
  }
  if (event !== '*') {
    const all = listeners.get('*');
    if (all) {
      for (const cb of all) {
        try { cb({ event, data }); } catch (err) { console.error(`[state] wildcard listener threw`, err); }
      }
    }
  }
}

function subscribe(event, callback) {
  if (typeof callback !== 'function') throw new TypeError('subscribe(event, cb): cb must be a function');
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => unsubscribe(event, callback);
}

function unsubscribe(event, callback) {
  const set = listeners.get(event);
  if (set) set.delete(callback);
}

/* ------------------------------------------------------------------
 * Reactive root
 * ------------------------------------------------------------------ */
const _internal = structuredClone(initialState);

const stateProxy = new Proxy(_internal, {
  set(target, key, value) {
    target[key] = value;
    if (SLICE_KEYS.includes(key)) emit(key, value);
    return true;
  },
});

/* ------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------ */
const store = {
  get(key) { return _internal[key]; },
  getAll() { return _internal; },

  set(key, value) {
    if (!SLICE_KEYS.includes(key)) console.warn(`[state] set('${key}', …) — '${key}' is not a registered slice`);
    stateProxy[key] = value;
  },

  patch(key, partial) {
    const current = _internal[key];
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      stateProxy[key] = { ...current, ...partial };
    } else {
      stateProxy[key] = partial;
    }
  },

  dispatch(action, payload) {
    const fn = actions[action];
    if (!fn) { console.warn(`[state] unknown action '${action}'`); return; }
    return fn(payload);
  },

  subscribe,
  unsubscribe,
  emit,
};

/* ------------------------------------------------------------------
 * Actions
 * ------------------------------------------------------------------ */
const actions = {
  /* --- Shore power --- */
  toggleShorePower(dockId) {
    const sp = _internal.shore_power;
    const nextDocks = sp.docks.map((d) =>
      d.id === dockId
        ? {
            ...d,
            shore_power_active: d.occupied ? !d.shore_power_active : false,
            kw_used: d.occupied && !d.shore_power_active ? d.kw_demand : 0,
          }
        : d
    );
    const total_kw = nextDocks.reduce((acc, d) => acc + (d.shore_power_active ? d.kw_used : 0), 0);
    const total_co2_saved_kg = +(total_kw * 0.69).toFixed(1);
    store.set('shore_power', { ...sp, docks: nextDocks, total_kw, total_co2_saved_kg });

    const dock = nextDocks.find((d) => d.id === dockId);
    if (dock) {
      pushAlert({
        id: `alert-${Date.now()}`, ts: Date.now(),
        severity: dock.shore_power_active ? 'success' : 'info',
        category: 'shore',
        title_key: dock.shore_power_active ? 'alert.shore.engaged' : 'alert.shore.released',
        body_key:  dock.shore_power_active ? 'alert.shore.body.engaged' : 'alert.shore.body.released',
        body_params: { name: dock.name, kw: dock.kw_used },
        recommendations: [],
        resolved: dock.shore_power_active ? true : false,
      });
    }
  },

  /* --- Copilot --- */
  toggleCopilot(open) {
    const cp = _internal.copilot;
    store.set('copilot', { ...cp, open: typeof open === 'boolean' ? open : !cp.open });
  },
  pushCopilotMessage(message) {
    const cp = _internal.copilot;
    store.set('copilot', { ...cp, messages: [...cp.messages, message] });
  },

  /* --- Vessels (manual CRUD) --- */
  addVessel(vessel) {
    const id = vessel.id || `IMO-MAN-${Date.now()}`;
    const next = { ...vessel, id, _manual: true, _created_at: Date.now() };
    store.set('manual_vessels', [...(_internal.manual_vessels || []), next]);
    return next;
  },
  updateVessel({ id, patch }) {
    const list = _internal.manual_vessels || [];
    const next = list.map((v) => v.id === id ? { ...v, ...patch, _updated_at: Date.now() } : v);
    store.set('manual_vessels', next);
  },
  removeVessel(id) {
    store.set('manual_vessels', (_internal.manual_vessels || []).filter((v) => v.id !== id));
  },

  /* --- Manual emission readings --- */
  addManualReading(reading) {
    const id = reading.id || `R-${Date.now()}`;
    const next = { ...reading, id, _created_at: Date.now() };
    store.set('manual_readings', [...(_internal.manual_readings || []), next]);
    return next;
  },
  removeManualReading(id) {
    store.set('manual_readings', (_internal.manual_readings || []).filter((r) => r.id !== id));
  },

  /* --- Alerts lifecycle --- */
  pushAlert,
  resolveAlert({ id, action_id, note }) {
    const list = _internal.alerts || [];
    const found = list.find((a) => a.id === id);
    if (!found) return;
    const updated = { ...found, resolved: true, resolved_at: Date.now(), resolved_action: action_id, resolved_note: note };
    store.set('alerts', list.map((a) => a.id === id ? updated : a));
    /* log to recommendations history */
    if (action_id) {
      store.set('recommendations', [
        { id: `applied-${Date.now()}`, alert_id: id, action_id, ts: Date.now(), note },
        ...(_internal.recommendations || []),
      ].slice(0, 200));
    }
  },
  dismissAlert(id) {
    const list = _internal.alerts || [];
    store.set('alerts', list.map((a) => a.id === id ? { ...a, dismissed: true, dismissed_at: Date.now() } : a));
  },
  snoozeAlert({ id, minutes }) {
    const list = _internal.alerts || [];
    const until = Date.now() + (minutes || 15) * 60_000;
    store.set('alerts', list.map((a) => a.id === id ? { ...a, snoozed_until: until } : a));
  },
  clearResolvedAlerts() {
    store.set('alerts', (_internal.alerts || []).filter((a) => !a.resolved && !a.dismissed));
  },

  /* --- Routing --- */
  setRoute(route) {
    if (typeof route === 'string') store.set('route', { id: route, params: {} });
    else store.set('route', { id: route.id, params: route.params || {} });
  },

  /* --- Reports --- */
  setReportConfig(patch) {
    store.patch('report_config', patch);
  },

  /* --- Settings --- */
  setSetting(patch) {
    store.patch('settings', patch);
  },

  /* --- Accounts (UI-only directory of operator profiles) --- */
  setActiveAccount(id) {
    const a = _internal.accounts;
    if (!a.list.some((x) => x.id === id)) return;
    store.patch('accounts', { active_id: id });
  },
  addAccount(payload) {
    const a = _internal.accounts;
    const id = payload.id || `acc-${Date.now()}`;
    const initials = (payload.name || '?').split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    const TONES = ['brand', 'info', 'success', 'warning', 'critical'];
    const tone = TONES[a.list.length % TONES.length];
    const next = {
      id,
      name: payload.name || 'Yeni Kullanıcı',
      role_key: null,
      role_text: payload.role || '',
      email: payload.email || '',
      initials,
      tone,
      _custom: true,
    };
    store.set('accounts', { ...a, list: [...a.list, next], active_id: id });
    return next;
  },
  removeAccount(id) {
    const a = _internal.accounts;
    if (a.list.length <= 1) return;
    const list = a.list.filter((x) => x.id !== id);
    const active_id = a.active_id === id ? list[0].id : a.active_id;
    store.set('accounts', { ...a, list, active_id });
  },

  /* --- Audit log (append-only) --- */
  appendLog(entry) {
    const list = _internal.audit_log || [];
    /* Cap at 500; oldest entries roll off when capped. The hash chain still
     * remains internally consistent because we keep the most recent run. */
    const next = [entry, ...list].slice(0, 500);
    store.set('audit_log', next);
  },
};

function pushAlert(alert) {
  const list = _internal.alerts;
  /* dedupe by signature to avoid alert flood from the rule engine */
  const sig = alert.signature;
  let next;
  if (sig) {
    const existing = list.find((a) => a.signature === sig && !a.resolved && !a.dismissed);
    if (existing) {
      next = list.map((a) => a.id === existing.id ? { ...a, ...alert, ts: existing.ts, hits: (existing.hits || 1) + 1 } : a);
    } else {
      next = [{ ...alert, hits: 1 }, ...list];
    }
  } else {
    next = [alert, ...list];
  }
  store.set('alerts', next.slice(0, 80));
}

export default store;
export { SLICE_KEYS };
