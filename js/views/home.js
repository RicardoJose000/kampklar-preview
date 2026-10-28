import { $, $$, go, icon, reduced, hasGsap, toast, vid, img } from '../ui.js';
import { startLenis, magnetic, spotlight, tilt, reveals, drawSvg, splitWords, autoVideos } from '../fx.js';
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

const STRIP = [
  ['keeper', 'KK 01A'], ['Secure', 'sign-up'], ['shot', 'KK 02C'], ['attack', 'KK 03A'], ['Consent', 'PDFs'],
  ['training', 'KK 04B'], ['jump', 'KK 05A'], ['GDPR', 'tools'], ['match', 'KK 06D'], ['leap', 'KK 07A'], ['Admin', 'dashboard']
];

const GALLERY = [
  ['jump', 'Jump shot'], ['keeper', 'The save'], ['tactics', 'Team talk'], ['shot', 'Fast break'], ['training', 'Training night'],
  ['player', 'Season start'], ['attack', 'Through the wall'], ['goal', 'Empty court, 7 a.m.'], ['leap', 'Wing shot'], ['match', 'Home game']
];

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

const pad = n => String(n).padStart(2, '0');
const timecode = t => `01:00:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 25))}`;

export async function renderHome(main) {
  main.innerHTML = `
  <section class="hero" id="hero">
    <div class="hero-bg"></div>
    ${COURT}
    <div class="shell hero-grid">
      <div class="hero-copy">
        <span class="chip-row" data-hero><b>Live</b>Youth handball platform, working preview</span>
        <h1 id="heroTitle"><span class="line">Every player</span><span class="line"><span class="stretch">signed up.</span></span><span class="line">Every parent</span><span class="line"><em class="serif">in control.</em></span></h1>
        <p class="lede" data-hero>Registration, parent accounts, consent forms and a secure admin area for your club. Click through the real flows. Nothing leaves your browser.</p>
        <div class="hero-cta" data-hero>
          <a class="btn btn-primary" href="#/register" data-magnetic>Try parent sign-up ${icon.arrow}</a>
          <a class="btn btn-ghost" href="#/admin" data-magnetic>Open admin dashboard</a>
        </div>
        <div class="trust" data-hero>
          <span class="chip-row">${icon.shield}GDPR ready</span>
          <span class="chip-row">${icon.users}Parent consent under 13</span>
          <span class="chip-row">${icon.lock}EU hosting</span>
        </div>
      </div>
      <div class="stage" id="stage">
        <div class="stage-inner" id="stageInner">
          <div class="layer card-photo cp1">${img('jump', 'Handball player in a jump shot', 'loading="eager"')}</div>
          <div class="layer viewfinder">
            ${vid('reel', { preload: 'auto' })}
            <div class="vf-ui" aria-hidden="true">
              <i class="c c1"></i><i class="c c2"></i><i class="c c3"></i><i class="c c4"></i>
              <span class="rec"><i></i>Rec</span><span class="tc" id="tc">01:00:00:00</span>
              <span class="focus"></span>
              <div class="meta"><span>Scene 01 / Match day</span><span>25 fps &middot; 1/50</span></div>
            </div>
          </div>
          <div class="layer card-photo cp2">${img('tactics', 'Coach drawing tactics for the team', 'loading="eager"')}</div>
          <div class="layer" style="inset:0;transform:translateZ(200px);pointer-events:none">
            <div class="float-chip c1"><i>&#10003;</i><div>Email confirmed<small>Code used once</small></div></div>
            <div class="float-chip c2"><i>3</i><div>Children, one account<small>J12, G10, Mini</small></div></div>
            <div class="float-chip c3"><i>PDF</i><div>Consent signed<small>Copy sent to parent</small></div></div>
          </div>
          <div class="layer ball-layer" id="ballWrap" data-drag>
            <canvas id="ball" role="img" aria-label="3D handball. Drag to spin it."></canvas>
            <div class="ball-shadow"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="scroll-hint" aria-hidden="true"><i></i>Scroll</div>
  </section>

  <div class="filmstrip" aria-hidden="true"><div class="film-skew"><div class="film-track">
    ${[...STRIP, ...STRIP].map(([a, b]) => b.startsWith('KK')
      ? `<div class="fr">${img(a)}<span>${b}</span></div>`
      : `<div class="wd">${a}<em>${b}</em></div>`).join('')}
  </div></div></div>

  <section class="reel" id="reel">
    <div class="reel-media" id="reelMedia">${vid('team')}</div>
    <div class="reel-bars"><i></i><i></i></div>
    <div class="reel-copy">
      <span class="eyebrow light">Club life</span>
      <h2 id="reelTitle"><span>One club.</span><span><em class="serif">Every family.</em></span><span>Safely signed up.</span></h2>
      <p>Hands in, season on. The platform does the paperwork so coaches can coach.</p>
    </div>
    <div class="reel-tc" aria-hidden="true"><span>Rec</span><span id="tc2">01:00:00:00</span><span>Take 02</span></div>
  </section>

  <section class="journey" id="journey">
    <div class="section-head">
      <div><span class="eyebrow" data-reveal>The parent journey</span><h2 data-reveal>Sign-up to signed consent <em class="serif">in five steps.</em></h2></div>
      <p data-reveal>The path every family takes on your site. Scroll through it here, then try it for real.</p>
    </div>
    <div class="journey-track" id="track">
      <article class="step-card"><div class="step-media">${vid('parent')}<span class="n">01 / Register</span></div>
        <div class="step-body"><h3>Register</h3><p>The parent fills in your existing form. One account for the whole family.</p>
        <div class="mock"><div class="mock-box"><div class="mock-field">ingrid.solberg@example.no</div><div class="mock-field typed">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</div><div class="mock-btn">Create account</div></div></div></div></article>
      <article class="step-card"><div class="step-media">${img('shot')}<span class="n">02 / Confirm</span>
        <div class="mock-float"><div class="mock-code"><b>4</b><b>8</b><b>1</b><b>9</b><b class="on">0</b><b></b></div></div></div>
        <div class="step-body"><h3>Confirm</h3><p>A 6-digit code arrives by email. It works once and expires in 15 minutes. Fake accounts stop here.</p></div></article>
      <article class="step-card"><div class="step-media">${img('player', '', 'style="object-position:50% 35%"')}<span class="n">03 / Children</span></div>
        <div class="step-body"><h3>Add children</h3><p>Each child gets a player profile. The age class is worked out automatically.</p>
        <div class="mock"><div class="mock-box">
          <div class="mock-kid"><span class="av" style="background:linear-gradient(135deg,#FF6A2A,#FF9354)">ES</span><div><b>Emma Solberg</b><small>J12 &middot; Consent signed</small></div></div>
          <div class="mock-kid"><span class="av" style="background:linear-gradient(135deg,#1F4FFF,#6E93FF)">JS</span><div><b>Jonas Solberg</b><small>G10 &middot; Consent signed</small></div></div>
          <div class="mock-kid add">+ Add child</div>
        </div></div></div></article>
      <article class="step-card"><div class="step-media">${vid('sign')}<span class="n">04 / Consent</span></div>
        <div class="step-body"><h3>Give consent</h3><p>Clear choices, a typed signature, and a record of exactly what was agreed.</p>
        <div class="mock"><div class="mock-box"><div class="check-row"><i>&#10003;</i>Participation</div><div class="check-row"><i>&#10003;</i>Data processing</div><div class="check-row"><i>&#10003;</i>Team photos</div><div class="mock-sign">Ingrid Solberg</div></div></div></div></article>
      <article class="step-card"><div class="step-media">${img('tactics', '', 'style="object-position:50% 30%"')}<span class="n">05 / Copy</span></div>
        <div class="step-body"><h3>Get a copy</h3><p>A signed PDF goes to the parent and to the club. Automatically.</p>
        <div class="mock"><div class="mock-box"><div class="mock-mail"><span class="pdf">PDF</span><div><b>consent-Emma.pdf</b><small class="muted" style="display:block;font-size:12.5px">Sent to the parent and the club</small></div></div></div></div></div></article>
      <article class="step-card end"><div class="bgv">${vid('team')}</div><span class="eyebrow light">Under a minute</span><h3 style="margin:14px 0 10px">Your turn.</h3><p>The whole flow, from first click to signed PDF.</p><a class="btn btn-white" href="#/register" data-magnetic>Start sign-up ${icon.arrow}</a></article>
    </div>
  </section>

  <section class="section" id="features">
    <div class="shell">
      <div class="section-head">
        <div><span class="eyebrow" data-reveal>What gets built</span><h2 data-reveal>Everything <em class="serif">behind</em> your design.</h2></div>
        <p data-reveal>Your pages stay exactly as they are. This is the part visitors never see, and the part that makes it all work.</p>
      </div>
      <div class="bento">
        <article class="tile t-a" data-reveal>
          <div><div class="ic">${icon.users}</div><h3>Parents and children</h3><p>One parent account holds every child in the family. Add, edit or remove players at any time.</p>
            <ul><li>Age class worked out from date of birth</li><li>Parents only see their own children</li></ul></div>
          <div class="family-viz" id="family">
            <svg viewBox="0 0 400 230" preserveAspectRatio="none" aria-hidden="true"><path d="M150 115 C 210 115, 210 35, 262 35"/><path d="M150 115 L 262 115"/><path d="M150 115 C 210 115, 210 195, 262 195"/></svg>
            <div class="p" style="left:0;top:92px"><i style="background:linear-gradient(135deg,#0B1B36,#3A4E78)">IS</i>Ingrid</div>
            <div class="p" style="right:0;top:12px"><i style="background:linear-gradient(135deg,#FF6A2A,#FF9354)">E</i>Emma, J12</div>
            <div class="p" style="right:14px;top:92px"><i style="background:linear-gradient(135deg,#1F4FFF,#6E93FF)">J</i>Jonas, G10</div>
            <div class="p" style="right:0;top:172px"><i style="background:linear-gradient(135deg,#0E9F6E,#4CCB9B)">A</i>Alma, Mini</div>
          </div>
        </article>
        <article class="tile t-b" data-reveal data-delay=".08"><div class="ic">${icon.mail}</div><h3>Email codes</h3><p>Verification, password reset and admin login, all sent from your own domain mailbox.</p></article>
        <article class="tile t-c" data-reveal><div class="ic">${icon.file}</div><h3>Consent PDFs</h3><p>A signed copy for the parent and the club, generated the moment consent is given.</p></article>
        <article class="tile t-d" data-reveal data-delay=".08"><div class="ic">${icon.shield}</div><h3>GDPR tools</h3><p>Data export, consent withdrawal and full account deletion. One click each.</p></article>
        <article class="tile t-e" data-reveal data-delay=".16"><div class="ic">${icon.lock}</div><h3>Locked down</h3><p>Hashed passwords, expiring codes, login limits and a private database.</p></article>
        <article class="tile t-f photo" data-reveal><div class="bg">${img('match', 'Indoor handball match with spectators')}</div><div class="ic">${icon.ball}</div><h3>Your design stays</h3><p>No rebuild and no WordPress. Small, clean PHP behind your existing HTML. The forms simply start working.</p>
          <ul><li>Plain PHP 8 and MySQL on your Hetzner setup</li><li>No new monthly costs</li><li>Clean code you own, with a handover guide</li></ul></article>
        <article class="tile t-g photo" data-reveal data-delay=".08"><div class="bg">${vid('coach')}</div><div class="ic">${icon.grid}</div><h3>Admin dashboard</h3><p>Every family and player in one place. Search, filter, export and check consent at a glance.</p>
          <div class="mini-table"><div><span>Player</span><span>Class</span><span>Consent</span></div><div><span>Emma Solberg</span><span>J12</span><span class="pill ok">Signed</span></div><div><span>Oskar Nilsen</span><span>G12</span><span class="pill warn">Missing</span></div></div></article>
      </div>
    </div>
  </section>

  <section class="section club">
    <div class="shell">
      <div class="section-head" style="margin-bottom:10px">
        <div><span class="eyebrow" data-reveal>Who it is for</span><h2 data-reveal>Built for the people <em class="serif">around the court.</em></h2></div>
        <p data-reveal>Players, parents, coaches and volunteers. Each one sees exactly what they need, and nothing more.</p>
      </div>
    </div>
    <div class="ring-stage" id="ringStage" data-drag>
      <div class="ring" id="ring">${GALLERY.map(([n, c]) => `<figure>${img(n, c)}<figcaption>${c}</figcaption></figure>`).join('')}</div>
      <div class="ring-floor"></div>
    </div>
    <p class="ring-hint">Drag to turn</p>
  </section>

  <section class="section security">
    <div class="shell sec-grid">
      <div class="sec-sticky">
        <span class="eyebrow" data-reveal>Security</span>
        <h2 data-reveal>Children's data, <em class="serif">locked down.</em></h2>
        <p data-reveal>Parents trust the club with information about their kids. These are the concrete steps that keep that trust.</p>
        <div class="sec-photo" data-clip>${img('keeper', 'Goalkeeper stretching for a save')}
          <div class="lockchip"><svg class="lock" id="lock" viewBox="0 0 120 120" aria-hidden="true"><rect x="22" y="52" width="76" height="56" rx="12"/><path d="M38 52V38a22 22 0 0 1 44 0v14"/><circle cx="60" cy="78" r="7"/></svg><div>Like a good keeper<small>Nothing gets through.</small></div></div>
        </div>
      </div>
      <div class="sec-list">
        ${SECURITY.map(([t, d], i) => `<div class="sec-item" data-reveal><b>${pad(i + 1)}</b><div><h4>${t}</h4><p>${d}</p></div></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head">
        <div><span class="eyebrow" data-reveal>GDPR in practice</span><h2 data-reveal>Parents' rights, <em class="serif">one click away.</em></h2></div>
        <p data-reveal>In Norway, children under 13 need a parent's consent online. The parent account handles it, and every right has a button. Click a card to try it.</p>
      </div>
      <div class="rights">
        ${RIGHTS.map(([r, b, k], i) => `<button class="right" data-reveal data-delay="${(i % 3) * .07}" data-go="portal/privacy" style="text-align:left;color:inherit;font:inherit"><i class="art"></i><small>Right ${pad(i + 1)}</small><h4>${r}</h4><span class="fake-btn ${k}">${b}</span></button>`).join('')}
      </div>
    </div>
  </section>

  <section class="section plan-sec">
    <div class="shell">
      <div class="section-head">
        <div><span class="eyebrow" data-reveal>The plan</span><h2 data-reveal>Three steps. <em class="serif">You approve each one.</em></h2></div>
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
    <div class="cta-bg">${vid('reel')}</div>
    <div class="shell">
      <span class="eyebrow light" data-reveal>Your move</span>
      <h2 id="ctaTitle" style="margin-top:20px"><span class="line">Click around.</span><span class="line"><em class="serif">Try to break it.</em></span></h2>
      <p data-reveal>Then picture it behind your own design. Same pages, now fully working.</p>
      <div class="hero-cta" data-reveal>
        <a class="btn btn-white" href="#/register" data-magnetic>Try parent sign-up ${icon.arrow}</a>
        <a class="btn btn-glass" href="#/admin" data-magnetic>Open admin dashboard</a>
      </div>
    </div>
  </section>

  <footer class="foot">
    <div class="shell">
      <div>Kampklar preview, built by Ricardo Jose. Demo data only, stored in this browser.
        <small>Photos and clips from Pexels contributors (free licence). Handball film cut and graded from those photos.</small></div>
      <button id="resetDemo">Reset demo data</button>
    </div>
  </footer>`;

  $$('[data-go]', main).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $('#resetDemo', main).addEventListener('click', async () => {
    resetAll(); await ensureSeed(); renderList();
    toast('Demo data reset.');
  });

  const kill = [];
  const stopLenis = startLenis();
  const stopVideos = autoVideos(main);
  magnetic(main);
  spotlight(main);
  tilt(main, '.right');

  // running timecode over the films
  let tcRaf = 0;
  const tcPairs = [[$('#stage video', main), $('#tc', main)], [$('#reelMedia video', main), $('#tc2', main)]];
  const tick = () => {
    tcPairs.forEach(([v, el]) => { if (!v.paused) el.textContent = timecode(v.currentTime); });
    tcRaf = requestAnimationFrame(tick);
  };
  tick();

  // 3D ball
  let destroyBall = null;
  const wrap = $('#ballWrap', main);
  const fallback = () => { const f = document.createElement('div'); f.className = 'ball-fallback'; wrap.prepend(f); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => import('../ball.js'))
    .then(m => { if (main.contains(wrap)) destroyBall = m.mountBall($('#ball', wrap), wrap); })
    .catch(fallback);

  const stopRing = ring3d($('#ringStage', main));

  const anim = hasGsap() && !reduced();
  if (anim) {
    const delay = filmIntro();
    const words = splitWords($('#heroTitle', main));
    const tl = gsap.timeline({ delay });
    tl.from(words, { yPercent: 120, rotate: 6, duration: 1.3, ease: 'expo.out', stagger: .06 })
      .from('[data-hero]', { opacity: 0, y: 24, duration: 1, ease: 'expo.out', stagger: .08 }, '-=1.05')
      .fromTo('.hero .stretch', { fontVariationSettings: '"wdth" 62' }, { fontVariationSettings: '"wdth" 118', duration: 1.6, ease: 'expo.out' }, .4)
      .from('#stageInner', { rotateY: -38, rotateX: 18, z: -500, opacity: 0, duration: 2, ease: 'expo.out' }, 0)
      .from('.cp1, .cp2', { opacity: 0, scale: .7, duration: 1.4, ease: 'expo.out', stagger: .15 }, .5)
      .from('.float-chip', { opacity: 0, scale: .8, y: 24, duration: .9, ease: 'back.out(1.6)', stagger: .15 }, 1);
    const breathe = gsap.to('.hero .stretch', { fontVariationSettings: '"wdth" 90', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: delay + 2.2 });
    $$('.float-chip', main).forEach((c, i) => kill.push(gsap.to(c, { y: i % 2 ? 10 : -10, duration: 2.4 + i * .4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: delay + 2 })));
    kill.push(tl, breathe);

    drawSvg($('.court', main), { duration: 2.6, stagger: .06, delay: delay + .2 });
    gsap.from($$('.court [data-dash]', main), { opacity: 0, duration: 1.4, delay: delay + 1.4 });

    // pointer moves the camera around the 3D stage
    const hero = $('#hero', main), inner = $('#stageInner', main);
    const onMove = e => {
      const px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
      gsap.to(inner, { rotateY: px * 16, rotateX: -py * 12, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
    };
    hero.addEventListener('pointermove', onMove);
    kill.push({ kill: () => hero.removeEventListener('pointermove', onMove) });

    gsap.to('.hero-copy', { yPercent: -16, opacity: .2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('#stage', { yPercent: 14, scale: .9, rotateX: 14, transformPerspective: 1400, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero .court', { scale: 1.15, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

    // film strip leans with scroll speed
    const skew = gsap.quickTo('.film-skew', 'skewX', { duration: .6, ease: 'power3.out' });
    ScrollTrigger.create({ trigger: '.filmstrip', start: 'top bottom', end: 'bottom top', onUpdate: s => skew(gsap.utils.clamp(-12, 12, s.getVelocity() / -260)), onLeave: () => skew(0), onLeaveBack: () => skew(0) });

    const cta = splitWords($('#ctaTitle', main));
    gsap.from(cta, { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '#ctaTitle', start: 'top 85%', once: true } });

    drawSvg($('#family svg', main), { duration: 1.4, stagger: .15, scroll: true });
    drawSvg($('#lock', main), { duration: 2, stagger: .2, scroll: true });
    gsap.to('.sec-photo[data-clip]', { clipPath: 'inset(0% 0 0 0 round 26px)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.sec-photo', start: 'top 85%', once: true } });
    gsap.fromTo('.sec-photo img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.sec-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('.tile.photo .bg', main).forEach(bg => gsap.fromTo(bg, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.from('#ring', { opacity: 0, scale: .7, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '#ringStage', start: 'top 80%', once: true } });
    gsap.from('.cta-bg', { scale: 1.25, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });

    gsap.to('#plan .rail i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#plan', start: 'top 75%', end: 'bottom 55%', scrub: true } });
    if (innerWidth <= 860) gsap.set('#plan .rail i', { scaleX: 1 });
    $$('[data-count]', main).forEach(el => {
      const o = { v: 0 }, to = +el.dataset.count;
      gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
  } else {
    $$('.court path, .court line, .court rect', main).forEach(p => { p.style.strokeDasharray = p.dataset.dash || 'none'; });
    $$('#plan .rail i', main).forEach(i => { i.style.transform = 'none'; });
    $$('[data-clip]', main).forEach(el => { el.style.clipPath = 'none'; });
  }

  const mm = hasGsap() ? gsap.matchMedia() : null;

  // showreel: the clip opens from a card to full screen, then letterbox bars close in
  mm?.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#reel', start: 'top top', end: '+=140%', pin: true, scrub: 1, anticipatePin: 1 } });
    tl.to('#reelMedia', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 })
      .to('#reelMedia video', { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .from('#reelTitle span', { yPercent: 60, opacity: 0, stagger: .12, duration: .6, ease: 'power3.out' }, .15)
      .from('.reel-copy .eyebrow, .reel-copy p', { opacity: 0, y: 20, duration: .4 }, .5)
      .to('.reel-bars i', { height: '9vh', ease: 'power2.inOut', duration: .5 }, .75)
      .from('.reel-tc', { opacity: 0, duration: .3 }, .8);
  });
  mm?.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('#reelMedia', { clipPath: 'none' }); gsap.set('#reelMedia video', { scale: 1 });
  });

  // horizontal journey on wide screens
  mm?.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('#track', main);
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#journey', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    $$('.step-card', track).forEach(card => {
      gsap.from($('.step-media', card) || card, { clipPath: 'inset(0 0 100% 0 round 18px)', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 92%', once: true } });
      gsap.from($('.mock', card) || $('.mock-float', card) || card, { y: 40, opacity: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 80%', once: true } });
    });
  });
  mm?.add('(max-width: 899px)', () => {
    $('#track', main).style.cssText = 'flex-direction:column;width:auto;padding:0 16px;';
    $$('.step-card', main).forEach(c => { c.style.width = '100%'; });
    return () => {
      $('#track', main).style.cssText = '';
      $$('.step-card', main).forEach(c => { c.style.width = ''; });
    };
  });

  reveals(main);

  return () => {
    stopLenis();
    stopVideos();
    stopRing();
    cancelAnimationFrame(tcRaf);
    destroyBall?.();
    kill.forEach(k => k.kill());
    mm?.revert();
  };
}

// Film shutter on first load: slate with a running counter, then the bars open.
function filmIntro() {
  if (window.__introDone) return .1;
  window.__introDone = true;
  const el = document.createElement('div');
  el.className = 'intro';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<i class="bar t"></i><i class="bar b"></i><div class="slate"><div><i></i><span>Take 01</span><b>Kampklar</b><span id="introN">00</span></div></div>`;
  document.body.append(el);
  const n = { v: 0 }, out = el.querySelector('#introN');
  gsap.timeline({ onComplete: () => el.remove() })
    .from('.intro .slate div', { opacity: 0, y: 20, duration: .5, ease: 'expo.out' })
    .to(n, { v: 24, duration: .8, ease: 'none', onUpdate: () => { out.textContent = pad(Math.round(n.v)); } }, 0)
    .to('.intro .slate', { opacity: 0, duration: .25 }, .85)
    .to('.intro .bar.t', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, .9)
    .to('.intro .bar.b', { yPercent: 100, duration: 1, ease: 'expo.inOut' }, .9);
  return 1.1;
}

