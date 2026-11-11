// 朝ブリーフの予定カード：Event list で「カレンダーに追加」した予定（calendar.json）だけを出す。
import { el } from '../util/dom.js';
import { state } from '../state.js';
import { md } from '../util/date.js';
import { EVENT_FORMALITY } from '../config.js';
import { formalityOf } from '../data/calendar-feed.js';

const fLabel = (k) => (EVENT_FORMALITY.find((x) => x[0] === k) || ['', ''])[1];

export function eventsCard(date, events) {
  const c = state.calendar;
  const box = el('section', { class: 'card ev' }, el('h2', { class: 'card-title', text: '予定' }));
  if (c.status === 'loading') { box.append(el('p', { class: 'muted', text: '読み込み中…' })); return box; }
  if (c.status === 'stale') box.append(el('p', { class: 'note', text: '前回の予定を表示中' }));
  if (c.status === 'error') box.append(el('p', { class: 'note', text: '予定を読めません' }));
  if (!events.length) { box.append(el('p', { class: 'muted', text: '予定なし' })); return box; }
  box.append(el('ul', { class: 'ev-list' }, events.map((ev) => el('li', { class: 'ev-row', style: `--c:${ev.color}` },
    el('span', { class: 'chip', text: ev.tab || '予定' }),
    el('div', null,
      el('p', { class: 'ev-title', text: ev.title }),
      el('p', { class: 'ev-meta', text: [
        ev.from === ev.to ? '' : `${md(ev.from)}〜${md(ev.to)}`,
        ev.place, ev.open ? `開場 ${ev.open}` : '', ev.start ? `開演 ${ev.start}` : ''
      ].filter(Boolean).join('　') }),
      el('p', { class: 'ev-dress', text: `服装：${fLabel(formalityOf(ev))}` }))))));
  return box;
}
