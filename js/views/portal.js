import { db, save, uid, session, currentUser, childrenOf, consentsOf, consentStatus, activeConsent, ageClass, ageOf, hashPassword, verifyPassword, audit, deleteFamily, exportFor, CONSENT_VERSION, CLUB_MAILBOX } from '../store.js';
import { $, $$, esc, go, icon, toast, openModal, confirmBox, fieldError, clearErrors, formError, pwScore, bindPasswordUI, pwField, setBusy, fmtDate, fmtDateTime, initials, avatarStyle, download } from '../ui.js';
import { sendMail, wrapMail } from '../mail.js';
import { consentPdf, CONSENT_ITEMS } from '../pdf.js';
import { enter, magnetic } from '../fx.js';

const TABS = [
  ['children', 'My children', icon.users],
  ['consents', 'Consents', icon.file],
  ['privacy', 'Privacy and data', icon.shield],
  ['account', 'Account', icon.user]
];
const STATUS = { signed: ['ok', 'Consent signed'], missing: ['warn', 'Consent needed'], withdrawn: ['bad', 'Consent withdrawn'] };

export async function renderPortal(main, [tab = 'children']) {
  const me = currentUser('parent');
  if (!me) { go('login'); return; }
  if (!TABS.find(t => t[0] === tab)) tab = 'children';

  main.innerHTML = `<div class="app-bg"></div>
  <section class="app">
    <aside class="card side">
      <div class="who"><span class="av" style="${avatarStyle(me.email)}">${esc(initials(me.first, me.last))}</span><div style="min-width:0"><b>${esc(me.first)} ${esc(me.last)}</b><small>${esc(me.email)}</small></div></div>
      <nav aria-label="Parent portal">
        ${TABS.map(([k, l, ic]) => `<a href="#/portal/${k}" class="${k === tab ? 'active' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${ic}${l}</a>`).join('')}
        <div class="sep"></div>
        <button id="logout">${icon.logout}Log out</button>
      </nav>
    </aside>
    <div id="pv"></div>
  </section>`;

  $('#logout', main).addEventListener('click', () => {
    audit(`${me.first} ${me.last}`, 'Logged out');
    session.clear(); toast('You are logged out.'); go('');
  });

  const pv = $('#pv', main);
  const views = { children, consents, privacy, account };
  const render = () => { views[tab](pv, me, render); enter(pv, '.page-head, .banner, .kid, .add-kid, .panel, .action, .empty'); magnetic(pv); };
  render();
  enter(main, '.side');
}

/* ---------------- children ---------------- */
function children(pv, me, rerender) {
  const kids = childrenOf(me.id);
  const s = session.get();
  pv.innerHTML = `
    <div class="page-head"><div><h1>My children</h1><p>Every child on your account, with age class and consent status.</p></div>
      <button class="btn btn-primary" id="addKid" data-magnetic>${icon.plus} Add child</button></div>
    ${s.welcome && !kids.length ? `<div class="banner"><span class="ic">${icon.ball}</span><div><b>Welcome, ${esc(me.first)}!</b><span>Add your first child to finish the registration. It takes about 30 seconds.</span></div></div>` : ''}
    ${kids.some(k => consentStatus(k.id) !== 'signed') && kids.length ? `<div class="banner"><span class="ic">${icon.bell}</span><div><b>Consent needed</b><span>Some children are missing consent. They can join training once it is signed.</span></div></div>` : ''}
    <div class="kids">
      ${kids.map(k => {
        const st = consentStatus(k.id), [cls, label] = STATUS[st];
        return `<article class="card kid">
          <span class="class-tag" title="Age class">${ageClass(k)}</span>
          <div class="kid-top"><span class="av" style="${avatarStyle(k.id)}">${esc(initials(k.first, k.last))}</span>
            <div><h3>${esc(k.first)} ${esc(k.last)}</h3><span class="sub">${ageOf(k.dob)} years old</span></div></div>
          <div class="kid-meta"><div><small>Born</small><b>${fmtDate(k.dob)}</b></div><div><small>Team</small><b>${k.gender === 'girl' ? 'Girls' : 'Boys'} ${ageClass(k)}</b></div></div>
          <p style="margin-bottom:16px"><span class="pill ${cls}">${label}</span></p>
          <div class="kid-actions">
            ${st === 'signed' ? `<button class="btn btn-ghost btn-sm" data-pdf="${k.id}">${icon.download} Consent PDF</button>` : `<button class="btn btn-primary btn-sm" data-consent="${k.id}">Give consent</button>`}
            <button class="icon-btn" data-edit="${k.id}" aria-label="Edit ${esc(k.first)}">${icon.edit}</button>
            <button class="icon-btn" data-del="${k.id}" aria-label="Remove ${esc(k.first)}">${icon.trash}</button>
          </div>
        </article>`;
      }).join('')}
      <button class="add-kid" id="addKid2"><div><i>+</i><b style="display:block;color:var(--text)">Add a child</b><span style="font-size:14px">Brothers and sisters too</span></div></button>
    </div>`;

  const add = () => childModal(me, null, rerender);
  $('#addKid', pv).addEventListener('click', add);
  $('#addKid2', pv).addEventListener('click', add);
  $$('[data-edit]', pv).forEach(b => b.addEventListener('click', () => childModal(me, db.children.find(c => c.id === b.dataset.edit), rerender)));
  $$('[data-consent]', pv).forEach(b => b.addEventListener('click', () => consentModal(me, db.children.find(c => c.id === b.dataset.consent), rerender)));
  $$('[data-pdf]', pv).forEach(b => b.addEventListener('click', () => {
    const k = db.children.find(c => c.id === b.dataset.pdf);
    download(`consent-${k.first}.pdf`, consentPdf({ parent: me, child: k, consent: activeConsent(k.id) }));
  }));
  $$('[data-del]', pv).forEach(b => b.addEventListener('click', async () => {
    const k = db.children.find(c => c.id === b.dataset.del);
    const ok = await confirmBox({ title: `Remove ${k.first}?`, text: `${esc(k.first)}'s profile and consent records are deleted for good. This cannot be undone.`, confirmLabel: 'Remove child', danger: true });
    if (!ok) return;
    db.children = db.children.filter(c => c.id !== k.id);
    db.consents = db.consents.filter(c => c.childId !== k.id);
    save();
    audit(`${me.first} ${me.last}`, `Removed a child profile (${k.first})`);
    toast(`${k.first} was removed.`);
    rerender();
  }));
}

