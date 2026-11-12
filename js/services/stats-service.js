import { fs } from '../firebase.js';
import { ref } from './firestore-service.js';
import { getLang } from '../utilities/i18n.js';

const N = (c, ...f) => fs.getCountFromServer(fs.query(c, ...f)).then(s => s.data().count);
const eq = (f, v) => fs.where(f, '==', v);

/** Server-side counts (about one read per 1,000 matches), cached for 5 minutes per institution. */
export async function getStats(orgId, subjects, types, force = false) {
  const key = `qg.stats.${orgId}`, hit = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (!force && hit && Date.now() - hit.at < 3e5) return hit.data;
  const Q = ref.col(orgId, 'questions'), E = ref.col(orgId, 'exams'), act = eq('status', 'active');
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - (5 - i));
    const e = new Date(d); e.setMonth(e.getMonth() + 1);
    return { label: d.toLocaleString(getLang() === 'bn' ? 'bn-BD' : 'en', { month: 'short' }), from: fs.Timestamp.fromDate(d), to: fs.Timestamp.fromDate(e) };
  });
  const range = (c, m) => N(c, fs.where('createdAt', '>=', m.from), fs.where('createdAt', '<', m.to));
  const [qs, ex, members, subj, diff, byType, bySubj, mq, me] = await Promise.all([
    Promise.all(['active', 'draft', 'archived'].map(s => N(Q, eq('status', s)))), Promise.all(['draft', 'final', 'archived'].map(s => N(E, eq('status', s)))),
    N(ref.col(orgId, 'members')), N(ref.col(orgId, 'subjects')), Promise.all(['easy', 'medium', 'hard'].map(d => N(Q, act, eq('difficulty', d)))),
    Promise.all(types.map(x => N(Q, act, eq('type', x.id)))), Promise.all(subjects.map(s => N(Q, act, eq('subjectId', s.id)))),
    Promise.all(months.map(m => range(Q, m))), Promise.all(months.map(m => range(E, m)))]);
  const data = { qs, ex, members, subj, diff, byType, bySubj, months: months.map(m => m.label), mq, me };
  sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  return data;
}

/** One page of a history collection (auditLogs, exports, imports), newest first. */
export async function listLog(orgId, name, after = null, action = '', size = 30) {
  const c = [...(action ? [eq('action', action)] : []), fs.orderBy('createdAt', 'desc'), ...(after ? [fs.startAfter(after)] : []), fs.limit(size)];
  const s = await fs.getDocs(fs.query(ref.col(orgId, name), ...c));
  return { items: s.docs.map(d => ({ id: d.id, ...d.data() })), last: s.docs.length === size ? s.docs[s.docs.length - 1] : null };
}
