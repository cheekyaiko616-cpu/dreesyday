// コーデ1組の点数（純関数）。暖かさ・雨・服装の格・色（アイテム内／全体）を0〜1で出し、重み付きで合計する。
// 学習した補正（adjust）とお気に入りも、ここで点数に足す。
import { itemColorScore, totalColorScore, isChromatic } from './color.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round = (x) => Math.round(x * 100) / 100;
const SLOTS = ['tops', 'bottoms', 'outer', 'shoes'];

/** コーデの組（id の並び）を表す鍵。学習の「提案の重み」に使う。 */
export const outfitKey = (o) => SLOTS.map((k) => (o[k] ? o[k].id : '-')).join('|');

/** 体感温度 → 暖かさの目安 { target, outer }。 */
export function warmthBand(feels, rw) {
  return rw.bands.find((b) => feels >= b.min) || rw.bands[rw.bands.length - 1];
}

/** 学習で補正したアイテムの暖かさ。 */
export const itemWarmth = (item, adjust) => (item ? item.warmth + ((adjust.items[item.id] || {}).warmth || 0) : 0);

/** コーデ全体の暖かさ。 */
export function outfitWarmth(o, adjust, rw) {
  return itemWarmth(o.tops, adjust) + itemWarmth(o.bottoms, adjust) * rw.bottomsFactor + itemWarmth(o.outer, adjust);
}

/** 予定の服装の種類の並び → 必要な格（数）と、スポーツ寄りか。 */
export function formalityNeed(kinds, rf) {
  const need = Math.max(0, ...kinds.map((k) => rf.required[k] ?? 0));
  return { need, sports: kinds.includes('sports') && need === 0 };
}

/** アイテムの格が、必要な格を満たすか。 */
export const meetsFormality = (item, need, rf) => !item || (rf.level[item.formality] ?? 0) >= need;

/** コーデの色の並び（主色・副色）。 */
export function outfitHexes(o) {
  const list = [];
  [...SLOTS.map((k) => o[k]), ...(o.accessories || [])].forEach((it) => {
    if (!it) return;
    list.push(it.color_main);
    if (it.color_sub) list.push(it.color_sub);
  });
  return list.filter(Boolean);
}

/** コーデ内の「色みのある主色」の組み合わせ（学習の色の相性に使う）。 */
export function colorPairs(o, rc) {
  const mains = SLOTS.map((k) => o[k]).filter(Boolean).map((it) => it.color_main).filter((h) => isChromatic(h, rc));
  const pairs = [];
  for (let i = 0; i < mains.length; i++) for (let j = i + 1; j < mains.length; j++) if (mains[i] !== mains[j]) pairs.push([mains[i], mains[j]].sort().join('-'));
  return [...new Set(pairs)];
}

/**
 * コーデ1組の点数。
 * ctx: { weather: { feels, pop }, need: { need, sports }, adjust, favorites, rules }
 */
export function scoreOutfit(o, ctx) {
  const { rules: R, adjust, weather } = ctx;
  const items = SLOTS.map((k) => o[k]).filter(Boolean);

  // 暖かさ
  const band = warmthBand(weather.feels, R.warmth);
  const sum = outfitWarmth(o, adjust, R.warmth);
  let warmth = clamp01(1 - Math.abs(sum - band.target) / R.warmth.tolerance);
  if (band.outer === 'need' && !o.outer) warmth *= R.warmth.noOuterPenalty;
  if (band.outer === 'none' && o.outer && itemWarmth(o.outer, adjust) >= 3) warmth *= R.warmth.heavyOuterPenalty;

  // 雨
  let rain = 1;
  if (weather.pop >= R.rain.popThreshold) {
    const outer = o.outer ? (o.outer.rain_ok ? 1 : R.rain.notRainOkScore) : R.rain.noOuterScore;
    const shoes = o.shoes ? (o.shoes.rain_ok ? 1 : R.rain.notRainOkScore) : R.rain.noOuterScore;
    rain = (outer + shoes) / 2;
  }

  // 服装の格（必要な格より上すぎると少し下げる。スポーツ観戦などはカジュアルを高く）
  const lv = items.map((it) => R.formality.level[it.formality] ?? 0);
  const over = lv.length ? lv.reduce((a, x) => a + Math.max(0, x - ctx.need.need), 0) / lv.length : 0;
  let formality = clamp01(1 - over * R.formality.overPenalty);
  if (ctx.need.sports && lv.some((x) => x >= 1)) formality = Math.min(formality, R.formality.sportsNeatScore);

  // 色
  const color_items = items.length ? items.reduce((a, it) => a + itemColorScore(it, R.color), 0) / items.length : 1;
  const tc = totalColorScore(outfitHexes(o), R.color);

  const rainy = weather.pop >= R.rain.popThreshold;
  const W = rainy ? { ...R.weights, rain: R.rain.rainyWeight } : { ...R.weights, rain: 0 }; // 雨の日だけ雨を見る（降らない日に満点が混ざって甘くならないように）
  const parts = [['warmth', warmth], ['rain', rain], ['formality', formality], ['color_items', color_items], ['color_total', tc.score]].filter(([k]) => W[k] > 0);
  const wsum = parts.reduce((a, [k]) => a + W[k], 0);
  const avg = parts.reduce((a, [k, v]) => a + W[k] * v, 0) / wsum;
  const weakest = Math.min(...parts.map(([, v]) => v)); // ひとつでも合わない所があれば、全体の点も下げる
  let total = (1 - R.strict.weakest) * avg + R.strict.weakest * weakest;

  // 学習した補正：アイテムの好み・色の相性・この組み合わせの重み
  const itemDelta = items.reduce((a, it) => a + ((adjust.items[it.id] || {}).score || 0), 0) / Math.max(1, items.length);
  const pairDelta = colorPairs(o, R.color).reduce((a, k) => a + (adjust.pairs[k] || 0), 0);
  const outfitDelta = adjust.outfits[outfitKey(o)] || 0;
  // お気に入りに近い組み合わせ（同じアイテムが多いほど）を少し上げる
  const ids = new Set(items.map((it) => it.id));
  const fav = Math.max(0, ...(ctx.favIds || (ctx.favIds = (ctx.favorites || []).map((f) => Object.values(f.items || {}).flat().filter(Boolean)))).map((fids) => (fids.length ? fids.filter((x) => ids.has(x)).length / fids.length : 0)));
  total += itemDelta + pairDelta + outfitDelta + fav * R.favoriteBonus;

  return {
    score: { warmth: round(warmth), rain: round(rain), formality: round(formality), color_items: round(color_items), color_total: round(tc.score), total: round(clamp01(total)) },
    color_summary: { chromatic_count: tc.chromatic_count, relationship: tc.relationship },
    warmth_sum: round(sum),
    band
  };
}
