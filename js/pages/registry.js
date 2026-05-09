/**
 * pages/registry.js — Single source of truth for which pages exist.
 *
 * Each route declares an id, an i18n label key, an icon name (used by the
 * sidebar nav), and a `loader` returning the page module on demand.
 * Page modules export a `mount(rootEl, params)` returning `{ unmount? }`.
 */

export const ROUTES = [
  {
    id: 'dashboard',
    tkey: 'nav.dashboard',
    icon: 'grid',
    loader: () => import('./dashboard.js'),
  },
  {
    id: 'vessels',
    tkey: 'nav.vessels',
    icon: 'ship',
    loader: () => import('./vessels.js'),
  },
  {
    id: 'emissions',
    tkey: 'nav.emissions',
    icon: 'cloud',
    loader: () => import('./emissions.js'),
  },
  {
    id: 'shore',
    tkey: 'nav.shore',
    icon: 'plug',
    loader: () => import('./shore.js'),
  },
  {
    id: 'alerts',
    tkey: 'nav.alerts',
    icon: 'bell',
    loader: () => import('./alerts.js'),
  },
  {
    id: 'reports',
    tkey: 'nav.reports',
    icon: 'doc',
    loader: () => import('./reports.js'),
  },
];

export const DEFAULT_ROUTE = 'dashboard';
