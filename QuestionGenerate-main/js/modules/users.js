import { auth } from '../firebase.js';
import { getActive, onOrgChange } from '../services/org-context.js';
import { listMembers, updateMember, removeMember, createInvite, listInvites, revokeInvite, ROLES } from '../services/firestore-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast, confirmBox } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
export function mount(el) {
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);

  const draw = async () => {
    const org = getActive();
    if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
    const owner = org.role === 'owner', manage = owner || org.role === 'admin';
    const roles = ROLES.filter(r => r !== 'owner' && (owner || r !== 'admin')); // mirrors the security rules
    root.innerHTML = '<div class="skeleton"></div>';
    try {
      const [members, invites] = await Promise.all([listMembers(org.id), manage ? listInvites(org.id) : []]);
      if (getActive()?.id !== org.id) return; // institution switched while loading
      const opts = cur => roles.map(r => `<option value="${r}"${r === cur ? ' selected' : ''}>${esc(t('role.' + r))}</option>`).join('');
      const row = m => {
        const editable = manage && m.role !== 'owner' && m.uid !== auth.currentUser.uid && (owner || m.role !== 'admin');
        const name = esc(m.displayName || m.email || m.uid);
        return `<div class="item"><div><strong>${name}</strong><br><span class="badge">${esc(t('role.' + m.role))}</span> <span class="badge">${esc(t('status.' + m.status))}</span></div>`
          + (editable ? `<div class="row" data-uid="${esc(m.uid)}" data-name="${name}"><select data-act="role">${opts(m.role)}</select><label class="inline"><input type="checkbox" data-act="key"${m.answerKeyAccess ? ' checked' : ''}> ${t('users.keyAccess')}</label><button class="btn sm" data-act="toggle" data-status="${esc(m.status)}">${t(m.status === 'active' ? 'users.disable' : 'users.enable')}</button><button class="btn sm" data-act="remove">${t('remove')}</button></div>` : '') + '</div>';
      };
      const invite = i => { const code = `${org.id}.${i.id}`; return `<div class="item"><span class="badge">${esc(t('role.' + i.role))}</span><code>${esc(code)}</code><div class="row"><button class="btn sm" data-copy="${esc(code)}">${t('copy')}</button><button class="btn sm" data-revoke="${esc(i.id)}">${t('revoke')}</button></div></div>`; };
      root.innerHTML = `<div class="card grid"><h3>${t('users.members')}</h3><div class="list">${members.map(row).join('')}</div></div>`
        + (manage ? `<div class="card grid"><h3>${t('users.invite')}</h3><p>${t('users.inviteHint')}</p><div class="row start"><select id="invRole">${opts('teacher')}</select><label class="inline"><input type="checkbox" id="invKey"> ${t('users.keyAccess')}</label><button class="btn primary" id="invCreate">${t('users.createInvite')}</button></div>${invites.length ? `<h3>${t('users.pending')}</h3><div class="list">${invites.map(invite).join('')}</div>` : ''}</div>` : '');
    } catch (e) { handleError(e, 'users'); root.innerHTML = ''; }
  };

  root.addEventListener('click', async e => {
    const b = e.target.closest('button'), org = getActive();
    if (!b || !org) return;
    const box = b.closest('[data-uid]');
    try {
      if (b.id === 'invCreate') { await createInvite(org.id, { role: root.querySelector('#invRole').value, answerKeyAccess: root.querySelector('#invKey').checked }); await draw(); }
      else if (b.dataset.revoke) { await revokeInvite(org.id, b.dataset.revoke); await draw(); }
      else if (b.dataset.copy) { await navigator.clipboard.writeText(b.dataset.copy); toast(t('copied')); }
      else if (b.dataset.act === 'toggle') { await updateMember(org.id, box.dataset.uid, { status: b.dataset.status === 'active' ? 'disabled' : 'active' }); await draw(); }
      else if (b.dataset.act === 'remove' && await confirmBox(t('users.removeWarn', { name: box.dataset.name }))) { await removeMember(org.id, box.dataset.uid); await draw(); }
    } catch (err) { handleError(err, 'users'); }
  });
  root.addEventListener('change', async e => {
    const c = e.target, box = c.closest('[data-uid]'), org = getActive();
    if (!box || !org) return;
    try {
      await updateMember(org.id, box.dataset.uid, c.dataset.act === 'role' ? { role: c.value } : { answerKeyAccess: c.checked });
      toast(t('saved'));
    } catch (err) { handleError(err, 'users'); await draw(); }
  });
  draw();
  off = onOrgChange(draw);
}
export function unmount() { off?.(); }
