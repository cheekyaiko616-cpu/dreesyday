// Gemini のレビュー表示（コーデ作成・朝ブリーフで共通）。同じ組み合わせ・天気なら使い回し、
// 選び直している間は呼ばず、複数あっても1件ずつ順に頼む（無料枠の回数・同時利用の上限を使いすぎないため）。
import { el, clear } from '../util/dom.js';
import { reviewOutfit, hasReviewKey } from '../data/review.js';

const reviews = new Map();
const inflight = new Map();
let chain = Promise.resolve();

/** onScore(n): アプリの点とGeminiの点の平均が出たとき、画面の点数を書き換える。 */
export function reviewBox(fit, wx, events, appScore, onScore) {
  const box = el('div', { class: 'review', 'aria-live': 'polite' });
  if (!hasReviewKey()) { box.append(el('p', { class: 'muted', text: '設定でGeminiのキーを入れると、Geminiの厳しめレビューが付きます' })); return box; }
  const names = events.map((e) => e.title || e.name || '').filter(Boolean);
  const key = JSON.stringify([['outer', 'tops', 'bottoms', 'shoes'].map((k) => (fit[k] ? [fit[k].id, fit[k].color_main, fit[k].color_sub, fit[k].warmth, fit[k].formality] : 0)), (fit.accessories || []).map((a) => a.id), Math.round(wx.feels), Math.round(wx.pop), names]);
  const show = (rv) => {
    const mix = Math.round((appScore + rv.score) / 2);
    if (onScore) onScore(mix);
    clear(box);
    box.append(el('h3', { class: 'card-title', text: `Geminiレビュー ${rv.score}点` }),
      el('p', { class: 'muted', text: `総合 ${mix}点（アプリ ${appScore}点 と Gemini ${rv.score}点の平均）` }),
      rv.good ? el('p', { text: `◎ ${rv.good}` }) : null, rv.bad ? el('p', { text: `△ ${rv.bad}` }) : null, rv.fix ? el('p', { text: `→ ${rv.fix}` }) : null);
  };
  if (reviews.has(key)) { show(reviews.get(key)); return box; }
  box.append(el('p', { class: 'muted', text: 'Geminiがレビュー中…' }));
  setTimeout(() => {
    if (!box.isConnected) return; // もう選び直されている
    if (!inflight.has(key)) {
      const run = chain.then(() => reviewOutfit(fit, wx, names, appScore));
      chain = run.then(() => {}, () => {});
      inflight.set(key, run.finally(() => inflight.delete(key)));
    }
    inflight.get(key).then((rv) => {
      reviews.set(key, rv);
      if (reviews.size > 30) reviews.delete(reviews.keys().next().value);
      if (box.isConnected) show(rv);
    }).catch((e) => { if (box.isConnected) { clear(box); box.append(el('p', { class: 'muted', text: `Geminiのレビューは出せませんでした：${e.message}` })); } });
  }, 900);
  return box;
}
