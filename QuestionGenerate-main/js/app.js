import { isConfigured, auth } from './firebase.js';
import { loadConfig, getConfig } from './services/config-service.js';
import * as authSvc from './services/auth-service.js';
import { t, applyI18n, getLang, setLang } from './utilities/i18n.js';
import { handleError, errorMessage } from './utilities/errors.js';
import { buildNav, render } from './router.js';
import { loadOrgs, getOrgs, getActive, setActive, onOrgChange, resetOrgs } from './services/org-context.js';
import { esc } from './utilities/dom.js';

const $ = id => document.getElementById(id);
const show = id => ['boot', 'auth', 'shell'].forEach(x => { $(x).hidden = x !== id; });

function applyBrand() {
  const { name, tagline } = getConfig().branding;
  document.title = name;
  document.querySelectorAll('[data-brand=name]').forEach(e => { e.textContent = name; });
  document.querySelectorAll('[data-brand=tagline]').forEach(e => {
    e.textContent = typeof tagline === 'string' ? tagline : (tagline?.[getLang()] || tagline?.en || '');
  });
}
function updateNet() {
  const p = $('net');
  p.dataset.on = navigator.onLine;
  p.textContent = t(navigator.onLine ? 'status.online' : 'status.offline');
}
function renderSwitch() {
  const s = $('orgSwitch'), orgs = getOrgs(), a = getActive();
  s.setAttribute('aria-label', t('inst.title'));
  s.hidden = !orgs.length;
  s.innerHTML = orgs.map(o => `<option value="${esc(o.id)}"${o.id === a?.id ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
}
function refreshText() { applyI18n(); applyBrand(); updateNet(); buildNav(); renderSwitch(); }

function toggleLang() {
  setLang(getLang() === 'bn' ? 'en' : 'bn');
  refreshText();
  const u = auth.currentUser;
  if (u) { render(); authSvc.savePreference(u.uid, 'ui', { language: getLang() }).catch(e => handleError(e, 'preference')); }
}

async function run(action, validate = true) {
  const form = $('authForm');
  if (validate && !form.reportValidity()) return;
  form.classList.add('busy'); $('authMsg').textContent = '';
  try { await action(); } catch (e) { console.error(e); $('authMsg').textContent = errorMessage(e); }
  finally { form.classList.remove('busy'); }
}
const creds = () => [$('email').value.trim(), $('password').value];

async function start() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(e => console.warn('Service worker not registered', e));
  await loadConfig();
  applyI18n();
  if (!isConfigured) {
    $('boot').innerHTML = `<div class="card auth-card"><h3>${t('setup.title')}</h3><p>${t('setup.body')}</p></div>`;
    return;
  }
  const { features } = getConfig();
  $('google').hidden = !features.googleSignIn;
  $('signUp').hidden = !features.selfRegistration;

  $('authForm').addEventListener('submit', e => { e.preventDefault(); run(() => authSvc.signIn(...creds())); });
  $('signUp').addEventListener('click', () => run(() => authSvc.signUp(...creds())));
  $('google').addEventListener('click', () => run(authSvc.signInGoogle, false));
  $('signOut').addEventListener('click', () => authSvc.signOut().catch(e => handleError(e, 'signout')));
  document.querySelectorAll('[data-lang-toggle]').forEach(b => b.addEventListener('click', toggleLang));
  $('menuBtn').addEventListener('click', e => { e.stopPropagation(); document.body.classList.toggle('drawer'); });
  document.querySelector('.main').addEventListener('click', () => document.body.classList.remove('drawer'));
  $('sidebar').addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('drawer'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('drawer'); });
  addEventListener('hashchange', () => { if (auth.currentUser) render(); });
  addEventListener('online', updateNet);
  addEventListener('offline', updateNet);

  refreshText();
  $('orgSwitch').addEventListener('change', e => setActive(e.target.value));
  onOrgChange(renderSwitch);
  authSvc.onUser(async user => {
    if (!user) { resetOrgs(); show('auth'); return; }
    show('shell'); render();
    authSvc.ensureProfile(user).catch(e => handleError(e, 'profile'));
    const p = await authSvc.loadPreference(user.uid, 'ui').catch(e => { console.warn('Preferences not loaded', e); return null; });
    if (p?.language && p.language !== getLang()) { setLang(p.language); refreshText(); render(); }
    loadOrgs(p?.activeOrgId).catch(e => handleError(e, 'organizations'));
  });
}
start().catch(e => console.error('Startup failed', e));
