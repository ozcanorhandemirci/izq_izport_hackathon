/**
 * logger.js — Append-only audit logger with hash-chain tamper detection.
 *
 * Core rules:
 *  - The only mutation is `log()` → `store.dispatch('appendLog', …)`.
 *  - Every entry stores `prev_hash` (hash of the previous record) and `hash`
 *    (hash of this record's canonicalized payload + prev_hash). A consumer
 *    can call `verifyChain()` to detect any edit/insert/delete against the
 *    persisted log.
 *  - Auto-subscribers watch the `accounts`, `shore_power`, `manual_vessels`,
 *    `manual_readings`, `alerts`, and `ui` slices and emit log entries on
 *    change. They never write back into those slices.
 *  - On first ever boot, a deterministic-ish set of demo entries is seeded
 *    so the drawer feels populated.
 */

import store from '../store/state.js';

/* ============================================================
 * Hash (FNV-1a 32-bit) — fast, deterministic, sufficient for tamper-evidence.
 * Not cryptographic, but adequate for showing chain integrity in a demo.
 * ============================================================ */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function canonicalize(entry) {
  /* Strip volatile fields before hashing. */
  const { hash, prev_hash, ...rest } = entry;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

function lastEntry() {
  const list = store.get('audit_log') || [];
  return list[0] || null;
}

function nextHash(entry) {
  const prev = lastEntry();
  const prev_hash = prev ? prev.hash : '00000000';
  const hash = fnv1a(prev_hash + canonicalize({ ...entry, prev_hash }));
  return { prev_hash, hash };
}

/** Public: walk the chain, return { ok, brokenAtIndex } */
export function verifyChain() {
  const list = (store.get('audit_log') || []).slice().reverse(); // chronological
  let prev_hash = '00000000';
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const expected = fnv1a(prev_hash + canonicalize({ ...e, prev_hash }));
    if (e.prev_hash !== prev_hash || e.hash !== expected) {
      return { ok: false, brokenAt: i };
    }
    prev_hash = e.hash;
  }
  return { ok: true, brokenAt: -1 };
}

/* ============================================================
 * Core log() — the one and only writer.
 * ============================================================ */
function activeAccount() {
  const a = store.get('accounts');
  if (!a) return null;
  return a.list.find((x) => x.id === a.active_id) || a.list[0] || null;
}

let _seq = 0;
let _lastSig = '';
let _lastSigTs = 0;

export function log({ action_key, action_params = {}, category = 'system', target = null, details = null, ts = Date.now() }) {
  if (!action_key) return;

  /* Cheap dedupe: same action+target within 500ms is collapsed. */
  const sig = `${action_key}|${JSON.stringify(action_params)}|${target ? JSON.stringify(target) : ''}`;
  if (sig === _lastSig && ts - _lastSigTs < 500) return;
  _lastSig = sig;
  _lastSigTs = ts;

  const acc = activeAccount();
  const id = `log-${ts}-${(++_seq).toString(36)}`;
  const draft = {
    id,
    ts,
    account_id:       acc?.id || 'system',
    account_name:     acc?.name || 'System',
    account_initials: acc?.initials || 'SY',
    account_tone:     acc?.tone || 'info',
    action_key,
    action_params,
    category,
    target,
    details,
  };
  const { prev_hash, hash } = nextHash(draft);
  store.dispatch('appendLog', { ...draft, prev_hash, hash });
}

/* ============================================================
 * Auto-subscribers. Each tracks a previous snapshot to diff against.
 * ============================================================ */

let prevAccounts    = null;
let prevShorePower  = null;
let prevManualVess  = null;
let prevManualRead  = null;
let prevAlerts      = null;
let prevUi          = null;

function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

