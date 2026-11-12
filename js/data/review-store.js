// Gemini のレビューを端末に覚えておく。コーデ（アイテムの組み合わせ）ごとに1件。
// 「再評価」を押すまで同じ内容を出し続けるので、アプリを開き直してもGeminiの無料枠を使わない。
import { get, put } from './db.js';
import { parseReview } from '../engine/review.js';

const MAX = 200;
let cache = {};

export async function loadReviews() {
  try { const v = await get('kv', 'reviews'); cache = v && typeof v === 'object' ? v : {}; } catch { cache = {}; }
}

/** コーデ → 保存用のキー（アイテムのid。小物は順不同）。天気や予定は入れない。 */
export const reviewKey = (fit) => JSON.stringify([fit.outer, fit.tops, fit.bottoms, fit.shoes].map((x) => (x ? x.id : 0)).concat([(fit.accessories || []).map((a) => a.id).sort()]));

export const getReview = (fit) => cache[reviewKey(fit)] || null;

export async function setReview(fit, rv) {
  cache[reviewKey(fit)] = { ...rv, at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) };
  const keys = Object.keys(cache);
  if (keys.length > MAX) keys.sort((a, b) => (cache[a].at < cache[b].at ? -1 : 1)).slice(0, keys.length - MAX).forEach((k) => delete cache[k]);
  try { await put('kv', 'reviews', cache); } catch { /* 保存できなくても画面には出す */ }
}

/** 保存済みのレビューを検査して取り出す（壊れていたら null）。 */
export const cleanReview = (o) => { const r = parseReview(o); return r ? { ...r, at: typeof o.at === 'string' ? o.at.slice(0, 16) : '' } : null; };
