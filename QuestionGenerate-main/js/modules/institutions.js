import { getOrgs, getActive, setActive, loadOrgs, onOrgChange } from '../services/org-context.js';
import { createOrganization, updateOrganization, redeemInvite, ORG_TYPES, PROFILE_FIELDS } from '../services/firestore-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
const typeOptions = cur => ORG_TYPES.map(x => `<option value="${x}"${x === cur ? ' selected' : ''}>${esc(t('type.' + x))}</option>`).join('');

function field([key, kind], org, locked) {
  const v = esc(org[key] ?? (kind === 'color' ? '#1d6b7a' : ''));
  const dis = locked ? ' disabled' : '';
  const ctl = kind === 'select' ? `<select name="${key}"${dis}>${typeOptions(org[key])}</select>`
    : kind === 'textarea' ? `<textarea name="${key}" rows="3"${dis}>${v}</textarea>`
    : `<input name="${key}" type="${kind}" value="${v}"${dis}${key === 'name' ? ' required maxlength="120"' : ''}${kind === 'url' ? ' pattern="https?://.*"' : ''}>`;
  return `<label>${esc(t('f.' + key))}${ctl}</label>`;
}

export function mount(el) {
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root); // a fresh container per visit, so listeners never pile up

  const draw = () => {
    const orgs = getOrgs(), act = getActive(), canEdit = !!act && ['owner', 'admin'].includes(act.role);
    const card = o => `<div class="item${o.id === act?.id ? ' on' : ''}"><div><strong>${esc(o.name)}</strong><br><span class="badge">${esc(t('role.' + o.role))}</span> <span class="badge">${esc(t('type.' + o.type))}</span></div>`
      + (o.id === act?.id ? `<span class="badge">${t('inst.active')}</span>` : `<button class="btn sm" data-switch="${esc(o.id)}">${t('inst.switch')}</button>`) + '</div>';
    root.innerHTML = `<div class="card grid"><h3>${t('inst.title')}</h3>${orgs.length ? `<div class="list">${orgs.map(card).join('')}</div>` : `<p class="empty">${t('inst.empty')}</p>`}</div>
<form class="card grid" id="newOrg"><h3>${t('inst.new')}</h3><div class="grid two"><label>${t('f.name')}<input name="name" required maxlength="120"></label><label>${t('f.type')}<select name="type">${typeOptions('school')}</select></label></div><div class="row"><button class="btn primary">${t('inst.create')}</button></div></form>
<form class="card grid" id="joinOrg"><h3>${t('inst.join')}</h3><label>${t('inst.code')}<input name="code" required autocomplete="off"></label><div class="row"><button class="btn">${t('inst.joinBtn')}</button></div></form>`
      + (act ? `<form class="card grid" id="profile"><h3>${t('inst.profile')}: ${esc(act.name)}</h3><div class="grid two">${PROFILE_FIELDS.map(f => field(f, act, !canEdit)).join('')}</div>${canEdit ? `<div class="row"><button class="btn primary">${t('save')}</button></div>` : ''}</form>` : '');
  };

  root.addEventListener('click', e => { const b = e.target.closest('[data-switch]'); if (b) setActive(b.dataset.switch); });
  root.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, data = Object.fromEntries(new FormData(f));
    f.classList.add('busy');
    try {
      if (f.id === 'newOrg') await loadOrgs(await createOrganization(data));
      else if (f.id === 'joinOrg') await loadOrgs(await redeemInvite(data.code));
      else { await updateOrganization(getActive().id, data); await loadOrgs(getActive().id); }
      toast(t('saved')); // only after the write succeeded
    } catch (err) { handleError(err, f.id); }
    finally { f.classList.remove('busy'); }
  });
  draw();
  off = onOrgChange(draw);
}
export function unmount() { off?.(); }
