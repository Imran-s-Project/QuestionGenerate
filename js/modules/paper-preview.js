import { getActive, onOrgChange } from '../services/org-context.js';
import { listSubjects } from '../services/question-service.js';
import { getExam, loadSets, getQuestionsById, selectionIssues } from '../services/exam-service.js';
import { TEMPLATE_ROLES, DEFAULT_LAYOUT, GROUPS, LABELS, OPTION_LABELS, listLayouts, saveLayout } from '../services/layout-service.js';
import { renderPaper } from '../utilities/paper-render.js';
import { t } from '../utilities/i18n.js';
import { esc, toast } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null, timer = null, onResize = null;

export async function mount(el, param) {
  unmount();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  if (!param) { location.hash = '#/examManager'; return; } // each exam in the list has a preview button
  off = onOrgChange(() => { location.hash = '#/examManager'; });
  root.innerHTML = '<div class="skeleton"></div>';
  let exam, sections, sets, qmap, layouts, subjects;
  try {
    ({ exam, sections } = await getExam(org.id, param));
    [sets, qmap, layouts, subjects] = await Promise.all([loadSets(org.id, param), getQuestionsById(org.id, [...new Set(sections.flatMap(s => s.questionIds))]), listLayouts(org.id), listSubjects(org.id)]);
  } catch (e) { handleError(e, 'preview'); root.innerHTML = ''; return; }
  const canDesign = TEMPLATE_ROLES.includes(org.role);
  let layoutId = layouts.find(l => l.isDefault)?.id || '', setId = sets[0]?.id || '';
  const current = () => layouts.find(l => l.id === layoutId) || DEFAULT_LAYOUT;
  const subject = subjects.find(s => s.id === exam.subjectId)?.name || '';
  const { errors } = selectionIssues(sections, qmap);

  const optText = (k, v) => (OPTION_LABELS[k]?.[v] ? t(OPTION_LABELS[k][v]) : k === 'paperLang' ? (v === 'bn' ? 'বাংলা' : 'English') : v);
  const fieldHtml = ([k, kind, o], L) => kind === 'check' ? `<label class="inline"><input type="checkbox" name="${k}"${L[k] ? ' checked' : ''}> ${t(LABELS[k])}</label>`
    : kind === 'select' ? `<label>${t(LABELS[k])}<select name="${k}">${o.map(v => `<option value="${esc(v)}"${String(L[k]) === String(v) ? ' selected' : ''}>${esc(optText(k, v))}</option>`).join('')}</select></label>`
    : kind === 'number' ? `<label>${t(LABELS[k])}<input name="${k}" type="number" min="${o[0]}" max="${o[1]}" step="${o[2]}" value="${esc(L[k])}"></label>`
    : `<label>${t(LABELS[k])}<input name="${k}" value="${esc(L[k] ?? '')}"></label>`;
  const designHtml = L => `<details class="card no-print"><summary>${t('p.design')}</summary><form id="df" class="grid"><label>${t('f.name')}<input name="name" required maxlength="80" value="${esc(L.name)}"></label>`
    + GROUPS.map(([g, fields]) => `<h3>${t('p.g.' + g)}</h3><div class="grid two">${fields.map(f => fieldHtml(f, L)).join('')}</div>`).join('')
    + `<div class="row"><button type="button" class="btn" data-act="saveNew">${t('p.saveNew')}</button><button type="button" class="btn primary" data-act="save">${t('p.save')}</button></div></form></details>`;
  const layoutOpts = () => `<option value="">${t('p.default')}</option>` + layouts.map(l => `<option value="${esc(l.id)}"${l.id === layoutId ? ' selected' : ''}>${esc(l.name || '—')}</option>`).join('');

  root.innerHTML = `<div class="card grid no-print"><div class="row start"><label class="inline">${t('p.set')} <select data-f="set">${sets.length ? sets.map(s => `<option value="${esc(s.id)}">${esc(t('x.gen.set', { label: s.label }))}</option>`).join('') : `<option value="">${t('p.original')}</option>`}</select></label>
<label class="inline">${t('p.layout')} <select data-f="layout" id="layoutSel">${layoutOpts()}</select></label><button class="btn primary" data-act="print">${t('p.print')}</button></div>
${errors.length ? `<p class="warn">${t('p.incomplete')}</p>` : ''}</div>
${canDesign ? `<div id="design">${designHtml(current())}</div>` : ''}
<div class="paper-wrap"><div id="paper"></div></div>`;

  const paper = () => root.querySelector('#paper');
  const fit = () => { // scale the page to the screen width (phones); printing ignores the scale
    const p = paper(), w = root.querySelector('.paper-wrap');
    if (!p || !w.clientWidth) return;
    p.style.transform = 'none';
    const s = Math.min(1, w.clientWidth / p.scrollWidth);
    p.style.transform = `scale(${s})`;
    w.style.height = `${p.offsetHeight * s}px`;
  };
  const draw = async layout => {
    await renderPaper(paper(), { org, exam, sections, set: sets.find(s => s.id === setId) || null, qmap, subject }, { ...DEFAULT_LAYOUT, ...layout });
    fit();
  };
  const readForm = () => {
    const f = root.querySelector('#df').elements, L = { name: f.name.value.trim() };
    for (const [, fields] of GROUPS) for (const [k, kind] of fields) L[k] = kind === 'check' ? f[k].checked : typeof DEFAULT_LAYOUT[k] === 'number' ? Number(f[k].value) || 0 : f[k].value;
    return L;
  };

  root.addEventListener('change', e => {
    const f = e.target.dataset.f;
    if (f === 'set') { setId = e.target.value; draw(canDesign ? readForm() : current()); }
    else if (f === 'layout') {
      layoutId = e.target.value;
      if (canDesign) root.querySelector('#design').innerHTML = designHtml(current());
      draw(current());
    }
  });
  root.addEventListener('input', e => {
    if (!e.target.closest('#df')) return;
    clearTimeout(timer);
    timer = setTimeout(() => draw(readForm()), 200); // live preview
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    try {
      if (b.dataset.act === 'print') { window.print(); return; }
      if (!root.querySelector('#df').reportValidity()) return;
      layoutId = await saveLayout(org.id, b.dataset.act === 'save' ? layoutId || null : null, readForm());
      layouts = await listLayouts(org.id);
      root.querySelector('#layoutSel').innerHTML = layoutOpts();
      toast(t('saved')); // only after the write succeeded
    } catch (err) { handleError(err, 'preview'); }
  });
  onResize = () => fit();
  addEventListener('resize', onResize);
  draw(current());
}
export function unmount() {
  off?.(); off = null; clearTimeout(timer);
  if (onResize) removeEventListener('resize', onResize);
  onResize = null;
}
