// 学習：着たコーデの記録（選択）と、ワンタップ評価（結果）→ 補正値。kv の 'adjust' と 'wears' に保存する。
// 3つの層：①提案（おまかせ）か自分選択か ②どれを着たか ③着た結果の評価。
import { state, notify } from '../state.js';
import { get, put } from './db.js';
import { RULES } from './rules.js';
import { applyFeedback, emptyAdjust } from '../engine/feedback.js';
import { outfitKey } from '../engine/score.js';
import { idsOf } from './favorites.js';
import { itemById } from './closet.js';

const KEEP = 90; // 記録を残す件数

export async function loadLearning() {
  const a = await get('kv', 'adjust');
  state.adjust = a && a.items && a.pairs && a.outfits ? a : emptyAdjust();
  const w = await get('kv', 'wears');
  state.wears = Array.isArray(w) ? w : [];
}

/** 記録の id の組 → アイテムの実体（消したアイテムは null）。 */
export function fitOf(ids) {
  const f = {};
  ['tops', 'bottoms', 'outer', 'shoes'].forEach((k) => { f[k] = ids[k] ? itemById(ids[k]) : null; });
  f.accessories = (ids.accessories || []).map(itemById).filter(Boolean);
  return f;
}

/** その日に着たコーデの記録（無ければ null）。 */
export const wearOn = (date) => state.wears.find((w) => w.date === date) || null;

/** 「今日はこれを着る」。同じ日は上書き。mode: 'suggest'（おまかせ）/ 'self'（自分で選んだ）。 */
export async function chooseOutfit(date, fit, mode) {
  const rec = { date, mode, items: idsOf(fit), key: outfitKey(fit), rating: '', at: new Date().toISOString() };
  state.wears = [rec, ...state.wears.filter((w) => w.date !== date)].slice(0, KEEP);
  await put('kv', 'wears', state.wears);
  notify();
}

/** 着た結果の評価。補正値を更新して、一言の理由を返す。 */
export async function rateOutfit(date, rating) {
  const rec = wearOn(date);
  if (!rec || rec.rating === rating) return ''; // 同じ評価を二度押しても、二重に学習しない
  const { adjust, reason } = applyFeedback(state.adjust, { mode: rec.mode, rating, outfit: fitOf(rec.items) }, RULES);
  state.adjust = adjust;
  rec.rating = rating;
  await put('kv', 'adjust', adjust);
  await put('kv', 'wears', state.wears);
  notify();
  return reason;
}

/** 学習をはじめからにする（記録は残す）。 */
export async function resetLearning() {
  state.adjust = emptyAdjust();
  await put('kv', 'adjust', state.adjust);
  notify();
}
