// Outgoing mail. In production this goes through the club's domain mailbox (SMTP).
// In the preview every message lands in the Demo inbox instead.
import { db, save, uid } from './store.js';
import { $, esc, ago, fmtDateTime, toast } from './ui.js';

const FROM = 'Kampklar <no-reply@kampklar-club.test>';

export function wrapMail(title, body) {
  return `<div class="mail-doc"><div class="mh"><i></i>Kampklar</div>
    <div class="mb"><h2>${esc(title)}</h2>${body}</div>
    <div class="mf">Kampklar youth handball. You get this email because an account was created with this address. Questions? Just reply to this email.</div></div>`;
}

export function sendMail(to, subject, html, attachments = []) {
  const m = { id: uid('m'), to, from: FROM, subject, html, at: Date.now(), read: false, attachments };
  db.mail.unshift(m);
  db.mail = db.mail.slice(0, 60);
  save();
  renderList();
  const btn = $('#inboxBtn');
  btn.classList.remove('ping'); void btn.offsetWidth; btn.classList.add('ping');
  toast(`Email sent: ${subject}`, 'mail', { label: 'Open', onClick: () => openInbox(m.id) });
  return m;
}

/* ---------- drawer ---------- */
let drawer, list, view;
export function initInbox() {
  drawer = $('#inbox'); list = $('#mailList'); view = $('#mailView');
  $('#inboxBtn').addEventListener('click', () => (drawer.classList.contains('open') ? closeInbox() : openInbox()));
  document.querySelectorAll('[data-inbox-close]').forEach(b => b.addEventListener('click', closeInbox));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open') && !document.querySelector('.modal')) closeInbox(); });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-mail]');
    if (b) showMail(b.dataset.mail);
  });
  renderList();
}

export function openInbox(id) {
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  window.__lenis?.stop();
  if (id) showMail(id); else { view.hidden = true; list.hidden = false; }
  setTimeout(() => drawer.querySelector('button')?.focus(), 80);
}
export function closeInbox() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal')) window.__lenis?.start();
}

export function renderList() {
  if (!list) return;
  const unread = db.mail.filter(m => !m.read).length;
  const badge = $('#inboxBadge');
  badge.hidden = !unread; badge.textContent = unread;
  if (!db.mail.length) {
    list.innerHTML = '<li class="empty">No emails yet.<br>Sign up as a parent and the verification code arrives here.</li>';
    return;
  }
  list.innerHTML = db.mail.map(m => `<li class="${m.read ? '' : 'unread'}"><button data-mail="${m.id}">
    <span class="av" aria-hidden="true">K</span>
    <span style="min-width:0"><b>${esc(m.subject)}</b><small>To ${esc(m.to)}${m.attachments.length ? ' &middot; 1 attachment' : ''}</small></span>
    <time>${ago(m.at)}</time></button></li>`).join('');
}

function showMail(id) {
  const m = db.mail.find(x => x.id === id);
  if (!m) return;
  m.read = true; save(); renderList();
  list.hidden = true; view.hidden = false;
  view.innerHTML = `<button class="btn btn-ghost btn-sm back" id="mailBack">&larr; All emails</button>
    <div class="mail-meta"><span><b>${esc(m.subject)}</b></span><span>From ${esc(m.from)}</span><span>To ${esc(m.to)}</span><span>${fmtDateTime(m.at)}</span></div>
    ${m.html}
    ${m.attachments.map(a => `<a class="attach" href="${a.url}" download="${esc(a.name)}"><span class="pdf">PDF</span><span><b>${esc(a.name)}</b><small>Click to download</small></span></a>`).join('')}`;
  $('#mailBack').addEventListener('click', () => { view.hidden = true; list.hidden = false; });
  drawer.querySelector('.inbox-body').scrollTop = 0;
}
