/**
 * auditDrawer.js — Slide-in right drawer rendering the audit log.
 *
 * The drawer mirrors the AI Copilot drawer position. It listens to:
 *  - `audit_log` slice for the entries
 *  - `ui.audit_open` flag for visibility
 *  - `ui` slice for language/theme re-renders
 *
 * Tampering with localStorage is detected on every render via
 * `verifyChain()`. The header surfaces "Bütünlük doğrulandı" / "ihlali" so a
 * tester can manually edit a record and see the warning flip.
 */

import store from '../store/state.js';
import { t, getLanguage } from '../i18n.js';
import * as fmt from '../utils/format.js';
import { verifyChain } from '../engine/logger.js';

let mountEl = null;
let drawerEl = null;
let activeFilter = 'all';
let searchTerm = '';

const CATEGORIES = ['all', 'account', 'operation', 'data', 'alert', 'report', 'system'];

const ICON_HISTORY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>';
const ICON_CLOSE   = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
const ICON_LOCK    = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>';
const ICON_DL      = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const ICON_SEARCH  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>';
const ICON_CHECK   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const ICON_WARN    = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m10.3 3.86-8.05 13.94A2 2 0 0 0 4 20.94h16a2 2 0 0 0 1.7-3.14L13.7 3.86a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

/* ----------------------------------------------------------------- */
function buildShell() {
  mountEl.innerHTML = `
    <aside class="audit-drawer" id="audit-drawer" data-open="false" role="dialog" aria-modal="false" aria-label="${t('audit.title')}">
      <header class="audit-head">
        <div class="audit-head-title">
          <span class="audit-head-icon" aria-hidden="true">${ICON_HISTORY}</span>
          <div>
            <h3>${t('audit.title')}</h3>
            <span class="subtitle">
              <span class="audit-lock-icon" aria-hidden="true">${ICON_LOCK}</span>
              ${t('audit.subtitle')}
            </span>
          </div>
        </div>
        <button class="audit-close" id="audit-close" aria-label="${t('audit.aria.close')}">
          ${ICON_CLOSE}
        </button>
      </header>

      <div class="audit-integrity" id="audit-integrity"></div>

      <div class="audit-toolbar">
        <div class="audit-search">
          <span class="audit-search-icon" aria-hidden="true">${ICON_SEARCH}</span>
          <input type="text" id="audit-search-input" placeholder="${t('audit.search.placeholder')}" value="${escapeAttr(searchTerm)}" />
        </div>
        <div class="audit-filters" role="toolbar" aria-label="Filters">
          ${CATEGORIES.map((c) => `
            <button type="button" class="chip ${c === activeFilter ? 'is-active' : ''}" data-cat="${c}">
              ${escapeHTML(t('audit.filter.' + c))}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="audit-body scroll-styled" id="audit-body" aria-live="polite"></div>

      <footer class="audit-foot">
        <div class="audit-foot-meta">
          <span class="audit-foot-records" id="audit-foot-records">—</span>
          <span class="audit-foot-hash mono" id="audit-foot-hash"></span>
        </div>
        <button type="button" class="btn btn--outline btn--sm" id="audit-export">
          ${ICON_DL}
          ${escapeHTML(t('audit.export.csv'))}
        </button>
      </footer>
    </aside>
  `;

  drawerEl = mountEl.querySelector('#audit-drawer');

  mountEl.querySelector('#audit-close').addEventListener('click', () => store.patch('ui', { audit_open: false }));

  mountEl.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.cat;
      mountEl.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === activeFilter));
      renderBody();
    });
  });

  const search = mountEl.querySelector('#audit-search-input');
  search.addEventListener('input', () => {
    searchTerm = search.value;
    renderBody();
  });

  mountEl.querySelector('#audit-export').addEventListener('click', exportCSV);

  /* Close on Escape when open */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && store.get('ui')?.audit_open) {
      store.patch('ui', { audit_open: false });
    }
  });
}

/* ----------------------------------------------------------------- */
function renderBody() {
  const body = mountEl.querySelector('#audit-body');
  if (!body) return;

  const all = store.get('audit_log') || [];
  const term = searchTerm.trim().toLowerCase();

  const filtered = all.filter((e) => {
    if (activeFilter !== 'all' && e.category !== activeFilter) return false;
    if (term) {
      const label = renderActionLabel(e).toLowerCase();
      const acc = (e.account_name || '').toLowerCase();
      if (!label.includes(term) && !acc.includes(term)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    body.innerHTML = `
      <div class="empty-state" style="margin:var(--sp-3) 0">
        <div class="empty-state-icon">${ICON_HISTORY}</div>
        <div class="empty-state-title">${escapeHTML(t('audit.empty.title'))}</div>
        <div class="empty-state-body">${escapeHTML(t('audit.empty.body'))}</div>
      </div>
    `;
  } else {
    body.innerHTML = filtered.map(renderEntry).join('');
  }

  /* Footer counters + chain hash + integrity */
  const recordsEl = mountEl.querySelector('#audit-foot-records');
  if (recordsEl) recordsEl.textContent = t('audit.records', { n: all.length });

  const hashEl = mountEl.querySelector('#audit-foot-hash');
  if (hashEl) {
    const last = all[0];
    hashEl.textContent = last ? `${t('audit.hash_label')}: ${last.hash.slice(0, 8)}…` : '';
  }

  const integrityEl = mountEl.querySelector('#audit-integrity');
  if (integrityEl) {
    const v = verifyChain();
    if (v.ok) {
      integrityEl.dataset.tone = 'success';
      integrityEl.innerHTML = `<span class="audit-integrity-icon">${ICON_CHECK}</span> ${escapeHTML(t('audit.integrity_ok'))} · ${escapeHTML(t('audit.append_only_note'))}`;
    } else {
      integrityEl.dataset.tone = 'critical';
      integrityEl.innerHTML = `<span class="audit-integrity-icon">${ICON_WARN}</span> ${escapeHTML(t('audit.integrity_broken', { idx: v.brokenAt }))}`;
    }
  }
}

function renderEntry(e) {
  const label = renderActionLabel(e);
  const cat = t('audit.cat.' + e.category) || e.category;
  return `
    <article class="audit-entry" data-cat="${escapeAttr(e.category)}">
      <div class="audit-entry-bar" data-cat="${escapeAttr(e.category)}"></div>
      <div class="audit-entry-avatar" data-tone="${e.account_tone || 'brand'}">${escapeHTML(e.account_initials || '?')}</div>
      <div class="audit-entry-body">
        <div class="audit-entry-line">
          <span class="audit-entry-actor">${escapeHTML(e.account_name || 'System')}</span>
          <span class="audit-entry-action">${escapeHTML(label)}</span>
        </div>
        <div class="audit-entry-meta">
          <span class="audit-entry-cat" data-cat="${escapeAttr(e.category)}">${escapeHTML(cat)}</span>
          <span class="audit-entry-time" title="${escapeAttr(fmt.ymdhm(e.ts))}">${escapeHTML(fmt.relativeTime(e.ts))}</span>
          <span class="audit-entry-hash mono" title="${escapeAttr(e.hash)}">#${escapeHTML((e.hash || '').slice(0, 6))}</span>
        </div>
      </div>
    </article>
  `;
}

function renderActionLabel(e) {
  if (!e.action_key) return e.details || '—';
  return t(e.action_key, e.action_params || {});
}

/* ----------------------------------------------------------------- */
function exportCSV() {
  const list = (store.get('audit_log') || []).slice().reverse();
  const headers = ['id', 'timestamp', 'account', 'category', 'action', 'prev_hash', 'hash'];
  const rows = list.map((e) => [
    e.id,
    new Date(e.ts).toISOString(),
    e.account_name || 'System',
    e.category,
    renderActionLabel(e).replace(/"/g, '""'),
    e.prev_hash,
    e.hash,
  ]);
  const csv = [headers, ...rows].map((row) =>
    row.map((c) => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c)).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `izport-audit-log-${fmt.ymd(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ----------------------------------------------------------------- */
function reflectVisibility() {
  const open = !!store.get('ui')?.audit_open;
  if (drawerEl) drawerEl.dataset.open = String(open);
}

function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s) { return escapeHTML(s); }

/* ----------------------------------------------------------------- */
export function init(root) {
  mountEl = root;
  buildShell();
  renderBody();
  reflectVisibility();
  store.subscribe('audit_log', renderBody);
  store.subscribe('ui', () => { buildShell(); renderBody(); reflectVisibility(); });
}
