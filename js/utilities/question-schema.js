import { plainText } from './rich-text.js';

// Pure functions (no Firebase): the question schema, validation and conversion of imported rows.
export const SYSTEM_FIELDS = ['id', 'orgId', 'questionId', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt', 'fingerprint'];
export const strip = o => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !SYSTEM_FIELDS.includes(k)));
/** Columns of the CSV/XLSX files used by both export and import. */
export const IMPORT_FIELDS = ['type', 'family', 'statement', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'optionF', 'correct', 'answer', 'explanation',
  'difficulty', 'marks', 'negativeMarks', 'timeSeconds', 'subject', 'topic', 'chapter', 'category', 'tags', 'status'];
const L6 = ['A', 'B', 'C', 'D', 'E', 'F'];
const arr = a => (Array.isArray(a) ? a : []);
const splitList = s => String(s).split(/[;,]/).map(x => x.trim()).filter(Boolean);
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o?.[k] !== undefined).map(k => [k, o[k]]));

/** Returns the text keys of every problem. Used by the builder and by the import. */
export function validateQuestion(q, ak = {}) {
  const e = [], fam = q.family;
  if (!plainText(q.statement)) e.push('q.err.statement');
  if (!(q.marks >= 0)) e.push('q.err.marks');
  if (!['easy', 'medium', 'hard'].includes(q.difficulty)) e.push('i.err.difficulty');
  if (fam === 'choice' || fam === 'multi') {
    if (arr(q.options).length < 2) e.push('q.err.options');
    else if (!arr(ak.correct).length || (fam === 'choice' && ak.correct.length !== 1)) e.push('q.err.correct');
  }
  if (fam === 'truefalse' && typeof ak.value !== 'boolean') e.push('q.err.correct');
  if (fam === 'blank' && (!arr(ak.blanks).length || ak.blanks.length !== (String(q.statement).match(/___/g) || []).length)) e.push('q.err.blanks');
  if (fam === 'match' && arr(q.lefts).length < 2) e.push('q.err.options');
  if (fam === 'order' && arr(q.items).length < 2) e.push('q.err.options');
  if (fam === 'structured') {
    const subs = arr(q.subs);
    if (!subs.length) e.push('q.err.options');
    else if (Math.abs(subs.reduce((s, x) => s + (Number(x.marks) || 0), 0) - q.marks) > 1e-9) e.push('q.err.sum');
  }
  return e;
}

/** One spreadsheet row (field -> text) becomes { q, ak, buildErrors }. Match, ordering and structured questions need the JSON import. */
export function rowToItem(r, ctx) {
  const s = f => String(r[f] ?? '').replace(/^'(?=[=+\-@])/, '').trim(), errs = [];
  const raw = s('type').toLowerCase(), found = raw ? ctx.types.get(raw) : null;
  if (raw && !found) errs.push('i.err.type');
  const opts = L6.map((L, i) => ({ id: 'o' + (i + 1), text: s('option' + L), L })).filter(o => o.text);
  const letters = s('correct').toUpperCase().split(/[\s,;|]+/).filter(Boolean), ans = s('answer');
  const tp = found || ctx.byId(opts.length ? (letters.length > 1 ? 'multiSelect' : 'mcq') : /^(true|false|সত্য|মিথ্যা)$/i.test(ans) ? 'trueFalse' : /___/.test(s('statement')) ? 'blank' : 'short');
  const fam = tp.family, chapter = s('chapter');
  const q = { type: tp.id, family: fam, statement: s('statement'), imageUrl: '', instructions: '', subjectName: s('subject'), topic: s('topic'), chapter, chapterId: chapter.toLowerCase().replace(/\s+/g, '-'),
    category: s('category'), difficulty: (s('difficulty') || 'medium').toLowerCase(), marks: s('marks') === '' ? 1 : Number(s('marks')), negativeMarks: Number(s('negativeMarks')) || 0,
    timeSeconds: Number(s('timeSeconds')) || 0, tags: splitList(s('tags')).map(x => x.toLowerCase()).slice(0, 30), status: ctx.status };
  const ak = { explanation: s('explanation'), notes: '' };
  if (fam === 'choice' || fam === 'multi') {
    q.options = opts.map(({ id, text }) => ({ id, text }));
    ak.correct = letters.map(L => opts.find(o => o.L === L)?.id).filter(Boolean);
    if (ak.correct.length !== letters.length) ak.correct = []; // a letter that points to an empty option is a mistake, never ignored
  } else if (fam === 'truefalse') ak.value = /^(true|সত্য|yes|1)$/i.test(ans) ? true : /^(false|মিথ্যা|no|0)$/i.test(ans) ? false : null;
  else if (fam === 'blank') ak.blanks = ans.split(/;|\n/).map(x => x.trim()).filter(Boolean);
  else if (fam === 'text') ak.answer = ans;
  else errs.push('i.err.family');
  return { q, ak, buildErrors: errs };
}

/** A question from a JSON export. Only known fields are kept; ids and the other institution's subject id are dropped. */
export function jsonToItem(it, ctx) {
  const errs = [], found = ctx.types.get(String(it?.type || '').toLowerCase());
  const idText = a => arr(a).filter(o => o && typeof o.text === 'string').map((o, i) => ({ id: String(o.id ?? 'o' + (i + 1)), text: o.text }));
  const q = { ...pick(it, ['type', 'family', 'statement', 'instructions', 'topic', 'chapter', 'category', 'difficulty', 'marks', 'negativeMarks', 'timeSeconds']),
    subjectName: String(it?.subject || '').trim(), status: ctx.status, imageUrl: /^https:\/\//.test(it?.imageUrl || '') ? it.imageUrl : '' };
  q.family ||= found?.family;
  if (!q.family) errs.push('i.err.type');
  q.statement = String(q.statement ?? '').trim();
  q.difficulty = String(q.difficulty || 'medium').toLowerCase();
  q.marks = q.marks === undefined ? 1 : Number(q.marks);
  q.chapterId = String(q.chapter || '').toLowerCase().replace(/\s+/g, '-');
  q.tags = arr(it?.tags).map(x => String(x).toLowerCase()).slice(0, 30);
  for (const k of ['options', 'lefts', 'rights', 'items']) if (it?.[k]) q[k] = idText(it[k]);
  if (it?.subs) q.subs = arr(it.subs).map((x, i) => ({ id: String(x.id ?? 's' + (i + 1)), text: String(x.text ?? ''), marks: Number(x.marks) || 0 }));
  const ak = pick(it?.answerKey, ['correct', 'value', 'blanks', 'answer', 'map', 'order', 'subs', 'explanation', 'notes']);
  return { q, ak, buildErrors: errs };
}
