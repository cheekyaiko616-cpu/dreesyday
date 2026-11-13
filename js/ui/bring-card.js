// 持ち物チェック：毎日の持ち物＋天気・予定から出した物。タップでチェック（日付ごとに残る）。
import { el } from '../util/dom.js';
import { state } from '../state.js';
import { isChecked, toggleCheck } from '../data/checklist.js';

export function bringCard(date, list) {
  const done = list.filter((x) => isChecked(date, x)).length;
  const open = state.ui.bringOpen === date;
  const box = el('details', { class: 'card bring more', open: open || null },
    el('summary', { class: 'bring-sum' }, el('span', { text: '持ち物' }), el('span', { class: 'count', text: `${done}/${list.length}` })),
    el('ul', { class: 'checks' }, list.map((name) => {
      const on = isChecked(date, name);
      return el('li', null, el('button', {
        type: 'button', class: 'check-btn' + (on ? ' on' : ''), 'aria-pressed': String(on),
        onclick: () => toggleCheck(date, name)
      }, el('span', { class: 'box', 'aria-hidden': 'true', text: on ? '✓' : '' }), name));
    })));
  box.addEventListener('toggle', () => { state.ui.bringOpen = box.open ? date : ''; }); // チェックで描き直しても開いたままにする
  return box;
}
