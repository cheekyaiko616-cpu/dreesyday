// クローゼット画面：アイテムの一覧（種類で絞り込み）と追加。数の上限はない。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { CATEGORIES, STATUS } from '../config.js';
import { thumbEl, itemName } from './thumb.js';
import { openItemSheet } from './item-sheet.js';

const statusLabel = (s) => (STATUS.find((x) => x[0] === s) || ['', ''])[1];

export function renderCloset(root) {
  clear(root);
  const f = state.ui.closetFilter;
  const chip = (id, label, n) => el('button', { type: 'button', class: 'filter' + (f === id ? ' on' : ''), 'aria-pressed': String(f === id),
    onclick: () => { state.ui.closetFilter = id; notify(); } }, label, el('small', { text: String(n) }));
  const list = state.items.filter((x) => f === 'all' || x.category === f);
  root.append(
    el('div', { class: 'page-head' }, el('h1', { class: 'page-title', text: 'クローゼット' }),
      el('button', { type: 'button', class: 'btn solid', text: '＋ 追加', onclick: () => openItemSheet(null) })),
    el('div', { class: 'filters' }, chip('all', 'すべて', state.items.length),
      CATEGORIES.map((c) => chip(c.id, c.label, state.items.filter((x) => x.category === c.id).length))));
  if (!list.length) {
    root.append(el('p', { class: 'muted card', text: 'まだありません。「＋ 追加」から写真を撮って登録してください' }));
    return;
  }
  root.append(el('ul', { class: 'grid' }, list.map((it) => el('li', null, el('button', {
    type: 'button', class: 'grid-item' + (it.status !== 'active' ? ' off' : ''), onclick: () => openItemSheet(it)
  }, thumbEl(it, 'l'), el('span', { class: 'gi-name', text: itemName(it) }),
    el('span', { class: 'gi-meta', text: [`暖${it.warmth}`, it.rain_ok ? '雨OK' : '', it.status !== 'active' ? statusLabel(it.status) : ''].filter(Boolean).join('・') }))))));
}