function childModal(me, child, rerender) {
  const isNew = !child;
  const max = new Date().toISOString().slice(0, 10);
  openModal({
    title: isNew ? 'Add a child' : `Edit ${child.first}`,
    sub: 'We only ask for what the club needs.',
    html: `<form class="form" id="cf" novalidate>
      <div class="row2">
        <div class="field"><label for="cfirst">First name</label><input class="input" id="cfirst" name="first" value="${esc(child?.first || '')}" required></div>
        <div class="field"><label for="clast">Last name</label><input class="input" id="clast" name="last" value="${esc(child?.last || me.last)}" required></div>
      </div>
      <div class="row2">
        <div class="field"><label for="dob">Date of birth</label><input class="input" id="dob" name="dob" type="date" max="${max}" min="2005-01-01" value="${esc(child?.dob || '')}" required></div>
        <div class="field"><label for="gender">Plays in</label><select class="input" id="gender" name="gender"><option value="girl" ${child?.gender === 'girl' ? 'selected' : ''}>Girls team</option><option value="boy" ${child?.gender === 'boy' ? 'selected' : ''}>Boys team</option></select></div>
      </div>
      <div class="field"><label for="notes">Note for the coach <span class="opt">(optional)</span></label><textarea class="input" id="notes" name="notes" maxlength="200" placeholder="Only what the coach needs to know, for example asthma or allergies.">${esc(child?.notes || '')}</textarea></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">${isNew ? 'Add child' : 'Save changes'}</button></div>
    </form>`,
    onMount(w, close) {
      const form = $('#cf', w);
      form.addEventListener('submit', e => {
        e.preventDefault();
        clearErrors(form);
        const f = Object.fromEntries(new FormData(form));
        let bad = false;
        if (!f.first.trim()) { fieldError(form, 'first', 'Please enter a first name.'); bad = true; }
        if (!f.last.trim()) { fieldError(form, 'last', 'Please enter a last name.'); bad = true; }
        const age = f.dob ? ageOf(f.dob) : -1;
        if (!f.dob || age < 4 || age > 19) { fieldError(form, 'dob', 'Players must be between 4 and 19 years old.'); bad = true; }
        if (bad) return;
        const data = { first: f.first.trim(), last: f.last.trim(), dob: f.dob, gender: f.gender, notes: f.notes.trim().slice(0, 200) };
        let k = child;
        if (isNew) { k = { id: uid('c'), parentId: me.id, createdAt: Date.now(), ...data }; db.children.push(k); }
        else Object.assign(child, data);
        save();
        audit(`${me.first} ${me.last}`, `${isNew ? 'Added' : 'Updated'} a child profile (${data.first})`);
        const s = session.get(); if (s.welcome) session.set({ ...s, welcome: false });
        close();
        toast(isNew ? `${data.first} was added.` : 'Changes saved.');
        rerender();
        if (isNew) setTimeout(() => consentModal(me, k, rerender), 450);
      });
    }
  });
}

