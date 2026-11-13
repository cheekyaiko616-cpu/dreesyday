// 朝ブリーフの予定カード：Event list で「カレンダーに追加」した予定（calendar.json）だけを出す。
import { el } from '../util/dom.js';
import { state } from '../state.js';

const opened = new Set(); // 開いている予定（描き直しても開いたままにする）

const line = (k, v) => (v ? el('div', { class: 'es-row' }, el('small', { text: k }), el('div', null, v)) : null);

/** 予定の一覧。1件ずつ押すと、その場で開いて、日付・時間・場所を見られる。 */
export function eventList(events) {
  return el('ul', { class: 'ev-list' }, events.map((ev) => {
    const d = el('details', { class: 'ev-item', style: `--c:${ev.color}`, open: opened.has(ev.id) || null },
      el('summary', { class: 'ev-row' }, el('span', { class: 'chip', text: ev.tab || '予定' }), el('p', { class: 'ev-title', text: ev.title })),
      el('div', { class: 'ev-detail' }, ...[
        line('開場', ev.open), line('開演', ev.start),
        ev.open || ev.start ? null : line('時間', '登録なし'),
        line('場所', ev.place ? el('div', null, el('p', { text: ev.place }),
          el('a', { class: 'btn', href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.place)}`, target: '_blank', rel: 'noopener noreferrer', text: '地図で開く' })) : null)
      ].filter(Boolean)));
    d.addEventListener('toggle', () => { if (d.open) opened.add(ev.id); else opened.delete(ev.id); });
    return el('li', null, d);
  }));
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
