import { esc } from './dom.js';
import { renderRich } from './rich-text.js';
import { tIn } from './i18n.js';

// STUDENT PAPER ONLY. This file works from question documents and never reads answer keys.
const FALLBACK = '"Noto Sans","Segoe UI",system-ui,sans-serif';
const BN = '০১২৩৪৫৬৭৮৯';
export const LET = { en: 'ABCDEFGH', bn: 'কখগঘঙচছজ' };
export const num = (n, lang) => (lang === 'bn' ? String(n).replace(/\d/g, d => BN[d]) : String(n));
const run = s => renderRich(s).replace(/^<p>/, '').replace(/<\/p>$/, '');
const https = u => /^https:\/\//.test(u || '');
let fontLink = null, seq = 0;

export function pageSize(l) {
  const [w, h] = l.pageSize === 'Legal' ? [215.9, 355.6] : l.pageSize === 'Custom' ? [+l.customW || 210, +l.customH || 297] : [210, 297];
  return l.orientation === 'landscape' ? [h, w] : [w, h];
}

/** Bengali-capable web fonts (Google Fonts). Pagination is measured only after they are ready. */
export function loadFonts(family) {
  fontLink ??= new Promise(r => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.crossOrigin = 'anonymous';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Noto+Serif+Bengali:wght@400;700&family=Hind+Siliguri:wght@400;600&display=swap';
    l.onload = l.onerror = r;
    document.head.append(l);
  });
  return fontLink.then(() => Promise.all(['', 'bold '].map(w => document.fonts.load(`${w}12px "${family}"`, 'অআকখ Aa')))).catch(() => {});
}

function headerHtml(d, L, tt, lang) {
  const { org, exam, set } = d, meta = [];
  if (L.hSubject && d.subject) meta.push(tt('pp.subject', { v: d.subject }));
  if (L.hClass && exam.className) meta.push(tt('pp.class', { v: exam.className }));
  if (L.hClass && exam.group) meta.push(tt('pp.group', { v: exam.group }));
  if (L.hDate && exam.date) meta.push(tt('pp.date', { v: num(exam.date, lang) }));
  if (L.hDuration && exam.durationMin) meta.push(tt('pp.time', { n: num(exam.durationMin, lang) }));
  if (L.hMarks) meta.push(tt('pp.full', { n: num(exam.totalMarks, lang) }));
  const logo = L.hLogo && https(org.logoUrl) ? `<img class="logo" src="${esc(org.logoUrl)}" alt="">` : '';
  const stu = [['sName', 'pp.name'], ['sRoll', 'pp.roll'], ['sReg', 'pp.reg'], ['sClass', 'pp.sclass'], ['sSection', 'pp.section'], ['sSign', 'pp.sign']].filter(([k]) => L[k]);
  return `<div class="hd">${logo}<div class="hd-t">${L.hInstitution && org.name ? `<div class="inst">${esc(org.name)}</div>` : ''}${L.hAddress && org.address ? `<div class="addr">${esc(org.address)}</div>` : ''}${org.paperHeader ? `<div class="addr">${esc(org.paperHeader)}</div>` : ''}${L.hTitle ? `<div class="ttl">${esc(exam.title)}${set ? ' — ' + esc(tt('pp.set', { label: set.label })) : ''}</div>` : ''}<div class="meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div></div></div>`
    + (stu.length ? `<div class="stu">${stu.map(([, k]) => `<span>${esc(tt(k))}:</span>`).join('')}</div>` : '')
    + (exam.instructions ? `<div class="ins">${renderRich(exam.instructions)}</div>` : '');
}