function attachSubscribers() {
  /* Account changes (switch / add / remove) */
  prevAccounts = clone(store.get('accounts'));
  store.subscribe('accounts', (a) => {
    if (!prevAccounts) { prevAccounts = clone(a); return; }
    if (a.active_id !== prevAccounts.active_id) {
      const acc = a.list.find((x) => x.id === a.active_id);
      log({ category: 'account', action_key: 'log.account.switch', action_params: { name: acc?.name || '—' } });
    }
    if (a.list.length > prevAccounts.list.length) {
      const added = a.list.find((x) => !prevAccounts.list.some((p) => p.id === x.id));
      if (added) log({ category: 'account', action_key: 'log.account.add', action_params: { name: added.name } });
    } else if (a.list.length < prevAccounts.list.length) {
      const removed = prevAccounts.list.find((p) => !a.list.some((x) => x.id === p.id));
      if (removed) log({ category: 'account', action_key: 'log.account.remove', action_params: { name: removed.name } });
    }
    prevAccounts = clone(a);
  });

  /* Shore power: detect engage/disengage per dock */
  prevShorePower = clone(store.get('shore_power'));
  store.subscribe('shore_power', (sp) => {
    if (!prevShorePower) { prevShorePower = clone(sp); return; }
    for (const next of sp.docks) {
      const old = prevShorePower.docks.find((d) => d.id === next.id);
      if (!old) continue;
      if (next.shore_power_active !== old.shore_power_active) {
        log({
          category: 'operation',
          action_key: next.shore_power_active ? 'log.shore.engage' : 'log.shore.release',
          action_params: { dock: next.name, vessel: next.vessel_name || '—', kw: next.kw_used || next.kw_demand || 0 },
          target: { kind: 'dock', id: next.id },
        });
      }
    }
    prevShorePower = clone(sp);
  });

  /* Manual vessels: add / update / remove */
  prevManualVess = clone(store.get('manual_vessels'));
  store.subscribe('manual_vessels', (list) => {
    if (!prevManualVess) { prevManualVess = clone(list); return; }
    const prevIds = new Set(prevManualVess.map((v) => v.id));
    const nextIds = new Set(list.map((v) => v.id));
    /* added */
    for (const v of list) {
      if (!prevIds.has(v.id)) {
        log({ category: 'data', action_key: 'log.vessel.add', action_params: { name: v.name }, target: { kind: 'vessel', id: v.id } });
      }
    }
    /* removed */
    for (const v of prevManualVess) {
      if (!nextIds.has(v.id)) {
        log({ category: 'data', action_key: 'log.vessel.remove', action_params: { name: v.name }, target: { kind: 'vessel', id: v.id } });
      }
    }
    /* updated */
    for (const v of list) {
      const before = prevManualVess.find((p) => p.id === v.id);
      if (before && before._updated_at !== v._updated_at && v._updated_at) {
        log({ category: 'data', action_key: 'log.vessel.update', action_params: { name: v.name }, target: { kind: 'vessel', id: v.id } });
      }
    }
    prevManualVess = clone(list);
  });

  /* Manual readings: add / remove */
  prevManualRead = clone(store.get('manual_readings'));
  store.subscribe('manual_readings', (list) => {
    if (!prevManualRead) { prevManualRead = clone(list); return; }
    const prevIds = new Set(prevManualRead.map((r) => r.id));
    const nextIds = new Set(list.map((r) => r.id));
    for (const r of list) {
      if (!prevIds.has(r.id)) {
        log({ category: 'data', action_key: 'log.reading.add', action_params: { pollutant: (r.pollutant || '').toUpperCase(), value: r.value, unit: r.unit || '' }, target: { kind: 'reading', id: r.id } });
      }
    }
    for (const r of prevManualRead) {
      if (!nextIds.has(r.id)) {
        log({ category: 'data', action_key: 'log.reading.remove', action_params: { pollutant: (r.pollutant || '').toUpperCase() }, target: { kind: 'reading', id: r.id } });
      }
    }
    prevManualRead = clone(list);
  });

  /* Alerts: detect resolve / dismiss transitions */
  prevAlerts = clone(store.get('alerts'));
  store.subscribe('alerts', (list) => {
    if (!prevAlerts) { prevAlerts = clone(list); return; }
    const prevById = new Map(prevAlerts.map((a) => [a.id, a]));
    for (const a of list) {
      const before = prevById.get(a.id);
      if (!before) continue;
      const title = a.title_text || a.title_key || a.id;
      if (!before.resolved && a.resolved) {
        log({ category: 'alert', action_key: 'log.alert.resolve', action_params: { title, action: a.resolved_action || '—' }, target: { kind: 'alert', id: a.id } });
      } else if (!before.dismissed && a.dismissed) {
        log({ category: 'alert', action_key: 'log.alert.dismiss', action_params: { title }, target: { kind: 'alert', id: a.id } });
      }
    }
    prevAlerts = clone(list);
  });

  /* UI prefs: theme + language */
  prevUi = clone(store.get('ui'));
  store.subscribe('ui', (ui) => {
    if (!prevUi) { prevUi = clone(ui); return; }
    if (ui.theme !== prevUi.theme) {
      log({ category: 'system', action_key: 'log.ui.theme', action_params: { theme: ui.theme } });
    }
    if (ui.language !== prevUi.language) {
      log({ category: 'system', action_key: 'log.ui.lang', action_params: { lang: ui.language.toUpperCase() } });
    }
    prevUi = clone(ui);
  });
}

