// 判定エンジン（js/engine/）の自動テスト。python3 tools/build.py の最初に動く（単独でも: node tools/test.mjs）。
import { readFileSync } from 'node:fs';
import { suggest } from '../js/engine/suggest.js';
import { scoreOutfit, formalityNeed } from '../js/engine/score.js';
import { totalColorScore, itemColorScore, isChromatic } from '../js/engine/color.js';
import { applyFeedback, emptyAdjust } from '../js/engine/feedback.js';
import { bringList } from '../js/engine/bring.js';
import { reasonText } from '../js/engine/reason.js';

const R = JSON.parse(readFileSync(new URL('../config/rules.json', import.meta.url), 'utf8'));
let failed = 0;
const ok = (cond, name) => { if (!cond) { failed++; console.log('NG:', name); } };

const it = (id, category, warmth, color_main, extra = {}) => ({ id, name: id, category, sub_category: 'other', warmth, formality: 'casual', color_main, color_sub: '', rain_ok: false, status: 'active', ...extra });
const items = [
  it('t1', 'tops', 2, '#f2f2ef'), it('t2', 'tops', 3, '#1f2a44', { formality: 'neat' }), it('t3', 'tops', 1, '#e11d48'),
  it('b1', 'bottoms', 3, '#3b5b8c'), it('b2', 'bottoms', 3, '#1c1c1e', { formality: 'neat' }),
  it('o1', 'outer', 3, '#3f5e3a', { rain_ok: true }), it('o2', 'outer', 5, '#111214'), it('o3', 'outer', 4, '#9a8a78', { formality: 'formal' }),
  it('s1', 'shoes', 2, '#f4f4f2'), it('s2', 'shoes', 3, '#5a3e2b', { rain_ok: true }),
  it('a1', 'accessory', 1, '#2c3e50', { sub_category: 'umbrella', rain_ok: true }),
  it('x1', 'tops', 5, '#ff0000', { status: 'laundry' })
];
const adjust = emptyAdjust();

// 色
ok(!isChromatic('#f2f2ef', R.color) && isChromatic('#e11d48', R.color), '無彩色の判定');
ok(totalColorScore(['#ffffff', '#000000', '#e11d48'], R.color).chromatic_count === 1, '有彩色1色');
ok(totalColorScore(['#ff0000', '#00ffff'], R.color).relationship === 'complement', '補色');
ok(totalColorScore(['#ff0000', '#ff4400'], R.color).chromatic_count === 1, '近い色相は1色として数える');
ok(totalColorScore(['#ff0000', '#00ff00', '#0000ff'], R.color).score === R.color.total.many, '3色以上は減点');
ok(itemColorScore({ color_main: '#ff0000', color_sub: '#00ffff' }, R.color) === R.color.item.complement, 'アイテム内の補色');
ok(totalColorScore([], R.color).relationship === 'neutral', '色なし');

// 提案：雨・寒い日（予定あり）→ 3案、雨に強い上着と靴、洗濯中は使わない、傘を持つ
const rainy = { feels: 8, pop: 70, wind: 3 };
const r1 = suggest({ items, weather: rainy, events: [{ formality: 'casual' }], adjust, favorites: [] }, R);
ok(r1.outfits.length === 3, '予定ありは3案');
ok(r1.outfits[0].score.rain < 1 || r1.outfits[0].items.outer.rain_ok, '雨に強くない上着なら、雨の点が下がる');
ok(r1.outfits[0].items.shoes && r1.outfits[0].items.shoes.rain_ok, '雨の日の1案目は雨に強い靴');
ok(r1.outfits.every((o) => o.items.tops.id !== 'x1'), '洗濯中は提案しない');
ok(r1.outfits.every((o) => o.items.accessories.some((a) => a.id === 'a1')), '雨なら傘を持つ');
ok(r1.outfits.every((o) => o.reason.length <= 40), '理由は40字以内');
ok(r1.outfits.every((o) => o.score.total >= 0 && o.score.total <= 1), '点数は0〜1');
ok(r1.outfits[0].score.total >= r1.outfits[1].score.total, '点数の高い順');

// 予定なし・暑い日 → 2案、上着なしが上位
const hot = { feels: 28, pop: 0, wind: 2 };
const r2 = suggest({ items, weather: hot, events: [], adjust, favorites: [] }, R);
ok(r2.outfits.length === 2 && r2.note, '予定なしは2案＋注記');
ok(!r2.outfits[0].items.outer, '暑い日は上着なし');