function consentModal(me, child, rerender) {
  openModal({
    title: `Consent for ${child.first}`,
    sub: `Version ${CONSENT_VERSION}. You can withdraw it at any time.`,
    wide: true,
    html: `<form class="form" id="kf" novalidate>
      <div class="consent-text"><p>The club needs a parent's consent before a child under 18 can take part. In Norway, children under 13 cannot consent online themselves, so it is given here by you.</p><p>The club stores only what is on this account, keeps it safe, and never shares or sells it.</p></div>
      ${CONSENT_ITEMS.map(i => `<label class="check"><input type="checkbox" name="${i.key}"><span><b style="color:var(--text)">${i.title}${i.required ? ' *' : ''}</b><br>${i.text}</span></label>`).join('')}
      <div class="field" style="margin-top:6px"><label for="sig">Type your full name to sign</label><input class="input sign-input" id="sig" name="sig" placeholder="${esc(me.first)} ${esc(me.last)}" autocomplete="off"></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Later</button><button class="btn btn-primary" type="submit">Sign and send copy</button></div>
    </form>`,
    onMount(w, close) {
      const form = $('#kf', w);
      form.addEventListener('submit', e => {
        e.preventDefault();
        clearErrors(form);
        const f = Object.fromEntries(new FormData(form));
        let bad = false;
        CONSENT_ITEMS.filter(i => i.required).forEach(i => { if (!f[i.key]) { fieldError(form, i.key, ' '); bad = true; } });
        const full = `${me.first} ${me.last}`;
        if ((f.sig || '').trim().toLowerCase() !== full.toLowerCase()) { fieldError(form, 'sig', `Please type your full name exactly: ${full}`); bad = true; }
        if (bad) { if (!f.participation || !f.data) formError(form, 'Participation and data processing are required.'); return; }
        const consent = { id: uid('k'), childId: child.id, parentId: me.id, version: CONSENT_VERSION, items: { participation: true, data: true, photo: !!f.photo }, signedBy: f.sig.trim(), at: Date.now(), withdrawnAt: null };
        db.consents.push(consent);
        save();
        audit(`${me.first} ${me.last}`, `Signed consent for ${child.first}`);
        const pdf = consentPdf({ parent: me, child, consent });
        const att = [{ name: `consent-${child.first}.pdf`, url: pdf }];
        sendMail(me.email, `Consent confirmed for ${child.first}`, wrapMail('Consent received', `<p>Hi ${esc(me.first)},</p><p>Thank you. We have saved your consent for <b>${esc(child.first)} ${esc(child.last)}</b> (${ageClass(child)}). A signed copy is attached for your records.</p><p>Signed ${fmtDateTime(consent.at)} as ${esc(consent.signedBy)}.</p>`), att);
        sendMail(CLUB_MAILBOX, `New consent: ${child.first} ${child.last} (${ageClass(child)})`, wrapMail('New consent received', `<p>${esc(me.first)} ${esc(me.last)} signed consent for <b>${esc(child.first)} ${esc(child.last)}</b>. The signed form is attached.</p>`), att);
        close();
        toast(`Consent saved. A copy is in your inbox.`);
        rerender();
      });
    }
  });
}