// Drag-to-spin 3D ring of photos. Cards facing away are dimmed.
function ring3d(stage) {
  const ring = $('#ring', stage), figs = $$('figure', ring), n = figs.length;
  const step = 360 / n;
  let R = 0, rot = 0, vel = .12, drag = false, lx = 0, raf = 0, visible = false;
  const layout = () => {
    const w = figs[0].offsetWidth;
    R = Math.round(w / 2 / Math.tan(Math.PI / n)) + 30;
    figs.forEach((f, i) => { f.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`; });
  };
  const render = () => {
    ring.style.transform = `translateZ(${-R}px) rotateX(-8deg) rotateY(${rot}deg)`;
    figs.forEach((f, i) => {
      const face = Math.cos((i * step + rot) * Math.PI / 180);
      f.style.filter = `brightness(${(.55 + .45 * Math.max(0, face)).toFixed(3)})`;
    });
  };
  const still = reduced();
  const loop = () => {
    if (!visible) { raf = 0; return; }
    if (!drag && !still) { vel += (.12 - vel) * .03; rot -= vel; }
    render();
    raf = requestAnimationFrame(loop);
  };
  const down = e => { drag = true; lx = e.clientX; stage.setPointerCapture?.(e.pointerId); };
  const move = e => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; rot += dx * .25; vel = -dx * .25; };
  const up = () => { drag = false; };
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  addEventListener('resize', layout);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); });
  io.observe(stage);
  layout(); render();
  return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('resize', layout); };
}
