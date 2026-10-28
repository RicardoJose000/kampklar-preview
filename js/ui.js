export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const go = path => { location.hash = '#/' + path; };
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasGsap = () => typeof window.gsap !== 'undefined';

export const fmtDate = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = ts => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const fmtDateTime = ts => `${fmtDate(ts)}, ${fmtTime(ts)}`;
export function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return fmtDate(ts);
}
export const initials = (a, b) => ((a || '?')[0] + ((b || '')[0] || '')).toUpperCase();
const GRADS = [['#FF5A1F', '#FF8A3D'], ['#5B8CFF', '#8AB0FF'], ['#3DD68C', '#7BE8B2'], ['#B26BFF', '#D3A6FF'], ['#FFB547', '#FFD28A'], ['#FF5470', '#FF8FA2']];
export function avatarStyle(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = GRADS[h % GRADS.length];
  return `background:linear-gradient(135deg,${a},${b})`;
}
export const maskEmail = e => {
  const [n, d] = String(e).split('@');
  return (n.length <= 2 ? n[0] + '*' : n.slice(0, 2) + '*'.repeat(Math.min(6, n.length - 2))) + '@' + d;
};

export const icon = {
  arrow: '<svg class="arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M16 14.6c3 .1 5.5 1.7 5.5 5.4"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7.5 12 13l8.5-5.5"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.5 10c5 2 12 2 17 0M4 15.5c5-2 11-2 16 0"/></svg>'
};

/* ---------- toasts ---------- */
export function toast(msg, kind = 'ok', action) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  const sym = kind === 'bad' ? '!' : kind === 'mail' ? '@' : '&#10003;';
  el.innerHTML = `<i aria-hidden="true">${sym}</i><span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.className = 'btn btn-ghost btn-sm';
    b.textContent = action.label;
    b.onclick = () => { action.onClick(); dismiss(); };
    el.append(b);
  }
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  setTimeout(dismiss, action ? 6000 : 3800);
}

/* ---------- modal ---------- */
export function openModal({ title, sub = '', html, wide = false, onMount }) {
  const prev = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal-back" data-close></div>
    <div class="modal-card${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mTitle">
      <button class="icon-btn modal-x" data-close aria-label="Close">${icon.close}</button>
      <h3 id="mTitle">${esc(title)}</h3>
      ${sub ? `<p class="modal-sub">${sub}</p>` : ''}
      <div class="modal-body">${html}</div>
    </div>`;
  document.body.append(wrap);
  document.documentElement.style.overflow = 'hidden';
  window.__lenis?.stop();
  const card = $('.modal-card', wrap);
  if (hasGsap() && !reduced()) {
    gsap.fromTo($('.modal-back', wrap), { opacity: 0 }, { opacity: 1, duration: .35 });
    gsap.fromTo(card, { opacity: 0, y: 30, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'expo.out' });
  }
  const focusables = () => $$('button, [href], input, select, textarea', card).filter(x => !x.disabled && x.offsetParent !== null);
  const onKey = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = focusables(); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', onKey);
    const done = () => {
      wrap.remove();
      if (!$('.modal')) { document.documentElement.style.overflow = ''; window.__lenis?.start(); }
      prev?.focus?.();
    };
    if (hasGsap() && !reduced()) {
      gsap.to(card, { opacity: 0, y: 20, scale: .98, duration: .25, ease: 'power2.in' });
      gsap.to($('.modal-back', wrap), { opacity: 0, duration: .3, onComplete: done });
    } else done();
  }
  document.addEventListener('keydown', onKey);
  $$('[data-close]', wrap).forEach(b => b.addEventListener('click', close));
  onMount?.(wrap, close);
  setTimeout(() => (focusables().find(x => x.matches('input, select, textarea')) || focusables()[1] || card).focus(), 60);
  return close;
}

export function confirmBox({ title, text, confirmLabel = 'Confirm', danger = false, requireWord }) {
  return new Promise(resolve => {
    let result = false;
    const close = openModal({
      title,
      html: `<p class="muted" style="margin-bottom:${requireWord ? 16 : 0}px">${text}</p>
        ${requireWord ? `<div class="field"><label for="cw">Type <b>${esc(requireWord)}</b> to confirm</label><input class="input" id="cw" autocomplete="off"></div>` : ''}
        <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cOk" ${requireWord ? 'disabled' : ''}>${esc(confirmLabel)}</button></div>`,
      onMount(w, c) {
        const ok = $('#cOk', w);
        if (requireWord) $('#cw', w).addEventListener('input', e => { ok.disabled = e.target.value.trim().toUpperCase() !== requireWord; });
        ok.addEventListener('click', () => { result = true; c(); });
        const obs = new MutationObserver(() => { if (!w.isConnected) { obs.disconnect(); resolve(result); } });
        obs.observe(document.body, { childList: true });
      }
    });
    return close;
  });
}