/* ---------------- consents ---------------- */
function consents(pv, me, rerender) {
  const kids = childrenOf(me.id);
  const rows = kids.flatMap(k => consentsOf(k.id).map(c => ({ k, c })));
  pv.innerHTML = `
    <div class="page-head"><div><h1>Consents</h1><p>A full record of what you agreed to, and when.</p></div></div>
    ${rows.length ? `<div class="card panel" style="padding:0;overflow:hidden"><div class="table-wrap" style="border:0;border-radius:0"><table class="tbl">
      <thead><tr><th>Child</th><th>Signed</th><th>Photos</th><th>Version</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map(({ k, c }) => `<tr>
        <td><div class="pname"><span class="av" style="${avatarStyle(k.id)}">${esc(initials(k.first, k.last))}</span><div>${esc(k.first)} ${esc(k.last)}<small>${ageClass(k)}</small></div></div></td>
        <td>${fmtDateTime(c.at)}<small>by ${esc(c.signedBy)}</small></td>
        <td>${c.items.photo ? 'Yes' : 'No'}</td>
        <td>${c.version}</td>
        <td>${c.withdrawnAt ? `<span class="pill bad">Withdrawn</span><small>${fmtDate(c.withdrawnAt)}</small>` : '<span class="pill ok">Active</span>'}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="icon-btn" data-dl="${c.id}" aria-label="Download PDF">${icon.download}</button>
          ${c.withdrawnAt ? '' : `<button class="btn btn-ghost btn-sm" data-wd="${c.id}" style="margin-left:6px">Withdraw</button>`}
        </td></tr>`).join('')}</tbody></table></div></div>`
      : `<div class="card panel empty"><h3>No consents yet</h3><p class="muted" style="margin:8px 0 20px">Add a child and give consent to see it here.</p><a class="btn btn-primary" href="#/portal/children">Go to my children</a></div>`}`;

  $$('[data-dl]', pv).forEach(b => b.addEventListener('click', () => {
    const c = db.consents.find(x => x.id === b.dataset.dl), k = db.children.find(x => x.id === c.childId);
    download(`consent-${k.first}-${c.version}.pdf`, consentPdf({ parent: me, child: k, consent: c }));
  }));
  $$('[data-wd]', pv).forEach(b => b.addEventListener('click', async () => {
    const c = db.consents.find(x => x.id === b.dataset.wd), k = db.children.find(x => x.id === c.childId);
    const ok = await confirmBox({ title: 'Withdraw consent?', text: `${esc(k.first)} cannot take part until new consent is given. The withdrawal is logged with date and time.`, confirmLabel: 'Withdraw consent', danger: true });
    if (!ok) return;
    c.withdrawnAt = Date.now(); save();
    audit(`${me.first} ${me.last}`, `Withdrew consent for ${k.first}`);
    sendMail(me.email, `Consent withdrawn for ${k.first}`, wrapMail('Consent withdrawn', `<p>Hi ${esc(me.first)},</p><p>Your consent for ${esc(k.first)} was withdrawn on ${fmtDateTime(c.withdrawnAt)}. You can give new consent at any time from your account.</p>`));
    sendMail(CLUB_MAILBOX, `Consent withdrawn: ${k.first} ${k.last}`, wrapMail('Consent withdrawn', `<p>${esc(me.first)} ${esc(me.last)} withdrew consent for <b>${esc(k.first)} ${esc(k.last)}</b>.</p>`));
    toast('Consent withdrawn.');
    rerender();
  }));
}