// きれいめの予定 → カジュアルのアイテムを使わない
const r3 = suggest({ items, weather: { feels: 14, pop: 0, wind: 2 }, events: [{ formality: 'neat' }], adjust, favorites: [] }, R);
ok(r3.outfits.length === 0 || r3.outfits.every((o) => ['tops', 'bottoms', 'outer', 'shoes'].every((k) => !o.items[k] || o.items[k].formality !== 'casual')), 'きれいめの日はカジュアルを除く');

// トップスが無いとき
ok(suggest({ items: items.filter((x) => x.category !== 'tops'), weather: hot, events: [], adjust, favorites: [] }, R).outfits.length === 0, 'トップスなしは提案なし');

// 学習：寒かった → 暖かさを下げる → 同じ組の暖かさの点数が変わる
const fit = { tops: items[0], bottoms: items[3], outer: items[4], shoes: items[8] };
const a1 = applyFeedback(adjust, { mode: 'suggest', rating: 'cold', outfit: fit }, R).adjust;
ok(a1.items.t1.warmth === -R.feedback.warmthStep, '寒かった → 暖かさを下げる');
let a = adjust;
for (let i = 0; i < 10; i++) a = applyFeedback(a, { mode: 'suggest', rating: 'cold', outfit: fit }, R).adjust;
ok(a.items.t1.warmth === -R.feedback.warmthClip, '暖かさの補正は上限で止まる');
let b = adjust;
for (let i = 0; i < 20; i++) b = applyFeedback(b, { mode: 'self', rating: 'bad', outfit: fit }, R).adjust;
ok(Object.values(b.outfits)[0] === -R.feedback.clip, '提案の重みは上限で止まる');
const cm = applyFeedback(adjust, { mode: 'self', rating: 'color_mismatch', outfit: { tops: items[2], bottoms: items[3], outer: items[4] } }, R).adjust;
ok(Object.keys(cm.pairs).length > 0 && Object.values(cm.pairs).every((v) => v < 0), '色が合わない → 色の組を下げる');
const need = formalityNeed([], R.formality);
const s0 = scoreOutfit(fit, { rules: R, adjust, weather: { feels: 12, pop: 0 }, need, favorites: [] }).score.total;
const s1 = scoreOutfit(fit, { rules: R, adjust: applyFeedback(adjust, { mode: 'suggest', rating: 'good', outfit: fit }, R).adjust, weather: { feels: 12, pop: 0 }, need, favorites: [] }).score.total;
ok(s1 >= s0, 'よかった → 点数が上がる');

// 持ち物
const bl = bringList({ weather: { pop: 70, wind: 9 }, events: [{ tab: 'Ado', title: 'ライブ' }], daily: ['財布', '財布'], umbrellaName: '折りたたみ傘' }, R);
ok(bl.includes('折りたたみ傘') && bl.includes('チケット（スマホ）') && bl.filter((x) => x === '財布').length === 1, '持ち物');
ok(bringList({ weather: null, events: [], daily: [] }, R).length === 0, '天気なしでも動く');

// 理由
ok(reasonText(fit, { score: { warmth: 0.9 }, warmth_sum: 5, band: { target: 5 }, color_summary: { relationship: 'neutral' } }, { feels: 12, pop: 0 }, 50).length <= 40, '理由の長さ');


// 切り抜きの後処理
import { binarize, largestBlob, fillHoles, feather } from '../js/services/mask.js';
{
  const w = 20, h = 20, m = new Float32Array(w * h);
  for (let y = 4; y < 16; y++) for (let x = 4; x < 16; x++) m[y * w + x] = 0.9;
  m[8 * w + 8] = 0; // 中の穴（1画素）
  m[1 * w + 1] = 0.9; // 離れた小さな塊
  let b = binarize(m, 0.2); b = largestBlob(b, w, h);
  ok(b[1 * w + 1] === 0 && b[5 * w + 5] === 1, '最大の塊だけ残す');
  b = fillHoles(b, w, h, 4);
  ok(b[8 * w + 8] === 1, '小さな穴は埋める');
  ok(b[0] === 0, '外側は埋めない');
  const a = feather(b, w, h, 1, 1);
  ok(a[10 * w + 10] === 255 && a[0] === 0, '縁をなめらかにしても中は不透明・外は透明');
}

