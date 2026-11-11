import { fs } from '../firebase.js';
import { ref, forCreate, logAudit } from './firestore-service.js';
import { getExam, loadSets, getQuestionsById, getAnswerKeys } from './exam-service.js';
import { listQuestions, strip } from './question-service.js';
import { tIn } from '../utilities/i18n.js';
import { num, LET } from '../utilities/paper-render.js';

const warn = e => console.warn('Export record not written', e);
export const KEY_ROLES = ['owner', 'admin', 'teacher', 'editor', 'reviewer', 'examManager']; // roles that may read answer keys (firestore.rules)
const bullet = l => (l.startsWith('- ') ? '• ' + l.slice(2) : l.startsWith('|') ? l.replace(/^\||\|\s*$/g, '').split('|').map(c => c.trim()).join('   |   ') : l);

/** Everything one exam export needs. Answer keys are read ONLY when the mode needs them. */
export async function loadBundle(orgId, examId, withAnswers) {
  const { exam, sections } = await getExam(orgId, examId);
  const ids = [...new Set(sections.flatMap(s => s.questionIds))];
  const [sets, qmap, keys] = await Promise.all([loadSets(orgId, examId), getQuestionsById(orgId, ids), withAnswers ? getAnswerKeys(orgId, ids) : {}]);
  return { exam, sections, sets, qmap, keys };
}
const orderOf = (b, s, set) => set?.questionOrder?.[s.id] || s.questionIds.slice(0, s.count);

/** Answer in the language's letters, following the set's shuffled option order. */
export function answerText(q, ak = {}, set, lang) {
  const A = i => LET[lang][i] ?? i + 1;
  if (q.family === 'choice' || q.family === 'multi') {
    const order = set?.optionOrder?.[q.id] || (q.options || []).map(o => o.id);
    return (ak.correct || []).map(c => A(order.indexOf(c))).sort().join(', ');
  }
  if (q.family === 'truefalse') return tIn(lang, ak.value ? 'q.true' : 'q.false');
  if (q.family === 'blank') return (ak.blanks || []).join('; ');
  if (q.family === 'match') return (q.lefts || []).map((l, i) => `${num(i + 1, lang)}-${A((q.rights || []).findIndex(r => r.id === ak.map?.[l.id]))}`).join(', ');
  if (q.family === 'order') return (ak.order || []).map(id => A((q.items || []).findIndex(o => o.id === id))).join('-');
  if (q.family === 'structured') return (q.subs || []).map((s, i) => `${A(i)}: ${ak.subs?.[s.id] || '—'}`).join('; ');
  return ak.answer || '';
}

/** Paper as text items for DOCX and TXT. mode: student | teacher | solutions. */
export function docItems(b, set, mode, lang, org, subject) {
  const tt = (k, v) => tIn(lang, k, v), A = i => LET[lang][i] ?? i + 1, items = [], add = (s, o = {}) => items.push({ s, ...o });
  const { exam, sections, qmap, keys } = b, teacher = mode !== 'student';
  if (org.name) add(org.name, { align: 'center', bold: true, size: 16 });
  if (org.address) add(org.address, { align: 'center', size: 10 });
  if (org.paperHeader) add(org.paperHeader, { align: 'center', size: 10 });
  add(`${exam.title}${set ? ' — ' + tt('pp.set', { label: set.label }) : ''}${teacher ? ' (' + tt('pp.teacher') + ')' : ''}`, { align: 'center', bold: true, size: 14 });
  const meta = [subject && tt('pp.subject', { v: subject }), exam.className && tt('pp.class', { v: exam.className }), exam.group && tt('pp.group', { v: exam.group }),
    exam.date && tt('pp.date', { v: num(exam.date, lang) }), exam.durationMin && tt('pp.time', { n: num(exam.durationMin, lang) }), tt('pp.full', { n: num(exam.totalMarks, lang) })].filter(Boolean);
  add(meta.join('   |   '), { align: 'center', size: 11 });
  if (!teacher) add(`${tt('pp.name')}: ______________________   ${tt('pp.roll')}: ____________`, { after: 160 });
  String(exam.instructions || '').split('\n').filter(Boolean).forEach(l => add(l, { italic: true, size: 11 }));
  let n = 0;
  for (const s of sections) {
    add('');
    add(`${s.title}   (${num(s.count, lang)} × ${num(s.marksEach, lang)} = ${num(s.count * s.marksEach, lang)})`, { bold: true, size: 13 });
    String(s.instructions || '').split('\n').filter(Boolean).forEach(l => add(l, { italic: true, size: 11 }));
    for (const id of orderOf(b, s, set)) {
      const q = qmap[id];
      if (!q) continue;
      const lines = String(q.statement).split('\n');
      add(`${num(++n, lang)}. ${bullet(lines[0])}   [${num(s.marksEach, lang)}]`);
      lines.slice(1).forEach(l => add(bullet(l), { indent: 360 }));
      if (q.family === 'choice' || q.family === 'multi') {
        const by = Object.fromEntries((q.options || []).map(o => [o.id, o]));
        (set?.optionOrder?.[id] || (q.options || []).map(o => o.id)).map(k => by[k]).filter(Boolean).forEach((o, i) => add(`${A(i)}. ${o.text}`, { indent: 360 }));
      } else if (q.family === 'truefalse') add(`( ) ${tt('q.true')}    ( ) ${tt('q.false')}`, { indent: 360 });
      else if (q.family === 'match') Array.from({ length: Math.max((q.lefts || []).length, (q.rights || []).length) }, (_, i) => add(`${q.lefts?.[i] ? `${num(i + 1, lang)}. ${q.lefts[i].text}` : ''}      ${q.rights?.[i] ? `${A(i)}. ${q.rights[i].text}` : ''}`, { indent: 360 }));
      else if (q.family === 'order') (q.items || []).forEach((o, i) => add(`${A(i)}. ${o.text}`, { indent: 360 }));
      else if (q.family === 'structured') (q.subs || []).forEach((x, i) => add(`${A(i)}. ${x.text}   [${num(x.marks, lang)}]`, { indent: 360 }));
      if (teacher) {
        add(`${tt('pp.answer')}: ${answerText(q, keys[id], set, lang)}`, { indent: 360, bold: true });
        if (mode === 'solutions' && keys[id]?.explanation) add(`${tt('pp.explain')}: ${keys[id].explanation}`, { indent: 360, italic: true });
      }
      add('', { after: 40 });
    }
  }
  return items;
}