/* ---------------- privacy ---------------- */
function privacy(pv, me) {
  const kids = childrenOf(me.id);
  pv.innerHTML = `
    <div class="page-head"><div><h1>Privacy and data</h1><p>Your rights under GDPR, one click each.</p></div></div>
    <div class="actions3">
      <div class="card action ok"><span class="ic">${icon.download}</span><h3>Download my data</h3><p>Everything stored about you and your children, as a file you can keep.</p><button class="btn btn-ghost btn-sm" id="exp">Download (JSON)</button></div>
      <div class="card action"><span class="ic">${icon.undo}</span><h3>Withdraw consent</h3><p>Stop consent for one child. It is logged and the club is told.</p><a class="btn btn-ghost btn-sm" href="#/portal/consents">Manage consents</a></div>
      <div class="card action danger"><span class="ic">${icon.trash}</span><h3>Delete my account</h3><p>Removes your account, all children and all consent records for good.</p><button class="btn btn-danger btn-sm" id="del">Delete account</button></div>
    </div>
    <div class="card panel" style="margin-top:16px"><h3>What is stored</h3><p class="muted">No more than the club needs. Nothing is shared or sold.</p>
      <div class="store-list">
        <div><span>Your name</span><b>${esc(me.first)} ${esc(me.last)}</b></div>
        <div><span>Your email</span><b>${esc(me.email)}</b></div>
        <div><span>Account created</span><b>${fmtDate(me.createdAt)}</b></div>
        <div><span>Children</span><b>${kids.length}</b></div>
        <div><span>Per child</span><b>Name, birth date, team, note</b></div>
        <div><span>Consent records</span><b>${kids.reduce((n, k) => n + consentsOf(k.id).length, 0)}</b></div>
      </div></div>`;

  $('#exp', pv).addEventListener('click', () => {
    download(`my-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportFor(me.id), null, 2), 'application/json');
    audit(`${me.first} ${me.last}`, 'Downloaded own data');
    toast('Your data was downloaded.');
  });
  $('#del', pv).addEventListener('click', async () => {
    const ok = await confirmBox({ title: 'Delete your account?', text: `This removes your account, ${kids.length} ${kids.length === 1 ? 'child' : 'children'} and every consent record. It cannot be undone.`, confirmLabel: 'Delete everything', danger: true, requireWord: 'DELETE' });
    if (!ok) return;
    const email = me.email, first = me.first;
    deleteFamily(me.id);
    audit('Parent', 'Deleted own account and all children (GDPR erasure)');
    sendMail(email, 'Your account has been deleted', wrapMail('Account deleted', `<p>Hi ${esc(first)},</p><p>Your account, your children's profiles and all consent records have been deleted. Thank you for being part of the club.</p>`));
    session.clear();
    toast('Your account and all data were deleted.');
    go('');
  });
}

/* ---------------- account ---------------- */
function account(pv, me, rerender) {
  pv.innerHTML = `
    <div class="page-head"><div><h1>Account</h1><p>Your details and password.</p></div></div>
    <div class="card panel"><h3>Your details</h3><p class="muted">Used on consent forms and emails.</p>
      <form class="form" id="af" novalidate style="max-width:560px">
        <div class="row2">
          <div class="field"><label for="afirst">First name</label><input class="input" id="afirst" name="first" value="${esc(me.first)}"></div>
          <div class="field"><label for="alast">Last name</label><input class="input" id="alast" name="last" value="${esc(me.last)}"></div>
        </div>
        <div class="field"><label for="aemail">Email</label><input class="input" id="aemail" value="${esc(me.email)}" disabled></div>
        <div><button class="btn btn-primary" type="submit">Save details</button></div>
      </form></div>
    <div class="card panel"><h3>Change password</h3><p class="muted">You get an email whenever the password changes.</p>
      <form class="form" id="pf" novalidate style="max-width:560px">
        ${pwField('current', 'Current password', 'current-password')}
        ${pwField('next', 'New password', 'new-password', true)}
        <div><button class="btn btn-primary" type="submit">Change password</button></div>
      </form></div>`;

  const af = $('#af', pv);
  af.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(af);
    const f = Object.fromEntries(new FormData(af));
    if (!f.first.trim()) { fieldError(af, 'first', 'Required.'); return; }
    if (!f.last.trim()) { fieldError(af, 'last', 'Required.'); return; }
    me.first = f.first.trim(); me.last = f.last.trim(); save();
    audit(`${me.first} ${me.last}`, 'Updated account details');
    toast('Details saved.');
    const who = document.querySelector('.who b');
    if (who) who.textContent = `${me.first} ${me.last}`;
  });
  const pf = $('#pf', pv);
  bindPasswordUI(pf);
  pf.addEventListener('submit', async e => {
    e.preventDefault(); clearErrors(pf);
    const f = Object.fromEntries(new FormData(pf));
    const btn = pf.querySelector('[type=submit]');
    setBusy(btn, true);
    const ok = await verifyPassword(f.current || '', me.pw);
    if (!ok) { setBusy(btn, false); fieldError(pf, 'current', 'That is not your current password.'); return; }
    if (f.next.length < 10 || pwScore(f.next) < 3) { setBusy(btn, false); fieldError(pf, 'next', 'Use at least 10 characters with upper and lower case and a number.'); return; }
    me.pw = await hashPassword(f.next); save();
    setBusy(btn, false);
    audit(`${me.first} ${me.last}`, 'Changed password');
    sendMail(me.email, 'Your password was changed', wrapMail('Password changed', `<p>Hi ${esc(me.first)},</p><p>Your password was just changed. If this was not you, contact the club right away.</p>`));
    pf.reset();
    toast('Password changed.');
  });
}
