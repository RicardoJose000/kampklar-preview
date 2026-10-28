import { ensureSeed } from './store.js';
import { $, $$, reduced, hasGsap } from './ui.js';
import { initInbox, closeInbox } from './mail.js';
import { initCursor } from './fx.js';
import { renderHome } from './views/home.js';
import { renderRegister, renderVerify, renderLogin, renderForgot } from './views/auth.js';
import { renderPortal } from './views/portal.js';
import { renderAdmin } from './views/admin.js';

const routes = {
  '': renderHome,
  register: renderRegister,
  verify: renderVerify,
  login: renderLogin,
  forgot: renderForgot,
  portal: renderPortal,
  admin: renderAdmin
};
const titles = { '': 'Youth Handball Platform Preview', register: 'Sign up', verify: 'Confirm email', login: 'Log in', forgot: 'Reset password', portal: 'Parent portal', admin: 'Admin dashboard' };

const main = $('#main');
let cleanup = null, first = true, busy = false, queued = false;

if (hasGsap()) {
  gsap.registerPlugin(ScrollTrigger);
  if (!reduced()) document.documentElement.classList.add('js-anim');
}

async function wipe(dir) {
  if (!hasGsap() || reduced()) return;
  const [a, b] = $$('.wipe span');
  if (dir === 'in') {
    gsap.set([a, b], { transformOrigin: 'bottom' });
    await gsap.timeline().to(a, { scaleY: 1, duration: .45, ease: 'power3.in' }).to(b, { scaleY: 1, duration: .45, ease: 'power3.in' }, .12);
  } else {
    gsap.set([a, b], { transformOrigin: 'top' });
    await gsap.timeline().to(b, { scaleY: 0, duration: .6, ease: 'expo.out' }).to(a, { scaleY: 0, duration: .6, ease: 'expo.out' }, .08);
  }
}

async function navigate() {
  if (busy) { queued = true; return; }
  busy = true;
  const [name = '', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  const view = routes[name] ? name : '';
  document.body.classList.remove('menu-open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
  closeInbox();
  $$('.modal').forEach(m => m.remove());
  document.documentElement.style.overflow = '';

  if (!first) await wipe('in');
  try { cleanup?.(); } catch { /* ignore */ }
  cleanup = null;
  if (hasGsap()) ScrollTrigger.getAll().forEach(t => t.kill());
  main.innerHTML = '';
  window.scrollTo(0, 0);
  document.title = `Kampklar | ${titles[view]}`;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === view || (view === 'verify' && a.dataset.nav === 'register')));
  try { cleanup = await routes[view](main, rest); } catch (err) { console.error(err); main.innerHTML = '<div class="shell" style="padding:160px 0"><h1>Something went wrong.</h1><p class="muted" style="margin-top:12px">Please reload the page.</p></div>'; }
  if (hasGsap()) ScrollTrigger.refresh();
  if (!first) { main.focus({ preventScroll: true }); await wipe('out'); }
  first = false;
  busy = false;
  if (queued) { queued = false; navigate(); }
}

function topbar() {
  const bar = $('#topbar');
  let last = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    bar.classList.toggle('hide', y > 200 && y > last && !document.body.classList.contains('menu-open'));
    last = y;
  }, { passive: true });
  $('#menuBtn').addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
}

(async function start() {
  await ensureSeed();
  initInbox();
  initCursor();
  topbar();
  addEventListener('hashchange', navigate);
  await navigate();
})();
