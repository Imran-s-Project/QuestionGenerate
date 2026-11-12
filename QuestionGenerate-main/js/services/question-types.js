import { fs } from '../firebase.js';
import { ref, forCreate } from './firestore-service.js';
import { getLang } from '../utilities/i18n.js';

// Every type belongs to a family. The builder renders its fields from the family, so new types need no code.
export const FAMILIES = ['choice', 'multi', 'truefalse', 'blank', 'text', 'match', 'order', 'structured'];
const T = (id, family, en, bn, count) => ({ id, family, en, bn, count });
export const BUILT_IN = [
  T('mcq', 'choice', 'Multiple choice (MCQ)', 'বহুনির্বাচনি (MCQ)', 4), T('multiSelect', 'multi', 'Multiple select', 'একাধিক সঠিক উত্তর', 4),
  T('trueFalse', 'truefalse', 'True / False', 'সত্য / মিথ্যা'), T('blank', 'blank', 'Fill in the blanks', 'শূন্যস্থান পূরণ'),
  T('short', 'text', 'Short answer', 'সংক্ষিপ্ত প্রশ্ন'), T('broad', 'text', 'Broad / descriptive', 'বিস্তারিত প্রশ্ন'), T('essay', 'text', 'Essay', 'রচনা'),
  T('matching', 'match', 'Matching', 'মিলকরণ', 4), T('ordering', 'order', 'Ordering / sequencing', 'ক্রমবিন্যাস', 4),
  T('assertionReason', 'choice', 'Assertion and reason', 'উক্তি ও কারণ', 4), T('caseBased', 'structured', 'Case-based', 'কেস-ভিত্তিক', 3),
  T('passageBased', 'structured', 'Passage-based', 'অনুচ্ছেদভিত্তিক', 3), T('math', 'text', 'Mathematical', 'গাণিতিক'), T('equation', 'text', 'Equation-based', 'সমীকরণভিত্তিক'),
  T('practical', 'text', 'Practical', 'ব্যবহারিক'), T('viva', 'text', 'Viva', 'মৌখিক (ভাইভা)'), T('structured', 'structured', 'Structured', 'কাঠামোবদ্ধ', 4),
  T('subQuestion', 'structured', 'Sub-question based', 'উপ-প্রশ্নভিত্তিক', 3), T('diagram', 'text', 'Diagram-based', 'চিত্রভিত্তিক'),
  T('tableBased', 'text', 'Table-based', 'ছকভিত্তিক'), T('imageBased', 'text', 'Image-based', 'ছবিভিত্তিক'), T('comprehension', 'structured', 'Comprehension', 'অনুচ্ছেদ বোধ', 3)
];
export const typeName = tp => tp[getLang()] || tp.name || tp.id;

let cache = { org: null, list: BUILT_IN };
/** Built-in types plus the institution's custom types (one read per institution, cached). */
export async function loadTypes(orgId, force = false) {
  if (cache.org === orgId && !force) return cache.list;
  const s = await fs.getDocs(ref.col(orgId, 'questionTypes'));
  cache = { org: orgId, list: [...BUILT_IN, ...s.docs.map(d => ({ ...d.data(), id: 'c_' + d.id, custom: true }))] };
  return cache.list;
}

export async function createCustomType(orgId, { name, description = '', family, count = 0, instructions = '', criteria = '' }) {
  if (!String(name).trim() || !FAMILIES.includes(family)) throw new Error('Invalid question type');
  const r = await fs.addDoc(ref.col(orgId, 'questionTypes'), forCreate(orgId, { name: name.trim(), description, family, count: Number(count) || 0, instructions, criteria, status: 'active' }));
  return { list: await loadTypes(orgId, true), id: 'c_' + r.id };
}