function questionHtml(q, n, s, set, L, lang, tt) {
  const A = i => LET[lang][i] ?? i + 1;
  let b = q.instructions ? `<div class="qin">${esc(q.instructions)}</div>` : '';
  b += `<div class="st">${renderRich(q.statement)}</div>`;
  if (https(q.imageUrl)) b += `<img class="qi" src="${esc(q.imageUrl)}" alt="">`;
  if ((q.family === 'choice' || q.family === 'multi') && q.options) {
    const by = Object.fromEntries(q.options.map(o => [o.id, o]));
    const opts = (set?.optionOrder?.[q.id] || q.options.map(o => o.id)).map(id => by[id]).filter(Boolean);
    b += `<ol class="op ${L.optionsLayout}">${opts.map((o, i) => `<li><span class="ol">${A(i)}.</span> ${run(o.text)}</li>`).join('')}</ol>`;
  } else if (q.family === 'truefalse') b += `<div class="tf">( ) ${esc(tt('q.true'))} &nbsp;&nbsp; ( ) ${esc(tt('q.false'))}</div>`;
  else if (q.family === 'match' && q.lefts && q.rights) {
    const rows = Math.max(q.lefts.length, q.rights.length);
    b += `<table class="mt">${Array.from({ length: rows }, (_, i) => `<tr><td>${q.lefts[i] ? `${num(i + 1, lang)}. ${run(q.lefts[i].text)}` : ''}</td><td>${q.rights[i] ? `${A(i)}. ${run(q.rights[i].text)}` : ''}</td></tr>`).join('')}</table>`;
  } else if (q.family === 'order' && q.items) b += `<ol class="op list">${q.items.map((o, i) => `<li><span class="ol">${A(i)}.</span> ${run(o.text)}</li>`).join('')}</ol>`;
  else if (q.family === 'structured' && q.subs) b += `<ol class="subq">${q.subs.map((x, i) => `<li><span class="ol">${A(i)}.</span> ${run(x.text)} <span class="mk">[${num(x.marks, lang)}]</span></li>`).join('')}</ol>`;
  const m = num(s.marksEach, lang), mk = L.marksAlign === 'none' ? '' : `<span class="mk">${L.marksAlign === 'inline' ? `(${m})` : `[${m}]`}</span>`;
  return `<div class="blk q"><span class="no">${num(n, lang)}.</span><div class="qb">${b}${L.marksAlign === 'inline' ? mk : ''}</div>${L.marksAlign === 'right' ? mk : ''}</div>`;
}

function blocksOf(d, L, lang, tt) {
  const out = [];
  let n = 0;
  for (const s of d.sections) {
    const ids = d.set?.questionOrder?.[s.id] || s.questionIds.slice(0, s.count);
    const head = `<div class="sh"><span>${esc(s.title)}</span><span>${esc(`(${num(s.count, lang)} × ${num(s.marksEach, lang)} = ${num(s.count * s.marksEach, lang)})`)}</span></div>${s.instructions ? `<div class="si">${renderRich(s.instructions)}</div>` : ''}`;
    ids.map(id => d.qmap[id]).filter(Boolean).forEach((q, i) => {
      const html = questionHtml(q, ++n, s, d.set, L, lang, tt);
      out.push(i === 0 ? `<div class="blk sec">${head}${html}</div>` : html); // a heading always travels with its first question
    });
  }
  return out;
}

/** Builds real pages: blocks are placed one by one and move to a new page when the page body overflows.
 *  The same pages are shown on screen and printed, so preview and print always match. */
export async function renderPaper(host, d, L) {
  const my = ++seq, lang = L.paperLang === 'en' ? 'en' : 'bn', tt = (k, v) => tIn(lang, k, v), [W, H] = pageSize(L);
  host.style.cssText = `--pw:${W}mm;--ph:${H}mm;--m:${L.margin}mm;--fs:${L.fontSize}pt;--lh:${L.lineHeight};--qs:${L.qSpacing}mm;--ss:${L.sSpacing}mm;--cols:${L.columns};font-family:"${L.fontFamily}",${FALLBACK}`;
  let rule = document.getElementById('pageRule');
  if (!rule) { rule = document.createElement('style'); rule.id = 'pageRule'; document.head.append(rule); }
  rule.textContent = `@page{size:${W}mm ${H}mm;margin:0}`;
  host.classList.toggle('bordered', !!L.border);
  const blocks = blocksOf(d, L, lang, tt), head = headerHtml(d, L, tt, lang);
  const urls = [...new Set([...(head + blocks.join('')).matchAll(/src="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
  await Promise.all([loadFonts(L.fontFamily), ...urls.map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; setTimeout(r, 4000); }))]);
  if (my !== seq) return 0; // a newer render started while fonts and images loaded

  const wm = L.watermark ? `<div class="wm">${esc(L.watermark)}</div>` : '', pages = [];
  const addPage = () => {
    const p = document.createElement('section');
    p.className = 'page';
    p.innerHTML = `<div class="frame">${pages.length ? `<div class="rh">${esc(d.exam.title)}${d.set ? ' — ' + esc(tt('pp.set', { label: d.set.label })) : ''}</div>` : head}<div class="pg-body"></div><div class="pg-foot"></div></div>${wm}`;
    host.append(p); pages.push(p);
    return p.querySelector('.pg-body');
  };
  host.replaceChildren();
  let body = addPage();
  const over = b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1; // height, or extra columns when 2-column
  for (const html of blocks) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const blk = tpl.content.firstElementChild;
    body.append(blk);
    if (over(body) && body.children.length > 1) { blk.remove(); body = addPage(); body.append(blk); }
  }
  const foot = L.footerText || d.org.defaultFooter || '';
  pages.forEach((p, i) => { p.querySelector('.pg-foot').innerHTML = `<span>${esc(foot)}</span>${L.pageNumbers ? `<span>${esc(tt('pp.page', { n: num(i + 1, lang), m: num(pages.length, lang) }))}</span>` : ''}`; });
  return pages.length;
}
