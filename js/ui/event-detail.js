// 予定を開いたときの詳細（Event list の詳細と同じ並び）：日程・場所・メモ と、乗り換え・ナビ・マップ。
// 出典・カレンダー・天気・リンク・編集は出さない（天気は天気カードで見る）。
import { el } from '../util/dom.js';
import { md } from '../util/date.js';
import { hasPlace, locate } from '../services/geo.js';
import { carnaviUrl, mapUrl } from '../services/trip-links.js';
import { openTransit } from './transit-sheet.js';

const where = (ev) => locate(ev.place).catch(() => null); // 同じ場所は保存されるので、通信は1回

const range = (ev) => (ev.to > ev.from ? `${md(ev.from)} 〜 ${md(ev.to)}` : md(ev.from));

/** 乗り換え・ナビ・マップのボタン。場所がない（オンラインなど）予定では null。 */
function tripButtons(ev) {
  if (!hasPlace(ev.place)) return null;
  const map = el('a', { class: 'btn', href: mapUrl(null, ev.place), target: '_blank', rel: 'noopener', text: 'マップ' });
  const navi = el('a', { class: 'btn', href: '#', 'aria-disabled': 'true', text: 'ナビ' });
  where(ev).then((pos) => {
    if (!pos) return;
    map.href = mapUrl(pos, ev.place);
    navi.href = carnaviUrl(pos, pos.name || ev.place);
    navi.removeAttribute('aria-disabled');
  });
  navi.addEventListener('click', (e) => { if (navi.getAttribute('aria-disabled')) e.preventDefault(); });
  return el('div', { class: 'actions trip-actions' },
    el('button', { class: 'btn', type: 'button', text: '乗り換え', onclick: () => openTransit(ev, () => where(ev)) }), navi, map);
}

export function eventDetail(ev) {
  const dl = el('dl', { class: 'kv' });
  const add = (k, v) => { if (v) dl.append(el('dt', { text: k }), el('dd', { text: v })); };
  add('日程', range(ev));
  add('開場', ev.open);
  add('開演', ev.start);
  add('場所', ev.place);
  add('メモ', ev.note);
  return el('div', { class: 'ev-detail' }, dl, tripButtons(ev));
}
