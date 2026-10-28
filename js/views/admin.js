import { db, save, session, currentUser, userByEmail, verifyPassword, issueCode, checkCode, lockedFor, loginFailed, loginOk, audit, childrenOf, consentsOf, consentStatus, ageClass, deleteFamily, userById, ADMIN_EMAIL, ADMIN_PASSWORD, CLUB_MAILBOX } from '../store.js';
import { $, $$, esc, go, icon, toast, openModal, confirmBox, fieldError, clearErrors, formError, validEmail, bindPasswordUI, pwField, bindCodeInputs, codeInputsHTML, setBusy, fmtDate, fmtDateTime, initials, avatarStyle, download, demoNote, hasGsap, reduced, img, vid } from '../ui.js';
import { sendMail, wrapMail, openInbox } from '../mail.js';
import { enter, magnetic, countUp, autoVideos } from '../fx.js';


const ST = { signed: ['ok', 'Signed'], missing: ['warn', 'Missing'], withdrawn: ['bad', 'Withdrawn'] };

export async function renderAdmin(main) {
  const me = currentUser('admin');
  if (me) return dashboard(main, me);
  return login(main);
}

/* ---------------- two-step login ---------------- */
function login(main) {
  main.innerHTML = `<div class="app-bg"></div>
    <section class="admin-login">
      <div class="bgphoto">${img('tactics')}</div>
      <div class="card auth-card" style="position:relative" id="al"></div>
    </section>`;
  const box = $('#al', main);
  let admin = null;

  function stepOne() {
    box.innerHTML = `<span class="eyebrow">Club admin</span><h2 style="margin-top:14px">Admin login</h2><p class="muted">Step 1 of 2. Password first, then a code by email.</p>
      <div class="creds"><span>Demo login<br><code>${ADMIN_EMAIL}</code><br><code>${ADMIN_PASSWORD}</code></span><button class="btn btn-ghost btn-sm" id="fill" type="button">Fill in</button></div>
      <form class="form" id="a1" novalidate>
        <div class="field"><label for="email">Admin email</label><input class="input" id="email" name="email" type="email" autocomplete="username"></div>
        ${pwField('password', 'Password', 'current-password')}
        <button class="btn btn-primary btn-block" type="submit">Continue ${icon.arrow}</button>
      </form>`;
    const form = $('#a1', box);
    bindPasswordUI(form);
    enter(box, ':scope > *', { stagger: .05 });
    $('#fill', box).addEventListener('click', () => { form.email.value = ADMIN_EMAIL; form.password.value = ADMIN_PASSWORD; form.querySelector('[type=submit]').focus(); });
    form.addEventListener('submit', async e => {
      e.preventDefault(); clearErrors(form);
      const { email, password } = Object.fromEntries(new FormData(form));
      if (!validEmail(email)) { fieldError(form, 'email', 'Please enter a valid email address.'); return; }
      const wait = lockedFor(email);
      if (wait) { formError(form, `Too many attempts. Try again in ${wait} seconds.`); return; }
      const btn = form.querySelector('[type=submit]');
      setBusy(btn, true);
      const u = userByEmail(email);
      const ok = u && u.role === 'admin' && await verifyPassword(password || '', u.pw);
      setBusy(btn, false);
      if (!ok) {
        const left = loginFailed(email);
        formError(form, lockedFor(email) ? 'Too many attempts. Paused for 60 seconds.' : `Wrong email or password. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
        return;
      }
      loginOk(email);
      admin = u;
      const code = await issueCode(u.id, 'admin2fa');
      sendMail(u.email, `Admin login code: ${code}`, wrapMail('Your admin login code', `<p>Someone is signing in to the club dashboard with your password.</p><div class="code">${code}</div><p>If this was not you, change your password now.</p>`));
      session.set({ userId: u.id, mfa: false });
      stepTwo();
    });
  }

  function stepTwo() {
    box.innerHTML = `<span class="eyebrow">Club admin</span><h2 style="margin-top:14px">Enter login code</h2><p class="muted">Step 2 of 2. We emailed a 6-digit code to ${esc(admin.email)}.</p>
      ${demoNote('Find the code in the <b>Demo inbox</b>.')}
      <form class="form" id="a2" novalidate>
        ${codeInputsHTML('Admin login code')}
        <button class="btn btn-primary btn-block" type="submit">Open dashboard</button>
        <button class="btn btn-ghost btn-block" type="button" id="oi">${icon.mail} Open demo inbox</button>
      </form>`;
    const form = $('#a2', box);
    enter(box, ':scope > *', { stagger: .05 });
    $('#oi', box).addEventListener('click', () => openInbox(db.mail.find(m => m.to === admin.email)?.id));
    const code = bindCodeInputs($('.code-inputs', form), () => form.requestSubmit());
    setTimeout(() => form.querySelector('input').focus(), 200);
    form.addEventListener('submit', async e => {
      e.preventDefault(); clearErrors(form);
      if (code.value().length < 6) { formError(form, 'Please enter all 6 digits.'); return; }
      const r = await checkCode(admin.id, 'admin2fa', code.value());
      if (!r.ok) { formError(form, r.msg); code.shake(); code.clear(); return; }
      session.set({ userId: admin.id, role: 'admin', mfa: true });
      audit('Club Admin', 'Logged in to the dashboard (two-step)');
      toast('Welcome to the dashboard.');
      main.innerHTML = '';
      dashboard(main, admin);
    });
  }
  stepOne();
}

/* ---------------- dashboard ---------------- */
function rowsAll() {
  return db.children.map(k => {
    const p = userById(k.parentId);
    return { k, p, cls: ageClass(k), st: consentStatus(k.id) };
  }).filter(r => r.p).sort((a, b) => b.k.createdAt - a.k.createdAt);
}

function dashboard(main, me) {
  const state = { q: '', cls: '', st: '' };
  main.innerHTML = `<div class="app-bg"></div>
  <section class="app" style="grid-template-columns:1fr">
    <div>
      <div class="admin-hero">
        ${vid('coach', { preload: 'auto' })}
        <div><span class="eyebrow light">Club admin</span><h1 style="margin-top:12px">Club dashboard</h1><p>Every family and player. Only admins who passed two-step login can see this.</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" id="csv" data-magnetic>${icon.download} Export CSV</button>
          <button class="btn btn-ghost" id="out">${icon.logout} Log out</button>
        </div>
      </div>
      <div class="kpis" id="kpis"></div>
      <div class="charts">
        <div class="card panel"><h3>Players per age class</h3><p class="muted">Worked out from date of birth.</p><div class="chart-bars" id="bars"></div></div>
        <div class="card panel"><h3>Consent status</h3><p class="muted">Across all players.</p><div class="donut" id="donut"></div></div>
      </div>
      <div class="card panel">
        <div class="page-head" style="margin-bottom:16px"><div><h3>Players</h3><p class="muted" style="margin:0" id="count"></p></div></div>
        <div class="toolbar">
          <div class="search">${icon.search}<input class="input" id="q" placeholder="Search player, parent or email" aria-label="Search players"></div>
          <select class="input" id="fc" aria-label="Filter by class"><option value="">All classes</option></select>
          <select class="input" id="fs" aria-label="Filter by consent"><option value="">All consent</option><option value="signed">Signed</option><option value="missing">Missing</option><option value="withdrawn">Withdrawn</option></select>
        </div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Player</th><th>Class</th><th>Born</th><th>Parent</th><th>Consent</th><th>Registered</th></tr></thead><tbody id="rows"></tbody></table></div>
      </div>
      <div class="card panel"><h3>Audit log</h3><p class="muted">Every sign-in, change, export and deletion is recorded.</p><ul class="audit" id="audit"></ul></div>
    </div>
  </section>`;

  autoVideos(main);
  $('#out', main).addEventListener('click', () => { audit('Club Admin', 'Logged out'); session.clear(); toast('Logged out.'); go(''); });
  $('#csv', main).addEventListener('click', exportCsv);
  $('#q', main).addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); table(); });
  $('#fc', main).addEventListener('change', e => { state.cls = e.target.value; table(); });
  $('#fs', main).addEventListener('change', e => { state.st = e.target.value; table(); });
  $('#rows', main).addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) familyModal(tr.dataset.id); });
  $('#rows', main).addEventListener('keydown', e => { const tr = e.target.closest('tr[data-id]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); familyModal(tr.dataset.id); } });

  function refresh(animate = false) { kpis(animate); charts(animate); table(); auditLog(); }

  function kpis(animate) {
    const parents = db.users.filter(u => u.role === 'parent');
    const all = rowsAll();
    const signed = all.filter(r => r.st === 'signed').length;
    const pct = all.length ? Math.round(signed / all.length * 100) : 0;
    const unverified = parents.filter(p => !p.verified).length;
    const data = [['Families', parents.length, 'Parent accounts', 100], ['Players', all.length, 'Child profiles', 100], ['Consent complete', pct, `${signed} of ${all.length} players`, pct, '%'], ['Awaiting email check', unverified, 'Accounts not confirmed', parents.length ? unverified / parents.length * 100 : 0]];
    $('#kpis', main).innerHTML = data.map(([l, v, s, bar, suf = '']) => `<div class="card kpi"><small>${l}</small><b data-v="${v}" data-s="${suf}">${v}${suf}</b><span>${s}</span><div class="bar"><i style="width:${bar}%"></i></div></div>`).join('');
    if (animate) {
      $$('#kpis b', main).forEach(b => countUp(b, +b.dataset.v, { suffix: b.dataset.s }));
      if (hasGsap() && !reduced()) gsap.from('#kpis .bar i', { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: .08 });
    }
  }

  function charts(animate) {
    const all = rowsAll();
    const order = ['Mini', '10', '12', '14', '16', '18', '20'];
    const groups = {};
    all.forEach(r => { const key = r.cls === 'Mini' ? 'Mini' : r.cls.slice(1); groups[key] = (groups[key] || 0) + 1; });
    const keys = order.filter(k => groups[k]);
    const max = Math.max(1, ...Object.values(groups));
    $('#bars', main).innerHTML = keys.length ? keys.map(k => `<div><i style="height:${groups[k] / max * 100}%"><em>${groups[k]}</em></i><span>${k === 'Mini' ? 'Mini' : 'U' + k}</span></div>`).join('') : '<p class="muted">No players yet.</p>';
    const fc = $('#fc', main), cur = fc.value;
    const classes = [...new Set(all.map(r => r.cls))].sort();
    fc.innerHTML = '<option value="">All classes</option>' + classes.map(c => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('');

    const counts = { signed: 0, missing: 0, withdrawn: 0 };
    all.forEach(r => counts[r.st]++);
    const total = all.length || 1, C = 2 * Math.PI * 52;
    const cols = { signed: '#3DD68C', missing: '#FFB547', withdrawn: '#FF5470' };
    let off = 0;
    const arcs = Object.entries(counts).map(([k, n]) => {
      const len = n / total * C;
      const a = `<circle r="52" cx="70" cy="70" stroke="${cols[k]}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`;
      off += len; return a;
    }).join('');
    $('#donut', main).innerHTML = `<svg viewBox="0 0 140 140" aria-hidden="true"><circle r="52" cx="70" cy="70" stroke="rgba(11,27,54,.07)"/>${arcs}</svg>
      <div class="legend">${Object.entries(counts).map(([k, n]) => `<div><i style="background:${cols[k]}"></i>${ST[k][1]}<b>${n}</b></div>`).join('')}</div>`;
    if (animate && hasGsap() && !reduced()) {
      gsap.from('#bars i', { scaleY: 0, duration: 1.2, ease: 'expo.out', stagger: .07, delay: .2 });
      gsap.from('#donut svg', { rotate: -270, opacity: 0, duration: 1.4, ease: 'expo.out' });
    }
  }

  function table() {
    const all = rowsAll();
    const rows = all.filter(r =>
      (!state.cls || r.cls === state.cls) && (!state.st || r.st === state.st) &&
      (!state.q || `${r.k.first} ${r.k.last} ${r.p.first} ${r.p.last} ${r.p.email}`.toLowerCase().includes(state.q)));
    $('#count', main).textContent = `${rows.length} of ${all.length} players`;
    $('#rows', main).innerHTML = rows.length ? rows.map(({ k, p, cls, st }) => `<tr class="click" data-id="${p.id}" tabindex="0">
      <td><div class="pname"><span class="av" style="${avatarStyle(k.id)}">${esc(initials(k.first, k.last))}</span><div>${esc(k.first)} ${esc(k.last)}${k.notes ? '<small>Has a note for the coach</small>' : ''}</div></div></td>
      <td><b>${cls}</b></td>
      <td>${fmtDate(k.dob)}</td>
      <td>${esc(p.first)} ${esc(p.last)}<small>${esc(p.email)}</small></td>
      <td><span class="pill ${ST[st][0]}">${ST[st][1]}</span></td>
      <td>${fmtDate(k.createdAt)}</td></tr>`).join('')
      : '<tr><td colspan="6" class="muted" style="text-align:center;padding:40px">No players match these filters.</td></tr>';
  }

  function auditLog() {
    $('#audit', main).innerHTML = db.audit.slice(0, 12).map(a => `<li><time>${fmtDateTime(a.at)}</time><span><b>${esc(a.actor)}</b> &middot; ${esc(a.action)}</span></li>`).join('') || '<li class="muted">Nothing yet.</li>';
  }

  function exportCsv() {
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const head = ['Player first name', 'Player last name', 'Date of birth', 'Class', 'Parent', 'Parent email', 'Consent', 'Photo consent', 'Registered'];
    const lines = rowsAll().map(({ k, p, cls, st }) => {
      const c = consentsOf(k.id).find(x => !x.withdrawnAt);
      return [k.first, k.last, k.dob, cls, `${p.first} ${p.last}`, p.email, st, c ? (c.items.photo ? 'yes' : 'no') : '', new Date(k.createdAt).toISOString().slice(0, 10)].map(cell).join(',');
    });
    download(`players-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [head.map(cell).join(','), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
    audit('Club Admin', 'Exported the player list (CSV)');
    auditLog();
    toast('Player list exported.');
  }

  function familyModal(parentId) {
    const p = userById(parentId);
    if (!p) return;
    const kids = childrenOf(p.id);
    audit('Club Admin', `Viewed family record (${p.last})`);
    openModal({
      title: `${p.first} ${p.last}`,
      sub: `Parent account since ${fmtDate(p.createdAt)}`,
      wide: true,
      html: `<div class="detail-grid">
          <div><small>Email</small><b>${esc(p.email)}</b></div>
          <div><small>Email confirmed</small><b>${p.verified ? 'Yes' : 'Not yet'}</b></div>
        </div>
        ${kids.map(k => {
          const st = consentStatus(k.id), c = consentsOf(k.id)[0];
          return `<div class="card panel" style="padding:18px;margin-bottom:10px;background:var(--bg);box-shadow:none">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
              <div class="pname" style="display:flex;gap:12px;align-items:center"><span class="av" style="${avatarStyle(k.id)};width:40px;height:40px">${esc(initials(k.first, k.last))}</span><div><b>${esc(k.first)} ${esc(k.last)}</b><small class="muted" style="display:block">${ageClass(k)} &middot; born ${fmtDate(k.dob)}</small></div></div>
              <span class="pill ${ST[st][0]}">${ST[st][1]}</span>
            </div>
            ${k.notes ? `<p style="margin-top:12px;font-size:14px"><span class="muted">Note for coach:</span> ${esc(k.notes)}</p>` : ''}
            ${c ? `<p class="muted" style="margin-top:10px;font-size:13px">Last consent ${fmtDateTime(c.at)}, version ${c.version}, photos ${c.items.photo ? 'yes' : 'no'}${c.withdrawnAt ? `, withdrawn ${fmtDate(c.withdrawnAt)}` : ''}</p>` : ''}
            ${st !== 'signed' ? `<button class="btn btn-ghost btn-sm" style="margin-top:12px" data-remind="${k.id}">${icon.bell} Send consent reminder</button>` : ''}
          </div>`;
        }).join('') || '<p class="muted">No children on this account yet.</p>'}
        <div class="modal-foot" style="justify-content:space-between">
          <button class="btn btn-danger btn-sm" id="erase">${icon.trash} Delete family (GDPR request)</button>
          <button class="btn btn-primary btn-sm" data-close>Done</button>
        </div>`,
      onMount(w, close) {
        $$('[data-remind]', w).forEach(b => b.addEventListener('click', () => {
          const k = kids.find(x => x.id === b.dataset.remind);
          sendMail(p.email, `Consent needed for ${k.first}`, wrapMail('Consent needed', `<p>Hi ${esc(p.first)},</p><p>We are missing consent for <b>${esc(k.first)}</b>. Please log in and give consent so ${esc(k.first)} can join training.</p><p>It takes less than a minute.</p>`));
          audit('Club Admin', `Sent consent reminder (${k.first} ${k.last})`);
          b.disabled = true; b.textContent = 'Reminder sent';
          auditLog();
        }));
        $('#erase', w).addEventListener('click', async () => {
          close();
          const ok = await confirmBox({ title: `Delete the ${esc(p.last)} family?`, text: 'Use this when a parent asks the club to erase their data. The account, all children and all consent records are removed for good.', confirmLabel: 'Delete family', danger: true, requireWord: 'DELETE' });
          if (!ok) return;
          const email = p.email, first = p.first;
          deleteFamily(p.id);
          audit('Club Admin', 'Deleted a family on request (GDPR erasure)');
          sendMail(email, 'Your data has been deleted', wrapMail('Your data has been deleted', `<p>Hi ${esc(first)},</p><p>As requested, the club has deleted your account, your children's profiles and all consent records.</p>`));
          toast('Family deleted.');
          refresh();
        });
      }
    });
    auditLog();
  }

  refresh(true);
  enter(main, '.page-head, .kpi, .charts .panel, .app .panel');
  magnetic(main);
  const onMail = () => auditLog();
  document.addEventListener('visibilitychange', onMail);
  return () => document.removeEventListener('visibilitychange', onMail);
}