// 体型とサイズ感
import { bodyDims, parseSize, sizeFeel } from '../js/engine/fit.js';
{
  ok(bodyDims(null).ws === 1, '未登録なら標準の体');
  ok(bodyDims({ height: 185, weight: 70 }).S > bodyDims({ height: 160, weight: 50 }).S, '背が高いほど大きい');
  ok(bodyDims({ height: 170, weight: 90 }).ws > bodyDims({ height: 170, weight: 55 }).ws, '体重が重いほど幅が広い');
  ok(parseSize('xl').n === 4 && parseSize('32').kind === 'inch' && parseSize('abc') === null, 'サイズ表記を読む');
  ok(sizeFeel({ size: 'L' }, { top: 'M' }).wk > 1 && sizeFeel({ size: 'S' }, { top: 'M' }).wk < 1, 'ひとつ大きいとゆったり');
  ok(sizeFeel({ size: 'M' }, { top: 'M' }).wk === 1 && sizeFeel({ size: 'M' }, {}).wk === 1, '同じサイズ／未登録は等倍');
  ok(sizeFeel({ size: '34' }, { waist: 30 }).wk > sizeFeel({ size: '31' }, { waist: 30 }).wk, 'インチ差');
}

// 平置きの配置（アウター→パンツ→靴を縦に、インナーはアウターの右隣）
import { flatLayout, FLAT_W } from '../js/engine/flatlay.js';
{
  const it = (category, w = 300, h = 300) => ({ category, w, h });
  const L = flatLayout([it('tops'), it('outer', 400, 300), it('bottoms', 300, 500), it('shoes', 170, 100), it('accessory', 100, 100)]);
  ok(L.rects.length === 5 && L.width === FLAT_W, '全部の服に置き場所がある');
  ok(L.rects.every((r) => r.x >= 0 && r.x + r.w <= L.width + 0.01 && r.y >= 0 && r.y + r.h <= L.height + 0.01), '枠の中に収まる');
  const R = (i) => L.rects.find((r) => r.index === i);
  ok(R(1).y < R(2).y && R(2).y < R(3).y, '上から アウター → パンツ → 靴');
  ok(R(0).x > R(1).x + R(1).w / 2 && Math.abs((R(0).y + R(0).h / 2) - (R(1).y + R(1).h / 2)) < 60, 'インナーはアウターの右隣');
  ok(R(4).x > R(2).x + R(2).w / 2 && R(4).y > R(0).y, 'アクセサリーは右の列のインナーの下');
  const N = flatLayout([it('tops'), it('bottoms', 300, 500), it('shoes', 170, 100)]);
  const T = N.rects.find((r) => r.index === 0), B = N.rects.find((r) => r.index === 1);
  ok(T.y < B.y && Math.abs(T.x + T.w / 2 - (B.x + B.w / 2)) < 1, 'アウターが無ければトップスがアウターの場所');
  ok(flatLayout([it('tops')]).height === 330, '1つだけなら1マス');
}

// 画像の保存（data URL → バイト列）
import { dataUrlToPacked } from '../js/data/images.js';
{
  const p = dataUrlToPacked('data:image/jpeg;base64,/9j/4AAQ');
  ok(p.type === 'image/jpeg' && new Uint8Array(p.buf)[0] === 0xff && p.buf.byteLength === 6, 'data URL をバイト列にもどす');
}

// AI評価の文章
import { evaluateText } from '../js/engine/evaluate.js';
{
  const r = { score: { total: 0.83, warmth: 0.9, rain: 0.4, formality: 0.8, color_items: 0.7, color_total: 0.6 }, color_summary: { relationship: 'neutral' } };
  const t = evaluateText({ tops: { name: 'シャツ', size: 'XL' }, bottoms: null }, r, true, { top: 'M' });
  ok(t.includes('総合 83点') && t.includes('◎ 暖かさ・服装の格') && t.includes('△ 雨への備え'), '点数・よい点・見直す点を書く');
  ok(t.includes('シャツはゆったり'), 'サイズ感を書く');
  ok(!evaluateText({}, r, false, {}).includes('雨への備え') && evaluateText({}, r, false, {}).includes('天気を使わない'), '天気が無ければ天気の項目は書かない');
}

