import { GUIDE } from '../utilities/guide.js';
import { getLang } from '../utilities/i18n.js';
import { esc } from '../utilities/dom.js';

export function mount(el) {
  el.innerHTML = (GUIDE[getLang()] || GUIDE.en).map(([h, b]) => `<div class="card grid"><h3>${esc(h)}</h3><p>${esc(b)}</p></div>`).join('');
}
