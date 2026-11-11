// おまかせ提案（純関数）。手持ちのアイテムだけで組み合わせを作り、点数の高い順に、似すぎない案を選ぶ。
// 「自分で選ぶ」も同じ scoreOutfit で点数を出す（builder 画面）。
import { scoreOutfit, formalityNeed, meetsFormality, warmthBand, itemWarmth } from './score.js';
import { reasonText } from './reason.js';

const usable = (it) => it.status === 'active';

/** 予定の服装の種類の並び（予定なしなら空）。 */
export const eventKinds = (events) => events.map((e) => e.formality || 'casual');

/** 1つのアイテムだけで見た、大まかな向き不向き（組み合わせを絞るため）。 */
function quick(it, ctx, slot) {
  const R = ctx.rules;
  const band = warmthBand(ctx.weather.feels, R.warmth);
  const w = itemWarmth(it, ctx.adjust);
  const share = slot === 'outer' ? band.target * 0.5 : slot === 'tops' ? band.target * 0.35 : 3;
  let s = 1 - Math.abs(w - share) / 5;
  if (ctx.weather.pop >= R.rain.popThreshold && (slot === 'outer' || slot === 'shoes') && it.rain_ok) s += 0.3;
  s += (ctx.adjust.items[it.id] || {}).score || 0;
  return s;
}

function top(list, ctx, slot, n) {
  return [...list].sort((a, b) => quick(b, ctx, slot) - quick(a, ctx, slot)).slice(0, n);
}

/** その日に持つ小物（雨なら傘、日差しが強ければ帽子）。 */
function accessoriesFor(acc, weather, R) {
  const out = [];
  const umb = acc.find((a) => a.sub_category === 'umbrella');
  if (umb && weather.pop >= R.rain.foldingUmbrellaFrom) out.push(umb);
  const hat = acc.find((a) => a.sub_category === 'hat');
  if (hat && weather.uv >= R.bring.uvFrom) out.push(hat);
  return out;
}

/**
 * items: 手持ち。weather: { feels, pop, uv, wind }。events: [{ formality }]。adjust: 学習の補正。favorites: お気に入り。
 * 返す: { has_events, outfits: [{ rank, items, reason, score, color_summary, key }], note }
 */
export function suggest({ items, weather, events, adjust, favorites }, R) {
  const has = events.length > 0;
  const need = formalityNeed(eventKinds(events), R.formality);
  const ctx = { rules: R, adjust, weather, need, favorites };
  const pool = items.filter(usable).filter((it) => meetsFormality(it, need.need, R.formality));
  const by = (c) => pool.filter((it) => it.category === c);
  const n = R.suggest.prefilter;
  const tops = top(by('tops'), ctx, 'tops', n);
  const bottoms = top(by('bottoms'), ctx, 'bottoms', n);
  const outers = [null, ...top(by('outer'), ctx, 'outer', n)];
  const shoesList = by('shoes').length ? top(by('shoes'), ctx, 'shoes', n) : [null];
  const accessories = accessoriesFor(by('accessory'), weather, R);

  if (!tops.length || !bottoms.length) {
    return { has_events: has, outfits: [], note: 'トップスとボトムスを1つ以上登録すると、提案が出ます' };
  }

  const all = [];
  tops.forEach((t) => bottoms.forEach((b) => outers.forEach((o) => shoesList.forEach((s) => {
    const fit = { tops: t, bottoms: b, outer: o, shoes: s, accessories };
    all.push({ fit, r: scoreOutfit(fit, ctx) });
  }))));
  all.sort((a, b) => b.r.score.total - a.r.score.total);

  // 似すぎない案を選ぶ（同じアイテムが maxShared 個を超えて重ならない）
  const want = has ? R.suggest.withEvents : R.suggest.noEvents;
  const ids = (f) => ['tops', 'bottoms', 'outer', 'shoes'].map((k) => f[k] && f[k].id).filter(Boolean);
  const picked = [];
  for (const c of all) {
    if (picked.length >= want) break;
    const mine = ids(c.fit);
    if (picked.every((p) => mine.filter((x) => ids(p.fit).includes(x)).length <= R.suggest.maxShared)) picked.push(c);
  }

  return {
    has_events: has,
    outfits: picked.map((c, i) => ({
      rank: i + 1,
      items: c.fit,
      reason: reasonText(c.fit, c.r, weather, R.rain.popThreshold),
      score: c.r.score,
      color_summary: c.r.color_summary
    })),
    note: has ? '' : '予定なしのため天気だけで組んだ提案'
  };
}
