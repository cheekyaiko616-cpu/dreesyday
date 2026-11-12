// クローゼット画面：アイテムの一覧（種類で絞り込み）と追加。数の上限はない。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { CATEGORIES, STATUS } from '../config.js';
import { thumbEl, itemName } from './thumb.js';
import { openItemSheet } from './item-sheet.js';
import { wearHistory } from '../engine/history.js';
import { todayIso, addDaysIso } from '../util/date.js';

const UNWORN_DAYS = 30; // これ以上着ていない服を「しばらく着ていない」とする
const SORTS = [['new', '新しい順'], ['recent', '最近着た順'], ['many', '着た回数順'], ['old', '着ていない順']];

const statusLabel = (s) => (STATUS.find((x) => x[0] === s) || ['', ''])[1];

const wornText = ({ count, ago }) => (count === 0 ? '未着用' : `着${count}回${ago === 0 ? '・今日' : ago === 1 ? '・昨日' : `・${ago}日前`}`);

export function renderCloset(root) {
  clear(root);
  const f = state.ui.closetFilter;
  const chip = (id, label, n) => el('button', { type: 'button', class: 'filter' + (f === id ? ' on' : ''), 'aria-pressed': String(f === id),
    onclick: () => { state.ui.closetFilter = id; notify(); } }, label, el('small', { text: String(n) }));
  // 着た回数と、最後に着てから何日か（今日の記録も数えるため、明日を基準にして1日引く）
  const h = wearHistory(state.wears, addDaysIso(todayIso(), 1));
  const info = (it) => ({ count: h.count[it.id] || 0, ago: h.ago[it.id] === undefined ? null : h.ago[it.id] - 1 });
  const q = state.ui.closetQuery.trim().toLowerCase();
  let list = state.items.filter((x) => (f === 'all' || x.category === f)
    && (!q || `${x.name} ${x.size}`.toLowerCase().includes(q))
    && (!state.ui.closetUnworn || (info(x).ago === null || info(x).ago >= UNWORN_DAYS)));
  const sort = state.ui.closetSort;
  const key = { recent: (x) => info(x).ago ?? 9999, many: (x) => -info(x).count, old: (x) => -(info(x).ago ?? 9999) }[sort];
  if (key) list = [...list].sort((a, b) => key(a) - key(b));
  const search = el('input', { type: 'search', class: 'search', value: state.ui.closetQuery, placeholder: '名前で探す', 'aria-label': '名前で探す' });
  search.addEventListener('change', () => { state.ui.closetQuery = search.value; notify(); });
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') search.blur(); });
  const sortSel = el('select', { 'aria-label': '並べ替え' }, SORTS.map(([v, l]) => el('option', { value: v, selected: v === sort || null, text: l })));
  sortSel.addEventListener('change', () => { state.ui.closetSort = sortSel.value; notify(); });
  const unworn = el('button', { type: 'button', class: 'filter' + (state.ui.closetUnworn ? ' on' : ''), 'aria-pressed': String(state.ui.closetUnworn), text: 'しばらく着ていない',
    onclick: () => { state.ui.closetUnworn = !state.ui.closetUnworn; notify(); } });
  root.append(
    el('div', { class: 'page-head' }, el('h1', { class: 'page-title', text: 'クローゼット' }),
      el('button', { type: 'button', class: 'btn solid', text: '＋ 追加', onclick: () => openItemSheet(null) })),
    el('div', { class: 'filters' }, chip('all', 'すべて', state.items.length),
      CATEGORIES.map((c) => chip(c.id, c.label, state.items.filter((x) => x.category === c.id).length))),
    el('div', { class: 'closet-tools' }, search, sortSel, unworn));
  if (!list.length) {
    root.append(el('p', { class: 'muted card', text: state.items.length ? '条件に合う服がありません' : 'まだありません' }));
    return;
  }
  root.append(el('ul', { class: 'grid' }, list.map((it) => el('li', null, el('button', {
    type: 'button', class: 'grid-item' + (it.status !== 'active' ? ' off' : ''), onclick: () => openItemSheet(it)
  }, thumbEl(it, 'l'), el('span', { class: 'gi-name', text: itemName(it) }),
    el('span', { class: 'gi-meta', text: [`暖${it.warmth}`, it.rain_ok ? '雨OK' : '', it.status !== 'active' ? statusLabel(it.status) : '', wornText(info(it))].filter(Boolean).join('・') }))))));
}
