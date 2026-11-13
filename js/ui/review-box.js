// Gemini のレビュー表示（コーデ作成・朝ブリーフで共通）。
// 頼んだときだけGeminiを呼び、結果は端末に覚える。「再評価」を押すまで同じ内容を出す（開くたびに無料枠を使わない）。
import { el, clear } from '../util/dom.js';
import { reviewOutfit, hasReviewKey } from '../data/review.js';
import { getReview, setReview } from '../data/review-store.js';

let chain = Promise.resolve(); // 同時に頼まず1件ずつ

/** onScore(n): Geminiの点数が出たとき、画面の点数をその点数だけに書き換える（アプリの点は出さない）。 */
export function reviewBox(fit, wx, events, appScore, onScore) {
  const root = el('details', { class: 'review-d more' });
  const head = el('summary', { text: 'Geminiレビュー' });
  const box = el('div', { class: 'review', 'aria-live': 'polite' });
  root.append(head, box);
  if (!hasReviewKey()) return el('div'); // キーが無いときは何も出さない
  const names = events.map((e) => e.title || e.name || '').filter(Boolean);
  let busy = false;
  const btn = (text, fn) => el('button', { type: 'button', class: 'btn', text, onclick: fn });
  const show = (rv) => {
    if (onScore) onScore(rv.score);
    clear(box); head.textContent = `Geminiレビュー ${rv.score}点`;
    box.append(
      rv.color ? el('p', { text: `色: ${rv.color}` }) : null,
      rv.good ? el('p', { text: `◎ ${rv.good}` }) : null, rv.bad ? el('p', { text: `△ ${rv.bad}` }) : null, rv.fix ? el('p', { text: `→ ${rv.fix}` }) : null,
      el('p', { class: 'muted', text: rv.at ? `${rv.at.replace('T', ' ')} のレビュー` : '' }),
      btn('再評価する', ask));
  };
  function ask() {
    if (busy) return;
    busy = true;
    clear(box); box.append(el('p', { class: 'muted', text: 'Geminiがレビュー中…' }));
    const run = chain.then(() => reviewOutfit(fit, wx, names, appScore));
    chain = run.then(() => {}, () => {});
    run.then(async (rv) => {
      await setReview(fit, rv);
      if (box.isConnected) show(getReview(fit));
    }).catch((e) => {
      if (!box.isConnected) return;
      clear(box);
      box.append(el('p', { class: 'muted', text: `Geminiのレビューは出せませんでした：${e.message}` }), btn(getReview(fit) ? '再評価する' : 'Geminiにレビューしてもらう', ask));
    }).finally(() => { busy = false; });
  }
  const saved = getReview(fit);
  if (saved) show(saved); else box.append(btn('Geminiにレビューしてもらう', ask));
  return root;
}
