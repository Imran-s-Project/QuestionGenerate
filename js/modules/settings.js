import { getActive, onOrgChange } from '../services/org-context.js';
import { loadTypes, typeName } from '../services/question-types.js';
import { SETTING_FIELDS, SETTING_LABELS, DEFAULT_SETTINGS, getSettings, saveSettings } from '../services/settings-service.js';
import { t } from '../utilities/i18n.js';
import { esc, toast } from '../utilities/dom.js';
import { handleError } from '../utilities/errors.js';

let off = null;
export async function mount(el) {
  off?.();
  const root = document.createElement('div');
  root.className = 'grid';
  el.replaceChildren(root);
  const org = getActive();
  if (!org) { root.innerHTML = `<div class="card empty"><p>${t('inst.empty')}</p></div>`; return; }
  const canEdit = ['owner', 'admin'].includes(org.role), dis = canEdit ? '' : ' disabled';
  let types = [], S = DEFAULT_SETTINGS;
  try { [types, S] = await Promise.all([loadTypes(org.id), getSettings(org.id, true)]); } catch (e) { handleError(e, 'settings'); }
  const field = ([k, kind, o]) => kind === 'check' ? `<label class="inline"><input type="checkbox" name="${k}"${S[k] ? ' checked' : ''}${dis}> ${t(SETTING_LABELS[k])}</label>`
    : kind === 'select' ? `<label>${t(SETTING_LABELS[k])}<select name="${k}"${dis}>${(o ? o.map(v => [v, t('diff.' + v)]) : types.map(x => [x.id, typeName(x)])).map(([v, l]) => `<option value="${esc(v)}"${v === S[k] ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`
    : kind === 'number' ? `<label>${t(SETTING_LABELS[k])}<input name="${k}" type="number" min="${o[0]}" max="${o[1]}" step="${o[2]}" value="${esc(S[k])}"${dis}></label>`
    : `<label>${t(SETTING_LABELS[k])}<textarea name="${k}" rows="3"${dis}>${esc(S[k])}</textarea></label>`;
  root.innerHTML = `<form class="card grid" id="sf"><h3>${t('s.title')}</h3><p>${t('s.hint')}</p><div class="grid two">${SETTING_FIELDS.map(field).join('')}</div>${canEdit ? `<div class="row"><button class="btn primary">${t('save')}</button></div>` : ''}</form>`;
  root.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target.elements, data = {};
    for (const [k, kind] of SETTING_FIELDS) data[k] = kind === 'check' ? f[k].checked : kind === 'number' ? Number(f[k].value) || 0 : f[k].value;
    e.target.classList.add('busy');
    try { await saveSettings(org.id, data); toast(t('saved')); } catch (err) { handleError(err, 'settings'); }
    finally { e.target.classList.remove('busy'); }
  });
  off = onOrgChange(() => mount(el));
}
export function unmount() { off?.(); off = null; }
