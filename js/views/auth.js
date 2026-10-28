import { db, save, uid, norm, session, userByEmail, userById, hashPassword, verifyPassword, issueCode, checkCode, codeSentAt, lockedFor, loginFailed, loginOk, audit, currentUser } from '../store.js';
import { $, esc, vid, go, icon, toast, openModal, fieldError, clearErrors, formError, validEmail, pwScore, bindPasswordUI, pwField, bindCodeInputs, codeInputsHTML, setBusy, maskEmail, demoNote } from '../ui.js';
import { sendMail, wrapMail, openInbox } from '../mail.js';
import { enter, magnetic, autoVideos } from '../fx.js';

const STEPS = ['Create account', 'Confirm email', 'Add children', 'Give consent'];

function layout(main, { kicker, title, text, step, card, media = 'parent' }) {
  main.innerHTML = `<div class="app-bg"></div>
  <section class="auth">
    <div class="auth-art">
      <div class="art-media">${vid(media, { preload: 'auto' })}</div>
      <span class="eyebrow">${kicker}</span>
      <h1>${title}</h1>
      <p>${text}</p>
      ${step ? `<ol class="auth-steps">${STEPS.map((s, i) => `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''}"><b>${i + 1 < step ? '&#10003;' : i + 1}</b>${s}</li>`).join('')}</ol>` : ''}
    </div>
    <div class="auth-side"><div class="card auth-card">${card}</div></div>
  </section>`;
  enter(main, '.auth-art > *:not(.art-media), .auth-card > *', { stagger: .05 });
  magnetic(main);
  return autoVideos(main);
}

async function sendVerifyCode(user) {
  const code = await issueCode(user.id, 'verify');
  sendMail(user.email, `Your code: ${code}`, wrapMail('Confirm your email', `
    <p>Hi ${esc(user.first)},</p>
    <p>Use this code to confirm your email address and finish creating your parent account.</p>
    <div class="code">${code}</div>
    <p>The code works once and expires in 15 minutes. If you did not create an account, you can ignore this email.</p>`));
}

/* ---------------- register ---------------- */
export async function renderRegister(main) {
  const me = currentUser('parent');
  if (me) { go('portal'); return; }
  layout(main, {
    media: 'parent',
    kicker: 'Join the club',
    title: 'Sign up in<br>two minutes.',
    text: 'One parent account for the whole family. Add every child, give consent once, and get a copy by email.',
    step: 1,
    card: `<h2>Create parent account</h2><p class="muted">Already registered? <a class="link" href="#/login">Log in</a></p>
      ${demoNote('Preview mode. Use any email address. The verification code arrives in the <b>Demo inbox</b> at the top right.')}
      <form class="form" id="reg" novalidate>
        <div class="row2">
          <div class="field"><label for="first">First name</label><input class="input" id="first" name="first" autocomplete="given-name" required></div>
          <div class="field"><label for="last">Last name</label><input class="input" id="last" name="last" autocomplete="family-name" required></div>
        </div>
        <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" placeholder="you@example.no" required></div>
        ${pwField('password', 'Password', 'new-password', true)}
        ${pwField('confirm', 'Repeat password', 'new-password')}
        <label class="check"><input type="checkbox" name="guardian"><span>I am the parent or legal guardian of the children I will add.</span></label>
        <label class="check"><input type="checkbox" name="privacy"><span>I have read the <button type="button" class="link" id="policyLink">privacy policy</button>.</span></label>
        <button class="btn btn-primary btn-block" type="submit">Create account ${icon.arrow}</button>
      </form>`
  });
  const form = $('#reg', main);
  bindPasswordUI(form);
  $('#policyLink', main).addEventListener('click', policyModal);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors(form);
    const f = Object.fromEntries(new FormData(form));
    let bad = false;
    const need = (k, msg) => { if (!String(f[k] || '').trim()) { fieldError(form, k, msg); bad = true; } };
    need('first', 'Please enter your first name.');
    need('last', 'Please enter your last name.');
    if (!validEmail(f.email)) { fieldError(form, 'email', 'Please enter a valid email address.'); bad = true; }
    if ((f.password || '').length < 10 || pwScore(f.password) < 3) { fieldError(form, 'password', 'Use at least 10 characters with upper and lower case and a number.'); bad = true; }
    if (f.password !== f.confirm) { fieldError(form, 'confirm', 'The passwords do not match.'); bad = true; }
    if (!f.guardian) { fieldError(form, 'guardian', ' '); bad = true; }
    if (!f.privacy) { fieldError(form, 'privacy', ' '); bad = true; }
    if (bad) { form.querySelector('.err input')?.focus(); return; }

    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true);
    let user = userByEmail(f.email);
    if (user && (user.verified || user.role !== 'parent')) {
      setBusy(btn, false);
      formError(form, 'An account with this email already exists. Try logging in instead.');
      return;
    }
    const pw = await hashPassword(f.password);
    if (user) Object.assign(user, { first: f.first.trim(), last: f.last.trim(), pw });
    else {
      user = { id: uid('u'), role: 'parent', first: f.first.trim(), last: f.last.trim(), email: norm(f.email), pw, verified: false, createdAt: Date.now() };
      db.users.push(user);
    }
    save();
    audit(`${user.first} ${user.last}`, 'Created a parent account');
    await sendVerifyCode(user);
    session.set({ pending: user.id });
    go('verify');
  });
}

