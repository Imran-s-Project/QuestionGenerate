import { getActive, onOrgChange } from '../services/org-context.js';
import { loadTypes, typeName } from '../services/question-types.js';
import { listSubjects } from '../services/question-service.js';
import { MANAGERS, listExams, getExam, saveExam, setExamStatus, listCategories, addCategory, catName, examIssues, sectionTotal } from '../services/exam-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';
import { getSettings } from '../services/settings-service.js';

let off = null;

export async function mount(el, param) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  const canManage = MANAGERS.includes(org.role);
  off = onOrgChange(() => { if (location.hash === '#/examManager') mount(el); else location.hash = '#/examManager'; });
  if (!param) return list(root, org, canManage);
  if (!canManage) { root.innerHTML = `<div class="card empty"><p>${t('err.permission')}</p></div>`; return; }
  return editor(root, org, param === 'new' ? null : param);
}
export function unmount() { off?.(); off = null; }

async function list(root, org, canManage) {
  let items = [], cursor = null, status = 'draft';
  root.innerHTML = `<div class="card"><div class="row start"><select data-f="status" aria-label="${esc(t('x.status'))}">${['draft', 'final', 'archived'].map(s => `<option value="${s}">${t('status.' + s)}</option>`).join('')}</select>${canManage ? `<a class="btn primary" href="#/examManager/new">${t('x.new')}</a>` : ''}</div></div><div id="res" class="list"></div><div id="more" class="row"></div>`;
  const draw = () => {
    root.querySelector('#res').innerHTML = items.length ? items.map(x => `<div class="item"><div><strong>${esc(x.title)}</strong><br><span class="badge">${esc(x.code || '—')}</span> <span class="badge">${esc(x.date || '—')}</span> <span class="badge">${t('x.sumQ')}: ${esc(x.questionCount ?? 0)}</span> <span class="badge">${t('x.totalMarks')}: ${esc(x.totalMarks)}</span></div>${canManage ? `<div class="row" data-id="${esc(x.id)}"><a class="btn sm" href="#/examManager/${esc(x.id)}">${t('bank.edit')}</a><a class="btn sm" href="#/paperGenerator/${esc(x.id)}">${t('nav.paperGenerator')}</a><a class="btn sm" href="#/paperPreview/${esc(x.id)}">${t('nav.paperPreview')}</a><button class="btn sm" data-act="${x.status === 'archived' ? 'restore' : 'archive'}">${t(x.status === 'archived' ? 'bank.restore' : 'bank.archive')}</button></div>` : ''}</div>`).join('') : `<p class="empty">${t('bank.empty')}</p>`;
    root.querySelector('#more').innerHTML = cursor ? `<button class="btn" data-act="more">${t('bank.more')}</button>` : '';
  };
  const load = async reset => {
    if (reset) { items = []; cursor = null; }
    try { const r = await listExams(org.id, status, cursor); items = items.concat(r.items); cursor = r.last; } catch (e) { handleError(e, 'exams'); }
    draw();
  };
  root.addEventListener('change', e => { if (e.target.dataset.f === 'status') { status = e.target.value; load(true); } });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.closest('[data-id]')?.dataset.id, a = b.dataset.act;
    try {
      if (a === 'more') await load(false);
      else { await setExamStatus(org.id, id, a === 'archive' ? 'archived' : 'draft'); toast(t('saved')); await load(true); }
    } catch (err) { handleError(err, 'exams'); }
  });
  load(true);
}