// Gemini
import { buildPrompt } from '../js/engine/gemini-prompt.js';
import { askGemini } from '../js/services/gemini.js';
{
  const p = buildPrompt({ tops: { name: 'シャツ', color_main: '#112233', color_sub: '' }, accessories: [] }, '総合 80点', { feels: 12.4, pop: 30 }, ['ライブ']);
  ok(p.includes('シャツ') && p.includes('体感12℃') && p.includes('ライブ') && p.includes('総合 80点'), 'プロンプトに服・天気・予定・採点が入る');
  ok(!p.includes('data:image'), '写真は入らない');
  const real = globalThis.fetch;
  globalThis.fetch = async (u, o) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: ' よい組み合わせです ' }] } }] }), _u: u, _o: o });
  ok((await askGemini('x', 'K')) === 'よい組み合わせです', 'Geminiの返事を取り出す');
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  let msg = ''; try { await askGemini('x', 'K'); } catch (e) { msg = e.message; }
  ok(msg.includes('上限'), '429は上限のメッセージ');
  globalThis.fetch = real;
}

// AI判定の答えの検査
import { parseJudge } from '../js/engine/item-judge.js';
{
  const r = parseJudge({ category: 'tops', sub: 'knit', name: ' ネイビーのニット ', color_main: '#1F2A44', color_sub: 'x', warmth: 4.4, formality: 'neat', rain_ok: false });
  ok(r.category === 'tops' && r.sub === 'knit' && r.name === 'ネイビーのニット' && r.color_main === '#1f2a44' && r.color_sub === '' && r.warmth === 4 && r.formality === 'neat' && r.rain_ok === false, '判定結果を整える');
  ok(parseJudge({ category: 'shoes', sub: 'knit' }).sub === 'other', '種類に合わない細かい種類は「その他」');
  ok(Object.keys(parseJudge({ category: 'ufo', color_main: 'red' })).join() === 'color_sub', '使えない項目は入れない');
}

// Gemini: 使えないモデル(404)なら次のモデルを試す
{
  const real = globalThis.fetch; const urls = [];
  globalThis.fetch = async (u) => { urls.push(u); return urls.length === 1 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) }; };
  ok((await askGemini('x', 'K')) === 'OK' && urls.length === 2 && urls[0] !== urls[1], '404なら次のモデルで試す');
  globalThis.fetch = async (u) => { urls.push(u); return { ok: false, status: 404 }; };
  const before = urls.length; let m = ''; try { await askGemini('x', 'K2'); } catch (e) { m = e.message; }
  ok(m.includes('404') || m.length > 0, '全部404ならエラー'); void before;
  globalThis.fetch = real;
}

// 点数の厳しさ：合わない所が1つでもあれば80点を超えない／文句なしなら高い
{
  const ctx = { rules: R, adjust, weather: { feels: 22, pop: 0, wind: 0 }, need: { need: 0, sports: false }, favorites: [] };
  const good = scoreOutfit({ tops: it('g1', 'tops', 2, '#f2f2ef'), bottoms: it('g2', 'bottoms', 3, '#1c1c1e'), outer: null, shoes: it('g3', 'shoes', 1, '#f4f4f2'), accessories: [] }, ctx);
  const clash = scoreOutfit({ tops: it('c1', 'tops', 2, '#e11d48'), bottoms: it('c2', 'bottoms', 2, '#16a34a'), outer: null, shoes: it('c3', 'shoes', 1, '#facc15'), accessories: [] }, ctx);
  const cold = scoreOutfit({ tops: it('d1', 'tops', 1, '#f2f2ef'), bottoms: it('d2', 'bottoms', 1, '#1c1c1e'), outer: null, shoes: it('d3', 'shoes', 1, '#f4f4f2'), accessories: [] }, { ...ctx, weather: { feels: 3, pop: 0, wind: 0 } });
  ok(good.score.total >= 0.9, '無彩色でまとまった組み合わせは高い');
  ok(clash.score.total < 0.7, '色がばらばらな組み合わせは70点未満');
  ok(cold.score.total < 0.7, '寒い日に薄着の組み合わせは70点未満');
}