function policyModal() {
  openModal({
    title: 'Privacy policy',
    sub: 'Placeholder text. The club provides the final wording.',
    html: `<div class="consent-text" style="max-height:300px">
      <p><b>What we store.</b> Your name and email, and for each child: name, date of birth, gender for age class, optional notes for the coach, and consent records.</p>
      <p><b>Why.</b> To organise teams, contact parents and keep a record of consent.</p>
      <p><b>Who sees it.</b> You, and the club admins. Nobody else. Data is never sold or shared.</p>
      <p><b>Your rights.</b> You can download your data, correct it, withdraw consent or delete your account at any time from "Privacy and data".</p>
      <p><b>How long.</b> Until you delete the account, or 12 months after the last season your child played.</p>
    </div><div class="modal-foot"><button class="btn btn-primary" data-close>Got it</button></div>`
  });
}

/* ---------------- verify ---------------- */
export async function renderVerify(main) {
  const s = session.get();
  const user = s?.pending && userById(s.pending);
  if (!user) { go('register'); return; }
  layout(main, {
    media: 'sign',
    kicker: 'Almost there',
    title: 'Check your<br>inbox.',
    text: `We sent a 6-digit code to ${esc(maskEmail(user.email))}. It works once and expires in 15 minutes.`,
    step: 2,
    card: `<h2>Enter your code</h2><p class="muted">Sent to <b style="color:var(--text)">${esc(user.email)}</b></p>
      ${demoNote('Open the <b>Demo inbox</b> to find the code. In the real platform it arrives by normal email.')}
      <form class="form" id="vf" novalidate>
        ${codeInputsHTML()}
        <div class="resend"><span id="cool"></span><button type="button" class="link" id="resend">Send a new code</button></div>
        <button class="btn btn-primary btn-block" type="submit">Confirm email</button>
        <button class="btn btn-ghost btn-block" type="button" id="openIn">${icon.mail} Open demo inbox</button>
      </form>`
  });
  const form = $('#vf', main);
  const resend = $('#resend', main), cool = $('#cool', main);
  $('#openIn', main).addEventListener('click', () => openInbox(db.mail.find(m => m.to === user.email)?.id));
  const code = bindCodeInputs($('.code-inputs', form), () => form.requestSubmit());
  setTimeout(() => form.querySelector('input').focus(), 300);

  const timer = setInterval(tick, 1000);
  function tick() {
    const left = 30 - Math.floor((Date.now() - codeSentAt(user.id, 'verify')) / 1000);
    resend.disabled = left > 0;
    resend.style.opacity = left > 0 ? .4 : 1;
    cool.textContent = left > 0 ? `New code available in ${left}s` : 'Did not get it?';
  }
  tick();
  resend.addEventListener('click', async () => { await sendVerifyCode(user); code.clear(); tick(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors(form);
    if (code.value().length < 6) { formError(form, 'Please enter all 6 digits.'); return; }
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true);
    const r = await checkCode(user.id, 'verify', code.value());
    setBusy(btn, false);
    if (!r.ok) { formError(form, r.msg); code.shake(); code.clear(); return; }
    user.verified = true; save();
    audit(`${user.first} ${user.last}`, 'Confirmed email address');
    sendMail(user.email, 'Welcome to Kampklar, your registration is confirmed', wrapMail('Registration confirmed', `
      <p>Hi ${esc(user.first)},</p>
      <p>Your parent account is ready. Here is what happens next:</p>
      <ul><li>Add each of your children to the account</li><li>Give consent for each child</li><li>You get a signed copy of the consent form by email</li></ul>
      <p>You can manage your data or delete the account at any time under "Privacy and data".</p>
      <p>See you on court!</p>`));
    session.set({ userId: user.id, role: 'parent', welcome: true });
    toast('Email confirmed. Welcome!');
    go('portal');
  });
  return () => clearInterval(timer);
}

