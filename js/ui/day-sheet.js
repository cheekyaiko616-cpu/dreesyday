// 日付をタップしたときの、その日の画面（予定・天気・着たコーデ）。左右のスワイプか ‹ › で前後の日へ（Aqua-lab と同じ）。
import { $, el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { eventsOn } from '../data/calendar-feed.js';
import { wearOn, fitOf } from '../data/learning.js';
import { weatherLabel } from '../services/weather.js';
import { addDaysIso, todayIso, mdLong } from '../util/date.js';
import { fitRow } from './outfit-card.js';
import { onHSwipe, slideIn } from './gestures.js';

const MARKUP = `
  <div class="sheet" id="dy-sheet" role="dialog" aria-modal="true" aria-labelledby="dy-title">
    <div class="sheet-head">
      <div class="day-nav">
        <button type="button" class="btn" id="dy-prev" aria-label="前の日">‹</button>
        <h2 id="dy-title"></h2>
        <button type="button" class="btn" id="dy-next" aria-label="次の日">›</button>
      </div>
      <button type="button" class="ghost" id="dy-close">閉じる</button>
    </div>
    <div id="dy-body"></div>
  </div>`;

let wrap = null, day = '';

function render() {
  $('#dy-title').textContent = mdLong(day);
  const body = $('#dy-body'); clear(body);
  const d = state.weather.home && state.weather.home.days[day];
  if (d) { const w = weatherLabel(d.code); body.append(el('p', { class: 'dy-wx', text: `${w.icon} ${w.label}　${d.max}℃ / ${d.min}℃　降水${d.pop}%` })); }
  const evs = eventsOn(day);
  body.append(evs.length ? el('ul', { class: 'ev-list' }, evs.map((ev) => el('li', { class: 'ev-row', style: `--c:${ev.color}` },
    el('span', { class: 'chip', text: ev.tab || '予定' }),
    el('div', null, el('p', { class: 'ev-title', text: ev.title }),
      ev.place ? el('p', { class: 'ev-meta', text: ev.place }) : null,
      ev.open || ev.start ? el('p', { class: 'ev-meta', text: [ev.open && `開場 ${ev.open}`, ev.start && `開演 ${ev.start}`].filter(Boolean).join('　') }) : null)))) : el('p', { class: 'muted', text: 'この日の予定はありません。' }));
  const rec = wearOn(day);
  if (rec) body.append(el('h3', { class: 'card-title', text: '着たコーデ' }), fitRow(fitOf(rec.items)));
  body.append(el('button', { type: 'button', class: 'btn solid dy-go', text: day < todayIso() ? 'この日のブリーフを開く' : 'この日のコーデを見る',
    onclick: () => { state.ui.briefDate = day; state.screen = 'brief'; hideSheet(wrap); notify(); } }));
}

function shift(delta) {
  day = addDaysIso(day, delta);
  state.ui.calSel = day; state.ui.calMonth = day.slice(0, 7);
  render();
  const box = $('#dy-sheet'); box.scrollTop = 0; slideIn(box, delta);
  notify(); // 後ろのカレンダーの月も合わせる
}

export function initDaySheet() {
  wrap = mountSheet(MARKUP);
  $('#dy-close').addEventListener('click', () => hideSheet(wrap));
  $('#dy-prev').addEventListener('click', () => shift(-1));
  $('#dy-next').addEventListener('click', () => shift(1));
  onHSwipe(wrap, shift);
}

export function openDay(date) { day = date; render(); showSheet(wrap); }
