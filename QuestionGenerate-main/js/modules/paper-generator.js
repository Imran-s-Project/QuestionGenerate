import { getActive, onOrgChange } from '../services/org-context.js';
import { loadTypes, typeName } from '../services/question-types.js';
import { listQuestions } from '../services/question-service.js';
import { MANAGERS, getExam, loadSets, saveSelection, saveSets, getQuestionsById, getAnswerKeys, autoFill, selectionIssues, buildSets } from '../services/exam-service.js';
import { t, getLang } from '../utilities/i18n.js';
import { esc, toast } from '../utilities/dom.js';
import { plainText } from '../utilities/rich-text.js';
import { handleError } from '../utilities/errors.js';

let off = null, timer = null;
const LETTERS = { en: 'ABCDEFGH', bn: 'কখগঘঙচছজ' };
const slug = s => s.trim().toLowerCase().replace(/\s+/g, '-');

export async function mount(el, param) {
  off?.(); clearTimeout(timer);
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  if (!MANAGERS.includes(org.role)) { root.innerHTML = `<div class="card empty"><p>${t('err.permission')}</p></div>`; return; }
  if (!param) { location.hash = '#/examManager'; return; } // each exam in the list has a "Paper generator" button
  off = onOrgChange(() => { location.hash = '#/examManager'; });
  root.innerHTML = '<div class="skeleton"></div>';

  let exam, sections, sets, qmap, types, found = [], picker = null, keyShown = null, keys = {};
  try {
    types = await loadTypes(org.id);
    ({ exam, sections } = await getExam(org.id, param));
    [sets, qmap] = await Promise.all([loadSets(org.id, param), getQuestionsById(org.id, [...new Set(sections.flatMap(s => s.questionIds))])]);
  } catch (e) { handleError(e, 'gen'); root.innerHTML = ''; return; }
  const tn = Object.fromEntries(types.map(x => [x.id, typeName(x)]));
  const taken = () => new Set(sections.flatMap(s => s.questionIds));
  const snippet = q => esc(plainText(q?.statement ?? '—').slice(0, 120));
  const foundHtml = () => found.map(q => `<div class="item"><span>${snippet(q)}</span><button class="btn sm" data-act="add" data-q="${esc(q.id)}">+</button></div>`).join('');

  // Answer key of a set, derived from the answer-key documents and the set's option order (never stored in the set).
  const keyHtml = set => {
    const L = [...LETTERS[getLang()]];
    return `<div class="card">${sections.map(s => `<p><b>${esc(s.title)}</b>: ${(set.questionOrder[s.id] || []).map((id, i) => {
      const q = qmap[id], ak = keys[id] || {};
      if (q?.family === 'choice' || q?.family === 'multi') return `${i + 1}:${(ak.correct || []).map(c => L[(set.optionOrder?.[id] || q.options.map(o => o.id)).indexOf(c)]).sort().join('')}`;
      if (q?.family === 'truefalse') return `${i + 1}:${t(ak.value ? 'q.true' : 'q.false')}`;
      return `${i + 1}:—`;
    }).join('  ')}</p>`).join('')}</div>`;
  };
  const secCard = s => `<div class="card grid" data-sid="${esc(s.id)}"><div class="row start"><h3>${esc(s.title)}</h3><span class="badge">${esc(t('x.gen.selected', { have: s.questionIds.length, need: s.count }))}</span>${s.type ? `<span class="badge">${esc(tn[s.type] || s.type)}</span>` : ''}</div>
<div class="list">${s.questionIds.map(id => `<div class="item"><span>${snippet(qmap[id])}</span><button class="btn sm" data-act="rm" data-q="${esc(id)}">${t('remove')}</button></div>`).join('')}</div>
<div class="row start">${['easy', 'medium', 'hard'].map(d => `<input class="pct" data-k="${d}" type="number" min="0" max="100" placeholder="${esc(t('diff.' + d))} %" aria-label="${esc(t('diff.' + d))} %">`).join('')}<input data-k="chapter" placeholder="${esc(t('q.chapter'))}"><button class="btn sm" data-act="auto">${t('x.gen.auto')}</button><button class="btn sm" data-act="manual">${t('x.gen.manual')}</button></div>
${picker === s.id ? `<div class="grid"><input data-k="search" type="search" placeholder="${esc(t('bank.search'))}"><div class="list found">${foundHtml()}</div></div>` : ''}</div>`;
  const draw = () => {
    const { errors, marksDiff } = selectionIssues(sections, qmap);
    root.innerHTML = `<div class="card grid"><h3>${esc(exam.title)}</h3><p>${t('x.sumQ')}: <b>${esc(exam.questionCount ?? 0)}</b> · ${t('x.totalMarks')}: <b>${esc(exam.totalMarks)}</b> <a class="btn sm" href="#/examManager/${esc(param)}">${t('x.edit')}</a></p>
${errors.length || marksDiff ? `<ul class="warn">${errors.map(i => `<li>${esc(t(i.key, i.vars))}</li>`).join('')}${marksDiff ? `<li>${esc(t('x.warn.marks', { n: marksDiff }))}</li>` : ''}</ul>` : ''}</div>`
      + sections.map(secCard).join('')
      + `<div class="card grid"><h3>${t('x.gen.sets')}</h3><div class="row start"><label class="inline">${t('x.gen.numSets')} <select data-k="n">${[1, 2, 3, 4, 5, 6].map(n => `<option${n === 4 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
<label class="inline"><input type="checkbox" data-k="sq" checked> ${t('x.gen.shuffleQ')}</label><label class="inline"><input type="checkbox" data-k="so" checked> ${t('x.gen.shuffleO')}</label>
<button class="btn primary" data-act="gen"${errors.length ? ' disabled' : ''}>${t('x.gen.make')}</button></div>
${sets.map(s => `<div class="item"><strong>${esc(t('x.gen.set', { label: s.label }))}</strong><button class="btn sm" data-act="key" data-id="${esc(s.id)}">${t('x.gen.key')}</button></div>${keyShown === s.id ? keyHtml(s) : ''}`).join('')}</div>`;
  };
  const select = async (s, list) => {
    await saveSelection(org.id, param, s.id, list, sets);
    s.questionIds = list;
    if (sets.length) { sets = []; keyShown = null; toast(t('x.gen.stale')); }
    draw();
  };

  root.addEventListener('input', e => {
    if (e.target.dataset.k !== 'search') return;
    const sid = e.target.closest('[data-sid]').dataset.sid, s = sections.find(x => x.id === sid), text = e.target.value;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        found = (await listQuestions(org.id, { status: 'active', field: s.type ? 'type' : '', value: s.type, search: text })).items;
        found.forEach(q => { qmap[q.id] = q; });
        root.querySelector(`[data-sid="${CSS.escape(sid)}"] .found`).innerHTML = foundHtml();
      } catch (err) { handleError(err, 'gen'); }
    }, 350);
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const a = b.dataset.act, card = b.closest('[data-sid]'), s = card && sections.find(x => x.id === card.dataset.sid);
    const g = k => card?.querySelector(`[data-k=${k}]`)?.value ?? '', ctl = k => root.querySelector(`[data-k=${k}]`);
    try {
      if (a === 'rm') await select(s, s.questionIds.filter(id => id !== b.dataset.q));
      else if (a === 'manual') { picker = picker === s.id ? null : s.id; found = []; draw(); }
      else if (a === 'add') { if (taken().has(b.dataset.q)) toast(t('x.err.dupSel'), 'error'); else await select(s, [...s.questionIds, b.dataset.q]); }
      else if (a === 'auto') {
        const mix = ['easy', 'medium', 'hard'].some(k => g(k)) ? { easy: +g('easy') || 0, medium: +g('medium') || 0, hard: +g('hard') || 0 } : null;
        const { picked, short } = await autoFill(org.id, exam, s, taken(), { mix, chapter: slug(g('chapter')) });
        picked.forEach(q => { qmap[q.id] = q; });
        await select(s, [...s.questionIds, ...picked.map(q => q.id)]);
        if (short > 0) toast(t('x.gen.pool', { n: picked.length }), 'error');
      } else if (a === 'gen') {
        await saveSets(org.id, param, buildSets(sections, qmap, { n: Number(ctl('n').value), shuffleQ: ctl('sq').checked, shuffleO: ctl('so').checked }), sets);
        sets = await loadSets(org.id, param); keyShown = null; toast(t('saved')); draw();
      } else if (a === 'key') {
        keys = await getAnswerKeys(org.id, [...taken()]);
        keyShown = keyShown === b.dataset.id ? null : b.dataset.id; draw();
      }
    } catch (err) { handleError(err, 'gen'); }
  });
  draw();
}
export function unmount() { off?.(); off = null; clearTimeout(timer); }