/* ---------------- login ---------------- */
export async function renderLogin(main) {
  if (currentUser('parent')) { go('portal'); return; }
  layout(main, {
    media: 'team',
    kicker: 'Parent portal',
    title: 'Welcome<br>back.',
    text: 'Log in to manage your children, consent and data. Five wrong attempts pause the account for a minute.',
    card: `<h2>Log in</h2><p class="muted">New here? <a class="link" href="#/register">Create an account</a></p>
      <form class="form" id="lf" novalidate>
        <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="username" required></div>
        ${pwField('password', 'Password', 'current-password')}
        <div style="text-align:right;margin-top:-6px"><a class="link" href="#/forgot" style="font-size:14px">Forgot password?</a></div>
        <button class="btn btn-primary btn-block" type="submit">Log in ${icon.arrow}</button>
      </form>`
  });
  const form = $('#lf', main);
  bindPasswordUI(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors(form);
    const { email, password } = Object.fromEntries(new FormData(form));
    if (!validEmail(email)) { fieldError(form, 'email', 'Please enter a valid email address.'); return; }
    if (!password) { fieldError(form, 'password', 'Please enter your password.'); return; }
    const wait = lockedFor(email);
    if (wait) { formError(form, `Too many attempts. Try again in ${wait} seconds.`); return; }
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true);
    const user = userByEmail(email);
    const ok = user && user.role === 'parent' && await verifyPassword(password, user.pw);
    setBusy(btn, false);
    if (!ok) {
      if (user?.role === 'admin') { formError(form, 'This is an admin account. Please use the Admin login.'); return; }
      const left = loginFailed(email);
      formError(form, lockedFor(email) ? 'Too many attempts. The account is paused for 60 seconds.' : `Wrong email or password. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
      return;
    }
    loginOk(email);
    if (!user.verified) {
      await sendVerifyCode(user);
      session.set({ pending: user.id });
      toast('Please confirm your email first. We sent a new code.');
      go('verify');
      return;
    }
    session.set({ userId: user.id, role: 'parent' });
    audit(`${user.first} ${user.last}`, 'Logged in');
    go('portal');
  });
}

/* ---------------- forgot password ---------------- */
export async function renderForgot(main) {
  layout(main, {
    media: 'parent',
    kicker: 'Reset password',
    title: 'Locked out?<br>No problem.',
    text: 'Enter your email and we send a code. For privacy, we never reveal whether an address is registered.',
    card: `<div id="fp"></div>`
  });
  const box = $('#fp', main);
  let target = null;

  function stepOne() {
    box.innerHTML = `<h2>Reset password</h2><p class="muted">Remembered it? <a class="link" href="#/login">Log in</a></p>
      <form class="form" id="f1" novalidate>
        <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required></div>
        <button class="btn btn-primary btn-block" type="submit">Send code ${icon.arrow}</button>
      </form>`;
    const form = $('#f1', box);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      clearErrors(form);
      const email = new FormData(form).get('email');
      if (!validEmail(email)) { fieldError(form, 'email', 'Please enter a valid email address.'); return; }
      const u = userByEmail(email);
      if (u && u.role === 'parent') {
        const code = await issueCode(u.id, 'reset');
        sendMail(u.email, 'Reset your password', wrapMail('Reset your password', `<p>Hi ${esc(u.first)},</p><p>Use this code to choose a new password:</p><div class="code">${code}</div><p>The code expires in 15 minutes. If you did not ask for this, you can ignore this email. Your password stays the same.</p>`));
      }
      target = u && u.role === 'parent' ? u : { id: 'none', email: norm(email) };
      stepTwo();
    });
  }

  function stepTwo() {
    box.innerHTML = `<h2>Choose a new password</h2><p class="muted">If ${esc(target.email)} has an account, a code is on its way.</p>
      ${demoNote('Find the code in the <b>Demo inbox</b>.')}
      <form class="form" id="f2" novalidate>
        ${codeInputsHTML('Reset code')}
        ${pwField('password', 'New password', 'new-password', true)}
        <button class="btn btn-primary btn-block" type="submit">Save new password</button>
      </form>`;
    const form = $('#f2', box);
    bindPasswordUI(form);
    const code = bindCodeInputs($('.code-inputs', form), () => form.querySelector('#password').focus());
    enter(box, '.form > *', { stagger: .05 });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      clearErrors(form);
      const pw = new FormData(form).get('password');
      if (code.value().length < 6) { formError(form, 'Please enter all 6 digits.'); return; }
      if (pw.length < 10 || pwScore(pw) < 3) { fieldError(form, 'password', 'Use at least 10 characters with upper and lower case and a number.'); return; }
      const r = target.id === 'none' ? { ok: false, msg: 'Wrong code.' } : await checkCode(target.id, 'reset', code.value());
      if (!r.ok) { formError(form, r.msg); code.shake(); return; }
      target.pw = await hashPassword(pw);
      target.verified = true;
      save();
      audit(`${target.first} ${target.last}`, 'Reset password');
      sendMail(target.email, 'Your password was changed', wrapMail('Password changed', `<p>Hi ${esc(target.first)},</p><p>Your password was just changed. If this was not you, contact the club right away.</p>`));
      toast('Password saved. You can log in now.');
      go('login');
    });
  }
  stepOne();
}
