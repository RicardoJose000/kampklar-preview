import { $, $$, go, icon, reduced, hasGsap, toast } from '../ui.js';
import { startLenis, magnetic, spotlight, tilt, reveals, drawSvg, splitWords } from '../fx.js';
import { resetAll, ensureSeed } from '../store.js';
import { renderList } from '../mail.js';

// Handball court to scale: 40 x 20 m drawn at 35 px per metre.
const HALF = `
  <path d="M100 187.5 A210 210 0 0 1 310 397.5 L310 502.5 A210 210 0 0 1 100 712.5"/>
  <path data-dash="10 12" d="M203.5 100 A315 315 0 0 1 415 397.5 L415 502.5 A315 315 0 0 1 203.5 800"/>
  <line x1="345" y1="432.5" x2="345" y2="467.5"/>
  <line x1="240" y1="442.5" x2="240" y2="457.5"/>
  <rect x="72" y="397.5" width="28" height="105"/>`;
export const COURT = `<svg class="court" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect x="100" y="100" width="1400" height="700"/>
  <line x1="800" y1="100" x2="800" y2="800"/>
  <g>${HALF}</g>
  <g transform="translate(1600 0) scale(-1 1)">${HALF.replace('<path d="M100', '<path class="hot" d="M100')}</g>
</svg>`;

const MARQUEE = ['Secure sign-up', 'Email codes', 'Parent accounts', 'Several children', 'Consent PDFs', 'GDPR tools', 'Admin dashboard', 'Runs on Hetzner'];

const SECURITY = [
  ['Passwords never stored readable', 'Hashed with a slow, salted algorithm. Not even an admin can see them.'],
  ['Safe database queries', 'Prepared statements on every query. Blocks SQL injection.'],
  ['Forms protected', 'A one-time token on each form stops fake submissions.'],
  ['Limits on login attempts', 'Five wrong passwords or codes and the account pauses for a minute.'],
  ['Codes that expire', 'Email codes work once and expire after 15 minutes.'],
  ['Strict access rules', 'Parents only ever see their own children. Checked on every request.'],
  ['Two-step admin login', 'Password plus a code by email before anyone sees player data.'],
  ['Database kept private', 'Only your web server can reach it. Closed to the internet.'],
  ['Collect only what is needed', 'No extra fields. Less data stored means less risk.'],
  ['Audit log and daily backup', 'Every admin action is recorded and the data is backed up each day.']
];

const RIGHTS = [
  ['Right of access', 'Download my data', ''],
  ['Right to erasure', 'Delete my account', 'danger'],
  ['Right to correction', 'Edit child profile', ''],
  ['Withdraw consent', 'Withdraw', ''],
  ['Proof of consent', 'Consent log', ''],
  ['Data minimisation', 'Only needed fields', '']
];

