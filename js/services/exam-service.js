import { db, fs } from '../firebase.js';
import { ref, forCreate, forUpdate, logAudit } from './firestore-service.js';
import { getLang } from '../utilities/i18n.js';
import { shuffle } from '../utilities/random.js';

const warn = e => console.warn('Audit log not written', e);
export const MANAGERS = ['owner', 'admin', 'examManager', 'teacher']; // mirrors canManageExams in firestore.rules
const C = (id, en, bn) => ({ id, en, bn });
export const CATEGORIES = [C('classTest', 'Class Test', 'ক্লাস টেস্ট'), C('weekly', 'Weekly Test', 'সাপ্তাহিক পরীক্ষা'), C('monthly', 'Monthly Test', 'মাসিক পরীক্ষা'),
  C('halfYearly', 'Half-Yearly Examination', 'অর্ধবার্ষিক পরীক্ষা'), C('annual', 'Annual Examination', 'বার্ষিক পরীক্ষা'), C('model', 'Model Test', 'মডেল টেস্ট'),
  C('admission', 'Admission Test', 'ভর্তি পরীক্ষা'), C('recruitment', 'Recruitment Examination', 'নিয়োগ পরীক্ষা'), C('scholarship', 'Scholarship Examination', 'বৃত্তি পরীক্ষা'),
  C('competitive', 'Competitive Examination', 'প্রতিযোগিতামূলক পরীক্ষা'), C('practical', 'Practical Examination', 'ব্যবহারিক পরীক্ষা'), C('professional', 'Professional Assessment', 'পেশাদার মূল্যায়ন')];
export const catName = c => c[getLang()] || c.name || c.id;
export const listCategories = async orgId => [...CATEGORIES, ...(await fs.getDocs(ref.col(orgId, 'categories'))).docs.map(d => ({ id: 'c_' + d.id, name: d.data().name }))];
export const addCategory = async (orgId, name) => 'c_' + (await fs.addDoc(ref.col(orgId, 'categories'), forCreate(orgId, { name: name.trim() }))).id;

const sub = (orgId, examId, name) => fs.collection(db, 'organizations', orgId, 'exams', examId, name);
export const sectionTotal = s => (Number(s.count) || 0) * (Number(s.marksEach) || 0);
const mins = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };

/** Everything that makes an exam setup inconsistent. Each issue is { key, vars } for the text engine. */
export function examIssues(exam, sections) {
  const out = [], sum = sections.reduce((a, s) => a + sectionTotal(s), 0), total = Number(exam.totalMarks) || 0;
  if (!sections.length) out.push({ key: 'x.err.noSections' });
  if (sections.some(s => !String(s.title).trim() || !(s.count > 0) || !(s.marksEach > 0))) out.push({ key: 'x.err.section' });
  if (sections.length && Math.abs(sum - total) > 1e-9) out.push({ key: 'x.err.total', vars: { sum, total } });
  if ((Number(exam.passMarks) || 0) > total) out.push({ key: 'x.err.pass', vars: { pass: exam.passMarks, total } });
  if (exam.startTime && exam.endTime && exam.durationMin) {
    const span = mins(exam.endTime) - mins(exam.startTime);
    if (span !== Number(exam.durationMin)) out.push({ key: 'x.err.time', vars: { span, dur: exam.durationMin } });
  }
  return out;
}

export async function listExams(orgId, status = 'draft', after = null, size = 20) {
  const c = [fs.where('status', '==', status), fs.orderBy('updatedAt', 'desc'), ...(after ? [fs.startAfter(after)] : []), fs.limit(size)];
  const s = await fs.getDocs(fs.query(ref.col(orgId, 'exams'), ...c));
  return { items: s.docs.map(d => ({ id: d.id, ...d.data() })), last: s.docs.length === size ? s.docs[s.docs.length - 1] : null };
}
export async function getExam(orgId, id) {
  const [e, s] = await Promise.all([fs.getDoc(ref.doc(orgId, 'exams', id)), fs.getDocs(sub(orgId, id, 'sections'))]);
  if (!e.exists()) throw new Error('Exam not found');
  return { exam: { id, ...e.data() }, sections: s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order) };
}
export const loadSets = async (orgId, examId) =>
  (await fs.getDocs(sub(orgId, examId, 'sets'))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.label.localeCompare(b.label));

/** Exam, sections and (when the structure changed) removal of stale sets are written in ONE batch. */
export async function saveExam(orgId, id, exam, sections, removed, clearSets) {
  const eRef = id ? ref.doc(orgId, 'exams', id) : fs.doc(ref.col(orgId, 'exams'));
  const body = { ...exam, sectionCount: sections.length, questionCount: sections.reduce((a, s) => a + s.count, 0) };
  const sc = sub(orgId, eRef.id, 'sections'), batch = fs.writeBatch(db);
  if (id) batch.update(eRef, forUpdate(body)); else batch.set(eRef, forCreate(orgId, body));
  sections.forEach((s, order) => {
    const data = { title: s.title, type: s.type, count: s.count, marksEach: s.marksEach, order, questionIds: s.questionIds };
    if (s.id) batch.update(fs.doc(sc, s.id), forUpdate(data)); else batch.set(fs.doc(sc), forCreate(orgId, data));
  });
  removed.forEach(sid => batch.delete(fs.doc(sc, sid)));
  if (id && clearSets) (await fs.getDocs(sub(orgId, id, 'sets'))).docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  logAudit(orgId, id ? 'exam.update' : 'exam.create', { id: eRef.id }).catch(warn);
  return eRef.id;
}
export async function setExamStatus(orgId, id, status) {
  await fs.updateDoc(ref.doc(orgId, 'exams', id), forUpdate({ status }));
  logAudit(orgId, 'exam.status', { id, status }).catch(warn);
}

