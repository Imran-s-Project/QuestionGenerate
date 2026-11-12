import { auth } from '../firebase.js';
import { listMyOrganizations } from './firestore-service.js';
import { savePreference } from './auth-service.js';

// The institution the user is currently working in. Every module reads it from here.
let orgs = [], activeId = null;
const subs = new Set();
const emit = () => subs.forEach(f => f());
export const onOrgChange = f => { subs.add(f); return () => subs.delete(f); };
export const getOrgs = () => orgs;
export const getActive = () => orgs.find(o => o.id === activeId) || null;

/** Loads the user's institutions and picks the active one: requested id, else last used on this device, else the first. */
export async function loadOrgs(preferredId) {
  orgs = (await listMyOrganizations()).filter(o => o.status === 'active');
  const key = `qg.org.${auth.currentUser.uid}`;
  activeId = [preferredId, localStorage.getItem(key)].find(id => orgs.some(o => o.id === id)) || orgs[0]?.id || null;
  if (activeId) localStorage.setItem(key, activeId);
  emit();
}

export function setActive(id) {
  if (!orgs.some(o => o.id === id)) return;
  activeId = id;
  localStorage.setItem(`qg.org.${auth.currentUser.uid}`, id);
  emit();
  savePreference(auth.currentUser.uid, 'ui', { activeOrgId: id }).catch(e => console.warn('Active institution not saved', e));
}

export function resetOrgs() { orgs = []; activeId = null; emit(); }
