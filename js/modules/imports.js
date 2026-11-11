import { getActive, onOrgChange } from '../services/org-context.js';
import { loadTypes, typeName } from '../services/question-types.js';
import { checkDuplicates, ensureSubjects, writeItems, recordImport } from '../services/import-service.js';
import { IMPORT_FIELDS, rowToItem, jsonToItem, validateQuestion } from '../utilities/question-schema.js';
import { parseText, readXlsx } from '../utilities/parse.js';
import { csv, download } from '../utilities/office.js';
import { t } from '../utilities/i18n.js';
import { esc, toast, confirmBox } from '../utilities/dom.js';
import { plainText } from '../utilities/rich-text.js';
import { handleError } from '../utilities/errors.js';

let off = null;
const MAPPABLE = IMPORT_FIELDS.filter(f => f !== 'family'), CAP = 2000, WRITERS = ['owner', 'admin', 'teacher', 'editor'];
const EXAMPLES = [{ type: 'mcq', statement: 'What is 2 + 2?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correct: 'B', explanation: 'Add the numbers.', difficulty: 'easy', marks: 1, subject: 'Mathematics', chapter: 'Chapter 1', tags: 'arithmetic;basic', status: 'active' },
  { type: 'blank', statement: 'The capital of France is ___.', answer: 'Paris', difficulty: 'easy', marks: 1, subject: 'Geography', status: 'active' }];

export async function mount(el) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  if (!WRITERS.includes(org.role)) { root.innerHTML = `<div class="card empty"><p>${t('err.permission')}</p></div>`; return; }
  let types = [];
  try { types = await loadTypes(org.id); } catch (e) { handleError(e, 'import'); }
  const tmap = new Map(), tname = Object.fromEntries(types.map(x => [x.id, typeName(x)]));
  types.forEach(x => [x.id, x.en, x.bn, x.name].filter(Boolean).forEach(n => tmap.set(String(n).toLowerCase(), x)));
  let source = null, mapping = {}, items = [], cancel = false, fileName = '';
  const cache = { yes: new Set(), no: new Set() }, q = s => root.querySelector(s);

  root.innerHTML = `<div class="card grid"><h3>${t('i.title')}</h3><p>${t('i.hint')}</p><div class="grid two">
<label>${t('i.file')}<input type="file" id="file" accept=".csv,.tsv,.txt,.json,.xlsx"></label>
<label>${t('i.status')}<select id="st"><option value="active">${t('status.active')}</option><option value="draft">${t('status.draft')}</option></select></label></div>
<label>${t('i.paste')}<textarea id="paste" rows="4"></textarea></label>
<div class="row"><button class="btn" id="tpl">${t('i.template')}</button><button class="btn primary" id="read">${t('i.read')}</button></div></div>
<div id="map"></div><div id="prev"></div><div id="rep"></div>`;

  const errorsOf = it => [...it.buildErrors, ...validateQuestion(it.q, it.ak)];
  const build = async () => {
    const ctx = { types: tmap, byId: id => types.find(x => x.id === id), status: q('#st').value };
    if (source.kind === 'json') items = source.list.slice(0, CAP).map(x => jsonToItem(x, ctx));
    else items = source.rows.slice(1, CAP + 1).map(r => rowToItem(Object.fromEntries(MAPPABLE.map(f => [f, mapping[f] >= 0 ? r[mapping[f]] ?? '' : ''])), ctx));
    items.forEach((it, i) => { it.n = i + 1; it.errors = errorsOf(it); });
    await checkDuplicates(org.id, items, cache);
    items.forEach(it => { it.include = !it.errors.length && !it.dup; });
    drawPrev();
  };
  const drawMap = () => {
    if (source.kind !== 'table') { q('#map').innerHTML = ''; return; }
    const heads = source.rows[0];
    q('#map').innerHTML = `<details class="card"${mapping.statement < 0 ? ' open' : ''}><summary>${t('i.map')}</summary><div class="grid two">${MAPPABLE.map(f => `<label>${f}<select data-map="${f}"><option value="-1">—</option>${heads.map((h, i) => `<option value="${i}"${mapping[f] === i ? ' selected' : ''}>${esc(String(h).trim() || '#' + (i + 1))}</option>`).join('')}</select></label>`).join('')}</div></details>`;
  };
  const rowHtml = it => `<div class="item" data-n="${it.n}"><label class="inline"><input type="checkbox" data-inc${it.include ? ' checked' : ''}${it.errors.length ? ' disabled' : ''}> <b>${it.n}</b></label>
<div class="grow"><textarea data-st rows="2" aria-label="${esc(t('q.statement'))}">${esc(it.q.statement)}</textarea><div><span class="badge">${esc(tname[it.q.type] || it.q.type || '—')}</span> <span class="badge">${esc(it.q.marks)}</span>${it.errors.length ? it.errors.map(k => ` <span class="warn">${esc(t(k))}</span>`).join('') : it.dup ? ` <span class="warn">${t(it.dupWhy === 'bank' ? 'i.dup' : 'i.dupFile')}</span>` : ` <span class="badge">${t('i.ready')}</span>`}</div></div></div>`;
  const drawPrev = () => {
    const ready = items.filter(i => i.include).length, dup = items.filter(i => !i.errors.length && i.dup).length, bad = items.filter(i => i.errors.length).length;
    const fresh = [...new Set(items.filter(i => i.include && i.q.subjectName && !i.q.subjectName.startsWith('\0')).map(i => i.q.subjectName))];
    q('#prev').innerHTML = items.length ? `<div class="card grid"><h3>${t('i.preview')}</h3><p>${t('i.counts', { ready, dup, bad })}</p>${fresh.length ? `<p>${esc(t('i.newSubjects', { names: fresh.join(', ') }))}</p>` : ''}
<div class="row"><button class="btn" id="stop" hidden>${t('i.cancel')}</button><button class="btn primary" id="go"${ready ? '' : ' disabled'}>${esc(t('i.go', { n: ready }))}</button></div><p id="pg" aria-live="polite"></p>
<div class="list">${items.map(rowHtml).join('')}</div></div>` : `<div class="card empty"><p>${t('i.noRows')}</p></div>`;
  };

  q('#tpl').addEventListener('click', () => download('question-template.csv', csv([MAPPABLE, ...EXAMPLES.map(x => MAPPABLE.map(f => x[f] ?? ''))]), 'text/csv;charset=utf-8'));
  q('#read').addEventListener('click', async () => {
    try {
      const file = q('#file').files[0];
      fileName = file?.name || 'pasted';
      source = file && /\.xlsx$/i.test(file.name) ? { kind: 'table', rows: await readXlsx(await file.arrayBuffer()) } : parseText(file ? await file.text() : q('#paste').value);
      if (source.kind === 'table') {
        if (source.rows.length > CAP + 1) toast(t('i.cap'), 'error');
        const heads = (source.rows[0] || []).map(h => String(h).trim().toLowerCase());
        mapping = Object.fromEntries(MAPPABLE.map(f => [f, heads.indexOf(f.toLowerCase())]));
        if (mapping.statement < 0) mapping.statement = heads.indexOf('question');
      }
      drawMap();
      await build();
    } catch (e) { console.error(e); items = []; source = null; toast(t('i.badFile'), 'error'); drawPrev(); }
  });
  root.addEventListener('change', async e => {
    try {
      if (e.target.dataset.map) { mapping[e.target.dataset.map] = Number(e.target.value); await build(); }
      else if (e.target.id === 'st' && source) await build();
      else if (e.target.matches('[data-inc]')) { items.find(i => i.n === +e.target.closest('[data-n]').dataset.n).include = e.target.checked; drawPrev(); }
      else if (e.target.matches('[data-st]')) { // correct a statement, then re-validate and re-check duplicates
        const it = items.find(i => i.n === +e.target.closest('[data-n]').dataset.n);
        it.q.statement = e.target.value.trim(); it.fp = null; it.errors = errorsOf(it);
        await checkDuplicates(org.id, items, cache);
        it.include = !it.errors.length && !it.dup; drawPrev();
      }
    } catch (err) { handleError(err, 'import'); }
  });
  root.addEventListener('click', async e => {
    if (e.target.id === 'stop') { cancel = true; return; }
    if (e.target.id !== 'go') return;
    const n = items.filter(i => i.include && !i.errors.length).length;
    if (!n || !(await confirmBox(t('i.confirm', { n, name: org.name })))) return;
    cancel = false;
    q('#go').disabled = true; q('#stop').hidden = false;
    try {
      const names = [...new Map(items.filter(i => i.include && i.q.subjectName).map(i => [i.q.subjectName.toLowerCase(), i.q.subjectName])).values()];
      const subjectIds = await ensureSubjects(org.id, names);
      const rep = await writeItems(org.id, items, subjectIds, { cancelled: () => cancel, onProgress: (d, total) => { q('#pg').textContent = t('i.progress', { done: d, total }); } });
      const skipped = items.length - rep.todo;
      await recordImport(org.id, { fileName, format: source.kind, total: items.length, imported: rep.imported, skipped, status: rep.failed ? 'failed' : rep.stopped ? 'stopped' : 'done' });
      q('#prev').innerHTML = '';
      q('#rep').innerHTML = `<div class="card grid"><h3>${t('i.report')}</h3><p>${t('i.imported', { n: rep.imported })}</p><p>${t('i.skipped', { n: skipped })}</p>
${rep.todo - rep.imported ? `<p class="warn">${t('i.notSaved', { n: rep.todo - rep.imported })}</p>` : ''}${rep.failed ? `<p class="warn">${esc(t('i.failedRows', { from: rep.failed.from, to: rep.failed.to, msg: rep.failed.message }))}</p>` : ''}${rep.stopped ? `<p class="warn">${t('i.stopped')}</p>` : ''}
<div class="row"><a class="btn primary" href="#/questionBank">${t('nav.questionBank')}</a></div></div>`;
    } catch (err) { handleError(err, 'import'); }
    finally { q('#go')?.removeAttribute('disabled'); q('#stop')?.setAttribute('hidden', ''); }
  });
  off = onOrgChange(() => mount(el));
}
export function unmount() { off?.(); off = null; }
