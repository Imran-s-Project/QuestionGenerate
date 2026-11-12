import { db, fs } from '../firebase.js';

// The ONE place for default configuration. Firestore document appConfig/main overrides any key.
export const DEFAULTS = {
  branding: { name: 'Question Generate', tagline: { en: 'Create Smarter Exams. Generate Better Questions.', bn: 'আরও স্মার্ট পরীক্ষা তৈরি করুন, আরও ভালো প্রশ্ন জেনারেট করুন।' } },
  features: { googleSignIn: true, selfRegistration: true },
  modules: [
    { id: 'dashboard', icon: '▦', phase: 1, mobile: true },
    { id: 'questionBuilder', icon: '✎', phase: 4 },
    { id: 'questionBank', icon: '☰', phase: 4, mobile: true },
    { id: 'examManager', icon: '▤', phase: 5, mobile: true },
    { id: 'paperGenerator', icon: '⚙', phase: 5 },
    { id: 'paperPreview', icon: '⎙', phase: 6 },
    { id: 'imports', icon: '⇪', phase: 7 },
    { id: 'exports', icon: '⇩', phase: 7 },
    { id: 'templates', icon: '❏', phase: 6 },
    { id: 'institutions', icon: '⌂', phase: 3, mobile: true },
    { id: 'users', icon: '☺', phase: 3 },
    { id: 'reports', icon: '≋', phase: 8 },
    { id: 'settings', icon: '⚑', phase: 8 },
    { id: 'backup', icon: '⤓', phase: 8 },
    { id: 'help', icon: '?', phase: 10 }
  ]
};

const CACHE_KEY = 'qg.config';
let cfg = DEFAULTS, source = 'defaults';
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => { const o = { ...a }; for (const k in b) o[k] = isObj(a?.[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; };

/** Firestore first, then local cache (offline), then built-in defaults. Missing config never blocks the app. */
export async function loadConfig() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached) { cfg = merge(DEFAULTS, cached); source = 'cache'; }
  } catch (e) { console.warn('Bad cached config', e); }
  if (db) {
    try {
      const snap = await fs.getDoc(fs.doc(db, 'appConfig', 'main'));
      if (snap.exists()) { cfg = merge(DEFAULTS, snap.data()); source = 'firestore'; localStorage.setItem(CACHE_KEY, JSON.stringify(snap.data())); }
    } catch (e) { console.warn('Config not loaded from Firestore', e); }
  }
  return cfg;
}
export const getConfig = () => cfg;
export const configSource = () => source;
