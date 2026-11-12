// 年と月を回して選ぶ小さな画面（Aqua-lab と同じ）。openMonthWheel(年, 月(0〜11), 決定したとき(年, 月)) 。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';

const ROW = 40; // 1行の高さ（css の .wi と同じ）
const MARKUP = `
  <div class="sheet wheel-sheet" role="dialog" aria-modal="true" aria-label="年と月を選ぶ">
    <div class="wheel-head">
      <button type="button" class="ghost" id="wh-cancel">キャンセル</button>
      <button type="button" class="btn solid" id="wh-ok">決定</button>
    </div>
    <div class="wheel-box"><div class="wheel-band"></div><div class="wheel" id="wh-y"></div><div class="wheel" id="wh-m"></div></div>
  </div>`;

let wrap = null, onOk = null;

const fill = (id, from, to, suffix) => {
  const box = $(id); clear(box); box.dataset.from = from;
  for (let v = from; v <= to; v++) box.append(el('div', { class: 'wi', text: `${v}${suffix}` }));
};
const value = (id) => {
  const box = $(id);
  return Number(box.dataset.from) + Math.max(0, Math.min(box.children.length - 1, Math.round(box.scrollTop / ROW)));
};
const mark = (id) => {
  const box = $(id), idx = value(id) - Number(box.dataset.from);
  const prev = box.querySelector('.wi.on'); if (prev) prev.classList.remove('on');
  if (box.children[idx]) box.children[idx].classList.add('on');
};
const scrollTo = (id, v) => { const box = $(id); box.scrollTop = (v - Number(box.dataset.from)) * ROW; mark(id); };

export function initMonthWheel() {
  wrap = mountSheet(MARKUP);
  wrap.classList.add('wheel-scrim');
  $('#wh-cancel').addEventListener('click', () => hideSheet(wrap));
  $('#wh-ok').addEventListener('click', () => { const y = value('#wh-y'), m = value('#wh-m') - 1; hideSheet(wrap); if (onOk) onOk(y, m); });
  ['#wh-y', '#wh-m'].forEach((id) => { let raf = 0; $(id).addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark(id); }); }, { passive: true }); });
}

export function openMonthWheel(year, month, ok) {
  onOk = ok;
  fill('#wh-y', 2000, 2099, '年'); fill('#wh-m', 1, 12, '月');
  showSheet(wrap);
  scrollTo('#wh-y', year); scrollTo('#wh-m', month + 1);
}
