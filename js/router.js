/**
 * router.js — Hash-based SPA router.
 *
 * Routes are registered in pages/registry.js with a `loader` that returns the
 * page module on demand (dynamic import). The router keeps a single page
 * mounted at #page-root and handles unmount on navigation.
 */

import store from './store/state.js';
import { ROUTES, DEFAULT_ROUTE } from './pages/registry.js';

let mountEl = null;
let current = null;       /* { id, instance } where instance has optional unmount() */

function parseHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { id: DEFAULT_ROUTE, params: {} };
  const [id, query] = raw.split('?');
  const params = {};
  if (query) {
    new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
  }
  const route = ROUTES.find((r) => r.id === id);
  return route ? { id, params } : { id: DEFAULT_ROUTE, params: {} };
}

export function navigate(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  location.hash = '#/' + id + (qs ? '?' + qs : '');
}

export function getCurrentRoute() {
  return parseHash();
}

async function mount(id, params) {
  if (!mountEl) return;
  const route = ROUTES.find((r) => r.id === id);
  if (!route) return;

  /* unmount previous */
  if (current && current.instance && typeof current.instance.unmount === 'function') {
    try { current.instance.unmount(); } catch (e) { console.error('[router] unmount error', e); }
  }
  mountEl.innerHTML = '';
  mountEl.dataset.route = id;

  /* load page module — modules cache themselves via the dynamic import */
  let mod;
  try { mod = await route.loader(); }
  catch (err) {
    console.error(`[router] failed to load page '${id}'`, err);
    mountEl.innerHTML = `<div class="page-error">Page failed to load — ${err.message}</div>`;
    return;
  }

  if (typeof mod.mount !== 'function') {
    console.error(`[router] page '${id}' has no mount()`);
    return;
  }

  let instance;
  try { instance = mod.mount(mountEl, params) || {}; }
  catch (err) {
    console.error(`[router] page '${id}' mount threw`, err);
    mountEl.innerHTML = `<div class="page-error">Page mount error — ${err.message}</div>`;
    return;
  }

  current = { id, instance };
  store.dispatch('setRoute', { id, params });

  /* scroll the main content area to top on route change */
  const main = document.getElementById('main');
  if (main) main.scrollTo({ top: 0, behavior: 'instant' });
}

export function startRouter(rootEl) {
  mountEl = rootEl;
  const fire = () => {
    const { id, params } = parseHash();
    mount(id, params);
  };
  window.addEventListener('hashchange', fire);
  fire();
}
