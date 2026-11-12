import { getActive, onOrgChange } from '../services/org-context.js';
import { KEY_ROLES } from '../services/export-service.js';
import { collectBackup, restoreBackup } from '../services/backup-service.js';
import { checkBackup, summarize } from '../utilities/backup-plan.js';
import { download } from '../utilities/office.js';
import { t } from '../utilities/i18n.js';
import { esc, toast, confirmBox } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
export async function mount(el) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  if (!['owner', 'admin'].includes(org.role)) { root.innerHTML = `<div class="card empty"><p>${t('err.permission')}</p></div>`; return; }
  const q = s => root.querySelector(s), canKey = KEY_ROLES.includes(org.role);
  let backup = null, cancel = false;
  const chk = (id, key, on = true) => `<label class="inline"><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${t(key)}</label>`;
  root.innerHTML = `<div class="card grid"><h3>${t('b.title')}</h3>${chk('bs', 'b.settings')}${chk('bq', 'b.questions')}${canKey ? chk('ba', 'b.answers') : ''}${chk('bx', 'b.exams')}
<div class="row"><button class="btn primary" id="make">${t('b.make')}</button></div></div>
<div class="card grid"><h3>${t('b.restore')}</h3><p>${t('b.warn')}</p><label><input type="file" id="file" accept=".json,application/json"></label>
<div class="row"><button class="btn" id="check">${t('b.check')}</button></div><div id="found"></div></div><p id="st" aria-live="polite"></p><div id="rep"></div>`;
  const status = s => { q('#st').textContent = s; };

  q('#make').addEventListener('click', async e => {
    e.currentTarget.disabled = true; status(t('e.working'));
    try {
      const b = await collectBackup(org.id, org, { settings: q('#bs').checked, questions: q('#bq').checked, answers: !!q('#ba')?.checked, exams: q('#bx').checked }, n => status(`${t('e.working')} ${n}`));
      const name = `qg-backup-${String(org.name).trim().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')}-${b.createdAt.slice(0, 10)}.json`;
      download(name, JSON.stringify(b), 'application/json');
      status(''); toast(t('b.done'));
    } catch (err) { handleError(err, 'backup'); status(''); }
    finally { e.currentTarget.disabled = false; }
  });
  q('#check').addEventListener('click', async () => {
    try {
      const file = q('#file').files[0];
      backup = JSON.parse(await file.text());
      if (!checkBackup(backup)) throw new Error('not a backup');
      const c = summarize(backup);
      q('#found').innerHTML = `<p>${esc(t('b.found', { name: backup.institution?.name || '—', date: String(backup.createdAt || '').slice(0, 10) }))}</p><p>${esc(t('b.counts', c))}</p>
<div class="grid">${c.subjects + c.categories + c.types + c.layouts ? chk('rt', 'b.gTax') : ''}${c.questions ? chk('rq', 'b.gQ') : ''}${c.exams ? chk('rx', 'b.gX') : ''}${c.profile ? chk('rp', 'b.gP', false) : ''}</div>
<div class="row"><button class="btn" id="stop" hidden>${t('i.cancel')}</button><button class="btn primary" id="go">${t('b.go')}</button></div>`;
    } catch (err) { console.error(err); backup = null; q('#found').innerHTML = `<p class="warn">${t('b.bad')}</p>`; }
  });
  root.addEventListener('click', async e => {
    if (e.target.id === 'stop') { cancel = true; return; }
    if (e.target.id !== 'go' || !backup) return;
    const groups = { taxonomy: !!q('#rt')?.checked, questions: !!q('#rq')?.checked, exams: !!q('#rx')?.checked, profile: !!q('#rp')?.checked };
    if (!Object.values(groups).some(Boolean) || !(await confirmBox(t('b.confirm', { name: org.name })))) return;
    cancel = false; q('#go').disabled = true; q('#stop').hidden = false;
    try {
      const rep = await restoreBackup(org.id, backup, groups, { cancelled: () => cancel, onProgress: (d, n) => status(t('b.progress', { done: d, total: n })) });
      q('#found').innerHTML = '';
      q('#rep').innerHTML = `<div class="card grid"><h3>${t('b.report')}</h3><p>${esc(t('b.added', { list: Object.entries(rep.added).map(([k, n]) => `${k} ${n}`).join(', ') || '—' }))}${rep.profile ? ' + profile' : ''}</p>
${rep.skipped.questions ? `<p class="warn">${t('b.skipQ', { n: rep.skipped.questions })}</p>` : ''}${rep.skipped.sets || rep.skipped.links ? `<p class="warn">${t('b.skipX', { sets: rep.skipped.sets, links: rep.skipped.links })}</p>` : ''}
${rep.failed ? `<p class="warn">${t('b.failed', { n: rep.total - rep.written })}</p>` : ''}${rep.stopped ? `<p class="warn">${t('i.stopped')}</p>` : ''}</div>`;
      status('');
    } catch (err) { handleError(err, 'restore'); }
  });
  off = onOrgChange(() => mount(el));
}
export function unmount() { off?.(); off = null; }