export async function renderHome(main) {
  main.innerHTML = `
  <section class="hero" id="hero">
    <div class="hero-bg"></div>
    ${COURT}
    <div class="shell hero-grid">
      <div class="hero-copy">
        <span class="eyebrow" data-hero>Youth handball platform &middot; Live preview</span>
        <h1 id="heroTitle"><span class="line">Every player signed up.</span><span class="line">Every parent <span class="stretch">in control.</span></span></h1>
        <p class="lede" data-hero>Registration, parent accounts, consent forms and a secure admin dashboard. Click through the real flows. Everything works, and nothing leaves your browser.</p>
        <div class="hero-cta" data-hero>
          <a class="btn btn-primary" href="#/register" data-magnetic>Try parent sign-up ${icon.arrow}</a>
          <a class="btn btn-ghost" href="#/admin" data-magnetic>Open admin dashboard</a>
        </div>
        <div class="hero-stats" data-hero>
          <div><b>7</b><span>days to launch</span></div>
          <div><b>3</b><span>milestones</span></div>
          <div><b>0</b><span>design changes</span></div>
        </div>
      </div>
      <div class="ball-wrap" id="ballWrap">
        <div class="ball-ring"></div>
        <canvas id="ball" role="img" aria-label="3D handball. Drag to spin it."></canvas>
        <div class="ball-shadow"></div>
        <div class="float-chip c1"><i>&#10003;</i>Email confirmed</div>
        <div class="float-chip c2"><i>3</i>Children, one account</div>
        <div class="float-chip c3"><i>PDF</i>Consent copy sent</div>
      </div>
    </div>
    <div class="scroll-hint" aria-hidden="true"><i></i>Scroll</div>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track">${[...MARQUEE, ...MARQUEE].map(m => `<span>${m}</span>`).join('')}</div></div>

  <section class="journey" id="journey">
    <div class="section-head">
      <div><span class="eyebrow" data-reveal>The parent journey</span><h2 data-reveal>Sign-up to signed consent in five steps.</h2></div>
      <p data-reveal>The path every family takes on your site. Scroll through it here, then try it for real.</p>
    </div>
    <div class="journey-track" id="track">
      <article class="step-card"><div class="n">01</div><h3>Register</h3><p>The parent fills in your existing form. One account for the whole family.</p>
        <div class="mock"><div class="mock-box"><div class="mock-field">Ingrid Solberg</div><div class="mock-field">ingrid.solberg@example.no</div><div class="mock-field typed">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</div><div class="mock-btn">Create account</div></div></div></article>
      <article class="step-card"><div class="n">02</div><h3>Confirm</h3><p>A 6-digit code arrives by email. It works once and expires in 15 minutes.</p>
        <div class="mock"><div class="mock-box"><div class="mock-code"><b>4</b><b>8</b><b>1</b><b>9</b><b class="on">0</b><b></b></div></div></div></article>
      <article class="step-card"><div class="n">03</div><h3>Add children</h3><p>Each child gets a player profile. The age class is worked out automatically.</p>
        <div class="mock"><div class="mock-box">
          <div class="mock-kid"><span class="av" style="background:linear-gradient(135deg,#FF5A1F,#FF8A3D)">ES</span><div><b>Emma Solberg</b><small>J12 &middot; Consent signed</small></div></div>
          <div class="mock-kid"><span class="av" style="background:linear-gradient(135deg,#5B8CFF,#8AB0FF)">JS</span><div><b>Jonas Solberg</b><small>G10 &middot; Consent signed</small></div></div>
          <div class="mock-kid" style="border:1px dashed rgba(255,255,255,.16);background:none;justify-content:center;color:#8E9AB0;font-size:13px">+ Add child</div>
        </div></div></article>
      <article class="step-card"><div class="n">04</div><h3>Give consent</h3><p>Clear choices, a typed signature, and a record of exactly what was agreed.</p>
        <div class="mock"><div class="mock-box"><div class="check-row"><i>&#10003;</i>Participation</div><div class="check-row"><i>&#10003;</i>Data processing</div><div class="check-row"><i>&#10003;</i>Team photos</div><div class="mock-sign">Ingrid Solberg</div></div></div></article>
      <article class="step-card"><div class="n">05</div><h3>Get a copy</h3><p>A signed PDF goes to the parent and to the club. Automatically.</p>
        <div class="mock"><div class="mock-box"><div class="mock-mail"><span class="pdf">PDF</span><div><b>consent-Emma.pdf</b><small class="muted" style="display:block;font-size:12.5px">Sent to the parent and the club</small></div></div></div></div></article>
      <article class="step-card end"><h3>Your turn.</h3><p style="margin-bottom:26px">The whole flow takes under a minute.</p><a class="btn btn-primary" href="#/register" data-magnetic>Start sign-up ${icon.arrow}</a></article>
    </div>
  </section>

  <section class="section" id="features">
    <div class="shell">
      <div class="section-head">
        <div><span class="eyebrow" data-reveal>What gets built</span><h2 data-reveal>Everything behind your design.</h2></div>
        <p data-reveal>Your pages stay exactly as they are. This is the part visitors never see, and the part that makes it all work.</p>
      </div>
      <div class="bento">
        <article class="tile t-a" data-reveal>
          <div><div class="ic">${icon.users}</div><h3>Parents and children</h3><p>One parent account holds every child in the family. Add, edit or remove players at any time.</p>
            <ul><li>Age class worked out from date of birth</li><li>Parents only see their own children</li></ul></div>
          <div class="family-viz" id="family">
            <svg viewBox="0 0 400 230" preserveAspectRatio="none" aria-hidden="true"><path d="M150 115 C 210 115, 210 35, 262 35"/><path d="M150 115 L 262 115"/><path d="M150 115 C 210 115, 210 195, 262 195"/></svg>
            <div class="p" style="left:0;top:92px"><i style="background:linear-gradient(135deg,#5B8CFF,#8AB0FF)">IS</i>Ingrid</div>
            <div class="p" style="right:0;top:12px"><i style="background:linear-gradient(135deg,#FF5A1F,#FF8A3D)">E</i>Emma, J12</div>
            <div class="p" style="right:14px;top:92px"><i style="background:linear-gradient(135deg,#3DD68C,#7BE8B2)">J</i>Jonas, G10</div>
            <div class="p" style="right:0;top:172px"><i style="background:linear-gradient(135deg,#B26BFF,#D3A6FF)">A</i>Alma, Mini</div>
          </div>
        </article>
        <article class="tile t-b" data-reveal data-delay=".08"><div class="ic">${icon.mail}</div><h3>Email codes</h3><p>Verification, password reset and admin login, all sent from your own domain mailbox.</p></article>
        <article class="tile t-c" data-reveal><div class="ic">${icon.file}</div><h3>Consent PDFs</h3><p>A signed copy for the parent and the club, generated the moment consent is given.</p></article>
        <article class="tile t-d" data-reveal data-delay=".08"><div class="ic">${icon.shield}</div><h3>GDPR tools</h3><p>Data export, consent withdrawal and full account deletion. One click each.</p></article>
        <article class="tile t-e" data-reveal data-delay=".16"><div class="ic">${icon.lock}</div><h3>Locked down</h3><p>Hashed passwords, expiring codes, login limits and a private database.</p></article>
        <article class="tile t-f" data-reveal><div class="ic">${icon.ball}</div><h3>Your design stays</h3><p>No rebuild and no WordPress. Small, clean PHP behind your existing HTML. The forms simply start working.</p>
          <ul><li>Plain PHP 8 and MySQL on your Hetzner setup</li><li>No new monthly costs</li><li>Clean code you own, with a handover guide</li></ul></article>
        <article class="tile t-g" data-reveal data-delay=".08"><div class="ic">${icon.grid}</div><h3>Admin dashboard</h3><p>Every family and player in one place. Search, filter, export and check consent at a glance.</p>
          <div class="mini-table"><div><span>Player</span><span>Class</span><span>Consent</span></div><div><span>Emma Solberg</span><span>J12</span><span class="pill ok">Signed</span></div><div><span>Oskar Nilsen</span><span>G12</span><span class="pill warn">Missing</span></div></div></article>
      </div>
    </div>
  </section>

  <section class="section security">
    <div class="shell sec-grid">
      <div class="sec-sticky">
        <span class="eyebrow" data-reveal>Security</span>
        <h2 data-reveal>Children's data, locked down.</h2>
        <p data-reveal>Parents trust the club with information about their kids. These are the concrete steps that keep that trust.</p>
        <svg class="lock" id="lock" viewBox="0 0 120 120" aria-hidden="true"><rect x="22" y="52" width="76" height="56" rx="12"/><path d="M38 52V38a22 22 0 0 1 44 0v14"/><circle cx="60" cy="78" r="7"/><path d="M60 85v9"/></svg>
      </div>
      <div class="sec-list">
        ${SECURITY.map(([t, d], i) => `<div class="sec-item" data-reveal><b>${String(i + 1).padStart(2, '0')}</b><div><h4>${t}</h4><p>${d}</p></div></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head">
        <div><span class="eyebrow" data-reveal>GDPR in practice</span><h2 data-reveal>Parents' rights, one click away.</h2></div>
        <p data-reveal>In Norway, children under 13 need a parent's consent online. The parent account handles it, and every right has a button. Click a card to try it.</p>
      </div>
      <div class="rights">
        ${RIGHTS.map(([r, b, k], i) => `<button class="right" data-reveal data-delay="${(i % 3) * .07}" data-go="portal/privacy" style="text-align:left;color:inherit;font:inherit"><small>Right</small><h4>${r}</h4><span class="fake-btn ${k}">${b}</span></button>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="background:var(--bg-2);border-top:1px solid var(--line)">
    <div class="shell">
      <div class="section-head">
        <div><span class="eyebrow" data-reveal>The plan</span><h2 data-reveal>Three steps. You approve each one.</h2></div>
        <p data-reveal>Each milestone is tested on your own live site before the next one starts. No surprises, fixed price.</p>
      </div>
      <div class="plan-line" id="plan">
        <div class="rail"><i></i></div>
        <div class="ms" data-reveal><span class="d">Day 1 to 3</span><h4>Secure accounts and families</h4><p>Code review, database, registration, email codes, login, password reset and the parent area for several children.</p></div>
        <div class="ms" data-reveal data-delay=".1"><span class="d">Day 4 to 5</span><h4>Emails, privacy and admin</h4><p>Confirmation emails, consent PDFs, GDPR tools and the admin dashboard with two-step login.</p></div>
        <div class="ms" data-reveal data-delay=".2"><span class="d">Day 6 to 7</span><h4>Testing and launch</h4><p>Every flow tested on desktop and mobile, security review, backups, admin guide and go live.</p></div>
      </div>
      <div class="plan-meta" data-reveal>
        <div><b data-count="7">7</b><span>days from files to launch</span></div>
        <div><b data-count="3">3</b><span>milestones you approve</span></div>
        <div><b data-count="14">14</b><span>days of free fixes after launch</span></div>
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="shell">
      <h2 id="ctaTitle"><span class="line">Click around.</span><span class="line accent">Try to break it.</span></h2>
      <p data-reveal>Then picture it behind your own design. Same pages, now fully working.</p>
      <div class="hero-cta" data-reveal>
        <a class="btn btn-primary" href="#/register" data-magnetic>Try parent sign-up ${icon.arrow}</a>
        <a class="btn btn-ghost" href="#/admin" data-magnetic>Open admin dashboard</a>
      </div>
    </div>
  </section>

  <footer class="foot">
    <div class="shell">
      <span>Kampklar preview, built by Ricardo Jose. Demo data only, stored in this browser.</span>
      <button id="resetDemo">Reset demo data</button>
    </div>
  </footer>`;

  $$('[data-go]', main).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $('#resetDemo', main).addEventListener('click', async () => {
    resetAll(); await ensureSeed(); renderList();
    toast('Demo data reset.');
  });

  const stopLenis = startLenis();
  magnetic(main);
  spotlight(main);
  tilt(main, '.right');
  const kill = [];

  // 3D ball
  let destroyBall = null;
  const wrap = $('#ballWrap', main);
  const fallback = () => { const f = document.createElement('div'); f.className = 'ball-fallback'; wrap.prepend(f); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => import('../ball.js'))
    .then(m => { if (main.contains(wrap)) destroyBall = m.mountBall($('#ball', wrap), wrap); })
    .catch(fallback);

  const anim = hasGsap() && !reduced();
  if (anim) {
    const words = splitWords($('#heroTitle', main));
    const tl = gsap.timeline({ delay: .1 });
    tl.from(words, { yPercent: 115, rotate: 5, duration: 1.3, ease: 'expo.out', stagger: .055 })
      .from('[data-hero]', { opacity: 0, y: 24, duration: 1, ease: 'expo.out', stagger: .08 }, '-=1.05')
      .fromTo('.stretch', { fontVariationSettings: '"wdth" 62' }, { fontVariationSettings: '"wdth" 125', duration: 1.6, ease: 'expo.out' }, .5)
      .from('.float-chip', { opacity: 0, scale: .8, y: 20, duration: .9, ease: 'back.out(1.6)', stagger: .15 }, .8);
    const breathe = gsap.to('.stretch', { fontVariationSettings: '"wdth" 100', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.2 });
    $$('.float-chip', main).forEach((c, i) => kill.push(gsap.to(c, { y: i % 2 ? 10 : -10, duration: 2.4 + i * .4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 })));
    kill.push(tl, breathe);

    drawSvg($('.court', main), { duration: 2.6, stagger: .06, delay: .2 });
    gsap.from($$('.court [data-dash]', main), { opacity: 0, duration: 1.4, delay: 1.4 });

    gsap.to('.hero-copy', { yPercent: -14, opacity: .25, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('#ballWrap', { yPercent: 16, scale: .92, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero .court', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

    const cta = splitWords($('#ctaTitle', main));
    gsap.from(cta, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '#ctaTitle', start: 'top 85%', once: true } });

    drawSvg($('#family svg', main), { duration: 1.4, stagger: .15, scroll: true });
    drawSvg($('#lock', main), { duration: 2, stagger: .2, scroll: true });
    gsap.to('#plan .rail i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#plan', start: 'top 75%', end: 'bottom 55%', scrub: true } });
    if (innerWidth <= 860) gsap.set('#plan .rail i', { scaleX: 1 });
    $$('[data-count]', main).forEach(el => {
      const o = { v: 0 }, to = +el.dataset.count;
      gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
  } else {
    $$('.court path, .court line, .court rect', main).forEach(p => { p.style.strokeDasharray = p.dataset.dash || 'none'; });
    $$('#plan .rail i', main).forEach(i => { i.style.transform = 'none'; });
  }

  // horizontal journey on wide screens
  const mm = hasGsap() ? gsap.matchMedia() : null;
  mm?.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('#track', main);
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#journey', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    $$('.step-card', track).forEach(card => {
      gsap.from($('.mock', card) || card, { y: 40, opacity: 0, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%', once: true } });
    });
  });
  mm?.add('(max-width: 899px)', () => {
    $('#track', main).style.cssText = 'flex-direction:column;width:auto;padding:0 16px;';
    $$('.step-card', main).forEach(c => { c.style.width = '100%'; c.style.minHeight = '0'; });
    return () => {
      $('#track', main).style.cssText = '';
      $$('.step-card', main).forEach(c => { c.style.width = ''; c.style.minHeight = ''; });
    };
  });

  reveals(main);

  return () => {
    stopLenis();
    destroyBall?.();
    kill.forEach(k => k.kill());
    mm?.revert();
  };
}
