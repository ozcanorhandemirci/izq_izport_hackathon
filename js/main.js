/**
 * main.js — Application entry point.
 *
 * Order:
 *   1. Sync persisted theme/language from <html data-theme/lang> into the store.
 *   2. Hydrate persisted state slices (manual entries, settings, report config).
 *   3. Mount static shell (sidebar, topbar, copilot drawer).
 *   4. Wait for Chart.js, then start the simulation + alert engine.
 *   5. Boot the router so the active hash route mounts.
 */

import store               from './store/state.js';
import { syncFromDocument } from './i18n.js';
import { hydrate, attach }  from './store/persistence.js';
import { startSimulation }  from './engine/simulation.js';
import { startAlertEngine } from './engine/alertEngine.js';
import { startLogger }      from './engine/logger.js';
import { startRouter }      from './router.js';

import { init as initSidebar }      from './components/sidebar.js';
import { init as initTopbar }       from './components/topbar.js';
import { init as initCopilot }      from './components/aiCopilot.js';
import { init as initAuditDrawer }  from './components/auditDrawer.js';
import { init as initDisclaimer }   from './components/disclaimer.js';

function whenChartReady() {
  return new Promise((resolve) => {
    if (window.Chart) return resolve();
    const t0 = performance.now();
    const tick = () => {
      if (window.Chart) return resolve();
      if (performance.now() - t0 > 6000) {
        console.warn('[main] Chart.js failed to load within 6s — sparklines will be skipped.');
        return resolve();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function $(id) { return document.getElementById(id); }

async function bootstrap() {
  /* 1. UI prefs first so anything reading from i18n sees correct lang/theme. */
  syncFromDocument();

  /* 2. Hydrate persisted slices and start auto-save. */
  hydrate();
  attach();

  /* 3. Mount the always-visible shell. */
  initSidebar($('sidebar'));
  initTopbar($('topbar'));
  initCopilot($('copilot-mount'));
  initAuditDrawer($('audit-mount'));
  initDisclaimer();

  /* 4. Boot simulation + alert engine + logger. */
  startSimulation();
  startAlertEngine();
  startLogger();

  /* 5. Wait for Chart.js then start the router (some pages need charts on first paint). */
  await whenChartReady();
  startRouter($('page-root'));

  if (typeof window !== 'undefined') {
    window.__PORT_IQ__ = { store };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
