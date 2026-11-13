// 日付をタップしたときの、その日の内容（予定・天気・着たコーデ）。カレンダーの下の余白に表示する。
// 左右のスワイプか ‹ › で前後の日へ。
import { el } from '../util/dom.js';
import { state, notify } from '../state.js';
import { eventsOn } from '../data/calendar-feed.js';
import { wearOn, fitOf } from '../data/learning.js';
import { weatherLabel } from '../services/weather.js';
import { addDaysIso, todayIso, mdLong } from '../util/date.js';
import { fitRow } from './outfit-card.js';
import { onHSwipe, slideIn } from './gestures.js';

/** day: 表示する日。戻り値: カレンダーの下に置く要素。 */
export function dayPanel(day) {
  const go = (delta) => {
    const d = addDaysIso(day, delta);
    state.ui.calSel = d; state.ui.calMonth = d.slice(0, 7);
    notify();
    const p = document.querySelector('.day-panel'); if (p) slideIn(p, delta);
  };
  const w = state.weather.home && state.weather.home.days[day];
  const evs = eventsOn(day), rec = wearOn(day);
  const panel = el('section', { class: 'card day-panel' },
    el('div', { class: 'day-nav' },
      el('button', { type: 'button', class: 'btn', 'aria-label': '前の日', text: '‹', onclick: () => go(-1) }),
      el('h2', { text: mdLong(day) }),
      el('button', { type: 'button', class: 'btn', 'aria-label': '次の日', text: '›', onclick: () => go(1) })),
    w ? el('p', { class: 'dy-wx', text: `${weatherLabel(w.code).icon} ${weatherLabel(w.code).label}　${w.max}℃ / ${w.min}℃　降水${w.pop}%` }) : null,
    evs.length ? el('ul', { class: 'ev-list' }, evs.map((ev) => el('li', { class: 'ev-row', style: `--c:${ev.color}` },
      el('span', { class: 'chip', text: ev.tab || '予定' }),
      el('div', null, el('p', { class: 'ev-title', text: ev.title }),
        ev.place ? el('p', { class: 'ev-meta', text: ev.place }) : null,
        ev.open || ev.start ? el('p', { class: 'ev-meta', text: [ev.open && `開場 ${ev.open}`, ev.start && `開演 ${ev.start}`].filter(Boolean).join('　') }) : null))))
      : el('p', { class: 'muted', text: 'この日の予定はありません。' }),
    rec ? el('h3', { class: 'card-title', text: '着たコーデ' }) : null,
    rec ? fitRow(fitOf(rec.items)) : null,
    el('button', { type: 'button', class: 'btn solid dy-go', text: day < todayIso() ? 'この日のブリーフを開く' : 'この日のコーデを見る',
      onclick: () => { state.ui.briefDate = day; state.screen = 'brief'; notify(); } }));
  onHSwipe(panel, go);
  return panel;
}
