// ワンタップ評価 → 学習の補正（純関数）。補正は config/rules.json の feedback の範囲に収める。
//   寒かった → 使ったアイテムの「実際の暖かさ」を下げる（次は、より暖かい組み合わせが選ばれる）
//   暑かった → 上げる。色が合わなかった → その色の組み合わせを下げる
//   よかった → アイテムと色の組み合わせを少し上げる（おまかせ提案なら、その組も少し上げる）
//   いまいち・使わなかった → その組み合わせを下げる
import { colorPairs, outfitKey } from './score.js';

const clip = (x, m) => Math.round(Math.max(-m, Math.min(m, x)) * 100) / 100;

/** 空の補正。 */
export const emptyAdjust = () => ({ items: {}, pairs: {}, outfits: {} });

/**
 * adjust: 今の補正。fb: { mode: 'suggest'|'self', rating, outfit: { tops, bottoms, outer, shoes } }。
 * 返す: { adjust: 新しい補正, reason: 一言 }
 */
export function applyFeedback(adjust, fb, R) {
  const F = R.feedback;
  const next = { items: { ...adjust.items }, pairs: { ...adjust.pairs }, outfits: { ...adjust.outfits } };
  const its = ['tops', 'bottoms', 'outer', 'shoes'].map((k) => fb.outfit[k]).filter(Boolean);
  const bumpItem = (it, key, d, m) => {
    const cur = next.items[it.id] || {};
    next.items[it.id] = { ...cur, [key]: clip((cur[key] || 0) + d, m) };
  };
  const pairs = colorPairs(fb.outfit, R.color);
  const key = outfitKey(fb.outfit);
  let reason = '';

  switch (fb.rating) {
    case 'cold':
      its.forEach((it) => bumpItem(it, 'warmth', -F.warmthStep, F.warmthClip));
      reason = '寒かったので、次はもう少し暖かい組み合わせにします';
      break;
    case 'hot':
      its.forEach((it) => bumpItem(it, 'warmth', F.warmthStep, F.warmthClip));
      reason = '暑かったので、次はもう少し軽い組み合わせにします';
      break;
    case 'color_mismatch':
      pairs.forEach((k) => { next.pairs[k] = clip((next.pairs[k] || 0) + F.colorMismatch, F.clip); });
      reason = pairs.length ? 'この色の組み合わせを控えめにします' : '色の組み合わせを覚えました（白黒系のみ）';
      break;
    case 'good':
      its.forEach((it) => bumpItem(it, 'score', F.good, F.clip));
      pairs.forEach((k) => { next.pairs[k] = clip((next.pairs[k] || 0) + F.good, F.clip); });
      if (fb.mode === 'suggest') next.outfits[key] = clip((next.outfits[key] || 0) + F.goodProposal, F.clip);
      reason = 'よかった組み合わせを、少し選ばれやすくします';
      break;
    case 'bad':
    case 'did_not_use':
      next.outfits[key] = clip((next.outfits[key] || 0) + F.bad, F.clip);
      reason = 'この組み合わせを、少し選ばれにくくします';
      break;
    default:
      reason = '';
  }
  return { adjust: next, reason };
}
