import { db, fs } from '../firebase.js';
import { ref, forCreate, logAudit } from './firestore-service.js';
import { fingerprint, keywordsOf, listSubjects, addSubject } from './question-service.js';

const warn = e => console.warn('Import record not written', e);

/** Marks possible duplicates: inside the file, and against the bank (fingerprint lookups, 10 per query). */
export async function checkDuplicates(orgId, items, cache) {
  for (const it of items) it.fp ||= await fingerprint(it.q);
  const need = [...new Set(items.map(i => i.fp))].filter(f => !cache.yes.has(f) && !cache.no.has(f)), chunks = [];
  for (let i = 0; i < need.length; i += 10) chunks.push(need.slice(i, i + 10));
  for (let i = 0; i < chunks.length; i += 8) {
    await Promise.all(chunks.slice(i, i + 8).map(async c => {
      const s = await fs.getDocs(fs.query(ref.col(orgId, 'questions'), fs.where('fingerprint', 'in', c)));
      const hit = new Set(s.docs.map(d => d.data().fingerprint));
      c.forEach(f => (hit.has(f) ? cache.yes : cache.no).add(f));
    }));
  }
  const seen = new Set();
  for (const it of items) {
    const inFile = seen.has(it.fp), inBank = cache.yes.has(it.fp);
    seen.add(it.fp);
    it.dup = inBank || inFile; it.dupWhy = inBank ? 'bank' : inFile ? 'file' : '';
  }
}

/** Existing subjects are reused by name (case-insensitive); missing ones are created. Returns lowercase name -> id. */
export async function ensureSubjects(orgId, names) {
  const have = Object.fromEntries((await listSubjects(orgId)).map(s => [s.name.toLowerCase(), s.id]));
  for (const n of names) if (!have[n.toLowerCase()]) have[n.toLowerCase()] = await addSubject(orgId, n);
  return have;
}

/** Saves in batches of 200 questions (question + answer key = 2 writes each). Stops on cancel or on the first failed batch
 *  and reports exactly what was saved. */
export async function writeItems(orgId, items, subjectIds, { onProgress, cancelled }) {
  const todo = items.filter(i => i.include && !i.errors.length), rep = { todo: todo.length, imported: 0, failed: null, stopped: false };
  for (let i = 0; i < todo.length; i += 200) {
    if (cancelled()) { rep.stopped = true; break; }
    const chunk = todo.slice(i, i + 200), batch = fs.writeBatch(db);
    for (const it of chunk) {
      const { subjectName, ...q } = it.q, qRef = fs.doc(ref.col(orgId, 'questions'));
      batch.set(qRef, forCreate(orgId, { ...q, subjectId: subjectIds[(subjectName || '').toLowerCase()] || '', keywords: keywordsOf(q), fingerprint: it.fp }));
      batch.set(fs.doc(ref.answerKey(orgId, qRef.id), 'main'), forCreate(orgId, { ...it.ak, questionId: qRef.id }));
    }
    try { await batch.commit(); rep.imported += chunk.length; onProgress(rep.imported, todo.length); }
    catch (e) { rep.failed = { from: chunk[0].n, to: chunk[chunk.length - 1].n, message: e.code || e.message }; break; }
  }
  return rep;
}

export async function recordImport(orgId, info) {
  logAudit(orgId, 'question.import', { count: info.imported, status: info.status }).catch(warn);
  return fs.addDoc(ref.col(orgId, 'imports'), forCreate(orgId, info)).catch(warn); // the file itself is never stored
}
