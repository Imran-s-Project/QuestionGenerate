import { t } from './i18n.js';
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape any dynamic text before putting it into innerHTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ENT[c]);

export function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), 4500);
}

/** Modal confirmation built on <dialog>. Resolves true only when the user confirms. */
export function confirmBox(message) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog"><p>${esc(message)}</p><div class="row"><button class="btn" value="no">${esc(t('cancel'))}</button><button class="btn primary" value="yes">${esc(t('confirm'))}</button></div></form>`;
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    document.body.append(d);
    d.showModal();
  });
}
