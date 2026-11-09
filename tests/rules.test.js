import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, addDoc, collection, collectionGroup, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';

let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'qg-rules-test', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
after(() => env.cleanup());

const as = uid => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const stamps = u => ({ createdBy: u, createdAt: serverTimestamp(), updatedBy: u, updatedAt: serverTimestamp() });
const touch = u => ({ updatedBy: u, updatedAt: serverTimestamp() });
const member = (u, role, actor = u, extra = {}) => ({ uid: u, role, status: 'active', answerKeyAccess: false, email: '', displayName: '', ...stamps(actor), ...extra });
const question = (u, extra = {}) => ({ orgId: 'orgA', type: 'mcq', status: 'draft', marks: 1, statement: 'Q', difficulty: 'easy', ...stamps(u), ...extra });

// Seed: orgA has owner/admin/teacher/reviewer/viewer (+ a viewer with answer-key access); orgB has its own owner.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const s = ctx.firestore();
    for (const [o, owner] of [['orgA', 'own'], ['orgB', 'ownB']]) await setDoc(doc(s, 'organizations', o), { name: o, type: 'school', status: 'active', ownerUid: owner, ...stamps(owner) });
    for (const [u, r, x] of [['own', 'owner'], ['adm', 'admin'], ['tea', 'teacher'], ['rev', 'reviewer'], ['vie', 'viewer'], ['key', 'viewer', { answerKeyAccess: true }]])
      await setDoc(doc(s, 'organizations/orgA/members', u), member(u, r, u, x));
    await setDoc(doc(s, 'organizations/orgB/members/ownB'), member('ownB', 'owner'));
    await setDoc(doc(s, 'organizations/orgA/questions/q1'), question('tea'));
    await setDoc(doc(s, 'organizations/orgA/questions/q1/answerKey/a1'), { orgId: 'orgA', questionId: 'q1', correct: 'B', ...stamps('tea') });
    await setDoc(doc(s, 'platformAdmins/root'), { note: 'seed' });
  });
});

test('creator bootstraps an organization with an owner member in one batch', async () => {
  const d = as('newbie'), org = doc(collection(d, 'organizations')), b = writeBatch(d);
  b.set(org, { name: 'My School', type: 'school', status: 'active', ownerUid: 'newbie', ...stamps('newbie') });
  b.set(doc(d, 'organizations', org.id, 'members', 'newbie'), member('newbie', 'owner'));
  await assertSucceeds(b.commit());
});

test('cannot own an organization for someone else or self-grant owner in an existing one', async () => {
  await assertFails(setDoc(doc(as('newbie'), 'organizations/orgX'), { name: 'X', type: 'school', status: 'active', ownerUid: 'other', ...stamps('newbie') }));
  await assertFails(setDoc(doc(as('mallory'), 'organizations/orgA/members/mallory'), member('mallory', 'owner')));
});

test('organizations are isolated from each other and from signed-out users', async () => {
  await assertSucceeds(getDoc(doc(as('tea'), 'organizations/orgA/questions/q1')));
  await assertFails(getDoc(doc(as('ownB'), 'organizations/orgA/questions/q1')));
  await assertFails(getDoc(doc(as('ownB'), 'organizations/orgA')));
  await assertFails(getDoc(doc(anon(), 'organizations/orgA')));
});

test('question permissions follow roles and ownership fields cannot be forged', async () => {
  await assertSucceeds(setDoc(doc(as('tea'), 'organizations/orgA/questions/q2'), question('tea')));
  await assertFails(setDoc(doc(as('vie'), 'organizations/orgA/questions/q3'), question('vie')));
  await assertFails(setDoc(doc(as('tea'), 'organizations/orgA/questions/q4'), question('tea', { orgId: 'orgB' })));
  await assertFails(setDoc(doc(as('tea'), 'organizations/orgA/questions/q5'), question('tea', { createdBy: 'adm' })));
  await assertSucceeds(updateDoc(doc(as('tea'), 'organizations/orgA/questions/q1'), { status: 'archived', ...touch('tea') }));
  await assertFails(deleteDoc(doc(as('tea'), 'organizations/orgA/questions/q1')));
  await assertSucceeds(deleteDoc(doc(as('adm'), 'organizations/orgA/questions/q1')));
});

test('answer keys are visible only to authorised members', async () => {
  const a1 = u => doc(as(u), 'organizations/orgA/questions/q1/answerKey/a1');
  await assertFails(getDoc(a1('vie')));
  for (const u of ['tea', 'rev', 'key']) await assertSucceeds(getDoc(a1(u)));
  await assertFails(updateDoc(a1('rev'), { correct: 'C', ...touch('rev') }));
  await assertSucceeds(updateDoc(a1('tea'), { correct: 'C', ...touch('tea') }));
});

test('exams: owners write, reviewers only read', async () => {
  await assertSucceeds(setDoc(doc(as('own'), 'organizations/orgA/exams/e1'), { orgId: 'orgA', status: 'draft', ...stamps('own') }));
  await assertSucceeds(getDoc(doc(as('rev'), 'organizations/orgA/exams/e1')));
  await assertFails(setDoc(doc(as('rev'), 'organizations/orgA/exams/e2'), { orgId: 'orgA', status: 'draft', ...stamps('rev') }));
});

