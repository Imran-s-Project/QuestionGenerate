import { auth, db, fs } from '../firebase.js';

// The one place that knows the database layout (see docs/DATA_MODEL.md). Modules never build paths by hand.
export const ROLES = ['owner', 'admin', 'teacher', 'editor', 'reviewer', 'examManager', 'viewer'];
export const ORG_TYPES = ['school', 'college', 'university', 'madrasa', 'coachingCenter', 'trainingInstitute', 'recruitmentOrganization', 'examinationCenter', 'custom'];

const uid = () => {
  if (!auth.currentUser) throw new Error('Not signed in');
  return auth.currentUser.uid;
};

/** Ownership and server-timestamp fields that the security rules require on every write. */
export const forCreate = (orgId, data) => ({ ...data, orgId, createdBy: uid(), createdAt: fs.serverTimestamp(), updatedBy: uid(), updatedAt: fs.serverTimestamp() });
export const forUpdate = data => ({ ...data, updatedBy: uid(), updatedAt: fs.serverTimestamp() });

export const ref = {
  org: orgId => fs.doc(db, 'organizations', orgId),
  member: (orgId, memberUid) => fs.doc(db, 'organizations', orgId, 'members', memberUid),
  col: (orgId, name) => fs.collection(db, 'organizations', orgId, name),
  doc: (orgId, name, id) => fs.doc(db, 'organizations', orgId, name, id),
  answerKey: (orgId, questionId) => fs.collection(db, 'organizations', orgId, 'questions', questionId, 'answerKey')
};

export const logAudit = (orgId, action, details = {}) =>
  fs.addDoc(ref.col(orgId, 'auditLogs'), { orgId, action, details, actorUid: uid(), createdAt: fs.serverTimestamp() });

/** Creates the organization and its owner member in ONE batch, so a half-created workspace cannot exist. */
export async function createOrganization({ name, type = 'school', code = '' }) {
  const me = uid(), u = auth.currentUser;
  if (!name?.trim()) throw new Error('Institution name is required');
  if (!ORG_TYPES.includes(type)) throw new Error('Unknown institution type');
  const org = fs.doc(fs.collection(db, 'organizations'));
  const stamps = { createdBy: me, createdAt: fs.serverTimestamp(), updatedBy: me, updatedAt: fs.serverTimestamp() };
  const batch = fs.writeBatch(db);
  batch.set(org, { name: name.trim(), type, code: code.trim(), status: 'active', ownerUid: me, ...stamps });
  batch.set(ref.member(org.id, me), { uid: me, role: 'owner', status: 'active', answerKeyAccess: true, email: u.email || '', displayName: u.displayName || '', ...stamps });
  await batch.commit();
  logAudit(org.id, 'organization.create', { name: name.trim() }).catch(e => console.warn('Audit log not written', e));
  return org.id;
}

/** Active organizations of the signed-in user: one collection-group query, no mirrored data to keep in sync. */
export async function listMyOrganizations() {
  const snap = await fs.getDocs(fs.query(fs.collectionGroup(db, 'members'), fs.where('uid', '==', uid())));
  const mine = snap.docs.filter(d => d.data().status === 'active');
  const orgs = await Promise.all(mine.map(d => fs.getDoc(ref.org(d.ref.parent.parent.id))));
  return orgs.map((o, i) => (o.exists() ? { id: o.id, role: mine[i].data().role, ...o.data() } : null)).filter(Boolean);
}

export async function getMyMembership(orgId) {
  const s = await fs.getDoc(ref.member(orgId, uid()));
  return s.exists() ? s.data() : null;
}

export async function isPlatformAdmin() {
  return (await fs.getDoc(fs.doc(db, 'platformAdmins', uid()))).exists();
}

// ---------- Phase 3: institution profile, members, invites ----------
const warn = e => console.warn('Audit log not written', e);
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => ALPHABET[b % ALPHABET.length]).join('');

/** Profile fields (and their input kinds) of an institution. The forms are generated from this list. */
export const PROFILE_FIELDS = [['name', 'text'], ['code', 'text'], ['type', 'select'], ['academicSession', 'text'], ['address', 'text'], ['phone', 'tel'],
  ['email', 'email'], ['website', 'url'], ['logoUrl', 'url'], ['brandColor', 'color'], ['paperHeader', 'textarea'], ['defaultFooter', 'textarea']];

export async function updateOrganization(orgId, data) {
  const clean = Object.fromEntries(PROFILE_FIELDS.filter(([k]) => k in data).map(([k]) => [k, String(data[k]).trim()]));
  await fs.updateDoc(ref.org(orgId), forUpdate(clean));
  logAudit(orgId, 'organization.update', { fields: Object.keys(clean) }).catch(warn);
}

// Up to 200 members are listed; pagination arrives with the large-list screens.
export async function listMembers(orgId) {
  const s = await fs.getDocs(fs.query(ref.col(orgId, 'members'), fs.limit(200)));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateMember(orgId, memberUid, data) {
  await fs.updateDoc(ref.member(orgId, memberUid), forUpdate(data));
  logAudit(orgId, 'member.update', { target: memberUid, ...data }).catch(warn);
}
export async function removeMember(orgId, memberUid) {
  await fs.deleteDoc(ref.member(orgId, memberUid));
  logAudit(orgId, 'member.remove', { target: memberUid }).catch(warn);
}

/** Creates a one-time join code (valid 7 days) and returns it as "orgId.token". The token is the secret. */
export async function createInvite(orgId, { role, answerKeyAccess = false }) {
  const id = newToken();
  await fs.setDoc(ref.doc(orgId, 'invites', id), forCreate(orgId, { role, answerKeyAccess, status: 'pending', expiresAt: fs.Timestamp.fromMillis(Date.now() + 7 * 864e5) }));
  logAudit(orgId, 'invite.create', { role }).catch(warn);
  return `${orgId}.${id}`;
}
export async function listInvites(orgId) {
  const s = await fs.getDocs(fs.query(ref.col(orgId, 'invites'), fs.where('status', '==', 'pending')));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function revokeInvite(orgId, id) {
  await fs.deleteDoc(ref.doc(orgId, 'invites', id));
  logAudit(orgId, 'invite.revoke', {}).catch(warn);
}

/** Redeems a code: creates the member and marks the invite used in ONE batch. Returns the organization id. */
export async function redeemInvite(code) {
  const [orgId, id] = String(code).trim().split('.');
  const bad = () => Object.assign(new Error('Invalid invite'), { code: 'app/invalid-invite' });
  if (!orgId || !id) throw bad();
  const me = uid(), u = auth.currentUser;
  const [inv, mine] = await Promise.all([fs.getDoc(ref.doc(orgId, 'invites', id)), fs.getDoc(ref.member(orgId, me))]);
  const d = inv.data();
  if (mine.exists() || !inv.exists() || d.status !== 'pending' || d.expiresAt.toMillis() < Date.now()) throw bad();
  const stamps = { createdBy: me, createdAt: fs.serverTimestamp(), updatedBy: me, updatedAt: fs.serverTimestamp() };
  const batch = fs.writeBatch(db);
  batch.set(ref.member(orgId, me), { uid: me, role: d.role, status: 'active', answerKeyAccess: !!d.answerKeyAccess, email: u.email || '', displayName: u.displayName || '', inviteId: id, ...stamps });
  batch.update(inv.ref, { status: 'used', usedBy: me, usedAt: fs.serverTimestamp() });
  await batch.commit();
  logAudit(orgId, 'member.join', { role: d.role }).catch(warn);
  return orgId;
}
