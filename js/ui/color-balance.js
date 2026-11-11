// 全体の色のバランス（横長の帯）。見える面積の目安で、色の割合を並べる。
import { el } from '../util/dom.js';
import { colorWord } from '../engine/color.js';
import { RULES } from '../data/rules.js';

const AREA = { outer: 0.32, tops: 0.3, bottoms: 0.28, shoes: 0.07, accessory: 0.03 };

/** 凡例：同じ呼び名の色はまとめる（多い順に4つまで）。[[呼び名, 代表の色, 割合]] */
function legend(list) {
  const by = new Map();
  list.forEach(([hex, a]) => {
    const w = colorWord(hex, RULES.color);
    const cur = by.get(w);
    if (cur) cur[2] += a; else by.set(w, [w, hex, a]);
  });
  return [...by.values()].sort((x, y) => y[2] - x[2]).slice(0, 4);
}

/** fit: { tops, bottoms, outer, shoes, accessories }。 */
export function colorBalanceEl(fit) {
  const parts = [];
  const add = (it, area) => {
    if (!it) return;
    if (it.color_sub) { parts.push([it.color_main, area * 0.7]); parts.push([it.color_sub, area * 0.3]); } else parts.push([it.color_main, area]);
  };
  // アウターを着ると、トップスは一部しか見えない
  add(fit.outer, AREA.outer);
  add(fit.tops, fit.outer ? AREA.tops * 0.4 : AREA.tops + AREA.outer);
  add(fit.bottoms, AREA.bottoms);
  add(fit.shoes, AREA.shoes);
  (fit.accessories || []).forEach((a) => add(a, AREA.accessory));
  const merged = new Map();
  parts.forEach(([hex, a]) => merged.set(hex, (merged.get(hex) || 0) + a));
  const total = [...merged.values()].reduce((a, b) => a + b, 0) || 1;
  const list = [...merged.entries()].sort((a, b) => b[1] - a[1]);
  return el('div', { class: 'balance' },
    el('div', { class: 'balance-bar', role: 'img', 'aria-label': '色のバランス' },
      list.map(([hex, a]) => el('span', { style: `background:${hex};flex:${a / total}` }))),
    el('div', { class: 'balance-legend' },
      legend(list).map(([word, hex, a]) => el('span', null, el('i', { style: `background:${hex}` }), `${word} ${Math.round((a / total) * 100)}%`))));
}
