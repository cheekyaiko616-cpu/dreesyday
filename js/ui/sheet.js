// 「下から出る画面」の共通の動き（開く・閉じる・外をタップで閉じる・下へスワイプで閉じる）。Event list の sheet.js と同じ。
// 新しい画面を足すときは、mountSheet で枠を作り、中身を自分のファイルで用意する。
import { $ } from '../util/dom.js';

const open = []; // いま開いている画面（後に開いたものが末尾）

/** 画面の枠を作る。html は固定の文字だけを渡すこと（入力された内容は入れない）。 */
export function mountSheet(html) {
  const wrap = document.createElement('div');
  wrap.className = 'scrim';
  wrap.hidden = true;
  wrap.innerHTML = html;
  $('#app-sheets').append(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) hideSheet(wrap); });
  // 画面の背景や、中身が短くて動かす必要のない画面は、指で動かせないようにする
  wrap.addEventListener('touchmove', (e) => {
    const sheet = e.target instanceof Element ? e.target.closest('.sheet') : null;
    if (!sheet || sheet.scrollHeight <= sheet.clientHeight + 1) e.preventDefault();
  }, { passive: false });
  enableSwipeClose(wrap);
  return wrap;
}

/** 上から下へスワイプして閉じる。中身が一番上まで戻っているときだけ、画面を指についてこさせる。 */
function enableSwipeClose(wrap) {
  const sheet = wrap.querySelector('.sheet');
  if (!sheet) return;
  let y0 = 0;
  let dy = 0;
  let on = false;
  let t0 = 0;
  const reset = () => { sheet.style.transition = 'transform .18s ease-out'; sheet.style.transform = ''; };
  sheet.addEventListener('touchstart', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    on = e.touches.length === 1 && sheet.scrollTop <= 0 && !(t && t.closest('input, textarea, select'));
    dy = 0;
    if (on) { y0 = e.touches[0].clientY; t0 = Date.now(); sheet.style.transition = 'none'; }
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (!on) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || sheet.scrollTop > 0) { dy = 0; sheet.style.transform = ''; return; }
    if (e.cancelable) e.preventDefault();
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: false });
  const end = () => {
    if (!on) return;
    on = false;
    const fast = dy > 40 && Date.now() - t0 < 250;
    if (dy > 90 || fast) hideSheet(wrap);
    else reset();
  };
  sheet.addEventListener('touchend', end, { passive: true });
  sheet.addEventListener('touchcancel', () => { on = false; reset(); }, { passive: true });
}

export function showSheet(wrap) {
  clearTimeout(wrap._t);
  wrap.classList.remove('closing');
  const sh = wrap.querySelector('.sheet');
  if (sh) { sh.style.transition = ''; sh.style.transform = ''; }
  wrap.hidden = false;
  if (!open.includes(wrap)) open.push(wrap);
  document.documentElement.classList.add('lock');
}

export function hideSheet(wrap) {
  if (wrap.hidden || wrap.classList.contains('closing')) return;
  // 閉じる動き（下へ滑って消える）のあとで、実際に隠す
  wrap.classList.add('closing');
  clearTimeout(wrap._t);
  const sheet = wrap.querySelector('.sheet');
  if (sheet) { sheet.style.transition = 'transform .18s ease-in'; sheet.style.transform = 'translateY(100%)'; }
  wrap._t = setTimeout(() => {
    wrap.hidden = true; wrap.classList.remove('closing');
    if (sheet) { sheet.style.transition = ''; sheet.style.transform = ''; }
  }, 200);
  const i = open.indexOf(wrap);
  if (i >= 0) open.splice(i, 1);
  if (!open.length) document.documentElement.classList.remove('lock');
  wrap.dispatchEvent(new CustomEvent('sheetclose'));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && open.length) hideSheet(open[open.length - 1]);
});
