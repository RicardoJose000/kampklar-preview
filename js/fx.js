// Motion helpers: smooth scroll, reveals, magnetic buttons, spotlight, cursor, line drawing.
import { $, $$, reduced, hasGsap } from './ui.js';

const fine = () => matchMedia('(pointer: fine)').matches;

export function initCursor() {
  if (!fine() || reduced()) return;
  document.body.classList.add('has-cursor');
  const c = $('.cursor');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
  const tick = () => {
    cx += (x - cx) * .2; cy += (y - cy) * .2;
    c.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(tick);
  };
  tick();
  document.addEventListener('mouseover', e => {
    const drag = !!e.target.closest('[data-drag]');
    c.classList.toggle('play', drag);
    c.classList.toggle('hover', !drag && !!e.target.closest('a, button, [data-hover], label, select, .tile, tr.click'));
  });
}

// muted background clips: play only while on screen, never with reduced motion
export function autoVideos(root) {
  const vids = $$('video[data-auto]', root);
  if (reduced() || !('IntersectionObserver' in window)) { vids.forEach(v => v.pause()); return () => {}; }
  const io = new IntersectionObserver(entries => entries.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting) v.play()?.catch(() => {});
    else v.pause();
  }), { rootMargin: '120px' });
  vids.forEach(v => { v.muted = true; io.observe(v); });
  return () => { io.disconnect(); vids.forEach(v => v.pause()); };
}

export function startLenis() {
  if (reduced() || !window.Lenis || !hasGsap()) return () => {};
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  const raf = t => lenis.raf(t * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(raf);
    lenis.destroy();
    window.__lenis = null;
  };
}

export function magnetic(root) {
  if (!fine() || reduced() || !hasGsap()) return;
  $$('[data-magnetic]', root).forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .28, y: (e.clientY - r.top - r.height / 2) * .38, duration: .6, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
  });
}

export function spotlight(root, sel = '.tile') {
  $$(sel, root).forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', e.clientX - r.left + 'px');
    t.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
}

export function tilt(root, sel) {
  if (!fine() || reduced() || !hasGsap()) return;
  $$(sel, root).forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      gsap.to(el, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 900, duration: .5, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' }));
  });
}

export function reveals(root) {
  const els = $$('[data-reveal]', root);
  if (!hasGsap() || reduced()) { els.forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); return; }
  els.forEach(el => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', delay: +(el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });
}

// quick entrance for app screens
export function enter(root, sel, opts = {}) {
  const els = $$(sel, root);
  if (!hasGsap() || reduced() || !els.length) return;
  gsap.from(els, { opacity: 0, y: 26, duration: .9, ease: 'expo.out', stagger: .06, clearProps: 'transform,opacity', ...opts });
}

export function countUp(el, to, { dur = 1.4, suffix = '' } = {}) {
  if (!hasGsap() || reduced()) { el.textContent = to + suffix; return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: dur, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } });
}

export function drawSvg(svg, { duration = 2.2, stagger = .08, delay = 0, scroll = false } = {}) {
  const parts = $$('path, line, rect, circle', svg);
  parts.forEach(p => {
    const len = p.getTotalLength ? p.getTotalLength() : 1000;
    p.style.strokeDasharray = p.dataset.dash || len;
    if (!p.dataset.dash) p.style.strokeDashoffset = len;
  });
  if (!hasGsap() || reduced()) { parts.forEach(p => { p.style.strokeDashoffset = 0; }); return; }
  const targets = parts.filter(p => !p.dataset.dash);
  gsap.to(targets, {
    strokeDashoffset: 0, duration, ease: 'power2.inOut', stagger, delay,
    scrollTrigger: scroll ? { trigger: svg, start: 'top 80%', once: true } : undefined
  });
}

// split a heading's words into masked spans for kinetic entrance
export function splitWords(el) {
  $$('.line', el).forEach(line => {
    const nodes = [...line.childNodes];
    line.innerHTML = '';
    nodes.forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) line.append(document.createTextNode(' '));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; line.append(s); }
        });
      } else { n.classList.add('w'); line.append(n); }
    });
  });
  return $$('.w', el);
}
