import { esc } from './dom.js';

// Question text is stored as a small controlled markup, never as HTML, and rendered through this whitelist:
// **bold**  *italic*  ++underline++  ^(superscript)  _(subscript)  {1/2} fraction  "- " list item  "| a | b |" table row
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\+\+(.+?)\+\+/g, '<u>$1</u>')
  .replace(/\*(.+?)\*/g, '<i>$1</i>')
  .replace(/\^\((.+?)\)/g, '<sup>$1</sup>')
  .replace(/_\((.+?)\)/g, '<sub>$1</sub>')
  .replace(/\{([^{}/]+)\/([^{}/]+)\}/g, '<span class="frac"><span>$1</span><span>$2</span></span>');

export function renderRich(src = '') {
  const out = [];
  let list = [], table = [];
  const flush = () => {
    if (list.length) out.push('<ul>' + list.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>');
    if (table.length) out.push('<table>' + table.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</table>');
    list = []; table = [];
  };
  for (const line of String(src ?? '').split('\n')) {
    if (line.startsWith('- ')) { if (table.length) flush(); list.push(line.slice(2)); }
    else if (line.startsWith('|')) { if (list.length) flush(); table.push(line.replace(/^\||\|\s*$/g, '').split('|').map(c => c.trim())); }
    else { flush(); if (line.trim()) out.push(`<p>${inline(line)}</p>`); }
  }
  flush();
  return out.join('');
}

/** Text without markup symbols: used for emptiness checks, previews, search keywords and duplicate fingerprints. */
export const plainText = s => String(s ?? '').replace(/^- /gm, '').replace(/[*+^_(){}|]/g, ' ').replace(/\s+/g, ' ').trim();

/** Wraps the selected text of a textarea (or inserts at the cursor) and notifies listeners. */
export function wrapSelection(ta, before, after = '') {
  const { selectionStart: a, selectionEnd: b, value } = ta;
  ta.value = value.slice(0, a) + before + value.slice(a, b) + after + value.slice(b);
  ta.focus();
  ta.setSelectionRange(a + before.length, b + before.length);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
