import { getConfig } from './services/config-service.js';
import { t } from './utilities/i18n.js';
import { esc } from './utilities/dom.js';

// Only modules that are fully built are registered here. Every other module shows an honest "planned" page.
const BUILT = {
  dashboard: () => import('./modules/dashboard.js'),
  institutions: () => import('./modules/institutions.js'),
  users: () => import('./modules/users.js'),
  questionBuilder: () => import('./modules/question-builder.js'),
  questionBank: () => import('./modules/question-bank.js'),
  examManager: () => import('./modules/exam-manager.js'),
  paperGenerator: () => import('./modules/paper-generator.js'),
  paperPreview: () => import('./modules/paper-preview.js'),
  templates: () => import('./modules/templates.js'),
  exports: () => import('./modules/exports.js')
};
let current = null, seq = 0;

const link = m => `<a href="#/${esc(m.id)}" data-route="${esc(m.id)}"><span aria-hidden="true">${esc(m.icon)}</span><span>${esc(t('nav.' + m.id))}</span>${BUILT[m.id] ? '' : `<small>${esc(t('phase', { n: m.phase }))}</small>`}</a>`;

export function buildNav() {
  const { modules } = getConfig();
  document.getElementById('nav').innerHTML = modules.map(link).join('');
  document.getElementById('bottomNav').innerHTML = modules.filter(m => m.mobile).map(link).join('');
}

export async function render() {
  const mods = getConfig().modules;
  const [id, param] = location.hash.slice(2).split('/'); // #/module or #/module/param
  const mod = mods.find(m => m.id === id) || mods[0];
  const view = document.getElementById('view'), mine = ++seq;
  document.getElementById('pageTitle').textContent = t('nav.' + mod.id);
  document.querySelectorAll('[data-route]').forEach(a => a.dataset.route === mod.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  document.body.classList.remove('drawer');
  current?.unmount?.(); current = null; // lets a module release its Firestore listeners
  view.focus({ preventScroll: true });
  if (!BUILT[mod.id]) {
    view.innerHTML = `<div class="card empty"><h3>${esc(t('planned.title', { n: mod.phase }))}</h3><p>${esc(t('planned.body'))}</p></div>`;
    return;
  }
  view.innerHTML = '<div class="skeleton"></div>';
  try {
    const m = await BUILT[mod.id]();
    if (mine !== seq) return; // user navigated away while this loaded
    current = m; await m.mount(view, param);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><p class="msg">${esc(e.message)}</p></div>`;
  }
}
