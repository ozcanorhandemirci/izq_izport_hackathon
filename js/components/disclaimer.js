/**
 * disclaimer.js — Persistent demo / legal indicators.
 *
 * - Opening popup: shown every session, force-acknowledge via button.
 *   The overlay backdrop is non-dismissive; only the explicit
 *   "Anladım / I Understand" click closes the dialog.
 * - Bottom footer band: always-visible single-line demo notice rendered
 *   into a pre-existing #app-footer mount inside the app shell.
 * - Both surfaces re-render on language change via the 'ui' subscription.
 */

import store from '../store/state.js';
import { t } from '../i18n.js';

let popupEl  = null;
let footerEl = null;

/* ------------------------------------------------------------------ */
function buildPopup() {
  if (popupEl) popupEl.remove();
  popupEl = document.createElement('div');
  popupEl.className = 'disclaimer-popup-overlay';
  popupEl.setAttribute('role', 'dialog');
  popupEl.setAttribute('aria-modal', 'true');
  popupEl.setAttribute('aria-labelledby', 'disclaimer-popup-title');
  popupEl.innerHTML = `
    <div class="disclaimer-popup">
      <header class="disclaimer-popup-head">
        <h2 id="disclaimer-popup-title">${escapeHTML(t('disclaimer.popup.title'))}</h2>
      </header>
      <div class="disclaimer-popup-body scroll-styled">
        <p>${escapeHTML(t('disclaimer.popup.intro'))}</p>
        <p class="disclaimer-popup-warning">${escapeHTML(t('disclaimer.popup.warning'))}</p>
        <ul>
          <li>${escapeHTML(t('disclaimer.popup.bullet1'))}</li>
          <li>${escapeHTML(t('disclaimer.popup.bullet2'))}</li>
          <li>${escapeHTML(t('disclaimer.popup.bullet3'))}</li>
        </ul>
        <p class="disclaimer-popup-team">${escapeHTML(t('disclaimer.popup.team'))}</p>
      </div>
      <footer class="disclaimer-popup-foot">
        <button class="disclaimer-popup-ack" type="button">${escapeHTML(t('disclaimer.popup.acknowledge'))}</button>
      </footer>
    </div>
  `;
  popupEl.querySelector('.disclaimer-popup-ack').addEventListener('click', closePopup);
  document.body.appendChild(popupEl);
}

function closePopup() {
  if (popupEl) {
    popupEl.remove();
    popupEl = null;
  }
}

/* ------------------------------------------------------------------ */
function buildFooter() {
  if (!footerEl) return;
  footerEl.innerHTML = `<div class="app-footer-content">${escapeHTML(t('disclaimer.footer.text'))}</div>`;
}

/* ------------------------------------------------------------------ */
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------------ */
export function init() {
  /* Footer band — always visible */
  footerEl = document.getElementById('app-footer');
  buildFooter();

  /* Popup — every session */
  buildPopup();

  /* Re-render on language change */
  store.subscribe('ui', () => {
    buildFooter();
    if (popupEl) buildPopup();
  });
}
