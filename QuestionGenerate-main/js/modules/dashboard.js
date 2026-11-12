import { auth } from '../firebase.js';
import { configSource } from '../services/config-service.js';
import { getActive, onOrgChange } from '../services/org-context.js';
import { t } from '../utilities/i18n.js';
import { esc } from '../utilities/dom.js';

let off = null;
// Shows real facts only. Question and exam statistics arrive with the modules that produce that data.
export function mount(el) {
  const draw = () => {
    const a = getActive();
    const rows = [
      [t('dash.user'), esc(auth.currentUser?.email || '—')],
      [t('dash.inst'), a ? `${esc(a.name)} (${esc(t('role.' + a.role))})` : '—'],
      [t('dash.network'), t(navigator.onLine ? 'status.online' : 'status.offline')],
      [t('dash.config'), t('dash.src.' + configSource())],
      [t('dash.phase'), t('dash.phaseValue')]
    ];
    el.innerHTML = `<div class="card"><h3>${t('dash.status')}</h3><dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>
<div class="card empty"><p>${t('dash.noStats')}</p></div>`;
  };
  draw();
  off = onOrgChange(draw);
}
export function unmount() { off?.(); }
