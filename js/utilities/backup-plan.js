import { jsonToItem, validateQuestion, strip } from './question-schema.js';

// Pure planning of a restore (no Firebase): turns a backup file into a list of NEW documents with fresh ids.
// Nothing that exists is overwritten. Links between documents (exam sections -> questions, sets -> sections) are remapped.
const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => A[b % A.length]).join('');
const EXAM_FIELDS = ['title', 'code', 'version', 'examType', 'session', 'className', 'department', 'group', 'date', 'startTime', 'endTime', 'durationMin', 'totalMarks', 'passMarks', 'negativeMarking', 'instructions', 'status', 'sectionCount', 'questionCount'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o?.[k] !== undefined).map(k => [k, o[k]]));
const arr = a => (Array.isArray(a) ? a : []);

export const checkBackup = b => !!b && b.format === 'question-generate/backup' && b.version === 1 && !!b.data && typeof b.data === 'object';
export const summarize = b => { const d = b.data; return { subjects: arr(d.subjects).length, categories: arr(d.categories).length, types: arr(d.questionTypes).length, layouts: arr(d.paperLayouts).length, questions: arr(d.questions).length, exams: arr(d.exams).length, profile: !!d.profile }; };

/** groups: { taxonomy, questions, exams, profile }. existing: { subjects, categories, types } as lowercase name -> id. */
export function planRestore(b, groups, existing, id = newId) {
  const d = b.data, ops = [], skipped = { questions: 0, sets: 0, links: 0 };
  const subj = { ...existing.subjects }, cat = { ...existing.categories }, typ = { ...existing.types };
  const named = (map, kind, name, extra = {}) => { const k = String(name).toLowerCase(); if (!map[k]) { map[k] = id(); ops.push({ kind, path: [kind, map[k]], data: { name, ...extra } }); } return map[k]; };
  const catMap = {}, typeMap = {}, qmap = {};
  if (groups.taxonomy) {
    arr(d.subjects).filter(s => s?.name).forEach(s => named(subj, 'subjects', s.name));
    arr(d.categories).filter(c => c?.name).forEach(c => { catMap['c_' + c.id] = 'c_' + named(cat, 'categories', c.name); });
    arr(d.questionTypes).filter(x => x?.name).forEach(x => { typeMap['c_' + x.id] = 'c_' + named(typ, 'questionTypes', x.name, pick(x, ['description', 'family', 'count', 'instructions', 'criteria', 'status'])); });
    arr(d.paperLayouts).forEach(l => ops.push({ kind: 'paperLayouts', path: ['paperLayouts', id()], data: { ...strip(l), name: String(l.name || 'Layout'), isDefault: false } }));
  }
  if (groups.questions) {
    for (const src of arr(d.questions)) {
      const it = jsonToItem(src, { types: new Map(), status: 'active' });
      if (it.buildErrors.length || validateQuestion(it.q, it.ak).length) { skipped.questions++; continue; }
      const nid = id();
      if (src.id) qmap[src.id] = nid;
      const { subjectName, ...q } = it.q;
      q.status = ['draft', 'active', 'archived'].includes(src.status) ? src.status : 'active';
      q.type = typeMap[q.type] || q.type;
      ops.push({ kind: 'questions', path: ['questions', nid], data: { ...q, subjectId: subjectName ? named(subj, 'subjects', subjectName) : '' } });
      ops.push({ kind: 'answerKeys', path: ['questions', nid, 'answerKey', 'main'], data: { explanation: '', notes: '', ...it.ak, questionId: nid } });
    }
  }
  if (groups.exams) {
    for (const e of arr(d.exams).filter(x => x?.title)) {
      const eid = id(), smap = {};
      const body = pick(e, EXAM_FIELDS);
      body.categoryId = String(e.categoryId || '').startsWith('c_') ? catMap[e.categoryId] || '' : e.categoryId || '';
      body.subjectId = e.subject ? named(subj, 'subjects', e.subject) : '';
      ops.push({ kind: 'exams', path: ['exams', eid], data: body });
      for (const s of arr(e.sections)) {
        smap[s.id] = id();
        const ids = arr(s.questionIds).map(q => qmap[q]).filter(Boolean);
        skipped.links += arr(s.questionIds).length - ids.length;
        ops.push({ kind: 'sections', path: ['exams', eid, 'sections', smap[s.id]], data: { ...pick(s, ['title', 'count', 'marksEach', 'order', 'instructions']), type: typeMap[s.type] || s.type || '', questionIds: ids } });
      }
      for (const set of arr(e.sets)) {
        const order = {};
        let ok = true;
        for (const [sid, list] of Object.entries(set.questionOrder || {})) {
          const mapped = arr(list).map(q => qmap[q]);
          if (!smap[sid] || mapped.some(x => !x)) ok = false; else order[smap[sid]] = mapped;
        }
        if (!ok) { skipped.sets++; continue; }
        const opt = Object.fromEntries(Object.entries(set.optionOrder || {}).filter(([q]) => qmap[q]).map(([q, v]) => [qmap[q], v]));
        ops.push({ kind: 'sets', path: ['exams', eid, 'sets', id()], data: { ...pick(set, ['label', 'shuffleQuestions', 'shuffleOptions']), questionOrder: order, optionOrder: opt } });
      }
    }
  }
  const profile = groups.profile && d.profile ? pick(d.profile, ['name', 'type', 'code', 'academicSession', 'address', 'phone', 'email', 'website', 'logoUrl', 'brandColor', 'paperHeader', 'defaultFooter']) : null;
  return { ops, skipped, profile };
}
