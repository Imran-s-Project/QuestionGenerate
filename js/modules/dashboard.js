import { auth } from '../firebase.js';
import { configSource } from '../services/config-service.js';
import { getActive, getOrgs, onOrgChange } from '../services/org-context.js';
import { loadTypes, typeName } from '../services/question-types.js';
import { listSubjects, listQuestions } from '../services/question-service.js';
import { listExams } from '../services/exam-service.js';
import { getStats } from '../services/stats-service.js';
import { t } from '../utilities/i18n.js';
import { esc } from '../utilities/dom.js';
import { plainText } from '../utilities/rich-text.js';
import { handleError } from '../utilities/errors.js';

let off = null;
const bars = pairs => {
  const rows = pairs.filter(p => p[1] > 0), max = Math.max(1, ...rows.map(p => p[1]));
  return rows.map(([l, n]) => `<div class="bar"><span>${esc(l)}</span><i style="width:${Math.round((n / max) * 100)}%"></i><b>${n}</b></div>`).join('') || '<p class="empty">—</p>';
};
const stat = (label, value) => `<div class="card stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;

// Everything on this page is a real count read from the database. Nothing is estimated.
export function mount(el) {
  const draw = async force => {
    const a = getActive();
    const rows = [[t('dash.user'), esc(auth.currentUser?.email || '—')], [t('dash.inst'), a ? `${esc(a.name)} (${esc(t('role.' + a.role))})` : '—'],
      [t('dash.network'), t(navigator.onLine ? 'status.online' : 'status.offline')], [t('dash.config'), t('dash.src.' + configSource())], [t('dash.phase'), t('dash.phaseValue')]];
    el.innerHTML = `<div class="card"><h3>${t('dash.status')}</h3><dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>${a ? '<div id="stats" class="grid"><div class="skeleton"></div></div>' : `<div class="card empty"><p>${t('inst.empty')}</p></div>`}`;
    if (!a) return;
    try {
      const [types, subjects] = await Promise.all([loadTypes(a.id), listSubjects(a.id)]);
      const [s, rq, rd, rf] = await Promise.all([getStats(a.id, subjects, types, force), listQuestions(a.id, { status: 'active' }, null, 5), listExams(a.id, 'draft', null, 5), listExams(a.id, 'final', null, 5)]);
      const exams = [...rd.items, ...rf.items].sort((x, y) => (y.updatedAt?.toMillis?.() || 0) - (x.updatedAt?.toMillis?.() || 0)).slice(0, 5);
      const box = el.querySelector('#stats');
      if (!box) return; // the page changed while loading
      box.innerHTML = `<div class="grid stats">${stat(t('d.institutions'), getOrgs().length)}${stat(t('d.subjects'), s.subj)}${stat(t('d.members'), s.members)}${stat(t('d.questions'), s.qs.join(' / '))}${stat(t('d.exams'), s.ex.join(' / '))}</div>
<p class="muted">${t('d.note')} <button class="btn sm" data-refresh>${t('d.refresh')}</button></p>
<div class="grid two"><div class="card"><h3>${t('d.byType')}</h3>${bars(types.map((x, i) => [typeName(x), s.byType[i]]))}</div><div class="card"><h3>${t('d.byDifficulty')}</h3>${bars(['easy', 'medium', 'hard'].map((d, i) => [t('diff.' + d), s.diff[i]]))}</div>
<div class="card"><h3>${t('d.bySubject')}</h3>${bars(subjects.map((x, i) => [x.name, s.bySubj[i]]))}</div><div class="card"><h3>${t('d.monthlyQ')}</h3>${bars(s.months.map((m, i) => [m, s.mq[i]]))}</div>
<div class="card"><h3>${t('d.monthlyE')}</h3>${bars(s.months.map((m, i) => [m, s.me[i]]))}</div>
<div class="card"><h3>${t('d.recentQ')}</h3><div class="list">${rq.items.map(q => `<a href="#/questionBuilder/${esc(q.id)}">${esc(plainText(q.statement).slice(0, 70))}</a>`).join('') || '—'}</div>
<h3>${t('d.recentE')}</h3><div class="list">${exams.map(x => `<a href="#/examManager/${esc(x.id)}">${esc(x.title)}</a>`).join('') || '—'}</div></div></div>`;
      box.querySelector('[data-refresh]').addEventListener('click', () => draw(true));
    } catch (e) { handleError(e, 'dashboard'); }
  };
  draw();
  off = onOrgChange(() => draw());
}
export function unmount() { off?.(); off = null; }
