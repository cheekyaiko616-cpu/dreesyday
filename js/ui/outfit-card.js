// コーデ1案のカード：アイテムの絵・理由・点数・色相環・色のバランス・ボタン。
// 朝ブリーフ（おまかせ提案）とお気に入りで共通。
import { el } from '../util/dom.js';
import { thumbEl, itemName } from './thumb.js';
import { hueWheelEl } from './hue-wheel.js';
import { flatlayEl } from './flatlay.js';
import { colorBalanceEl } from './color-balance.js';
import { outfitHexes } from '../engine/score.js';

const LABEL = { warmth: '暖かさ', rain: '雨', formality: '服装の格', color_items: '色(アイテム)', color_total: '色(全体)' };

/** 点数の小さな棒グラフ。 */
export function scoreBars(score) {
  return el('dl', { class: 'bars' }, Object.keys(LABEL).map((k) => [
    el('dt', { text: LABEL[k] }),
    el('dd', null, el('span', { class: 'bar' }, el('i', { style: `width:${Math.round(score[k] * 100)}%` })), el('b', { text: Math.round(score[k] * 100) }))
  ]));
}

/** 写真の並び（アウター・トップス・ボトムス・シューズ・小物）。 */
export function fitRow(fit) {
  const list = [fit.outer, fit.tops, fit.bottoms, fit.shoes, ...(fit.accessories || [])].filter(Boolean);
  return el('ul', { class: 'fit-row' }, list.map((it) => el('li', null, thumbEl(it, 'm'), el('small', { text: itemName(it) }))));
}

/** アイテム名を1行で。 */
function fitNames(fit) {
  const list = [fit.outer, fit.tops, fit.bottoms, fit.shoes, ...(fit.accessories || [])].filter(Boolean);
  return el('p', { class: 'fit-names', text: list.map(itemName).join('・') });
}

/** 色相環と色のバランス。 */
export function colorViz(fit) {
  return el('div', { class: 'viz' }, hueWheelEl(outfitHexes(fit).map((hex) => ({ hex })), 104), colorBalanceEl(fit));
}

/**
 * o: { rank, items, reason, score }。actions: 下に並べるボタン（要素の配列）。open: 点数を最初から開くか。
 * review: (点数を書き換える関数) → レビューの要素（Gemini のレビューを付けるとき）。
 */
export function outfitCard(o, actions, open = false, review = null) {
  const summary = el('summary', { text: `点数 ${Math.round(o.score.total * 100)}　色と内訳を見る` });
  const more = el('details', { class: 'more', open: open || null },
    summary,
    scoreBars(o.score), colorViz(o.items));
  return el('article', { class: 'card outfit' },
    el('header', { class: 'outfit-head' },
      o.rank ? el('span', { class: 'rank', text: `案${o.rank}` }) : null,
      el('p', { class: 'reason', text: o.reason })),
    flatlayEl(o.items), fitNames(o.items),
    review ? review((n) => { summary.textContent = `点数 ${n}　色と内訳を見る`; }) : null, more,
    actions && actions.length ? el('div', { class: 'actions' }, actions) : null);
}
