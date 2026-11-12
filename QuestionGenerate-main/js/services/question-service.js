import { db, fs } from '../firebase.js';
import { ref, forCreate, forUpdate, logAudit } from './firestore-service.js';
import { plainText } from '../utilities/rich-text.js';

const warn = e => console.warn('Audit log not written', e);
const norm = s => plainText(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim(); // \p{M} keeps Bengali vowel signs
const akRef = (orgId, id) => fs.doc(ref.answerKey(orgId, id), 'main');
const SYSTEM = ['id', 'orgId', 'questionId', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt', 'fingerprint'];
const strip = o => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !SYSTEM.includes(k)));

/** Duplicate fingerprint: SHA-256 of the normalized statement plus the normalized option/item texts (order-independent). */
export async function fingerprint(q) {
  const opts = [...(q.options || []), ...(q.items || [])].map(o => norm(o.text)).sort().join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm(q.statement) + '#' + opts));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}
/** Lowercase search words (statement + tags) for array-contains search. Firestore has no full-text search. */
const keywordsOf = q => [...new Set([...norm(q.statement).split(' ').filter(w => w.length > 1), ...(q.tags || [])])].slice(0, 60);

export async function findDuplicate(orgId, fp, exceptId) {
  const s = await fs.getDocs(fs.query(ref.col(orgId, 'questions'), fs.where('fingerprint', '==', fp), fs.limit(2)));
  return s.docs.map(d => ({ id: d.id, ...d.data() })).find(d => d.id !== exceptId) || null;
}

export async function getQuestion(orgId, id) {
  const [q, ak] = await Promise.all([fs.getDoc(ref.doc(orgId, 'questions', id)), fs.getDoc(akRef(orgId, id)).catch(() => null)]);
  if (!q.exists()) throw new Error('Question not found');
  return { q: { id, ...q.data() }, ak: ak?.exists() ? ak.data() : {} };
}

/** Question and answer key are written together in one batch, so one can never exist without the other. */
export async function saveQuestion(orgId, id, q, ak) {
  const body = { ...q, keywords: keywordsOf(q), fingerprint: await fingerprint(q) };
  const qRef = id ? ref.doc(orgId, 'questions', id) : fs.doc(ref.col(orgId, 'questions'));
  const batch = fs.writeBatch(db);
  if (id) { batch.update(qRef, forUpdate(body)); batch.update(akRef(orgId, id), forUpdate(ak)); }
  else { batch.set(qRef, forCreate(orgId, body)); batch.set(akRef(orgId, qRef.id), forCreate(orgId, { ...ak, questionId: qRef.id })); }
  await batch.commit();
  logAudit(orgId, id ? 'question.update' : 'question.create', { id: qRef.id }).catch(warn);
  return qRef.id;
}

/** One server-side filter at a time (matches the deployed indexes). Pages of 20 with a cursor. */
export async function listQuestions(orgId, { status = 'active', field, value, search } = {}, after = null, size = 20) {
  const c = [fs.where('status', '==', status)];
  const word = search ? norm(search).split(' ')[0] : '';
  if (word) c.push(fs.where('keywords', 'array-contains', word));
  else if (field && value) c.push(field === 'tags' ? fs.where('tags', 'array-contains', value) : fs.where(field, '==', value));
  c.push(fs.orderBy('createdAt', 'desc'));
  if (after) c.push(fs.startAfter(after));
  c.push(fs.limit(size));
  const s = await fs.getDocs(fs.query(ref.col(orgId, 'questions'), ...c));
  return { items: s.docs.map(d => ({ id: d.id, ...d.data() })), last: s.docs.length === size ? s.docs[s.docs.length - 1] : null };
}

export async function setStatus(orgId, ids, status) {
  for (let i = 0; i < ids.length; i += 400) {
    const b = fs.writeBatch(db);
    ids.slice(i, i + 400).forEach(id => b.update(ref.doc(orgId, 'questions', id), forUpdate({ status })));
    await b.commit();
  }
  logAudit(orgId, 'question.status', { count: ids.length, status }).catch(warn);
}

/** Permanent delete (admins). The answer key is a subcollection, so it is deleted explicitly in the same batch. */
export async function deleteQuestion(orgId, id) {
  const b = fs.writeBatch(db);
  b.delete(akRef(orgId, id));
  b.delete(ref.doc(orgId, 'questions', id));
  await b.commit();
  logAudit(orgId, 'question.delete', { id }).catch(warn);
}

export async function duplicateQuestion(orgId, id) {
  const { q, ak } = await getQuestion(orgId, id);
  return saveQuestion(orgId, null, { ...strip(q), status: 'draft' }, strip(ak));
}

export const listSubjects = async orgId => (await fs.getDocs(ref.col(orgId, 'subjects'))).docs.map(d => ({ id: d.id, ...d.data() }));
export const addSubject = async (orgId, name) => (await fs.addDoc(ref.col(orgId, 'subjects'), forCreate(orgId, { name: name.trim() }))).id;