/* ---------- forms ---------- */
export function fieldError(form, name, msg) {
  const input = form.elements[name];
  const field = input?.closest('.field') || input?.closest('.check');
  if (!field) return;
  field.classList.toggle('err', !!msg);
  let m = field.querySelector('.msg');
  if (!m && field.classList.contains('field')) { m = document.createElement('div'); m.className = 'msg'; field.append(m); }
  if (m) m.textContent = msg || '';
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
export function clearErrors(form) {
  $$('.err', form).forEach(f => f.classList.remove('err'));
  $$('.msg', form).forEach(m => { m.textContent = ''; });
  $('.form-error', form)?.remove();
}
export function formError(form, msg) {
  $('.form-error', form)?.remove();
  const d = document.createElement('div');
  d.className = 'form-error'; d.setAttribute('role', 'alert'); d.textContent = msg;
  form.prepend(d);
}
export const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());
export function pwScore(pw) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return pw.length < 8 ? Math.min(s, 1) : s;
}
export function bindPasswordUI(root) {
  $$('.pw', root).forEach(w => {
    const input = $('input', w), b = $('button', w);
    b.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.innerHTML = show ? icon.eyeOff : icon.eye;
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
  const meter = $('.meter', root);
  if (meter) {
    const input = $('input[data-meter]', root), label = $('.meter-label', root);
    const cols = ['#FF5470', '#FFB547', '#FFD166', '#3DD68C'];
    const names = ['Too weak', 'Weak', 'Good', 'Strong'];
    input.addEventListener('input', () => {
      const s = input.value ? Math.max(1, pwScore(input.value)) : 0;
      $$('i', meter).forEach((i, n) => { i.style.background = n < s ? cols[s - 1] : ''; });
      label.textContent = input.value ? names[s - 1] : 'At least 10 characters, mixed case and a number';
    });
  }
}
export const pwField = (name, label, auto, meter = false) => `
  <div class="field"><label for="${name}">${label}</label>
    <div class="pw"><input class="input" type="password" id="${name}" name="${name}" autocomplete="${auto}" ${meter ? 'data-meter' : ''} required>
    <button type="button" aria-label="Show password">${icon.eye}</button></div>
    ${meter ? '<div class="meter"><i></i><i></i><i></i><i></i></div><div class="meter-label">At least 10 characters, mixed case and a number</div>' : ''}
  </div>`;

export function bindCodeInputs(wrap, onComplete) {
  const inputs = $$('input', wrap);
  const value = () => inputs.map(i => i.value).join('');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
      if (value().length === inputs.length) onComplete(value());
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
      if (e.key === 'ArrowLeft' && i > 0) inputs[i - 1].focus();
      if (e.key === 'ArrowRight' && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('paste', e => {
      const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, inputs.length);
      if (!t) return;
      e.preventDefault();
      inputs.forEach((x, n) => { x.value = t[n] || ''; });
      inputs[Math.min(t.length, inputs.length - 1)].focus();
      if (t.length === inputs.length) onComplete(t);
    });
  });
  return {
    value,
    clear() { inputs.forEach(x => { x.value = ''; }); inputs[0].focus(); },
    shake() { wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); }
  };
}
export const codeInputsHTML = (label = 'Verification code') =>
  `<div class="code-inputs" role="group" aria-label="${label}">${Array.from({ length: 6 }, (_, i) =>
    `<input inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" maxlength="1" aria-label="Digit ${i + 1}">`).join('')}</div>`;

export function download(name, data, type) {
  const url = typeof data === 'string' && data.startsWith('data:') ? data : URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  if (!url.startsWith('data:')) setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function setBusy(btn, busy) {
  btn.classList.toggle('loading', busy);
  btn.disabled = busy;
}

export const demoNote = text => `<div class="demo-note">${icon.info}<span>${text}</span></div>`;
