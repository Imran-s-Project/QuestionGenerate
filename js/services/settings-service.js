import { fs } from '../firebase.js';
import { ref, forCreate, forUpdate, logAudit } from './firestore-service.js';

// Institution settings: stored in organizations/{orgId}/settings/general. Only settings that the app really applies are listed.
export const DEFAULT_SETTINGS = { defaultType: 'mcq', defaultDifficulty: 'medium', defaultMarks: 1, defaultNegative: 0, defaultDuration: 0, defaultInstructions: '', autosave: true };
export const SETTING_FIELDS = [['defaultType', 'select'], ['defaultDifficulty', 'select', ['easy', 'medium', 'hard']], ['defaultMarks', 'number', [0, 100, 0.5]],
  ['defaultNegative', 'number', [0, 10, 0.25]], ['defaultDuration', 'number', [0, 600, 5]], ['defaultInstructions', 'textarea'], ['autosave', 'check']];
export const SETTING_LABELS = { defaultType: 's.defaultType', defaultDifficulty: 's.defaultDifficulty', defaultMarks: 's.defaultMarks', defaultNegative: 's.defaultNegative',
  defaultDuration: 's.defaultDuration', defaultInstructions: 's.defaultInstructions', autosave: 's.autosave' };
const docRef = orgId => fs.doc(ref.col(orgId, 'settings'), 'general');
let cache = { org: null, value: DEFAULT_SETTINGS };

/** Never throws: missing or unreadable settings fall back to the defaults. */
export async function getSettings(orgId, force = false) {
  if (cache.org === orgId && !force) return cache.value;
  let value = DEFAULT_SETTINGS;
  try { const s = await fs.getDoc(docRef(orgId)); if (s.exists()) value = { ...DEFAULT_SETTINGS, ...s.data() }; } catch (e) { console.warn('Settings not loaded', e); }
  cache = { org: orgId, value };
  return value;
}
export async function saveSettings(orgId, data) {
  const r = docRef(orgId), exists = (await fs.getDoc(r)).exists();
  await (exists ? fs.updateDoc(r, forUpdate(data)) : fs.setDoc(r, forCreate(orgId, data)));
  cache = { org: null, value: DEFAULT_SETTINGS };
  logAudit(orgId, 'settings.update', {}).catch(e => console.warn('Audit log not written', e));
}
