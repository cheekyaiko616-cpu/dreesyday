// マネキン合成の画面（下から出る）。合成した画像を見せ、PNG で保存できる。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { drawMannequin } from './mannequin.js';

const MARKUP = `
  <div class="sheet" id="mq-sheet" role="dialog" aria-modal="true" aria-labelledby="mq-heading">
    <div class="sheet-head">
      <h2 id="mq-heading">マネキンで見る</h2>
      <button type="button" class="ghost" id="mq-close">閉じる</button>
    </div>
    <div id="mq-body"></div>
  </div>`;

let wrap = null;

export function initMannequinSheet() {
  wrap = mountSheet(MARKUP);
  $('#mq-close').addEventListener('click', () => hideSheet(wrap));
}

export async function openMannequin(fit) {
  const body = $('#mq-body');
  clear(body);
  body.append(el('p', { class: 'muted', text: '合成しています…' }));
  showSheet(wrap);
  const c = await drawMannequin(fit);
  const url = c.toDataURL('image/png');
  clear(body);
  body.append(
    el('img', { class: 'mq-img', src: url, alt: 'マネキンに重ねたコーデ' }),
    el('div', { class: 'form-actions' },
      el('a', { class: 'btn solid grow', href: url, download: `outfit-${Date.now()}.png`, text: '画像を保存' })));
}
