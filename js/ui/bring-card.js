// 持ち物チェック：毎日の持ち物＋天気・予定から出した物。タップでチェック（日付ごとに残る）。
import { el } from '../util/dom.js';
import { isChecked, toggleCheck } from '../data/checklist.js';

export function bringCard(date, list) {
  const done = list.filter((x) => isChecked(date, x)).length;
  return el('section', { class: 'card bring' },
    el('h2', { class: 'card-title' }, '持ち物', el('span', { class: 'count', text: `${done}/${list.length}` })),
    el('ul', { class: 'checks' }, list.map((name) => {
      const on = isChecked(date, name);
      return el('li', null, el('button', {
        type: 'button', class: 'check-btn' + (on ? ' on' : ''), 'aria-pressed': String(on),
        onclick: () => toggleCheck(date, name)
      }, el('span', { class: 'box', 'aria-hidden': 'true', text: on ? '✓' : '' }), name));
    })));
}
