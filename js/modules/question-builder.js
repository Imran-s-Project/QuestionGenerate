import { getActive, onOrgChange } from '../services/org-context.js';
import { loadTypes, createCustomType, typeName, FAMILIES } from '../services/question-types.js';
import { getQuestion, saveQuestion, fingerprint, findDuplicate, listSubjects, addSubject } from '../services/question-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast, confirmBox } from '../utilities/dom.js';
import { renderRich, plainText, wrapSelection } from '../utilities/rich-text.js';
import { handleError } from '../utilities/errors.js';

let off = null;
const rid = () => 'o' + Math.random().toString(36).slice(2, 7);
const shuffle = a => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return a.length > 1 && b.every((x, i) => x === a[i]) ? [...b.slice(1), b[0]] : b; // never leave the correct order untouched
};
const TOOLS = [['B', '**', '**'], ['I', '*', '*'], ['U', '++', '++'], ['x²', '^(', ')'], ['x₂', '_(', ')'], ['½', '{', '/}'], ['•', '\n- ', ''], ['▦', '\n| a | b |\n| c | d |\n', '']];
const SYMBOLS = '² ³ √ π ∑ ∫ ∞ ≤ ≥ ≠ ± × ÷ ° ∠ ∴ ∵ → ½ ¼ ¾ α β θ λ μ Δ Ω'.split(' ');

// Row-based families. The same row editor serves options, pairs, ordering items and sub-questions.
const CELLS = {
  choice: [['ok', 'radio'], ['text', 'text', 'q.option']], multi: [['ok', 'checkbox'], ['text', 'text', 'q.option']],
  match: [['left', 'text', 'q.left'], ['right', 'text', 'q.right']], order: [['text', 'text', 'q.item']],
  structured: [['text', 'text', 'q.subq'], ['marks', 'number', 'q.marks'], ['answer', 'text', 'q.answer']]
};
// The question document never contains the answers: they are split out here and saved in the answer key.
const toRows = (fam, q, ak) => {
  const by = (a = []) => Object.fromEntries(a.map(x => [x.id, x]));
  if (fam === 'choice' || fam === 'multi') return (q.options || []).map(o => ({ id: o.id, ok: (ak.correct || []).includes(o.id), text: o.text }));
  if (fam === 'match') { const r = by(q.rights); return (q.lefts || []).map(l => ({ id: l.id, left: l.text, right: r[ak.map?.[l.id]]?.text || '' })); }
  if (fam === 'order') { const it = by(q.items); return (ak.order || []).map(id => ({ id, text: it[id]?.text || '' })); }
  if (fam === 'structured') return (q.subs || []).map(s => ({ id: s.id, text: s.text, marks: s.marks, answer: ak.subs?.[s.id] || '' }));
  return [];
};
const fromRows = (fam, rows) => {
  const R = rows.filter(r => r.text || r.left || r.right);
  if (fam === 'choice' || fam === 'multi') return { q: { options: R.map(r => ({ id: r.id, text: r.text })) }, ak: { correct: R.filter(r => r.ok).map(r => r.id) } };
  if (fam === 'match') return { q: { lefts: R.map(r => ({ id: r.id, text: r.left })), rights: shuffle(R.map(r => ({ id: 'r' + r.id, text: r.right }))) }, ak: { map: Object.fromEntries(R.map(r => [r.id, 'r' + r.id])) } };
  if (fam === 'order') return { q: { items: shuffle(R.map(r => ({ id: r.id, text: r.text }))) }, ak: { order: R.map(r => r.id) } };
  return { q: { subs: R.map(r => ({ id: r.id, text: r.text, marks: Number(r.marks) || 0 })) }, ak: { subs: Object.fromEntries(R.map(r => [r.id, r.answer || ''])) } };
};
const cell = ([k, kind, ph], v) => kind === 'radio' || kind === 'checkbox'
  ? `<input type="${kind}" name="ok" data-k="${k}"${v ? ' checked' : ''} aria-label="${esc(t('q.correct'))}">`
  : `<input type="${kind}" data-k="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph ? t(ph) : '')}"${kind === 'number' ? ' min="0" step="0.5"' : ''}>`;
const rowHtml = (fam, r) => `<div class="item opt" data-id="${esc(r.id)}">${CELLS[fam].map(c => cell(c, r[c[0]])).join('')}<button type="button" class="btn sm" data-act="del" aria-label="${esc(t('remove'))}">×</button></div>`;