/** Changing a selection invalidates generated sets, so they are removed in the same batch. */
export async function saveSelection(orgId, examId, sectionId, ids, staleSets = []) {
  const batch = fs.writeBatch(db);
  batch.update(fs.doc(sub(orgId, examId, 'sections'), sectionId), forUpdate({ questionIds: ids }));
  staleSets.forEach(s => batch.delete(fs.doc(sub(orgId, examId, 'sets'), s.id)));
  await batch.commit();
}
export async function saveSets(orgId, examId, sets, old) {
  const col = sub(orgId, examId, 'sets'), batch = fs.writeBatch(db);
  old.forEach(s => batch.delete(fs.doc(col, s.id)));
  sets.forEach(s => batch.set(fs.doc(col), forCreate(orgId, s)));
  await batch.commit();
  logAudit(orgId, 'exam.sets', { id: examId, count: sets.length }).catch(warn);
}

export async function getQuestionsById(orgId, ids) {
  const docs = await Promise.all(ids.map(id => fs.getDoc(ref.doc(orgId, 'questions', id))));
  return Object.fromEntries(docs.filter(d => d.exists()).map(d => [d.id, { id: d.id, ...d.data() }]));
}
export async function getAnswerKeys(orgId, ids) {
  const docs = await Promise.all(ids.map(id => fs.getDoc(fs.doc(ref.answerKey(orgId, id), 'main'))));
  return Object.fromEntries(docs.map((d, i) => [ids[i], d.exists() ? d.data() : {}]));
}

/** Random pick from the newest 300 active questions of the section's type. Optional difficulty mix (percent) and chapter. */
export async function autoFill(orgId, exam, section, taken, { mix, chapter } = {}) {
  const c = [fs.where('status', '==', 'active'), ...(section.type ? [fs.where('type', '==', section.type)] : []), fs.orderBy('createdAt', 'desc'), fs.limit(300)];
  const all = (await fs.getDocs(fs.query(ref.col(orgId, 'questions'), ...c))).docs.map(d => ({ id: d.id, ...d.data() }));
  const pool = all.filter(q => !taken.has(q.id) && (!exam.subjectId || q.subjectId === exam.subjectId) && (!chapter || q.chapterId === chapter));
  const need = Math.max(0, section.count - section.questionIds.length);
  let picked = [];
  if (mix) for (const d of ['easy', 'medium', 'hard']) picked.push(...shuffle(pool.filter(q => q.difficulty === d)).slice(0, Math.round(need * (mix[d] || 0) / 100)));
  picked = picked.slice(0, need);
  picked.push(...shuffle(pool.filter(q => !picked.includes(q))).slice(0, need - picked.length));
  return { picked, short: need - picked.length };
}

/** Before generating: counts per section, duplicates, missing or inactive questions. Marks differences are only a warning. */
export function selectionIssues(sections, qmap) {
  const errors = [], seen = new Set();
  let dup = false, bad = false, marksDiff = 0;
  for (const s of sections) {
    if (s.questionIds.length !== s.count) errors.push({ key: 'x.err.count', vars: { title: s.title, have: s.questionIds.length, need: s.count } });
    for (const id of s.questionIds) {
      if (seen.has(id)) dup = true;
      seen.add(id);
      const q = qmap[id];
      if (!q || q.status !== 'active') bad = true; else if (q.marks !== s.marksEach) marksDiff++;
    }
  }
  if (dup) errors.push({ key: 'x.err.dupSel' });
  if (bad) errors.push({ key: 'x.err.inactive' });
  return { errors, marksDiff };
}

/** Set A keeps the authored order. Other sets get shuffled question order and shuffled choice options.
 *  Only permutations are stored (never answers); the answer key is derived from the answer-key documents. */
export function buildSets(sections, qmap, { n, shuffleQ, shuffleO }) {
  return Array.from({ length: n }, (_, i) => {
    const questionOrder = {}, optionOrder = {};
    for (const s of sections) {
      const ids = s.questionIds.slice(0, s.count);
      questionOrder[s.id] = i && shuffleQ ? shuffle(ids) : ids;
      for (const id of ids) {
        const q = qmap[id];
        if (q?.options && (q.family === 'choice' || q.family === 'multi') && q.type !== 'assertionReason') optionOrder[id] = (i && shuffleO ? shuffle(q.options) : q.options).map(o => o.id);
      }
    }
    return { label: 'ABCDEF'[i], questionOrder, optionOrder, shuffleQuestions: !!shuffleQ, shuffleOptions: !!shuffleO };
  });
}
