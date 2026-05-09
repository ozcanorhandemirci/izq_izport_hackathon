/**
 * modal.js — Lightweight modal + form builder.
 *
 * Single root element gets attached to <body> on first call. Any number of
 * modals can be opened sequentially; openModal returns a handle with close().
 */

import { t } from '../i18n.js';

let rootEl = null;

function ensureRoot() {
  if (rootEl) return rootEl;
  rootEl = document.createElement('div');
  rootEl.className = 'modal-root';
  document.body.appendChild(rootEl);
  return rootEl;
}

export function openModal({ title = '', subtitle = '', body = '', actions = [], size = 'md', onClose }) {
  ensureRoot();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal--${size}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
      <header class="modal-head">
        <div class="modal-title-block">
          <h3 class="modal-title">${escapeHTML(title)}</h3>
          ${subtitle ? `<div class="modal-subtitle">${escapeHTML(subtitle)}</div>` : ''}
        </div>
        <button class="modal-close" aria-label="${t('common.close')}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </header>
      <div class="modal-body scroll-styled"></div>
      <footer class="modal-foot"></footer>
    </div>
  `;
  rootEl.appendChild(overlay);

  const bodyEl = overlay.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  const footEl = overlay.querySelector('.modal-foot');
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.className = `btn btn--${a.tone || 'ghost'}`;
    btn.textContent = a.label;
    if (a.disabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      const result = a.onClick?.({ close, body: bodyEl });
      if (result === false) return;
      close();
    });
    footEl.appendChild(btn);
  }

  function close() {
    overlay.classList.add('is-leaving');
    setTimeout(() => { overlay.remove(); onClose?.(); }, 180);
    document.removeEventListener('keydown', escHandler);
  }

  function escHandler(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', escHandler);

  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  /* enter animation */
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  return { close, root: overlay, body: bodyEl, foot: footEl };
}

/* ----------------------------------------------------------------- *
 * Form builder.
 *
 *   buildForm({
 *     fields: [
 *       { id, label, type: 'text'|'number'|'select'|'textarea'|'datetime'|'checkbox',
 *         value, required, options?: [{value,label}], min, max, step, placeholder, hint },
 *       ...
 *     ],
 *     submitLabel,
 *     onSubmit(values, helpers) -> false to keep modal open
 *   })
 *
 * Returns the modal handle.
 * ----------------------------------------------------------------- */
export function openForm({ title, subtitle, fields, submitLabel, cancelLabel, onSubmit, onClose }) {
  const formEl = document.createElement('form');
  formEl.className = 'form';
  formEl.noValidate = true;

  for (const f of fields) {
    formEl.appendChild(renderField(f));
  }

  /* live validation hooks */
  formEl.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', () => clearError(el));
  });

  const handle = openModal({
    title,
    subtitle,
    body: formEl,
    onClose,
    actions: [
      { label: cancelLabel || t('common.cancel'), tone: 'ghost' },
      {
        label: submitLabel || t('common.save'),
        tone: 'primary',
        onClick: () => {
          const values = collectValues(formEl, fields);
          const errors = validate(values, fields);
          showErrors(formEl, errors);
          if (Object.keys(errors).length > 0) return false;
          const result = onSubmit?.(values, { close: () => handle.close(), formEl });
          return result === false ? false : true;
        },
      },
    ],
  });

  /* Enter to submit */
  formEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      e.preventDefault();
      handle.foot.querySelector('.btn--primary')?.click();
    }
  });

  return handle;
}

function renderField(f) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  wrap.dataset.fieldId = f.id;

  const lbl = document.createElement('label');
  lbl.className = 'form-label';
  lbl.htmlFor = `f-${f.id}`;
  lbl.innerHTML = `${escapeHTML(f.label)} ${f.required ? '<span class="req">*</span>' : ''}`;
  wrap.appendChild(lbl);

  let input;
  if (f.type === 'select') {
    input = document.createElement('select');
    input.className = 'form-input';
    for (const opt of f.options || []) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (String(f.value) === String(opt.value)) o.selected = true;
      input.appendChild(o);
    }
  } else if (f.type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 'form-input form-textarea';
    input.rows = f.rows || 3;
    input.value = f.value ?? '';
  } else if (f.type === 'checkbox') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-checkbox';
    input.checked = !!f.value;
  } else {
    input = document.createElement('input');
    input.className = 'form-input';
    input.type = f.type === 'datetime' ? 'datetime-local' : (f.type || 'text');
    if (f.value != null) input.value = f.value;
    if (f.min  != null) input.min  = f.min;
    if (f.max  != null) input.max  = f.max;
    if (f.step != null) input.step = f.step;
    if (f.placeholder) input.placeholder = f.placeholder;
  }

  input.id = `f-${f.id}`;
  input.name = f.id;
  if (f.required) input.dataset.required = 'true';
  wrap.appendChild(input);

  if (f.hint) {
    const hint = document.createElement('div');
    hint.className = 'form-hint';
    hint.textContent = f.hint;
    wrap.appendChild(hint);
  }

  const err = document.createElement('div');
  err.className = 'form-error';
  wrap.appendChild(err);

  return wrap;
}

function collectValues(formEl, fields) {
  const v = {};
  for (const f of fields) {
    const el = formEl.querySelector(`[name="${f.id}"]`);
    if (!el) continue;
    if (f.type === 'checkbox') v[f.id] = el.checked;
    else if (f.type === 'number') v[f.id] = el.value === '' ? null : Number(el.value);
    else v[f.id] = el.value;
  }
  return v;
}

function validate(values, fields) {
  const errors = {};
  for (const f of fields) {
    const v = values[f.id];
    if (f.required && (v == null || v === '' || (Array.isArray(v) && v.length === 0))) {
      errors[f.id] = t('common.required');
      continue;
    }
    if (typeof f.validate === 'function') {
      const msg = f.validate(v, values);
      if (msg) errors[f.id] = msg;
    }
  }
  return errors;
}

function showErrors(formEl, errors) {
  formEl.querySelectorAll('.form-error').forEach((el) => { el.textContent = ''; });
  formEl.querySelectorAll('.form-field').forEach((el) => el.classList.remove('has-error'));
  for (const [id, msg] of Object.entries(errors)) {
    const field = formEl.querySelector(`.form-field[data-field-id="${id}"]`);
    if (!field) continue;
    field.classList.add('has-error');
    field.querySelector('.form-error').textContent = msg;
  }
}

function clearError(el) {
  const field = el.closest('.form-field');
  if (field) {
    field.classList.remove('has-error');
    const e = field.querySelector('.form-error');
    if (e) e.textContent = '';
  }
}

function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s) { return escapeHTML(s); }

/* Confirm helper */
export function confirm({ title, body, danger, confirmLabel, cancelLabel }) {
  return new Promise((resolve) => {
    const handle = openModal({
      title: title || t('common.confirm'),
      body: `<div class="modal-prose">${escapeHTML(body || '')}</div>`,
      size: 'sm',
      actions: [
        { label: cancelLabel || t('common.cancel'), tone: 'ghost', onClick: () => { resolve(false); } },
        { label: confirmLabel || t('common.confirm'), tone: danger ? 'danger' : 'primary', onClick: () => { resolve(true); } },
      ],
      onClose: () => resolve(false),
    });
  });
}
