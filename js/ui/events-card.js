// 朝ブリーフの予定カード：Event list で「カレンダーに追加」した予定（calendar.json）だけを出す。
import { el } from '../util/dom.js';
import { EVENT_LIST_URL } from '../config.js';
import { state } from '../state.js';

/** 予定の一覧。1件を押すと、Event list のその予定に移る。 */
export function eventList(events) {
  return el('ul', { class: 'ev-list' }, events.map((ev) => el('li', null,
    el('a', {
      class: 'ev-link', style: `--c:${ev.color}`, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${ev.title}を Event list で開く`,
      href: `${EVENT_LIST_URL}?event=${encodeURIComponent(ev.id.replace(/-\d{4}-\d{2}-\d{2}$/, ''))}`
    },
    el('span', { class: 'chip', text: ev.tab || '予定' }),
    el('div', { class: 'ev-main' },
      el('p', { class: 'ev-title', text: ev.title }),
      el('p', { class: 'ev-meta', text: [ev.place, ev.open ? `開場 ${ev.open}` : '', ev.start ? `開演 ${ev.start}` : ''].filter(Boolean).join('　') || '時間・場所の登録なし' }))))));
}

export function eventsCard(date, events) {
  const c = state.calendar;
  const box = el('section', { class: 'card ev' });
  if (c.status === 'loading') { box.append(el('p', { class: 'muted', text: '読み込み中…' })); return box; }
  if (c.status === 'stale') box.append(el('p', { class: 'note', text: '前回の予定を表示中' }));
  if (c.status === 'error') box.append(el('p', { class: 'note', text: '予定を読めません' }));
  if (!events.length) { box.append(el('p', { class: 'muted', text: '予定なし' })); return box; }
  box.append(eventList(events));
  return box;
}