// 柄と素材
{
  const ctx = { rules: R, adjust, weather: { feels: 20, pop: 0, wind: 0 }, need: { need: 0, sports: false }, favorites: [] };
  const mk = (id, c, w, hex, o = {}) => ({ id, category: c, warmth: w, formality: 'casual', color_main: hex, color_sub: '', rain_ok: false, pattern: 'plain', material: 'other', ...o });
  const base = { tops: mk('p1', 'tops', 2, '#f2f2ef'), bottoms: mk('p2', 'bottoms', 2, '#1c1c1e'), outer: null, shoes: mk('p3', 'shoes', 1, '#f4f4f2'), accessories: [] };
  const plain = scoreOutfit(base, ctx);
  const clash = scoreOutfit({ ...base, tops: mk('p1', 'tops', 2, '#f2f2ef', { pattern: 'stripe' }), bottoms: mk('p2', 'bottoms', 2, '#1c1c1e', { pattern: 'check' }) }, ctx);
  ok(plain.score.pattern === 1 && clash.score.pattern < 0.5 && clash.score.total < plain.score.total, '柄ものが2つ重なると下がる');
  const hot = scoreOutfit({ ...base, tops: mk('p1', 'tops', 2, '#f2f2ef', { material: 'wool' }) }, { ...ctx, weather: { feels: 30, pop: 0, wind: 0 } });
  ok(hot.score.material < 1, '暑い日のウールは素材の点が下がる');
  ok(parseJudge({ category: 'tops', pattern: 'stripe', material: 'wool' }).pattern === 'stripe' && parseJudge({ category: 'tops', pattern: 'xx', material: 'yy' }).pattern === undefined, 'AI判定の柄・素材は決まった値だけ使う');
}

// 着た履歴（一覧の表示用。点数には使わない）
import { wearHistory, diffDays } from '../js/engine/history.js';
{
  const wears = [{ date: '2026-11-11', items: { tops: 'h1', bottoms: 'h3', outer: null, shoes: null, accessories: [] }, rating: 'good' }, { date: '2026-11-10', items: { tops: 'h2', bottoms: 'h3' }, rating: 'did_not_use' }];
  const h = wearHistory(wears, '2026-11-12');
  ok(diffDays('2026-11-12', '2026-11-11') === 1 && diffDays('2026-12-01', '2026-11-30') === 1, '日付の差が正しい');
  ok(h.ago.h1 === 1 && h.count.h1 === 1 && h.ago.h2 === undefined, '「着なかった」は数えない');
  ok(wearHistory(wears, '2026-11-11').count.h1 === undefined, '基準の日以降の記録は数えない');
}
// 1日の気温差
import { daySwing } from '../js/engine/swing.js';
{
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22].map((h, i) => ({ date: '2026-11-12', hour: h, temp: [8, 9, 14, 18, 19, 16, 12, 10, 9][i] }));
  const s = daySwing(hours, '2026-11-12');
  ok(s.morning === 9 && s.noon === 19 && s.night === 10 && s.range === 11, '朝・昼・夜の気温と差');
  ok(daySwing(hours, '2026-11-13') === null, '1時間ごとの天気がなければ出さない');
  const ctx = { rules: R, adjust, weather: { feels: 22, pop: 0, wind: 0, swing: s }, need: { need: 0, sports: false }, favorites: [] };
  const mk = (id, c, w, hex) => ({ id, category: c, warmth: w, formality: 'casual', color_main: hex, color_sub: '', rain_ok: false, pattern: 'plain', material: 'other' });
  const base = { tops: mk('w1', 'tops', 2, '#f2f2ef'), bottoms: mk('w2', 'bottoms', 2, '#1c1c1e'), shoes: null, accessories: [] };
  const noOut = scoreOutfit({ ...base, outer: null }, ctx), noSwing = scoreOutfit({ ...base, outer: null }, { ...ctx, weather: { ...ctx.weather, swing: null } });
  ok(noOut.score.warmth < noSwing.score.warmth, '気温差が大きい日は、上着なしの暖かさの点が下がる');
}
// Gemini レビューの文章と検査
import { buildReviewPrompt, parseReview } from '../js/engine/review.js';
{
  const p = buildReviewPrompt({ tops: it('a', 'tops', 2, '#ffffff'), bottoms: it('b', 'bottoms', 2, '#000000'), accessories: [] }, { feels: 10, pop: 20 }, ['ライブ'], 70);
  ok(p.includes('厳しめ') && p.includes('体感10℃') && p.includes('ライブ') && p.includes('70点'), 'レビューの文章に天気・予定・アプリの点が入る');
  ok(parseReview({ score: 140.4, good: 'a', bad: 'b' }).score === 100 && parseReview({ score: -5 }).score === 0, '点数は0〜100にそろえる');
  ok(parseReview({ good: 'x' }) === null && parseReview(null) === null, '点数が無い答えは使わない');
}

if (failed) { console.log(`${failed} 件の失敗`); process.exit(1); }
console.log('自動テスト: すべて成功');
