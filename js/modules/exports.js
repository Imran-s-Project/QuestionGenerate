import { getActive, onOrgChange } from '../services/org-context.js';
import { listExams, loadSets } from '../services/exam-service.js';
import { listSubjects } from '../services/question-service.js';
import { listLayouts } from '../services/layout-service.js';
import * as ex from '../services/export-service.js';
import { toDocx, toXlsx, toTxt, csv, download } from '../utilities/office.js';
import { t, getLang } from '../utilities/i18n.js';
import { esc, toast } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
const MODES = { student: ['docx', 'txt'], teacher: ['docx', 'txt'], key: ['csv', 'xlsx', 'txt', 'json'], solutions: ['docx', 'txt'], archive: ['json'] };
const BANK = ['csv', 'xlsx', 'json', 'txt'];
const MIME = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv;charset=utf-8', json: 'application/json', txt: 'text/plain;charset=utf-8' };
const slug = s => String(s).trim().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'export';
const fmtOpts = list => list.map(f => `<option value="${f}">${f.toUpperCase()}</option>`).join('');

export async function mount(el) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  const canKey = ex.KEY_ROLES.includes(org.role);
  const modes = Object.keys(MODES).filter(m => m === 'student' || canKey);
  const q = s => root.querySelector(s);
  root.innerHTML = `<div class="card grid"><h3>${t('e.exam')}</h3><div class="grid two">
<label>${t('x.status')}<select id="es">${['draft', 'final', 'archived'].map(s => `<option value="${s}">${t('status.' + s)}</option>`).join('')}</select></label>
<label>${t('nav.examManager')}<select id="ex"></select></label>
<label>${t('p.set')}<select id="set"></select></label>
<label>${t('e.mode')}<select id="md">${modes.map(m => `<option value="${m}">${t('e.mode.' + m)}</option>`).join('')}</select></label>
<label>${t('e.format')}<select id="fmt"></select></label></div>
<p>${t('e.pdf')} <a href="#/examManager" id="pdf">${t('nav.paperPreview')}</a></p>
<div class="row"><button class="btn primary" id="goExam">${t('e.go')}</button></div></div>
<div class="card grid"><h3>${t('e.bank')}</h3><div class="grid two">
<label>${t('q.status')}<select id="bs">${['active', 'draft', 'archived'].map(s => `<option value="${s}">${t('status.' + s)}</option>`).join('')}</select></label>
<label>${t('e.format')}<select id="bf">${fmtOpts(BANK)}</select></label></div>
${canKey ? `<label class="inline"><input type="checkbox" id="bk"> ${t('e.include')}</label>` : ''}
<div class="row"><button class="btn primary" id="goBank">${t('e.go')}</button></div></div><p id="st" aria-live="polite"></p>`;

  const status = s => { q('#st').textContent = s; };
  const loadSetOptions = async () => {
    const id = q('#ex').value;
    q('#pdf').href = '#/paperPreview/' + id;
    const sets = id ? await loadSets(org.id, id).catch(() => []) : [];
    q('#set').innerHTML = `<option value="">${t('p.original')}</option>` + sets.map(s => `<option value="${esc(s.id)}">${esc(t('x.gen.set', { label: s.label }))}</option>`).join('');
  };
  const loadExamOptions = async () => {
    let items = [];
    try { items = (await listExams(org.id, q('#es').value, null, 100)).items; } catch (e) { handleError(e, 'export'); }
    q('#ex').innerHTML = items.length ? items.map(x => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('') : `<option value="">${t('bank.empty')}</option>`;
    await loadSetOptions();
  };
  const run = async (btn, job) => {
    btn.disabled = true; status(t('e.working'));
    try { await job(); } catch (e) { handleError(e, 'export'); status(''); }
    finally { btn.disabled = false; }
  };

  q('#es').addEventListener('change', loadExamOptions);
  q('#ex').addEventListener('change', loadSetOptions);
  q('#md').addEventListener('change', () => { q('#fmt').innerHTML = fmtOpts(MODES[q('#md').value]); });
  q('#goExam').addEventListener('click', e => run(e.currentTarget, async () => {
    const mode = q('#md').value, fmt = q('#fmt').value, examId = q('#ex').value;
    if (!examId) { status(''); return; }
    const withAnswers = mode !== 'student';
    const [b, layouts, subjects] = await Promise.all([ex.loadBundle(org.id, examId, withAnswers), listLayouts(org.id), listSubjects(org.id)]);
    const set = b.sets.find(s => s.id === q('#set').value) || null, lang = layouts.find(l => l.isDefault)?.paperLang || getLang();
    const subject = subjects.find(s => s.id === b.exam.subjectId)?.name || '';
    let data;
    if (mode === 'archive') data = JSON.stringify(ex.archiveOf(b, org), null, 2);
    else if (mode === 'key') {
      const rows = ex.keyRows(b, set, lang);
      data = fmt === 'csv' ? csv(rows) : fmt === 'xlsx' ? toXlsx([{ name: 'Answer key', rows }]) : fmt === 'json' ? JSON.stringify(rows.slice(1).map(([no, section, answer]) => ({ no, section, answer })), null, 2) : rows.slice(1).map(r => `${r[0]}. ${r[2]}`).join('\n');
    } else { const items = ex.docItems(b, set, mode, lang, org, subject); data = fmt === 'docx' ? toDocx(items) : toTxt(items); }
    download(`${slug(b.exam.title)}-${mode}${set ? '-' + set.label : ''}.${mode === 'archive' ? 'json' : fmt}`, data, MIME[mode === 'archive' ? 'json' : fmt]);
    const n = Object.keys(b.qmap).length;
    ex.record(org.id, { kind: 'exam', mode, format: fmt, examId, count: n });
    status(t('e.done', { n }));
  }));
  q('#goBank').addEventListener('click', e => run(e.currentTarget, async () => {
    const fmt = q('#bf').value, withAnswers = !!q('#bk')?.checked;
    const [bank, subjects] = await Promise.all([ex.fetchBank(org.id, q('#bs').value, withAnswers, n => status(`${t('e.working')} ${n}`)), listSubjects(org.id)]);
    const rows = ex.bankRows(bank.items, bank.keys, subjects);
    const data = fmt === 'csv' ? csv(rows) : fmt === 'xlsx' ? toXlsx([{ name: 'Questions', rows }]) : fmt === 'json' ? JSON.stringify(ex.bankJson(bank.items, bank.keys, org, subjects), null, 2)
      : bank.items.map((x, i) => `${i + 1}. ${x.statement}`).join('\n\n');
    download(`question-bank-${q('#bs').value}.${fmt}`, data, MIME[fmt]);
    ex.record(org.id, { kind: 'bank', format: fmt, count: bank.items.length, answers: withAnswers });
    status(t('e.done', { n: bank.items.length }) + (bank.capped ? ' ' + t('e.capped') : ''));
    toast(t('e.done', { n: bank.items.length }));
  }));
  q('#fmt').innerHTML = fmtOpts(MODES[q('#md').value]);
  off = onOrgChange(() => mount(el));
  loadExamOptions();
}
export function unmount() { off?.(); off = null; }