test('audit log is append-only and readable by admins only', async () => {
  let path;
  await assertSucceeds(addDoc(collection(as('tea'), 'organizations/orgA/auditLogs'), { orgId: 'orgA', action: 'x', actorUid: 'tea', createdAt: serverTimestamp() }).then(r => { path = r.path; }));
  await assertFails(getDoc(doc(as('tea'), path)));
  await assertSucceeds(getDoc(doc(as('adm'), path)));
  await assertFails(updateDoc(doc(as('adm'), path), { action: 'y' }));
  await assertFails(deleteDoc(doc(as('adm'), path)));
});

test('member management cannot escalate privileges', async () => {
  await assertFails(updateDoc(doc(as('tea'), 'organizations/orgA/members/tea'), { role: 'admin', ...touch('tea') }));
  await assertFails(setDoc(doc(as('adm'), 'organizations/orgA/members/n1'), member('n1', 'admin', 'adm')));
  await assertSucceeds(setDoc(doc(as('adm'), 'organizations/orgA/members/n2'), member('n2', 'teacher', 'adm')));
  await assertSucceeds(setDoc(doc(as('own'), 'organizations/orgA/members/n3'), member('n3', 'admin', 'own')));
  await assertFails(deleteDoc(doc(as('adm'), 'organizations/orgA/members/own')));
});

test('a user can list only their own memberships across organizations', async () => {
  const members = collectionGroup(as('tea'), 'members');
  await assertSucceeds(getDocs(query(members, where('uid', '==', 'tea'))));
  await assertFails(getDocs(query(members, where('uid', '==', 'own'))));
});

test('profiles are private, appConfig is public-read, platform admins get no organization data', async () => {
  await assertSucceeds(setDoc(doc(as('tea'), 'users/tea'), { email: 'a@x.test', displayName: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(getDoc(doc(as('adm'), 'users/tea')));
  await assertSucceeds(getDoc(doc(anon(), 'appConfig/main')));
  await assertFails(setDoc(doc(as('tea'), 'appConfig/main'), { x: 1 }));
  await assertSucceeds(setDoc(doc(as('root'), 'appConfig/main'), { x: 1 }));
  await assertFails(getDoc(doc(as('root'), 'organizations/orgA')));
});

// ---------- Phase 3: invites and institution profile ----------
import { Timestamp } from 'firebase/firestore';
const invite = (u, extra = {}) => ({ orgId: 'orgA', role: 'teacher', answerKeyAccess: false, status: 'pending', expiresAt: Timestamp.fromMillis(Date.now() + 864e5), ...stamps(u), ...extra });
const join = (u, role = 'teacher', inv = 'tok1') => {
  const d = as(u), b = writeBatch(d);
  b.set(doc(d, 'organizations/orgA/members', u), { ...member(u, role), inviteId: inv });
  b.update(doc(d, 'organizations/orgA/invites', inv), { status: 'used', usedBy: u, usedAt: serverTimestamp() });
  return b.commit();
};

test('invites: admins create, a newcomer redeems a code exactly once with the invited role', async () => {
  await assertSucceeds(setDoc(doc(as('adm'), 'organizations/orgA/invites/tok1'), invite('adm')));
  await assertFails(setDoc(doc(as('adm'), 'organizations/orgA/invites/tok2'), invite('adm', { role: 'admin' })));
  await assertFails(setDoc(doc(as('tea'), 'organizations/orgA/invites/tok3'), invite('tea')));
  await assertFails(join('eve', 'admin'));
  await assertSucceeds(join('newT'));
  await assertFails(join('late'));
});

test('invites: expired codes fail and codes cannot be listed by non-admins', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'organizations/orgA/invites/old'), invite('adm', { expiresAt: Timestamp.fromMillis(Date.now() - 1000) })));
  await assertFails(join('x1', 'teacher', 'old'));
  await assertFails(getDocs(collection(as('tea'), 'organizations/orgA/invites')));
});

test('institution profile: admins edit, members cannot, logo must be an https URL', async () => {
  const org = u => doc(as(u), 'organizations/orgA');
  await assertSucceeds(updateDoc(org('adm'), { logoUrl: 'https://x.test/l.png', address: 'Dhaka', ...touch('adm') }));
  await assertFails(updateDoc(org('adm'), { logoUrl: 'data:image/png;base64,AAAA', ...touch('adm') }));
  await assertFails(updateDoc(org('tea'), { address: 'x', ...touch('tea') }));
});

// ---------- Phase 4: question fields ----------
test('questions: field validation (marks, difficulty, https images, tag count)', async () => {
  const q = id => doc(as('tea'), 'organizations/orgA/questions/' + id);
  await assertFails(setDoc(q('v1'), question('tea', { marks: -1 })));
  await assertFails(setDoc(q('v2'), question('tea', { difficulty: 'impossible' })));
  await assertFails(setDoc(q('v3'), question('tea', { imageUrl: 'data:image/png;base64,AAAA' })));
  await assertSucceeds(setDoc(q('v4'), question('tea', { imageUrl: 'https://x.test/a.png', tags: ['x'] })));
});
