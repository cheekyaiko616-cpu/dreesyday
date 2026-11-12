// 指の操作：左右のスワイプ（月や日の切り替え）と、切り替えのときの滑る動き。Aqua-lab と同じ。

// 動き始めの向きを決める：縦の動きが横の1.3倍より大きければ縦、そうでなければ横
const swipeAxis = (dx, dy) => (Math.abs(dy) > Math.abs(dx) * 1.3 ? 'v' : 'h');

/** 左右スワイプを受け取る。cb(1)=左へスワイプ（次）、cb(-1)=右へスワイプ（前）。 */
export function onHSwipe(el, cb) {
  let sx = 0, sy = 0, st = 0, active = false, axis = '';
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { active = false; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); active = true; axis = '';
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!active || axis) return;
    const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (Math.hypot(dx, dy) >= 12) axis = swipeAxis(dx, dy);
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!active) return;
    active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (axis === 'h' && Math.abs(dx) > 60 && Math.abs(dy) < Math.abs(dx) * 0.6 && Date.now() - st < 700) cb(dx < 0 ? 1 : -1);
  }, { passive: true });
  el.addEventListener('touchcancel', () => { active = false; }, { passive: true });
}

/** 切り替えたとき、横から滑って入る動き。delta>0 は右から、<0 は左から。 */
export function slideIn(el, delta) {
  el.classList.remove('day-from-right', 'day-from-left');
  void el.offsetWidth;
  el.classList.add(delta > 0 ? 'day-from-right' : 'day-from-left');
}
