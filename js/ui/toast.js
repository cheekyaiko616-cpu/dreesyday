// 画面下に一瞬だけ出る短いお知らせ。
import { $ } from '../util/dom.js';

let timer = null;

export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { t.hidden = true; }, 2800);
}