/* ============================================================
 * Demo seed — runs once if the audit log is empty, populates the drawer
 * with believable historical entries spread over the last few hours.
 * ============================================================ */
function seedDemoEntries() {
  if ((store.get('audit_log') || []).length > 0) return;

  const now = Date.now();
  const accounts = store.get('accounts')?.list || [];
  const pickAcc = (i) => accounts[i % accounts.length] || null;

  /* Build entries chronologically (oldest first), so hash chain is built
   * forward. Each call to log() reads `lastEntry()` from the slice. */
  const seeds = [
    { age: 6.0 * 3600_000, by: 0, category: 'system',    action_key: 'log.system.boot',         action_params: {} },
    { age: 5.9 * 3600_000, by: 0, category: 'system',    action_key: 'log.system.signin',       action_params: { name: pickAcc(0)?.name || '—' } },
    { age: 5.5 * 3600_000, by: 0, category: 'operation', action_key: 'log.shore.engage',        action_params: { dock: 'Aliağa', vessel: 'MSC Olivia', kw: 7800 }, target: { kind: 'dock', id: 'D-1' } },
    { age: 4.7 * 3600_000, by: 1, category: 'data',      action_key: 'log.reading.add',         action_params: { pollutant: 'CO2', value: 18.4, unit: 't/h' } },
    { age: 4.2 * 3600_000, by: 0, category: 'alert',     action_key: 'log.alert.resolve',       action_params: { title: 'Berth A · CO₂ aşımı', action: 'engage_shore' } },
    { age: 3.5 * 3600_000, by: 2, category: 'data',      action_key: 'log.vessel.add',          action_params: { name: 'Anadolu Star' } },
    { age: 3.0 * 3600_000, by: 0, category: 'system',    action_key: 'log.ui.theme',            action_params: { theme: 'dark' } },
    { age: 2.6 * 3600_000, by: 1, category: 'operation', action_key: 'log.shore.release',       action_params: { dock: 'Dikili', vessel: 'COSCO Aurora', kw: 0 } },
    { age: 2.0 * 3600_000, by: 3, category: 'report',    action_key: 'log.report.generate',     action_params: { template: 'compliance' } },
    { age: 1.4 * 3600_000, by: 0, category: 'alert',     action_key: 'log.alert.dismiss',       action_params: { title: 'Dağılım riski yüksek: Karaburun Pioneer' } },
    { age: 0.9 * 3600_000, by: 2, category: 'data',      action_key: 'log.reading.add',         action_params: { pollutant: 'NOX', value: 142, unit: 'kg/h' } },
    { age: 0.4 * 3600_000, by: 0, category: 'account',   action_key: 'log.account.switch',      action_params: { name: pickAcc(0)?.name || '—' } },
  ];

  /* Sort oldest first so hashes chain forward, and synthesise the active
   * account at the time of writing (rotate through accounts list). */
  for (const s of seeds.sort((a, b) => b.age - a.age)) {
    const ts = now - s.age;
    const acc = pickAcc(s.by);
    /* Compute hash + entry directly to bypass dedupe (different timestamps). */
    const id = `log-${ts}-seed${s.by}`;
    const draft = {
      id, ts,
      account_id:       acc?.id || 'system',
      account_name:     acc?.name || 'System',
      account_initials: acc?.initials || 'SY',
      account_tone:     acc?.tone || 'info',
      action_key:    s.action_key,
      action_params: s.action_params,
      category:      s.category,
      target:        s.target || null,
      details:       null,
    };
    const { prev_hash, hash } = nextHash(draft);
    store.dispatch('appendLog', { ...draft, prev_hash, hash });
  }
}

/* ============================================================
 * Public boot
 * ============================================================ */
export function startLogger() {
  seedDemoEntries();
  attachSubscribers();
  /* Boot record (always emitted, deduped if reload happens within 500ms). */
  log({ category: 'system', action_key: 'log.system.boot', action_params: {} });
}
