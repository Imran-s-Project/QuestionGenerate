import { MORE } from './strings-institutions.js';
import { MORE_Q } from './strings-questions.js';
import { MORE_X } from './strings-exams.js';
import { MORE_P } from './strings-paper.js';
import { MORE_E } from './strings-export.js';
// Translation-ready: add a language by adding one more object to D.
const D = {
  bn: {
    'nav.dashboard': 'ওভারভিউ', 'nav.questionBuilder': 'প্রশ্ন নির্মাতা', 'nav.questionBank': 'প্রশ্নব্যাংক', 'nav.examManager': 'পরীক্ষা ব্যবস্থাপনা',
    'nav.paperGenerator': 'স্মার্ট পেপার জেনারেটর', 'nav.paperPreview': 'পেপার প্রিভিউ', 'nav.imports': 'প্রশ্ন ইম্পোর্ট', 'nav.exports': 'এক্সপোর্ট সেন্টার',
    'nav.templates': 'টেমপ্লেট', 'nav.institutions': 'প্রতিষ্ঠান', 'nav.users': 'ব্যবহারকারী ও ভূমিকা', 'nav.reports': 'রিপোর্ট ও ইতিহাস',
    'nav.settings': 'সেটিংস', 'nav.backup': 'ব্যাকআপ ও রিস্টোর', 'nav.help': 'সাহায্য',
    'phase': 'ফেজ {n}', 'planned.title': 'ফেজ {n}-এ তৈরি হবে',
    'planned.body': 'এই মডিউলটি এখনও তৈরি হয়নি। নির্ধারিত ফেজে এটি পুরোপুরি কার্যকর অবস্থায় যুক্ত হবে।',
    'auth.email': 'ইমেইল', 'auth.password': 'পাসওয়ার্ড', 'auth.signin': 'সাইন ইন', 'auth.signup': 'নতুন অ্যাকাউন্ট খুলুন',
    'auth.google': 'Google দিয়ে চালিয়ে যান', 'auth.signout': 'সাইন আউট',
    'status.online': 'অনলাইন', 'status.offline': 'অফলাইন',
    'dash.status': 'সিস্টেমের অবস্থা', 'dash.user': 'সাইন-ইন করা অ্যাকাউন্ট', 'dash.network': 'নেটওয়ার্ক', 'dash.config': 'কনফিগারেশনের উৎস',
    'dash.src.firestore': 'Firestore', 'dash.src.cache': 'লোকাল ক্যাশ (অফলাইন কপি)', 'dash.src.defaults': 'বিল্ট-ইন ডিফল্ট (Firestore-এ এখনও appConfig/main নেই)',
    'dash.phase': 'নির্মাণের অগ্রগতি', 'dash.phaseValue': 'ফেজ ৭ — এক্সপোর্ট সেন্টার',
    'dash.noStats': 'প্রশ্নব্যাংক ও পরীক্ষা মডিউল তৈরি হলে প্রশ্ন ও পরীক্ষার পরিসংখ্যান বাস্তব ডেটা থেকে এখানে দেখানো হবে। কোনো নকল সংখ্যা দেখানো হয় না।',
    'setup.title': 'Firebase সেটআপ দরকার', 'setup.body': 'js/firebase-config.js ফাইলে আপনার Firebase প্রজেক্টের কনফিগ বসিয়ে পেজ রিলোড করুন।',
    'err.credentials': 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।', 'err.email': 'ইমেইল ঠিকানাটি সঠিক নয়।', 'err.exists': 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।',
    'err.weak': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', 'err.network': 'নেটওয়ার্ক পাওয়া যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
    'err.permission': 'এই কাজের অনুমতি আপনার নেই।', 'err.cancelled': 'সাইন-ইন বাতিল করা হয়েছে।', 'err.generic': 'কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।'
  },
  en: {
    'nav.dashboard': 'Overview', 'nav.questionBuilder': 'Question Builder', 'nav.questionBank': 'Question Bank', 'nav.examManager': 'Exam Manager',
    'nav.paperGenerator': 'Smart Paper Generator', 'nav.paperPreview': 'Paper Preview', 'nav.imports': 'Import Questions', 'nav.exports': 'Export Center',
    'nav.templates': 'Templates', 'nav.institutions': 'Institutions', 'nav.users': 'Users & Roles', 'nav.reports': 'Reports & History',
    'nav.settings': 'Settings', 'nav.backup': 'Backup & Restore', 'nav.help': 'Help',
    'phase': 'Phase {n}', 'planned.title': 'Planned for phase {n}',
    'planned.body': 'This module is not built yet. It is added, fully working, in its phase of the build plan.',
    'auth.email': 'Email', 'auth.password': 'Password', 'auth.signin': 'Sign in', 'auth.signup': 'Create account',
    'auth.google': 'Continue with Google', 'auth.signout': 'Sign out',
    'status.online': 'Online', 'status.offline': 'Offline',
    'dash.status': 'System status', 'dash.user': 'Signed in as', 'dash.network': 'Network', 'dash.config': 'Configuration source',
    'dash.src.firestore': 'Firestore', 'dash.src.cache': 'Local cache (offline copy)', 'dash.src.defaults': 'Built-in defaults (no appConfig/main in Firestore yet)',
    'dash.phase': 'Build progress', 'dash.phaseValue': 'Phase 7 — Export center',
    'dash.noStats': 'Question and exam statistics will appear here from real data once the Question Bank and Exam modules exist. No placeholder numbers are shown.',
    'setup.title': 'Firebase setup needed', 'setup.body': 'Paste your Firebase project config into js/firebase-config.js, then reload.',
    'err.credentials': 'Wrong email or password.', 'err.email': 'That email address is not valid.', 'err.exists': 'An account with this email already exists.',
    'err.weak': 'Use a password with at least 6 characters.', 'err.network': 'No network. Check your connection and try again.',
    'err.permission': 'You do not have permission to do this.', 'err.cancelled': 'Sign-in was cancelled.', 'err.generic': 'That did not work. Try again.'
  }
};

for (const l in MORE) Object.assign(D[l], MORE[l], MORE_Q[l], MORE_X[l], MORE_P[l], MORE_E[l]);
let lang = localStorage.getItem('qg.lang');
if (!D[lang]) lang = 'bn';
export const getLang = () => lang;
export function setLang(l) {
  if (!D[l]) return;
  lang = l; localStorage.setItem('qg.lang', l); document.documentElement.lang = l;
}
export const tIn = (l, key, vars = {}) => String(D[l]?.[key] ?? D.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
export const t = (key, vars = {}) => tIn(lang, key, vars);
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.documentElement.lang = lang;
}
