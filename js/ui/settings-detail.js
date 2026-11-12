// 設定の項目をタップしたときに開く、入力用の小さな画面（設定の画面の上に重ねて出る）。
import { $, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';

const MARKUP = `
  <div class="sheet" id="sd-sheet" role="dialog" aria-modal="true" aria-labelledby="sd-heading">
    <div class="sheet-head">
      <h2 id="sd-heading"></h2>
      <button type="button" class="ghost" id="sd-close">閉じる</button>
    </div>
    <div id="sd-body"></div>
  </div>`;

let wrap = null;

export function initSettingsDetail() {
  wrap = mountSheet(MARKUP);
  $('#sd-close').addEventListener('click', () => hideSheet(wrap));
}

/** title: 項目名。build: 中身を作る関数（close を受け取る。保存したあとに close() で閉じる）。 */
export function openDetail(title, build) {
  $('#sd-heading').textContent = title;
  const body = $('#sd-body');
  clear(body);
  body.append(...[].concat(build(() => hideSheet(wrap))).filter(Boolean));
  showSheet(wrap);
}
