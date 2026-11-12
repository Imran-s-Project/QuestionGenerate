import { getActive, onOrgChange } from '../services/org-context.js';
import { listMembers } from '../services/firestore-service.js';
import { listLog } from '../services/stats-service.js';
import { t } from '../utilities/i18n.js';
import { esc } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
const ACTIONS = ['organization.create', 'organization.update', 'member.join', 'member.update', 'member.remove', 'invite.create', 'invite.revoke', 'question.create', 'question.update', 'question.status',
  'question.delete', 'question.import', 'exam.create', 'exam.update', 'exam.status', 'exam.sets', 'layout.create', 'layout.update', 'layout.delete', 'export', 'backup.create', 'backup.restore', 'settings.update'];
const short = o => { const s = JSON.stringify(o ?? {}); return s.length > 90 ? s.slice(0, 90) + '…' : s; };

// Activity history (admins), exports and imports (staff). Read from the audit log and the history collections.
export async function mount(el) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  const admin = ['owner', 'admin'].includes(org.role), staff = admin || ['teacher', 'editor', 'examManager'].includes(org.role);
  const tabs = [...(admin ? ['auditLogs'] : []), ...(staff ? ['exports', 'imports'] : [])];
  if (!tabs.length) { root.innerHTML = `<div class="card empty"><p>${t('err.permission')}</p></div>`; return; }
  let names = {}, tab = tabs[0], action = '', items = [], cursor = null;
  try { names = Object.fromEntries((await listMembers(org.id)).map(m => [m.uid, m.displayName || m.email || m.uid])); } catch (e) { console.warn('Names not loaded', e); }
  root.innerHTML = `<div class="card"><div class="row start"><select data-f="tab">${tabs.map(x => `<option value="${x}">${t('r.' + x)}</option>`).join('')}</select>
<select data-f="action" id="act"><option value="">${t('r.all')}</option>${ACTIONS.map(a => `<option>${a}</option>`).join('')}</select></div></div><div id="res" class="list"></div><div id="more" class="row"></div>`;
  const line = x => {
    const when = x.createdAt?.toDate?.().toLocaleString() || '', who = esc(names[x.actorUid || x.createdBy] || x.actorUid || x.createdBy || '—');
    const what = tab === 'auditLogs' ? `<b>${esc(x.action)}</b> ${esc(short(x.details))}` : tab === 'exports' ? `<b>${esc(x.kind)}</b> ${esc([x.mode, x.format, x.count].filter(v => v !== undefined && v !== '').join(' · '))}` : `<b>${esc(x.fileName)}</b> ${esc([x.format, `+${x.imported}`, `-${x.skipped}`, x.status].join(' · '))}`;
    return `<div class="item"><span>${what}</span><span class="muted">${esc(when)} · ${who}</span></div>`;
  };
  const draw = () => {
    root.querySelector('#res').innerHTML = items.length ? items.map(line).join('') : `<p class="empty">${t('bank.empty')}</p>`;
    root.querySelector('#more').innerHTML = cursor ? `<button class="btn" data-more>${t('bank.more')}</button>` : '';
  };
  const load = async reset => {
    if (reset) { items = []; cursor = null; }
    try { const r = await listLog(org.id, tab, cursor, tab === 'auditLogs' ? action : ''); items = items.concat(r.items); cursor = r.last; } catch (e) { handleError(e, 'reports'); }
    root.querySelector('#act').hidden = tab !== 'auditLogs';
    draw();
  };
  root.addEventListener('change', e => {
    if (e.target.dataset.f === 'tab') { tab = e.target.value; load(true); }
    else if (e.target.dataset.f === 'action') { action = e.target.value; load(true); }
  });
  root.addEventListener('click', e => { if (e.target.matches('[data-more]')) load(false); });
  off = onOrgChange(() => mount(el));
  load(true);
}
export function unmount() { off?.(); off = null; }
