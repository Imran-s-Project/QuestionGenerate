// Reads files in the browser. Nothing leaves the device.
/** Delimited text: comma, semicolon or tab (detected from the first line). Quotes and line breaks inside quotes are supported. */
export function parseCsv(text) {
  const t = String(text).replace(/^\ufeff/, ''), first = t.split(/\r?\n/, 1)[0];
  const d = [',', ';', '\t'].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const inflate = async data => new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
async function unzip(buf) { // reads the ZIP central directory; entries are stored or deflated
  const b = new Uint8Array(buf), dv = new DataView(buf), files = {};
  let e = b.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Not a ZIP file');
  let p = dv.getUint32(e + 16, true);
  for (let i = 0, n = dv.getUint16(e + 10, true); i < n; i++) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl)), start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    files[name] = async () => { const raw = b.subarray(start, start + size); return new TextDecoder().decode(method === 8 ? await inflate(raw) : raw); };
    p += 46 + nl + xl + cl;
  }
  return files;
}
const unesc = s => s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()]);
const texts = xml => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => unesc(m[1])).join('');

/** First worksheet of an XLSX file as rows of text. */
export async function readXlsx(buf) {
  const z = await unzip(buf), sheet = Object.keys(z).filter(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n)).sort()[0];
  if (!sheet) throw new Error('No worksheet found');
  const sst = z['xl/sharedStrings.xml'] ? [...(await z['xl/sharedStrings.xml']()).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => texts(m[1])) : [];
  const rows = [];
  for (const m of (await z[sheet]()).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const at = /\br="([A-Z]+)(\d+)"/.exec(m[1]);
    if (!at) continue;
    const type = /\bt="(\w+)"/.exec(m[1])?.[1], inner = m[2] || '', v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '';
    const val = type === 's' ? sst[+v] ?? '' : type === 'inlineStr' ? texts(inner) : type === 'b' ? (v === '1' ? 'TRUE' : 'FALSE') : unesc(v);
    (rows[+at[2] - 1] ??= [])[[...at[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1] = val;
  }
  return rows.filter(Boolean).map(r => Array.from(r, v => v ?? ''));
}

/** Pasted or loaded text: JSON (structured questions, or a list of flat rows) or delimited text. */
export function parseText(text) {
  const t = String(text).trim();
  if (!/^[\[{]/.test(t)) return { kind: 'table', rows: parseCsv(t) };
  const j = JSON.parse(t), list = Array.isArray(j) ? j : j.questions;
  if (!Array.isArray(list)) throw new Error('No questions found');
  if (list.some(x => x && (x.options || x.answerKey || x.family))) return { kind: 'json', list };
  const heads = [...new Set(list.flatMap(o => Object.keys(o || {})))];
  return { kind: 'table', rows: [heads, ...list.map(o => heads.map(h => o[h] ?? ''))] };
}
