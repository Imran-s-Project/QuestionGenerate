import { db, fs } from '../firebase.js';
import { ref, forCreate, logAudit, updateOrganization } from './firestore-service.js';
import { getAnswerKeys } from './exam-service.js';
import { fingerprint, keywordsOf, listSubjects } from './question-service.js';
import { strip } from '../utilities/question-schema.js';
import { planRestore } from '../utilities/backup-plan.js';

const warn = e => console.warn('Audit log not written', e);
const sub = (orgId, examId, name) => fs.collection(db, 'organizations', orgId, 'exams', examId, name);
const PROFILE = ['name', 'type', 'code', 'academicSession', 'address', 'phone', 'email', 'website', 'logoUrl', 'brandColor', 'paperHeader', 'defaultFooter'];

/** All documents of a collection, 500 per read, oldest first. */
async function all(col, size = 500) {
  let out = [], last = null;
  for (;;) {
    const s = await fs.getDocs(fs.query(col, fs.orderBy('createdAt'), ...(last ? [fs.startAfter(last)] : []), fs.limit(size)));
    out = out.concat(s.docs.map(d => ({ id: d.id, ...d.data() })));
    if (s.docs.length < size) return out;
    last = s.docs[s.docs.length - 1];
  }
}

/** Reads the selected parts of one institution into a single JSON-ready object (no timestamps: restore re-stamps). */
export async function collectBackup(orgId, org, { settings, questions, exams, answers }, onProgress) {
  const data = {}, subjects = await listSubjects(orgId), sn = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  if (settings) {
    data.subjects = subjects.map(s => ({ id: s.id, name: s.name }));
    data.categories = (await all(ref.col(orgId, 'categories'))).map(c => ({ id: c.id, name: c.name }));
    data.questionTypes = (await all(ref.col(orgId, 'questionTypes'))).map(x => ({ ...strip(x), id: x.id }));
    data.paperLayouts = (await all(ref.col(orgId, 'paperLayouts'))).map(l => strip(l));
    data.profile = Object.fromEntries(PROFILE.filter(k => org[k] !== undefined).map(k => [k, org[k]]));
  }
  if (questions) {
    const qs = await all(ref.col(orgId, 'questions'));
    onProgress?.(qs.length);
    const keys = {};
    if (answers) for (let i = 0; i < qs.length; i += 50) Object.assign(keys, await getAnswerKeys(orgId, qs.slice(i, i + 50).map(q => q.id)));
    data.questions = qs.map(q => ({ ...strip(q), id: q.id, subject: sn[q.subjectId] || '', answerKey: answers && keys[q.id] ? strip(keys[q.id]) : undefined }));
  }
  if (exams) {
    data.exams = [];
    for (const e of await all(ref.col(orgId, 'exams'))) {
      const [sec, sets] = await Promise.all([fs.getDocs(sub(orgId, e.id, 'sections')), fs.getDocs(sub(orgId, e.id, 'sets'))]);
      data.exams.push({ ...strip(e), id: e.id, subject: sn[e.subjectId] || '', sections: sec.docs.map(d => ({ ...strip(d.data()), id: d.id })), sets: sets.docs.map(d => strip(d.data())) });
    }
  }
  logAudit(orgId, 'backup.create', { parts: Object.keys(data) }).catch(warn);
  return { format: 'question-generate/backup', version: 1, createdAt: new Date().toISOString(), institution: { id: orgId, name: org.name }, includes: Object.keys(data), data };
}

const byName = list => Object.fromEntries(list.map(x => [String(x.name).toLowerCase(), x.id]));
/** Adds the planned documents in batches of 400 writes. Stops on cancel or on a failed batch and reports what was written. */
export async function restoreBackup(orgId, backup, groups, { onProgress, cancelled }) {
  const [subjects, cats, types] = await Promise.all([listSubjects(orgId), fs.getDocs(ref.col(orgId, 'categories')), fs.getDocs(ref.col(orgId, 'questionTypes'))]);
  const plan = planRestore(backup, groups, { subjects: byName(subjects), categories: byName(cats.docs.map(d => ({ id: d.id, name: d.data().name }))), types: byName(types.docs.map(d => ({ id: d.id, name: d.data().name }))) });
  for (const op of plan.ops) if (op.kind === 'questions') Object.assign(op.data, { fingerprint: await fingerprint(op.data), keywords: keywordsOf(op.data) });
  const rep = { added: {}, skipped: plan.skipped, total: plan.ops.length, written: 0, stopped: false, failed: false, profile: false };
  for (let i = 0; i < plan.ops.length; i += 400) {
    if (cancelled()) { rep.stopped = true; break; }
    const chunk = plan.ops.slice(i, i + 400), batch = fs.writeBatch(db);
    chunk.forEach(op => batch.set(fs.doc(db, 'organizations', orgId, ...op.path), forCreate(orgId, op.data)));
    try { await batch.commit(); } catch (e) { console.error(e); rep.failed = true; break; }
    chunk.forEach(op => { rep.added[op.kind] = (rep.added[op.kind] || 0) + 1; });
    rep.written += chunk.length; onProgress(rep.written, plan.ops.length);
  }
  if (plan.profile && !rep.failed && !rep.stopped) { await updateOrganization(orgId, plan.profile); rep.profile = true; }
  logAudit(orgId, 'backup.restore', { written: rep.written, total: rep.total }).catch(warn);
  return rep;
}
