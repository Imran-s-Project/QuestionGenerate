import { getActive, onOrgChange } from '../services/org-context.js';
import { loadTypes, typeName } from '../services/question-types.js';
import { listQuestions, listSubjects, setStatus, deleteQuestion, duplicateQuestion } from '../services/question-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast, confirmBox } from '../utilities/dom.js';
import { plainText } from '../utilities/rich-text.js';
import { handleError } from '../utilities/errors.js';

let off = null, timer = null;
const FIELDS = { subject: 'subjectId', type: 'type', difficulty: 'difficulty', chapter: 'chapterId', tag: 'tags' };
const LABELS = { subject: 'q.subject', type: 'q.type', difficulty: 'q.difficulty', chapter: 'q.chapter', tag: 'bank.tag' };
const slug = s => s.trim().toLowerCase().replace(/\s+/g, '-');

export async function mount(el) {
  off?.(); clearTimeout(timer);
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  const canWrite = ['owner', 'admin', 'teacher', 'editor'].includes(org.role), isAdmin = ['owner', 'admin'].includes(org.role);
  let types = [], subjects = [], items = [], cursor = null;
  const filter = { status: 'active', by: '', value: '', search: '' }, selected = new Set();
  try { [types, subjects] = await Promise.all([loadTypes(org.id), listSubjects(org.id)]); } catch (e) { handleError(e, 'bank'); }
  const sname = Object.fromEntries(subjects.map(s => [s.id, s.name])), tname = Object.fromEntries(types.map(x => [x.id, typeName(x)]));
  const lists = { subject: () => subjects.map(s => [s.id, s.name]), type: () => types.map(x => [x.id, typeName(x)]), difficulty: () => ['easy', 'medium', 'hard'].map(d => [d, t('diff.' + d)]) };
  const valueControl = () => lists[filter.by]
    ? `<select data-f="value"><option value="">—</option>${lists[filter.by]().map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`
    : filter.by ? '<input data-f="value">' : '';

  root.innerHTML = `<div class="card grid"><div class="row start">
<input data-f="search" type="search" placeholder="${esc(t('bank.search'))}" aria-label="${esc(t('bank.search'))}">
<select data-f="status">${['active', 'draft', 'archived'].map(s => `<option value="${s}">${t('status.' + s)}</option>`).join('')}</select>
<select data-f="by"><option value="">${t('bank.none')}</option>${Object.keys(FIELDS).map(k => `<option value="${k}">${t(LABELS[k])}</option>`).join('')}</select>
<span id="val"></span>${canWrite ? `<a class="btn primary" href="#/questionBuilder">${t('q.new')}</a>` : ''}</div>
<div id="bulk" class="row start" hidden><span></span><button class="btn sm" data-act="bulkArchive">${t('bank.archive')}</button><button class="btn sm" data-act="bulkRestore">${t('bank.restore')}</button></div></div>
<div id="res" class="list"></div><div id="more" class="row"></div>`;

  const drawRes = () => {
    root.querySelector('#res').innerHTML = items.length ? items.map(q => `<div class="item"><label class="inline">${canWrite ? `<input type="checkbox" data-sel="${esc(q.id)}"${selected.has(q.id) ? ' checked' : ''}>` : ''}<span>${esc(plainText(q.statement).slice(0, 160))}</span></label>
<div><span class="badge">${esc(tname[q.type] || q.type)}</span> <span class="badge">${esc(t('diff.' + q.difficulty))}</span> <span class="badge">${esc(q.marks)}</span>${sname[q.subjectId] ? ` <span class="badge">${esc(sname[q.subjectId])}</span>` : ''}</div>
${canWrite ? `<div class="row" data-id="${esc(q.id)}"><a class="btn sm" href="#/questionBuilder/${esc(q.id)}">${t('bank.edit')}</a><button class="btn sm" data-act="dup">${t('bank.duplicate')}</button><button class="btn sm" data-act="${q.status === 'archived' ? 'restore' : 'archive'}">${t(q.status === 'archived' ? 'bank.restore' : 'bank.archive')}</button>${isAdmin ? `<button class="btn sm" data-act="del">${t('bank.delete')}</button>` : ''}</div>` : ''}</div>`).join('') : `<p class="empty">${t('bank.empty')}</p>`;
    root.querySelector('#more').innerHTML = cursor ? `<button class="btn" data-act="more">${t('bank.more')}</button>` : '';
    const bulk = root.querySelector('#bulk');
    bulk.hidden = !selected.size;
    bulk.querySelector('span').textContent = t('bank.selected', { n: selected.size });
  };
  const load = async reset => {
    if (reset) { items = []; cursor = null; selected.clear(); }
    const value = filter.by === 'chapter' ? slug(filter.value) : filter.by === 'tag' ? filter.value.trim().toLowerCase() : filter.value;
    try {
      const r = await listQuestions(org.id, { status: filter.status, field: FIELDS[filter.by], value, search: filter.search }, cursor);
      items = items.concat(r.items); cursor = r.last;
    } catch (e) { handleError(e, 'bank'); }
    drawRes();
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(() => load(true), 350); }; // debounced search

  root.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'search') { filter.search = e.target.value; later(); }
    else if (f === 'value' && e.target.tagName === 'INPUT') { filter.value = e.target.value; later(); }
  });
  root.addEventListener('change', e => {
    const f = e.target.dataset.f, id = e.target.dataset.sel;
    if (id) { e.target.checked ? selected.add(id) : selected.delete(id); drawRes(); }
    else if (f === 'status') { filter.status = e.target.value; load(true); }
    else if (f === 'by') { filter.by = e.target.value; filter.value = ''; root.querySelector('#val').innerHTML = valueControl(); load(true); }
    else if (f === 'value' && e.target.tagName === 'SELECT') { filter.value = e.target.value; load(true); }
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.closest('[data-id]')?.dataset.id, a = b.dataset.act;
    try {
      if (a === 'more') await load(false);
      else if (a === 'dup') { const nid = await duplicateQuestion(org.id, id); toast(t('saved')); location.hash = '#/questionBuilder/' + nid; }
      else if (a === 'archive' || a === 'restore') { await setStatus(org.id, [id], a === 'archive' ? 'archived' : 'active'); toast(t('saved')); await load(true); }
      else if (a === 'del' && await confirmBox(t('bank.deleteWarn'))) { await deleteQuestion(org.id, id); toast(t('saved')); await load(true); }
      else if (a === 'bulkArchive' || a === 'bulkRestore') { await setStatus(org.id, [...selected], a === 'bulkArchive' ? 'archived' : 'active'); toast(t('saved')); await load(true); }
    } catch (err) { handleError(err, 'bank'); }
  });
  off = onOrgChange(() => mount(el));
  load(true);
}
export function unmount() { off?.(); off = null; clearTimeout(timer); }