async function editor(root, org, id) {
  root.innerHTML = '<div class="skeleton"></div>';
  let types, subjects, cats, cur = { exam: {}, sections: [] };
  try {
    [types, subjects, cats] = await Promise.all([loadTypes(org.id), listSubjects(org.id), listCategories(org.id)]);
    if (id) cur = await getExam(org.id, id);
  } catch (e) { handleError(e, 'exam'); root.innerHTML = ''; return; }
  const st = await getSettings(org.id);
  const e0 = cur.exam, sections0 = cur.sections, removed = [];
  const sig = ss => JSON.stringify(ss.map(s => [s.id, s.type, s.count, s.marksEach]));
  const opts = (list, sel, label) => list.map(x => `<option value="${esc(x.id)}"${x.id === sel ? ' selected' : ''}>${esc(label(x))}</option>`).join('');
  const FX = (name, kind = 'text', val = '', extra = '') => `<label>${t('x.' + name)}<input name="${name}" type="${kind}" value="${esc(val)}"${extra}></label>`;
  const secRow = s => `<div class="item sec" data-sid="${esc(s.id || '')}" data-q="${esc((s.questionIds || []).join(','))}">
<input data-k="title" value="${esc(s.title || '')}" placeholder="${esc(t('x.secTitle'))}" aria-label="${esc(t('x.secTitle'))}">
<select data-k="type" aria-label="${esc(t('q.type'))}"><option value="">${esc(t('x.anyType'))}</option>${opts(types, s.type, typeName)}</select>
<input data-k="count" type="number" min="0" step="1" value="${esc(s.count ?? 10)}" aria-label="${esc(t('x.count'))}" title="${esc(t('x.count'))}">
<input data-k="marksEach" type="number" min="0" step="0.5" value="${esc(s.marksEach ?? 1)}" aria-label="${esc(t('x.marksEach'))}" title="${esc(t('x.marksEach'))}">
<input data-k="instructions" value="${esc(s.instructions || '')}" placeholder="${esc(t('x.secInstr'))}" aria-label="${esc(t('x.secInstr'))}"><span class="badge" data-tot></span><button type="button" class="btn sm" data-act="delSec" aria-label="${esc(t('remove'))}">×</button></div>`;
  const statuses = ['draft', 'final', ...(e0.status === 'archived' ? ['archived'] : [])];

  root.innerHTML = `<form class="card grid" id="ef"><h3>${t(id ? 'x.edit' : 'x.new')}</h3><div class="grid two">
${FX('title', 'text', e0.title, ' required maxlength="200"')}${FX('code', 'text', e0.code)}
<label>${t('x.categoryId')}<select name="categoryId"><option value="">—</option>${opts(cats, e0.categoryId, catName)}</select></label>
<label>${t('x.newCategory')}<span class="row start"><input id="newCat"><button type="button" class="btn sm" data-act="addCat">+</button></span></label>
${FX('examType', 'text', e0.examType)}${FX('session', 'text', e0.session ?? org.academicSession)}${FX('className', 'text', e0.className)}${FX('department', 'text', e0.department)}${FX('group', 'text', e0.group)}
<label>${t('x.subjectId')}<select name="subjectId"><option value="">—</option>${opts(subjects, e0.subjectId, s => s.name)}</select></label>
${FX('version', 'number', e0.version ?? 1, ' min="1" step="1"')}${FX('date', 'date', e0.date)}${FX('startTime', 'time', e0.startTime)}${FX('endTime', 'time', e0.endTime)}
${FX('durationMin', 'number', e0.durationMin || (id ? '' : st.defaultDuration || ''), ' min="0" step="1"')}${FX('totalMarks', 'number', e0.totalMarks ?? '', ' min="0" step="0.5"')}${FX('passMarks', 'number', e0.passMarks ?? '', ' min="0" step="0.5"')}
<label class="inline"><input type="checkbox" name="negativeMarking"${e0.negativeMarking ? ' checked' : ''}> ${t('x.negativeMarking')}</label>
<label>${t('x.status')}<select name="status">${statuses.map(s => `<option value="${s}"${s === (e0.status || 'draft') ? ' selected' : ''}>${t('status.' + s)}</option>`).join('')}</select></label></div>
<label>${t('x.instructions')}<textarea name="instructions" rows="3">${esc(e0.instructions ?? (id ? '' : st.defaultInstructions))}</textarea></label>
<h3>${t('x.sections')}</h3><div id="secs" class="list">${(sections0.length ? sections0 : [{ title: '', count: 10, marksEach: 1 }]).map(secRow).join('')}</div>
<div class="row start"><button type="button" class="btn sm" data-act="addSec">${t('x.addSection')}</button></div>
<div id="sum" class="card"></div><div class="row"><button class="btn primary">${t('x.save')}</button></div></form>`;

  const read = () => {
    const f = root.querySelector('#ef').elements, v = n => f[n].value;
    const sections = [...root.querySelectorAll('.sec')].map(r => {
      const g = k => r.querySelector(`[data-k=${k}]`).value;
      return { id: r.dataset.sid || null, title: g('title').trim(), type: g('type'), count: Number(g('count')) || 0, marksEach: Number(g('marksEach')) || 0, questionIds: r.dataset.q ? r.dataset.q.split(',') : [], instructions: g('instructions').trim() };
    });
    const sum = sections.reduce((a, s) => a + sectionTotal(s), 0);
    const exam = { title: v('title').trim(), code: v('code').trim(), version: Number(v('version')) || 1, categoryId: v('categoryId'), examType: v('examType').trim(), session: v('session').trim(),
      className: v('className').trim(), department: v('department').trim(), group: v('group').trim(), subjectId: v('subjectId'), date: v('date'), startTime: v('startTime'), endTime: v('endTime'),
      durationMin: Number(v('durationMin')) || 0, totalMarks: v('totalMarks') === '' ? sum : Number(v('totalMarks')), passMarks: Number(v('passMarks')) || 0,
      negativeMarking: f.negativeMarking.checked, instructions: v('instructions').trim(), status: v('status') };
    return { exam, sections, sum };
  };
  const summary = () => {
    const { exam, sections, sum } = read(), issues = examIssues(exam, sections);
    root.querySelectorAll('.sec').forEach((r, i) => { r.querySelector('[data-tot]').textContent = '= ' + sectionTotal(sections[i]); });
    root.querySelector('#sum').innerHTML = `<p>${t('x.sumQ')}: <b>${sections.reduce((a, s) => a + s.count, 0)}</b> · ${t('x.sumSections')}: <b>${sum}</b> · ${t('x.totalMarks')}: <b>${exam.totalMarks}</b> · ${t('x.passMarks')}: <b>${exam.passMarks}</b></p>`
      + (issues.length ? `<ul class="warn">${issues.map(i => `<li>${esc(t(i.key, i.vars))}</li>`).join('')}</ul>` : '');
  };

  root.addEventListener('input', summary);
  root.addEventListener('change', summary);
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    try {
      if (b.dataset.act === 'addSec') { root.querySelector('#secs').insertAdjacentHTML('beforeend', secRow({ title: '', count: 10, marksEach: 1 })); summary(); }
      else if (b.dataset.act === 'delSec') { const r = b.closest('.sec'); if (r.dataset.sid) removed.push(r.dataset.sid); r.remove(); summary(); }
      else if (b.dataset.act === 'addCat') {
        const input = root.querySelector('#newCat'), name = input.value.trim();
        if (!name) return;
        const cid = await addCategory(org.id, name);
        cats = await listCategories(org.id);
        root.querySelector('[name=categoryId]').innerHTML = '<option value="">—</option>' + opts(cats, cid, catName);
        input.value = '';
      }
    } catch (err) { handleError(err, 'exam'); }
  });
  root.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target, { exam, sections } = read(), issues = examIssues(exam, sections);
    if (exam.status === 'final' && issues.length) { toast(`${t('x.err.final')} ${issues.map(i => t(i.key, i.vars)).join(' ')}`, 'error'); return; }
    form.classList.add('busy');
    try {
      const clear = !!id && sig(sections) !== sig(sections0);
      await saveExam(org.id, id, exam, sections, removed, clear);
      toast(t('saved') + (clear ? ' ' + t('x.setsCleared') : ''));
      location.hash = '#/examManager';
    } catch (err) { handleError(err, 'exam'); }
    finally { form.classList.remove('busy'); }
  });
  summary();
}
