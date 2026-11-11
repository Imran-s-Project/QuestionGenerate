// Bump VERSION on every release so old caches are removed.
const VERSION = 'qg-shell-v8';
const SHELL = ['./', 'index.html', 'manifest.json', 'css/app.css', 'css/paper-preview.css', 'assets/icons/icon.svg',
  'js/app.js', 'js/router.js', 'js/firebase.js', 'js/firebase-config.js',
  'js/services/auth-service.js', 'js/services/config-service.js',
  'js/utilities/dom.js', 'js/utilities/i18n.js', 'js/utilities/errors.js', 'js/services/firestore-service.js', 'js/services/org-context.js', 'js/utilities/strings-institutions.js', 'js/modules/institutions.js', 'js/modules/users.js', 'js/services/question-types.js', 'js/services/question-service.js', 'js/utilities/rich-text.js', 'js/utilities/strings-questions.js', 'js/modules/question-builder.js', 'js/modules/question-bank.js', 'js/services/exam-service.js', 'js/utilities/random.js', 'js/utilities/strings-exams.js', 'js/modules/exam-manager.js', 'js/modules/paper-generator.js', 'js/services/layout-service.js', 'js/utilities/paper-render.js', 'js/utilities/strings-paper.js', 'js/modules/paper-preview.js', 'js/modules/templates.js', 'js/utilities/zip.js', 'js/utilities/office.js', 'js/utilities/strings-export.js', 'js/services/export-service.js', 'js/modules/exports.js', 'js/utilities/question-schema.js', 'js/utilities/parse.js', 'js/utilities/strings-import.js', 'js/services/import-service.js', 'js/modules/imports.js', 'js/modules/dashboard.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

// App files and the Firebase SDK scripts: serve from cache, refresh in the background.
// Firestore / Auth network traffic is never intercepted.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || !(u.origin === location.origin || ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname))) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
