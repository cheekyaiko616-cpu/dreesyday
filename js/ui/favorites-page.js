// お気に入り画面：組み合わせ・マネキン画像・評価（星）・メモ・タグ。タグで絞り込める。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { fitOf, chooseOutfit } from '../data/learning.js';
import { todayIso } from '../util/date.js';
import { fitRow, colorViz } from './outfit-card.js';
import { openFavSheet } from './fav-sheet.js';
import { toast } from './toast.js';
import { aiEvaluation } from '../data/evaluation.js';
import { saveFavorite } from '../data/favorites.js';

let tag = '';

const filling = new Set(); // 保存中のお気に入り（二重に保存しない）

export function renderFavorites(root) {
  clear(root);
  root.append(el('div', { class: 'page-head' }, el('h1', { class: 'page-title', text: 'お気に入り' })));
  const tags = [...new Set(state.favorites.flatMap((f) => f.tags))];
  if (tag && !tags.includes(tag)) tag = '';
  if (tags.length) {
    const chip = (t, label) => el('button', { type: 'button', class: 'filter' + (tag === t ? ' on' : ''), 'aria-pressed': String(tag === t), text: label, onclick: () => { tag = t; notify(); } });
    root.append(el('div', { class: 'filters' }, chip('', 'すべて'), tags.map((t) => chip(t, `#${t}`))));
  }
  const list = state.favorites.filter((f) => !tag || f.tags.includes(tag));
  if (!list.length) {
    root.append(el('p', { class: 'muted card', text: '提案やコーデ作成の「☆ 保存」で、ここに残ります' }));
    return;
  }
  list.forEach((src) => {
    const fit = fitOf(src.items);
    let f = src;
    if (!f.ai && (fit.tops || fit.bottoms)) { // 前に保存したもの：AI評価を1回つける（画面の再描画はしない）
      const ev = aiEvaluation(fit, undefined, true);
      f = { ...src, ai: ev.text };
      if (ev.weather && !filling.has(src.id)) { // 天気が読めるときだけ保存する（天気なしの評価を固定しない）
        filling.add(src.id);
        saveFavorite(f, { quiet: true }).catch(() => {}).finally(() => filling.delete(src.id));
      }
    }
    root.append(el('article', { class: 'card fav' },
      el('div', { class: 'fav-main' },
        f.image ? el('img', { class: 'fav-img', src: f.image, alt: 'マネキンに重ねたコーデ' }) : null,
        el('div', { class: 'fav-info' },
          el('p', { class: 'stars', 'aria-label': `評価 ${f.stars}`, text: '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars) }),
          f.ai ? el('p', { class: 'fav-ai', text: f.ai }) : null,
          f.memo ? el('p', { class: 'fav-memo', text: `メモ: ${f.memo}` }) : null,
          f.tags.length ? el('p', { class: 'fav-tags', text: f.tags.map((t) => `#${t}`).join(' ') }) : null)),
      fitRow(fit), colorViz(fit),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn solid', text: '今日はこれを着る', onclick: async () => { await chooseOutfit(todayIso(), fit, 'self'); toast('今日のコーデにしました'); } }),
        el('button', { type: 'button', class: 'btn', text: '評価メモ', onclick: () => openFavSheet(f) }))));
  });
}
