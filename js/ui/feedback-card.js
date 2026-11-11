// 着たコーデと、ワンタップ評価（結果）。評価すると、次の提案に反映される。
import { el } from '../util/dom.js';
import { RATINGS } from '../config.js';
import { rateOutfit, fitOf } from '../data/learning.js';
import { fitRow } from './outfit-card.js';
import { toast } from './toast.js';

/** rec: 着た記録。title: 見出し。onRedo: 選び直す（無ければ出さない）。 */
export function feedbackCard(rec, title, onRedo) {
  const fit = fitOf(rec.items);
  return el('section', { class: 'card worn' },
    el('h2', { class: 'card-title' }, title, el('span', { class: 'tag', text: rec.mode === 'suggest' ? 'おまかせ' : '自分で選択' })),
    fitRow(fit),
    el('p', { class: 'hint', text: rec.rating ? '評価済み' : '着てみてどうでしたか？' }),
    el('div', { class: 'rates' }, RATINGS.map(([id, label]) => el('button', {
      type: 'button', class: 'rate' + (rec.rating === id ? ' on' : ''), 'aria-pressed': String(rec.rating === id), text: label,
      onclick: async () => { const why = await rateOutfit(rec.date, id); if (why) toast(why); }
    }))),
    onRedo ? el('button', { type: 'button', class: 'ghost', text: '選び直す', onclick: onRedo }) : null);
}
