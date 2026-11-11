import { zip } from './zip.js';

// File builders that run entirely in the browser: CSV, TXT, DOCX, XLSX. Nothing is uploaded anywhere.
const X = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const RELS = target => `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"/></Relationships>`;
const CT = overrides => `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides}</Types>`;

export function download(name, data, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** CSV with a BOM (so Excel reads Bengali correctly). Text starting with = + - @ is neutralised against spreadsheet formulas. */
export const csv = rows => '\ufeff' + rows.map(r => r.map(v => {
  let s = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(',')).join('\r\n');

// Question text markup -> plain text / Word runs.
export const markupToText = s => String(s ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\+\+(.+?)\+\+/g, '$1').replace(/\*(.+?)\*/g, '$1')
  .replace(/\^\((.+?)\)/g, '^$1').replace(/_\((.+?)\)/g, '_$1').replace(/\{([^{}/]+)\/([^{}/]+)\}/g, '$1/$2');
export const toTxt = items => items.map(it => ' '.repeat(Math.round((it.indent || 0) / 360) * 3) + markupToText(it.s)).join('\n');

const TOKENS = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|\*(.+?)\*|\^\((.+?)\)|_\((.+?)\)|\{([^{}/]+)\/([^{}/]+)\}/g;
function runs(src, base) {
  const out = [];
  let last = 0;
  for (const m of String(src ?? '').matchAll(TOKENS)) {
    if (m.index > last) out.push({ t: src.slice(last, m.index) });
    out.push(m[1] != null ? { t: m[1], b: 1 } : m[2] != null ? { t: m[2], u: 1 } : m[3] != null ? { t: m[3], i: 1 } : m[4] != null ? { t: m[4], sup: 1 } : m[5] != null ? { t: m[5], sub: 1 } : { t: `${m[6]}/${m[7]}` });
    last = m.index + m[0].length;
  }
  if (last < String(src ?? '').length) out.push({ t: src.slice(last) });
  return out.map(r => ({ ...base, ...r }));
}
const runXml = r => `<w:r><w:rPr><w:rFonts w:ascii="Nirmala UI" w:hAnsi="Nirmala UI" w:cs="Nirmala UI"/>${r.b ? '<w:b/><w:bCs/>' : ''}${r.i ? '<w:i/><w:iCs/>' : ''}<w:sz w:val="${r.size * 2}"/><w:szCs w:val="${r.size * 2}"/>${r.u ? '<w:u w:val="single"/>' : ''}${r.sup ? '<w:vertAlign w:val="superscript"/>' : ''}${r.sub ? '<w:vertAlign w:val="subscript"/>' : ''}</w:rPr><w:t xml:space="preserve">${X(r.t)}</w:t></w:r>`;

/** items: [{ s: text with question markup, align, indent (twips), bold, italic, size (pt), after (twips) }] */
export function toDocx(items) {
  const body = items.map(it => `<w:p><w:pPr><w:spacing w:after="${it.after ?? 80}"/>${it.indent ? `<w:ind w:left="${it.indent}"/>` : ''}${it.align ? `<w:jc w:val="${it.align}"/>` : ''}</w:pPr>${runs(it.s, { b: it.bold, i: it.italic, size: it.size || 12 }).map(runXml).join('')}</w:p>`).join('');
  const doc = `${HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    { name: '[Content_Types].xml', data: CT('<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>') },
    { name: '_rels/.rels', data: RELS('word/document.xml') },
    { name: 'word/document.xml', data: doc }
  ], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

const col = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
/** sheets: [{ name, rows: [[cell, ...], ...] }]. Numbers stay numbers; text is stored as text (never as a formula). */
export function toXlsx(sheets) {
  const sheetXml = rows => `${HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => typeof v === 'number' ? `<c r="${col(j)}${i + 1}"><v>${v}</v></c>` : `<c r="${col(j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const wb = `${HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${X(s.name.replace(/[\[\]:*?/\\]/g, '').slice(0, 31) || 'Sheet')}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  const wbRels = `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`;
  return zip([
    { name: '[Content_Types].xml', data: CT('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')) },
    { name: '_rels/.rels', data: RELS('xl/workbook.xml') },
    { name: 'xl/workbook.xml', data: wb }, { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) }))
  ], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
