import { getActive, onOrgChange } from '../services/org-context.js';
import { TEMPLATE_ROLES, listLayouts, saveLayout, deleteLayout, setDefaultLayout, cleanLayout } from '../services/layout-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast, confirmBox } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
// Paper layout templates of the active institution. Layouts are designed in Paper Preview and managed here.
export async function mount(el) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  const canManage = TEMPLATE_ROLES.includes(org.role);
  let layouts = [];
  const draw = () => {
    root.innerHTML = `<div class="card grid"><h3>${t('nav.templates')}</h3>${layouts.length ? `<div class="list">${layouts.map(l => `<div class="item"><div><strong>${esc(l.name || '—')}</strong>${l.isDefault ? ` <span class="badge">${t('t.default')}</span>` : ''}</div>${canManage ? `<div class="row" data-id="${esc(l.id)}">${l.isDefault ? '' : `<button class="btn sm" data-act="make">${t('t.make')}</button>`}<button class="btn sm" data-act="dup">${t('bank.duplicate')}</button><button class="btn sm" data-act="del">${t('bank.delete')}</button></div>` : ''}</div>`).join('')}</div>` : `<p class="empty">${t('t.empty')}</p>`}</div>`;
  };
  const load = async () => { try { layouts = await listLayouts(org.id); } catch (e) { handleError(e, 'templates'); } draw(); };
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id, l = layouts.find(x => x.id === id), a = b.dataset.act;
    try {
      if (a === 'make') await setDefaultLayout(org.id, id, layouts);
      else if (a === 'dup') await saveLayout(org.id, null, { ...cleanLayout(l), name: `${l.name} — ${t('bank.duplicate')}` });
      else if (a === 'del') { if (!(await confirmBox(t('t.deleteWarn')))) return; await deleteLayout(org.id, id); }
      toast(t('saved'));
      await load();
    } catch (err) { handleError(err, 'templates'); }
  });
  off = onOrgChange(() => mount(el));
  load();
}
export function unmount() { off?.(); off = null; }
