// 朝ブリーフの予定カード：Event list で「カレンダーに追加」した予定（calendar.json）だけを出す。
import { el } from '../util/dom.js';
import { eventDetail } from './event-detail.js';
import { state } from '../state.js';

/** 予定の一覧。1件を押すとその場で開き、日程・場所・メモと、乗り換え・ナビ・マップが出る。 */
export function eventList(events) {
  return el('ul', { class: 'ev-list' }, events.map((ev) => {
    const box = el('details', { class: 'ev-item', style: `--c:${ev.color}` },
      el('summary', { class: 'ev-sum' },
        el('span', { class: 'chip', text: ev.tab || '予定' }),
        el('div', { class: 'ev-main' },
          el('p', { class: 'ev-title', text: ev.title }),
          el('p', { class: 'ev-meta', text: [ev.place, ev.open ? `開場 ${ev.open}` : '', ev.start ? `開演 ${ev.start}` : ''].filter(Boolean).join('　') || '時間・場所の登録なし' }))));
    if (state.ui.evOpen === ev.id) { box.open = true; box.append(eventDetail(ev)); }
    // 開いたときに詳細を作る（閉じている間は作らない）。開いた予定は、画面を描き直しても開いたままにする
    box.addEventListener('toggle', () => {
      const d = box.querySelector('.ev-detail');
      if (box.open) { state.ui.evOpen = ev.id; if (!d) box.append(eventDetail(ev)); } else if (state.ui.evOpen === ev.id) state.ui.evOpen = '';
    });
    return el('li', null, box);
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
