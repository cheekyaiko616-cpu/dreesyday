// カレンダー画面（Aqua-lab と同じ仕様）：年月の選択（回して選ぶ）・今日へ戻る・‹ › と左右スワイプで月を移動・
// 前後の月の日を薄く表示（押すとその月へ）・今日は塗りつぶし・予定の色の点（3つまで、4件以上は＋）・着たコーデの輪。
// 日付をタップすると、その日の画面（予定・天気・着たコーデ）が開く。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { WEEKDAYS } from '../config.js';
import { eventsOn } from '../data/calendar-feed.js';
import { wearOn } from '../data/learning.js';
import { toIso, todayIso } from '../util/date.js';
import { onHSwipe, slideIn } from './gestures.js';
import { openDay } from './day-sheet.js';
import { openMonthWheel } from './month-wheel.js';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m は 0〜11

function cell(y, m, d, today, other) {
  const key = ymd(y, m, d), wd = new Date(y, m, d).getDay(), evs = eventsOn(key), worn = !!wearOn(key);
  const cls = ['cal-cell', other && 'other', key === today && 'today', wd === 0 && 'sun', wd === 6 && 'sat'].filter(Boolean).join(' ');
  const label = `${other ? '前後の月の日：' : ''}${m + 1}月${d}日（${WEEKDAYS[wd]}）${key === today ? '、今日' : ''}${evs.length ? `、予定${evs.length}件` : ''}${worn ? '、着たコーデの記録あり' : ''}${other ? '、押すとその月に切り替わります' : ''}`;
  return el('button', { type: 'button', class: cls, 'data-date': key, 'data-other': other ? '1' : null, 'aria-label': label },
    el('span', { class: 'num', text: String(d) }),
    el('span', { class: 'dots', 'aria-hidden': 'true' },
      worn ? el('i', { class: 'dot plan' }) : null,
      evs.slice(0, 3).map((ev) => el('i', { class: 'dot', style: `background:${ev.color}` })),
      evs.length > 3 ? el('span', { class: 'plus', text: '+' }) : null));
}

export function renderCalendar(root) {
  clear(root);
  const today = todayIso();
  if (!state.ui.calMonth) state.ui.calMonth = today.slice(0, 7);
  const [vy, vm1] = state.ui.calMonth.split('-').map(Number), vm = vm1 - 1;
  const setMonth = (y, m) => { state.ui.calMonth = `${y}-${pad(m + 1)}`; notify(); };
  const move = (delta) => { const d = new Date(vy, vm + delta, 1); setMonth(d.getFullYear(), d.getMonth()); const g = document.querySelector('#cal-grid'); if (g) slideIn(g, delta); };

  const first = new Date(vy, vm, 1).getDay(), days = new Date(vy, vm + 1, 0).getDate();
  const cells = [];
  const prev = new Date(vy, vm, 0); // 前の月の最後の日
  for (let i = first - 1; i >= 0; i--) cells.push(cell(prev.getFullYear(), prev.getMonth(), prev.getDate() - i, today, true));
  for (let d = 1; d <= days; d++) cells.push(cell(vy, vm, d, today, false));
  const rest = (7 - ((first + days) % 7)) % 7, next = new Date(vy, vm + 1, 1);
  for (let d = 1; d <= rest; d++) cells.push(cell(next.getFullYear(), next.getMonth(), d, today, true));

  const grid = el('div', { class: 'cal-grid', id: 'cal-grid' }, cells);
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('[data-date]');
    if (!c) return;
    if (c.dataset.other) { // 前後の月の日：その月に切り替える
      const [y, m] = c.dataset.date.split('-').map(Number);
      const delta = (y - vy) * 12 + (m - 1 - vm);
      setMonth(y, m - 1);
      const g = document.querySelector('#cal-grid'); if (g) slideIn(g, delta);
      return;
    }
    state.ui.calSel = c.dataset.date;
    openDay(c.dataset.date);
  });

  const head = el('div', { class: 'cal-top' },
    el('button', { type: 'button', class: 'pill', 'aria-label': '年と月を選ぶ', onclick: () => openMonthWheel(vy, vm, setMonth) },
      el('span', { text: `${vy}年` }), el('span', { class: 'sp', text: `${vm + 1}月` }), el('span', { class: 'caret', 'aria-hidden': 'true', text: '▾' })),
    el('button', { type: 'button', class: 'today-btn', text: '今日', onclick: () => { const n = new Date(); setMonth(n.getFullYear(), n.getMonth()); } }));

  const wrap = el('div', { class: 'cal-wrap' },
    el('div', { class: 'cal-head' },
      el('button', { type: 'button', class: 'btn', 'aria-label': '前の月', text: '‹', onclick: () => move(-1) }),
      head,
      el('button', { type: 'button', class: 'btn', 'aria-label': '次の月', text: '›', onclick: () => move(1) })),
    el('div', { class: 'weekdays' }, WEEKDAYS.map((w, i) => el('div', { class: i === 0 ? 'sun' : i === 6 ? 'sat' : '', text: w }))),
    grid,
    el('div', { class: 'cal-legend' }, el('span', null, el('i', { class: 'dot', style: 'background:var(--muted)' }), '予定（色は予定ごと）'), el('span', null, el('i', { class: 'dot plan' }), '着たコーデの記録')));
  onHSwipe(wrap, move);
  root.append(wrap);
}
