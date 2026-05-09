/**
 * validate.js — Field-level validators returning either an i18n-ready message
 * or null/undefined when valid. Used by the modal form builder.
 */

import { t } from '../i18n.js';

export const required = (v) => (v == null || v === '' ? t('common.required') : null);

export const minNumber = (n) => (v) => (v != null && +v < n) ? `≥ ${n}` : null;
export const maxNumber = (n) => (v) => (v != null && +v > n) ? `≤ ${n}` : null;
export const positive  = (v) => (v != null && +v < 0) ? '> 0' : null;

export const imo = (v) => {
  if (!v) return null;
  if (!/^IMO[- ]?\d{4,8}$/i.test(String(v).trim())) {
    return 'IMO-#######';
  }
  return null;
};

export const dateInPast = (v) => {
  if (!v) return null;
  if (+new Date(v) > Date.now()) return t('common.required');
  return null;
};

export function compose(...fns) {
  return (val, all) => {
    for (const fn of fns) {
      if (!fn) continue;
      const m = fn(val, all);
      if (m) return m;
    }
    return null;
  };
}
