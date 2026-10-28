// Browser-side stand-in for the real PHP + MySQL backend.
// Same rules as production: hashed passwords, hashed one-time codes,
// login throttling, consent records and an audit log.

const KEY = 'kampklar.db.v1';
const SKEY = 'kampklar.session.v1';
export const CONSENT_VERSION = '2026-10';
export const CLUB_MAILBOX = 'post@kampklar-club.test';
export const ADMIN_EMAIL = 'coach@kampklar-club.test';
export const ADMIN_PASSWORD = 'Handball2026!';

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

const blank = () => ({ users: [], children: [], consents: [], codes: [], mail: [], audit: [], throttle: {}, seeded: false });

function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export let db = load() || blank();
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked: keep in memory */ }
}
export function resetAll() {
  try { localStorage.removeItem(KEY); sessionStorage.removeItem(SKEY); } catch { /* ignore */ }
  db = blank();
  memSession = null;
}

export const uid = (p = 'id') => p + '_' + hex(crypto.getRandomValues(new Uint8Array(6)));
export const norm = e => String(e || '').trim().toLowerCase();

/* ---------- crypto ---------- */
export async function hashPassword(pw, salt) {
  salt = salt || hex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120000 }, key, 256);
  return { salt, hash: hex(bits) };
}
export async function verifyPassword(pw, rec) {
  const { hash } = await hashPassword(pw, rec.salt);
  return safeEqual(hash, rec.hash);
}
async function sha(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- session ---------- */
let memSession = null;
export const session = {
  get() { try { return JSON.parse(sessionStorage.getItem(SKEY)) || memSession; } catch { return memSession; } },
  set(v) { memSession = v; try { sessionStorage.setItem(SKEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear() { memSession = null; try { sessionStorage.removeItem(SKEY); } catch { /* ignore */ } }
};
export function currentUser(role) {
  const s = session.get();
  if (!s || !s.userId) return null;
  const u = db.users.find(x => x.id === s.userId);
  if (!u || (role && u.role !== role)) return null;
  if (u.role === 'admin' && !s.mfa) return null;
  return u;
}

/* ---------- one-time codes ---------- */
const CODE_TTL = 15 * 60 * 1000;
const CODE_TRIES = 5;
export async function issueCode(userId, purpose) {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  const code = String(n).padStart(6, '0');
  db.codes = db.codes.filter(c => !(c.userId === userId && c.purpose === purpose));
  db.codes.push({ userId, purpose, hash: await sha(code + ':' + userId), exp: Date.now() + CODE_TTL, tries: 0, sentAt: Date.now() });
  save();
  return code;
}
export function codeSentAt(userId, purpose) {
  const c = db.codes.find(x => x.userId === userId && x.purpose === purpose);
  return c ? c.sentAt : 0;
}
export async function checkCode(userId, purpose, code) {
  const c = db.codes.find(x => x.userId === userId && x.purpose === purpose);
  if (!c) return { ok: false, msg: 'No active code. Please request a new one.' };
  if (Date.now() > c.exp) return { ok: false, msg: 'This code has expired. Please request a new one.' };
  if (c.tries >= CODE_TRIES) return { ok: false, msg: 'Too many wrong attempts. Please request a new code.' };
  if (!safeEqual(await sha(code + ':' + userId), c.hash)) {
    c.tries++; save();
    const left = CODE_TRIES - c.tries;
    return { ok: false, msg: left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong attempts. Please request a new code.' };
  }
  db.codes = db.codes.filter(x => x !== c);
  save();
  return { ok: true };
}

/* ---------- login throttling ---------- */
export function lockedFor(email) {
  const t = db.throttle[norm(email)];
  return t && t.until > Date.now() ? Math.ceil((t.until - Date.now()) / 1000) : 0;
}
export function loginFailed(email) {
  const k = norm(email);
  const t = db.throttle[k] || { fails: 0, until: 0 };
  t.fails++;
  if (t.fails >= 5) { t.until = Date.now() + 60 * 1000; t.fails = 0; }
  db.throttle[k] = t; save();
  return 5 - t.fails;
}
export function loginOk(email) { delete db.throttle[norm(email)]; save(); }

/* ---------- audit ---------- */
export function audit(actor, action) {
  db.audit.unshift({ at: Date.now(), actor, action });
  db.audit = db.audit.slice(0, 200);
  save();
}

/* ---------- queries ---------- */
export const userByEmail = e => db.users.find(u => u.email === norm(e));
export const userById = id => db.users.find(u => u.id === id);
export const childrenOf = pid => db.children.filter(c => c.parentId === pid);
export const consentsOf = cid => db.consents.filter(c => c.childId === cid).sort((a, b) => b.at - a.at);
export const activeConsent = cid => consentsOf(cid).find(c => !c.withdrawnAt);
export function consentStatus(cid) {
  const all = consentsOf(cid);
  if (all.find(c => !c.withdrawnAt)) return 'signed';
  return all.length ? 'withdrawn' : 'missing';
}
// Norwegian handball age classes: J = jenter (girls), G = gutter (boys)
export function ageClass(child) {
  const y = new Date(child.dob).getFullYear();
  const age = new Date().getFullYear() - y;
  if (age <= 8) return 'Mini';
  const top = Math.min(age % 2 ? age + 1 : age, 20);
  return (child.gender === 'girl' ? 'J' : 'G') + top;
}
export function ageOf(dob) {
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

export function deleteFamily(parentId) {
  const kids = childrenOf(parentId).map(c => c.id);
  db.children = db.children.filter(c => c.parentId !== parentId);
  db.consents = db.consents.filter(c => !kids.includes(c.childId));
  db.codes = db.codes.filter(c => c.userId !== parentId);
  db.users = db.users.filter(u => u.id !== parentId);
  save();
}

export function exportFor(parentId) {
  const u = userById(parentId);
  return {
    exported_at: new Date().toISOString(),
    account: { first_name: u.first, last_name: u.last, email: u.email, created_at: new Date(u.createdAt).toISOString(), verified: u.verified },
    children: childrenOf(parentId).map(c => ({
      first_name: c.first, last_name: c.last, date_of_birth: c.dob, gender: c.gender, age_class: ageClass(c), notes_for_coach: c.notes || '',
      consents: consentsOf(c.id).map(k => ({ version: k.version, signed_by: k.signedBy, signed_at: new Date(k.at).toISOString(), items: k.items, withdrawn_at: k.withdrawnAt ? new Date(k.withdrawnAt).toISOString() : null }))
    }))
  };
}

/* ---------- seed ---------- */
const SEED = [
  ['Ingrid', 'Solberg', [['Emma', '2014-03-12', 'girl', 1], ['Jonas', '2016-08-30', 'boy', 1]]],
  ['Lars', 'Haugen', [['Nora', '2013-11-02', 'girl', 1]]],
  ['Kari', 'Nilsen', [['Oskar', '2015-05-19', 'boy', 0], ['Ella', '2017-01-07', 'girl', 1]]],
  ['Erik', 'Johansen', [['Filip', '2012-09-24', 'boy', 1]]],
  ['Marte', 'Berg', [['Sofie', '2014-06-15', 'girl', 1], ['Henrik', '2012-02-28', 'boy', 1], ['Maja', '2018-04-09', 'girl', 0]]],
  ['Thomas', 'Dahl', [['Leah', '2015-10-21', 'girl', 0]]],
  ['Silje', 'Lund', [['Aksel', '2013-07-03', 'boy', 1]]]
];
export async function ensureSeed() {
  if (db.seeded) return;
  const day = 86400000;
  const shared = await hashPassword('Demo-parent-2026');
  const admin = await hashPassword(ADMIN_PASSWORD);
  db.users.push({ id: uid('u'), role: 'admin', first: 'Club', last: 'Admin', email: ADMIN_EMAIL, pw: admin, verified: true, createdAt: Date.now() - 40 * day });
  SEED.forEach(([first, last, kids], i) => {
    const pid = uid('u');
    const created = Date.now() - (30 - i * 4) * day;
    db.users.push({ id: pid, role: 'parent', first, last, email: norm(`${first}.${last}@example.no`), pw: shared, verified: i !== 5, createdAt: created });
    kids.forEach(([kf, dob, gender, signed], j) => {
      const cid = uid('c');
      db.children.push({ id: cid, parentId: pid, first: kf, last, dob, gender, notes: '', createdAt: created + j * 3600000 });
      if (signed) db.consents.push({ id: uid('k'), childId: cid, parentId: pid, version: CONSENT_VERSION, items: { participation: true, data: true, photo: (i + j) % 3 !== 0 }, signedBy: `${first} ${last}`, at: created + day, withdrawnAt: null });
    });
  });
  db.audit.push({ at: Date.now() - 2 * day, actor: 'System', action: 'Daily database backup completed' });
  db.seeded = true;
  save();
}
