// Sheets (modal panels), toasts, confirm dialogs and icons.
import { h } from './util.js';
import { sfx } from './sfx.js';

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICONS = {
  play: svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" fill="currentColor"/>'),
  plus: svg('<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>'),
  gear: svg('<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
  soundOn: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  soundOff: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  home: svg('<path d="M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  options: svg('<circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/>'),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  pad: svg('<rect x="2.5" y="7" width="19" height="10.5" rx="5.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 10.3v4.2M4.9 12.4h4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15.8" cy="11.2" r="1.2" fill="currentColor"/><circle cx="18" cy="13.6" r="1.2" fill="currentColor"/>'),
  fullscreen: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  upload: svg('<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  download: svg('<path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  trash: svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'),
  wifiOff: svg('<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.3M19 13a10 10 0 0 0-2.4-1.6M2 9.5a15 15 0 0 1 4.3-2.6M22 9.5A15 15 0 0 0 11 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="19.5" r="1.3" fill="currentColor"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  info: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>')
};

export function icon(name, cls = '') {
  const span = h('span.ic' + (cls ? '.' + cls : ''));
  span.innerHTML = ICONS[name] || '';
  return span;
}

/* ---------------- sheets ---------------- */

const stack = [];
export const isSheetOpen = () => stack.length > 0;
export const topSheet = () => stack[stack.length - 1] || null;

export function openSheet({ title, subtitle, body, actions = [], className = '', onClose, dismissible = true } = {}) {
  const bodyEl = h('div.sheet-body');
  const actionsEl = h('footer.sheet-actions');
  const closeBtn = h('button.icon-btn.sheet-close', { 'aria-label': 'Close', type: 'button' }, icon('close'));
  const titleEl = h('h2', title || '');
  const subEl = h('p.sheet-sub', subtitle || '');
  const panel = h('div.sheet' + (className ? '.' + className : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
    h('header.sheet-head', h('div.sheet-titles', titleEl, subtitle ? subEl : null), dismissible ? closeBtn : null),
    bodyEl,
    actionsEl);
  const backdrop = h('div.sheet-backdrop', {}, panel);
  let closed = false;

  const api = {
    el: panel,
    body: bodyEl,
    close(result) {
      if (closed) return;
      closed = true;
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      backdrop.classList.add('closing');
      setTimeout(() => backdrop.remove(), 220);
      onClose && onClose(result);
    },
    setBody(...nodes) { bodyEl.replaceChildren(...nodes.flat()); },
    setActions(list) {
      actionsEl.replaceChildren(...list.map((a) => a instanceof Node ? a : button(a)));
      actionsEl.hidden = !list.length;
    },
    setTitle(t) { titleEl.textContent = t; },
    dismissible
  };

  if (body) api.setBody(body);
  api.setActions(actions);
  closeBtn.addEventListener('click', () => { sfx.back(); api.close(); });
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop && api.dismissible) { sfx.back(); api.close(); }
  });
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  stack.push(api);
  sfx.open();
  return api;
}

export function closeTopSheet() {
  const top = topSheet();
  if (top && top.dismissible) { sfx.back(); top.close(); return true; }
  return false;
}

export function button({ label, icon: ic, kind = 'secondary', onClick, disabled, glyph }) {
  return h('button.btn.btn-' + kind, { type: 'button', disabled, onclick: onClick },
    glyph ? h('span.glyph.glyph-' + glyph.toLowerCase(), glyph) : null,
    ic ? icon(ic) : null,
    h('span', label));
}

export function confirmDialog({ title, message, confirmLabel = 'OK', danger = false, extra = null }) {
  return new Promise((resolve) => {
    let result = false;
    const sheet = openSheet({
      title,
      className: 'sheet-small',
      body: [h('p.confirm-text', message), extra],
      onClose: () => resolve(result)
    });
    sheet.setActions([
      { label: 'Cancel', onClick: () => sheet.close() },
      { label: confirmLabel, kind: danger ? 'danger' : 'primary', onClick: () => { result = true; sheet.close(); } }
    ]);
  });
}

/* ---------------- toasts ---------------- */

let toastTimer = null;
export function toast(message, { action, duration = 3200, tone = 'info' } = {}) {
  let el = document.getElementById('toast');
  if (!el) { el = h('div', { id: 'toast', role: 'status' }); document.body.append(el); }
  el.className = 'toast toast-' + tone;
  el.replaceChildren(...[h('span', message), action ? h('button.toast-action', { type: 'button', onclick: () => { el.classList.remove('show'); action.onClick(); } }, action.label) : null].filter(Boolean));
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  if (duration) toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ---------------- form helpers ---------------- */

export function field(label, control, hint) {
  return h('label.field', h('span.field-label', label), control, hint ? h('span.field-hint', hint) : null);
}

export function select(options, value, onChange) {
  const s = h('select.input', { onchange: (e) => onChange(e.target.value) },
    options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
  return s;
}

export function toggle(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) });
  return h('label.toggle', input, h('span.toggle-track', h('span.toggle-thumb')), label ? h('span.toggle-label', label) : null);
}

export function progressBar() {
  const fill = h('div.progress-fill');
  const label = h('div.progress-label', 'Starting…');
  const el = h('div.progress', h('div.progress-track', fill), label);
  return {
    el,
    set(text, done, total) {
      label.textContent = total ? `${text} ${done}/${total}` : text;
      fill.style.width = total ? Math.round((done / total) * 100) + '%' : '100%';
    }
  };
}
