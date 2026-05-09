/**
 * sidebar.js — Primary navigation rail, wired to the SPA router.
 *
 * Reads route definitions from pages/registry.js and reflects the active
 * route based on the `route` slice. Clicking a nav item calls navigate()
 * which updates the URL hash. The footer is a button that opens an
 * account-switcher modal (active profile, switch / add / remove).
 */

import store from '../store/state.js';
import { t } from '../i18n.js';
import { ROUTES } from '../pages/registry.js';
import { navigate } from '../router.js';
import { openModal, openForm, confirm } from '../utils/modal.js';
import { required } from '../utils/validate.js';

const ICONS = {
  grid:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  ship:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1"/><path d="M19.4 15 12 8 4.6 15"/><path d="M12 8V3"/><path d="M5 15v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a4 4 0 0 0 .8-7.9 6 6 0 0 0-11.6-1A4.5 4.5 0 0 0 7 18Z"/><path d="M8 22v-3"/><path d="M16 22v-3"/><path d="M12 22v-2"/></svg>',
  plug:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6"/><path d="M15 2v6"/><rect x="6" y="8" width="12" height="6" rx="1.5"/><path d="M12 14v3a4 4 0 0 0 4 4"/></svg>',
  bell:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  doc:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
  gear:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9 1.7 1.7 0 0 0 4.4 7.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

const CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
const PLUS    = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const TRASH   = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 17.6 19a2 2 0 0 1-2 1.7H8.4A2 2 0 0 1 6.4 19L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
const CHECK   = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

let rootEl = null;

/* ----------------------------------------------------------------- */
function activeRouteId() {
  return store.get('route')?.id || 'dashboard';
}

function alertCount() {
  return (store.get('alerts') || []).filter((a) => !a.resolved && !a.dismissed && (a.severity === 'critical' || a.severity === 'warning')).length;
}

function activeAccount() {
  const a = store.get('accounts');
  if (!a) return null;
  return a.list.find((x) => x.id === a.active_id) || a.list[0];
}

function roleLabel(acc) {
  if (!acc) return '';
  if (acc.role_key) return t(acc.role_key);
  if (acc.role_text) return acc.role_text;
  return t('account.empty.role');
}

/* ----------------------------------------------------------------- */
function render() {
  const active = activeRouteId();
  const recent = alertCount();
  const acc = activeAccount();

  rootEl.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-mark" aria-hidden="true">İZP</div>
      <div class="sidebar-brand-meta">
        <span class="sidebar-brand-name">İZ<span>PORT</span></span>
        <span class="sidebar-brand-tag">${t('brand.subtitle')}</span>
      </div>
    </div>

    <nav class="sidebar-nav scroll-styled" aria-label="Primary">
      <div class="sidebar-section">${t('sidebar.section.live')}</div>
      ${ROUTES.map((r) => navItem(r, active, r.id === 'alerts' ? recent : 0)).join('')}
    </nav>

    <div class="sidebar-attribution">
      <strong>${t('brand.attribution')}</strong>
    </div>

    <button class="sidebar-footer sidebar-footer-btn" id="sidebar-account-btn" type="button" title="${escapeAttr(t('account.switcher.title'))}">
      <div class="sidebar-footer-avatar" data-tone="${acc?.tone || 'brand'}" aria-hidden="true">${escapeHTML(acc?.initials || '?')}</div>
      <div class="sidebar-footer-meta">
        <span class="sidebar-footer-name">${escapeHTML(acc?.name || t('sidebar.user.name'))}</span>
        <span class="sidebar-footer-role">${escapeHTML(roleLabel(acc))}</span>
      </div>
      <span class="sidebar-footer-chevron" aria-hidden="true">${CHEVRON}</span>
    </button>
  `;

  rootEl.querySelectorAll('.nav-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const id = el.dataset.routeId;
      if (id) navigate(id);
    });
  });

  rootEl.querySelector('#sidebar-account-btn').addEventListener('click', openAccountSwitcher);
}

function navItem(route, activeId, badge) {
  const isActive = route.id === activeId;
  return `
    <a class="nav-item ${isActive ? 'is-active' : ''}" href="#/${route.id}" data-route-id="${route.id}">
      <span class="nav-item-icon" aria-hidden="true">${ICONS[route.icon] ?? ''}</span>
      <span class="nav-label">${t(route.tkey)}</span>
      ${badge > 0 ? `<span class="nav-item-badge">${badge}</span>` : ''}
    </a>
  `;
}

/* =================================================================
 * Account switcher modal
 * ================================================================= */
let switcherHandle = null;

function openAccountSwitcher() {
  /* close any existing instance to avoid stacking duplicates */
  if (switcherHandle) { try { switcherHandle.close(); } catch (_) {} }

  const body = document.createElement('div');
  body.className = 'account-switcher';

  const refresh = () => {
    const a = store.get('accounts');
    const active = a.list.find((x) => x.id === a.active_id) || a.list[0];
    const others = a.list.filter((x) => x.id !== active.id);

    body.innerHTML = `
      <div class="account-switcher-active">
        <div class="account-avatar account-avatar--lg" data-tone="${active.tone || 'brand'}">${escapeHTML(active.initials)}</div>
        <div class="account-active-meta">
          <span class="account-active-label">${escapeHTML(t('account.signed_in_as'))}</span>
          <span class="account-active-name">${escapeHTML(active.name)}</span>
          <span class="account-active-role">${escapeHTML(roleLabel(active))}</span>
          ${active.email ? `<span class="account-active-email mono">${escapeHTML(active.email)}</span>` : ''}
          <span class="badge" data-tone="success" style="align-self:flex-start;margin-top:6px">
            <span class="account-active-pulse" aria-hidden="true"></span>${escapeHTML(t('account.active'))}
          </span>
        </div>
      </div>

      ${others.length > 0 ? `
        <div class="account-switcher-section-label">${escapeHTML(t('account.section.switch'))}</div>
        <ul class="account-list">
          ${others.map((acc) => `
            <li class="account-row" data-account-id="${escapeAttr(acc.id)}">
              <button type="button" class="account-row-main" data-act="switch" data-id="${escapeAttr(acc.id)}" title="${escapeAttr(t('account.switch_to'))}">
                <span class="account-avatar" data-tone="${acc.tone || 'brand'}">${escapeHTML(acc.initials)}</span>
                <span class="account-row-meta">
                  <span class="account-row-name">${escapeHTML(acc.name)}</span>
                  <span class="account-row-role">${escapeHTML(roleLabel(acc))}</span>
                </span>
                <span class="account-row-arrow" aria-hidden="true">${CHEVRON}</span>
              </button>
              <button type="button" class="account-row-delete" data-act="delete" data-id="${escapeAttr(acc.id)}" aria-label="${escapeAttr(t('account.delete'))}" title="${escapeAttr(t('account.delete'))}">
                ${TRASH}
              </button>
            </li>
          `).join('')}
        </ul>
      ` : ''}

      <button type="button" class="account-add-btn" data-act="add">
        <span class="account-add-btn-icon">${PLUS}</span>
        <span>${escapeHTML(t('account.add'))}</span>
      </button>
    `;

    bindSwitcherEvents(body);
  };

  refresh();

  /* Re-render the modal body when accounts slice changes (e.g. after add). */
  const unsub = store.subscribe('accounts', refresh);

  switcherHandle = openModal({
    title:    t('account.switcher.title'),
    subtitle: t('account.switcher.subtitle'),
    body,
    size: 'md',
    actions: [
      { label: t('common.close'), tone: 'ghost' },
    ],
    onClose: () => { unsub(); switcherHandle = null; },
  });
}

function bindSwitcherEvents(body) {
  body.querySelectorAll('[data-act="switch"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      store.dispatch('setActiveAccount', id);
      /* Close modal after switching, so user gets confirmation in the sidebar. */
      try { switcherHandle?.close(); } catch (_) {}
    });
  });

  body.querySelectorAll('[data-act="delete"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const acc = store.get('accounts').list.find((x) => x.id === id);
      if (!acc) return;
      const ok = await confirm({
        title: t('account.delete'),
        body: t('account.delete.confirm', { name: acc.name }),
        danger: true,
        confirmLabel: t('common.delete'),
      });
      if (ok) store.dispatch('removeAccount', id);
    });
  });

  body.querySelector('[data-act="add"]').addEventListener('click', () => {
    openForm({
      title: t('account.add.title'),
      subtitle: t('account.add.subtitle'),
      submitLabel: t('common.save'),
      fields: [
        { id: 'name',  label: t('account.field.name'),  type: 'text',  required: true,  validate: required, placeholder: 'Ad Soyad' },
        { id: 'role',  label: t('account.field.role'),  type: 'text',  placeholder: t('account.role.custom') },
        { id: 'email', label: t('account.field.email'), type: 'email', placeholder: 'isim.soyisim@izport.tr' },
      ],
      onSubmit: (values) => {
        store.dispatch('addAccount', values);
      },
    });
  });
}

/* ----------------------------------------------------------------- */
function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s) { return escapeHTML(s); }

export function init(root) {
  rootEl = root;
  render();
  store.subscribe('alerts',   render);
  store.subscribe('ui',       render);
  store.subscribe('route',    render);
  store.subscribe('accounts', render);
}