function famHtml(tp, q, ak) {
  const fam = tp.family;
  if (CELLS[fam]) {
    const rows = toRows(fam, q, ak);
    const seed = rows.length ? rows : Array.from({ length: tp.count || 4 }, () => ({ id: rid() }));
    return `<div class="list" id="rows">${seed.map(r => rowHtml(fam, r)).join('')}</div><div class="row start"><button type="button" class="btn sm" data-act="add">${t('q.add')}</button></div>`;
  }
  if (fam === 'truefalse') return ['true', 'false'].map(v => `<label class="inline"><input type="radio" name="tf" value="${v}"${String(ak.value) === v ? ' checked' : ''}> ${t('q.' + v)}</label>`).join('');
  if (fam === 'blank') return `<label>${t('q.blanks')}<textarea name="blanks" rows="3">${esc((ak.blanks || []).join('\n'))}</textarea></label>`;
  return `<label>${t('q.model')}<textarea name="answer" rows="4">${esc(ak.answer || '')}</textarea></label>`;
}
const F = (name, kind = 'text', val = '', extra = '') => `<label>${t('q.' + name)}<input name="${name}" type="${kind}" value="${esc(val)}"${extra}></label>`;
const TA = (name, val = '', rows = 2) => `<label>${t('q.' + name)}<textarea name="${name}" rows="${rows}">${esc(val)}</textarea></label>`;
const S = (name, opts, cur) => `<label>${t('q.' + name)}<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;

function validate(tp, q, ak) {
  const e = [], fam = tp.family;
  if (!plainText(q.statement)) e.push('q.err.statement');
  if (!(q.marks >= 0)) e.push('q.err.marks');
  if (fam === 'choice' || fam === 'multi') {
    if ((q.options?.length || 0) < 2) e.push('q.err.options');
    else if (!ak.correct.length || (fam === 'choice' && ak.correct.length !== 1)) e.push('q.err.correct');
  }
  if (fam === 'truefalse' && typeof ak.value !== 'boolean') e.push('q.err.correct');
  if (fam === 'blank' && (!ak.blanks.length || ak.blanks.length !== (q.statement.match(/___/g) || []).length)) e.push('q.err.blanks');
  if (fam === 'match' && (q.lefts?.length || 0) < 2) e.push('q.err.options');
  if (fam === 'order' && (q.items?.length || 0) < 2) e.push('q.err.options');
  if (fam === 'structured') {
    if (!q.subs?.length) e.push('q.err.options');
    else if (Math.abs(q.subs.reduce((s, x) => s + x.marks, 0) - q.marks) > 1e-9) e.push('q.err.sum');
  }
  return e;
}

export async function mount(el, param) {
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  if (!['owner', 'admin', 'teacher', 'editor'].includes(org.role)) { root.innerHTML = `<div class="card empty"><p>${t('err.permission')}</p></div>`; return; }
  root.innerHTML = '<div class="skeleton"></div>';
  let types, subjects, cur = { q: {}, ak: {} };
  try {
    [types, subjects] = await Promise.all([loadTypes(org.id), listSubjects(org.id)]);
    if (param) cur = await getQuestion(org.id, param);
  } catch (e) { handleError(e, 'builder'); root.innerHTML = ''; return; }
  const { q: q0, ak: ak0 } = cur;
  const tp0 = types.find(x => x.id === q0.type) || (q0.family ? { id: q0.type, family: q0.family, name: q0.type } : types[0]);
  const subjectOpts = sel => '<option value="">—</option>' + subjects.map(s => `<option value="${esc(s.id)}"${s.id === sel ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
  const tp = () => types.find(x => x.id === root.querySelector('[name=type]').value) || tp0;
  const statuses = ['draft', 'active', ...(q0.status === 'archived' ? ['archived'] : [])];

  root.innerHTML = `<form class="card grid" id="qf"><h3>${t(param ? 'q.edit' : 'q.new')}</h3>
${S('type', types.map(x => [x.id, typeName(x)]), tp0.id)}
<div class="tools">${TOOLS.map(([l, a, b]) => `<button type="button" class="btn sm" data-wrap="${esc(a)}" data-end="${esc(b)}">${l}</button>`).join('')}<select data-sym aria-label="${esc(t('q.symbols'))}"><option value="">∑</option>${SYMBOLS.map(s => `<option>${s}</option>`).join('')}</select></div>
<label>${t('q.statement')}<textarea name="statement" rows="6" required>${esc(q0.statement || '')}</textarea></label>
<div class="card rich" id="prev" aria-label="${esc(t('q.preview'))}">${renderRich(q0.statement)}</div>
${F('imageUrl', 'url', q0.imageUrl, ' pattern="https?://.*"')}${TA('instructions', q0.instructions || tp0.instructions)}
<div class="grid" id="fam">${famHtml(tp0, q0, ak0)}</div>
<div class="grid two">
<label>${t('q.subject')}<select name="subjectId">${subjectOpts(q0.subjectId)}</select></label>
<label>${t('q.newSubject')}<span class="row start"><input id="newSubject"><button type="button" class="btn sm" data-act="addSubject">+</button></span></label>
${F('topic', 'text', q0.topic)}${F('chapter', 'text', q0.chapter)}${F('category', 'text', q0.category)}
${S('difficulty', ['easy', 'medium', 'hard'].map(d => [d, t('diff.' + d)]), q0.difficulty || 'medium')}
${F('marks', 'number', q0.marks ?? 1, ' min="0" step="0.5" required')}${F('negativeMarks', 'number', q0.negativeMarks ?? 0, ' min="0" step="0.25"')}${F('timeSeconds', 'number', q0.timeSeconds || '', ' min="0"')}
${F('tags', 'text', (q0.tags || []).join(', '))}${S('status', statuses.map(s => [s, t('status.' + s)]), q0.status || 'active')}
</div>
${TA('explanation', ak0.explanation, 3)}${TA('notes', ak0.notes)}
<div class="row"><button class="btn primary">${t('q.save')}</button></div></form>
<details class="card"><summary>${t('ct.title')}</summary><form id="ctf" class="grid"><div class="grid two">
<label>${t('ct.name')}<input name="name" required maxlength="80"></label>
<label>${t('ct.family')}<select name="family">${FAMILIES.map(f => `<option value="${f}">${t('fam.' + f)}</option>`).join('')}</select></label>
<label>${t('ct.count')}<input name="count" type="number" min="0" max="12" value="4"></label>
<label>${t('ct.desc')}<input name="description"></label></div>
<label>${t('q.instructions')}<textarea name="instructions" rows="2"></textarea></label>
<label>${t('ct.criteria')}<textarea name="criteria" rows="2"></textarea></label>
<div class="row"><button class="btn">${t('ct.create')}</button></div></form></details>`;

  const collect = type => {
    const f = root.querySelector('#qf').elements, v = n => f[n].value, num = n => (v(n) === '' ? 0 : Number(v(n))), fam = type.family;
    const q = { type: type.id, family: fam, statement: v('statement').trim(), imageUrl: v('imageUrl').trim(), instructions: v('instructions').trim(),
      subjectId: v('subjectId'), topic: v('topic').trim(), chapter: v('chapter').trim(), chapterId: v('chapter').trim().toLowerCase().replace(/\s+/g, '-'),
      category: v('category').trim(), difficulty: v('difficulty'), marks: num('marks'), negativeMarks: num('negativeMarks'), timeSeconds: num('timeSeconds'),
      tags: v('tags').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 30), status: v('status') };
    const ak = { explanation: v('explanation').trim(), notes: v('notes').trim() };
    if (CELLS[fam]) {
      const rows = [...root.querySelectorAll('#rows .opt')].map(r => ({ id: r.dataset.id, ...Object.fromEntries([...r.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.type === 'radio' || i.type === 'checkbox' ? i.checked : i.value.trim()])) }));
      const p = fromRows(fam, rows);
      Object.assign(q, p.q); Object.assign(ak, p.ak);
    } else if (fam === 'truefalse') { const c = f.tf.value; ak.value = c === '' ? null : c === 'true'; }
    else if (fam === 'blank') ak.blanks = v('blanks').split('\n').map(s => s.trim()).filter(Boolean);
    else ak.answer = v('answer').trim();
    return { q, ak };
  };

  root.addEventListener('input', e => { if (e.target.name === 'statement') root.querySelector('#prev').innerHTML = renderRich(e.target.value); });
  root.addEventListener('change', e => {
    if (e.target.name === 'type') {
      const x = tp(), ins = root.querySelector('[name=instructions]');
      root.querySelector('#fam').innerHTML = famHtml(x, {}, {});
      if (!ins.value && x.instructions) ins.value = x.instructions;
    } else if (e.target.matches('[data-sym]')) { if (e.target.value) wrapSelection(root.querySelector('[name=statement]'), e.target.value); e.target.value = ''; }
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.dataset.wrap !== undefined) wrapSelection(root.querySelector('[name=statement]'), b.dataset.wrap, b.dataset.end);
      else if (b.dataset.act === 'add') root.querySelector('#rows')?.insertAdjacentHTML('beforeend', rowHtml(tp().family, { id: rid() }));
      else if (b.dataset.act === 'del') b.closest('.opt').remove();
      else if (b.dataset.act === 'addSubject') {
        const input = root.querySelector('#newSubject'), name = input.value.trim();
        if (!name) return;
        const id = await addSubject(org.id, name);
        subjects = await listSubjects(org.id);
        root.querySelector('[name=subjectId]').innerHTML = subjectOpts(id);
        input.value = '';
      }
    } catch (err) { handleError(err, 'builder'); }
  });
  root.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    form.classList.add('busy');
    try {
      if (form.id === 'ctf') {
        const r = await createCustomType(org.id, Object.fromEntries(new FormData(form)));
        types = r.list;
        const sel = root.querySelector('[name=type]');
        sel.innerHTML = types.map(x => `<option value="${esc(x.id)}">${esc(typeName(x))}</option>`).join('');
        sel.value = r.id;
        root.querySelector('#fam').innerHTML = famHtml(tp(), {}, {});
        form.reset(); toast(t('saved'));
        return;
      }
      const type = tp(), { q, ak } = collect(type), errs = validate(type, q, ak);
      if (errs.length) { toast(errs.map(k => t(k)).join(' '), 'error'); return; }
      const dup = await findDuplicate(org.id, await fingerprint(q), param);
      if (dup && !(await confirmBox(t('q.dup', { text: plainText(dup.statement).slice(0, 80) })))) return;
      await saveQuestion(org.id, param, q, ak);
      toast(t('saved')); // only after the write succeeded
      location.hash = '#/questionBank';
    } catch (err) { handleError(err, 'builder'); }
    finally { form.classList.remove('busy'); }
  });
  off = onOrgChange(() => { location.hash = '#/questionBank'; });
}
export function unmount() { off?.(); }