export function keyRows(b, set, lang) {
  const rows = [['No', 'Section', 'Answer']];
  let n = 0;
  for (const s of b.sections) for (const id of orderOf(b, s, set)) { const q = b.qmap[id]; if (q) rows.push([++n, s.title, answerText(q, b.keys[id], set, lang)]); }
  return rows;
}

/** Complete, re-importable archive of one exam: exam, sections, sets, questions and (when allowed) answer keys. */
export function archiveOf(b, org) {
  return { format: 'question-generate/exam-archive', version: 1, exportedAt: new Date().toISOString(), institution: org.name, exam: strip(b.exam),
    sections: b.sections.map(s => ({ ...strip(s), id: s.id })), sets: b.sets.map(s => strip(s)),
    questions: Object.values(b.qmap).map(q => ({ ...strip(q), id: q.id, answerKey: b.keys[q.id] ? strip(b.keys[q.id]) : undefined })) };
}

export const BANK_HEAD = ['id', 'type', 'family', 'statement', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'optionF', 'correct', 'answer', 'explanation',
  'difficulty', 'marks', 'negativeMarks', 'timeSeconds', 'subject', 'topic', 'chapter', 'category', 'tags', 'status'];
/** One row per question. Letters are always A-F so the file can be imported again. */
export function bankRows(items, keys, subjects) {
  const sn = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  return [BANK_HEAD, ...items.map(q => {
    const ak = keys[q.id], choice = q.family === 'choice' || q.family === 'multi', o = i => q.options?.[i]?.text ?? '';
    return [q.id, q.type, q.family, q.statement, o(0), o(1), o(2), o(3), o(4), o(5), ak && choice ? answerText(q, ak, null, 'en') : '', ak && !choice ? answerText(q, ak, null, 'en') : '',
      ak?.explanation || '', q.difficulty, q.marks ?? 0, q.negativeMarks ?? 0, q.timeSeconds ?? 0, sn[q.subjectId] || '', q.topic || '', q.chapter || '', q.category || '', (q.tags || []).join(';'), q.status];
  })];
}
export const bankJson = (items, keys, org) => ({ format: 'question-generate/questions', version: 1, exportedAt: new Date().toISOString(), institution: org.name,
  questions: items.map(q => ({ ...strip(q), answerKey: keys[q.id] ? strip(keys[q.id]) : undefined })) });

/** Reads the bank page by page (200 at a time, at most 5,000 questions). */
export async function fetchBank(orgId, status, withAnswers, onProgress) {
  let items = [], cursor = null;
  do {
    const r = await listQuestions(orgId, { status }, cursor, 200);
    items = items.concat(r.items); cursor = r.last; onProgress?.(items.length);
  } while (cursor && items.length < 5000);
  const keys = {};
  if (withAnswers) for (let i = 0; i < items.length; i += 50) Object.assign(keys, await getAnswerKeys(orgId, items.slice(i, i + 50).map(q => q.id)));
  return { items, keys, capped: !!cursor };
}

/** History entry (best effort: some roles may not write it) plus the audit trail. */
export function record(orgId, info) {
  logAudit(orgId, 'export', info).catch(warn);
  return fs.addDoc(ref.col(orgId, 'exports'), forCreate(orgId, info)).catch(warn);
}
