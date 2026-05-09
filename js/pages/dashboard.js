/**
 * pages/dashboard.js — Live overview page (the original bento layout).
 *
 * Composes the existing components (KPI cards, operations matrix, shore
 * power grid) into the dashboard route. Re-creates the bento DOM scaffold
 * on each mount and tears down chart instances on unmount.
 */

import { init as initKpi }        from '../components/kpiWidget.js';
import { init as initOps }        from '../components/operationsMatrix.js';
import { init as initShorePower } from '../components/shorePowerGrid.js';

const TEMPLATE = `
  <div class="page page-dashboard">
    <section class="bento bento--kpis">
      <div id="kpi-co2"   class="bento-cell" data-kpi="co2"></div>
      <div id="kpi-nox"   class="bento-cell" data-kpi="nox"></div>
      <div id="kpi-sox"   class="bento-cell" data-kpi="sox"></div>
      <div id="kpi-shore" class="bento-cell" data-kpi="shore"></div>
    </section>

    <section id="ops-matrix" class="bento bento--ops" aria-label="Operations matrix"></section>
    <section id="shore-power" class="bento bento--shore" aria-label="Shore power grid"></section>
  </div>
`;

export function mount(root) {
  root.innerHTML = TEMPLATE;

  initOps(root.querySelector('#ops-matrix'));
  initShorePower(root.querySelector('#shore-power'));

  /* KPI cards depend on Chart.js — main.js ensures it's loaded before
     navigating to the dashboard. Initialize synchronously here. */
  initKpi({
    co2:   root.querySelector('#kpi-co2'),
    nox:   root.querySelector('#kpi-nox'),
    sox:   root.querySelector('#kpi-sox'),
    shore: root.querySelector('#kpi-shore'),
  });

  return { unmount() { /* components self-detach when DOM is replaced */ } };
}
