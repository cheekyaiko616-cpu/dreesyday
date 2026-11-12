// カレンダー画面：月ごとの表示。日付に天気（予報のある日）・予定・着たコーデの印を出し、
// タップした日の予定・天気・着たコーデを下に見せる。「この日のコーデ」で朝ブリーフをその日で開く。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { WEEKDAYS } from '../config.js';
import { eventsOn } from '../data/calendar-feed.js';
import { wearOn, fitOf } from '../data/learning.js';
import { weatherLabel } from '../services/weather.js';
import { toIso, todayIso, mdLong } from '../util/date.js';
import { fitRow } from './outfit-card.js';

const monthOf = (iso) => iso.slice(0, 7);
const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return toIso(d).slice(0, 7); };

function cell(date, today) {
  const evs = eventsOn(date);
  const d = state.weather.home && state.weather.home.days[date];
  const sel = state.ui.calSel === date;
  return el('button', { type: 'button', class: 'cal-cell' + (date === today ? ' today' : '') + (sel ? ' sel' : ''), 'aria-pressed': String(sel),
    'aria-label': `${mdLong(date)}${evs.length ? `、予定${evs.length}件` : ''}`, onclick: () => { state.ui.calSel = date; notify(); } },
    el('b', { text: String(+date.slice(8)) }),
    el('span', { class: 'cal-wx', 'aria-hidden': 'true', text: d ? weatherLabel(d.code).icon : '' }),
    el('span', { class: 'cal-dots', 'aria-hidden': 'true' }, evs.slice(0, 3).map((ev) => el('i', { style: `background:${ev.color}` })), wearOn(date) ? el('i', { class: 'worn' }) : null));
}

function agenda(date) {
  const box = el('section', { class: 'card cal-day' }, el('h2', { class: 'card-title', text: mdLong(date) }));
  const d = state.weather.home && state.weather.home.days[date];
  if (d) { const w = weatherLabel(d.code); box.append(el('p', { text: `${w.icon} ${w.label}　${d.max}℃ / ${d.min}℃　降水${d.pop}%` })); }
  const evs = eventsOn(date);
  if (evs.length) box.append(el('ul', { class: 'ev-list' }, evs.map((ev) => el('li', { class: 'ev-row', style: `--c:${ev.color}` },
    el('span', { class: 'chip', text: ev.tab || '予定' }), el('div', null, el('p', { class: 'ev-title', text: ev.title }), ev.place ? el('p', { class: 'ev-meta', text: ev.place }) : null)))));
  else box.append(el('p', { class: 'muted', text: '予定なし' }));
  const rec = wearOn(date);
  if (rec) box.append(el('p', { class: 'hint', text: '着たコーデ' }), fitRow(fitOf(rec.items)));
  box.append(el('button', { type: 'button', class: 'btn solid', text: date < todayIso() ? 'この日を開く' : 'この日のコーデを見る',
    onclick: () => { state.ui.briefDate = date; state.screen = 'brief'; notify(); } }));
  return box;
}

export function renderCalendar(root) {
  clear(root);
  const today = todayIso();
  const ym = state.ui.calMonth || monthOf(today);
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const go = (n) => () => { state.ui.calMonth = shiftMonth(ym, n); notify(); };
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(el('span', { class: 'cal-blank' }));
  for (let d = 1; d <= days; d++) cells.push(cell(`${ym}-${String(d).padStart(2, '0')}`, today));
  if (!state.ui.calSel) state.ui.calSel = today;
  root.append(
    el('div', { class: 'cal-head' },
      el('button', { type: 'button', class: 'btn', text: '‹', 'aria-label': '前の月', onclick: go(-1) }),
      el('h1', { class: 'page-title', text: `${y}年${m}月` }),
      el('button', { type: 'button', class: 'btn', text: '›', 'aria-label': '次の月', onclick: go(1) }),
      ym !== monthOf(today) ? el('button', { type: 'button', class: 'btn', text: '今日', onclick: () => { state.ui.calMonth = monthOf(today); state.ui.calSel = today; notify(); } }) : null),
    el('div', { class: 'cal-grid' }, WEEKDAYS.map((w, i) => el('span', { class: 'cal-wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : ''), text: w })), cells),
    el('p', { class: 'cal-legend' }, el('i', { class: 'worn' }), ' 着たコーデの記録　予定の色の点＝予定'),
    agenda(state.ui.calSel));
}
