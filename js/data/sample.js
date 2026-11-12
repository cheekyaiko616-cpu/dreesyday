// 見本のデータ（Claude上・手元のファイルで開いたときだけ使う。github.io で開いたときは使わない）。
// 本番では、予定は Event list の calendar.json、天気は Open-Meteo、アイテムは自分で登録したものだけを使う。
import { todayIso, addDaysIso } from '../util/date.js';

/** 見本の版。見本の中身を変えたら上げる（確認用で開いたとき、古い見本が残らず入れ替わる）。 */
export const SAMPLE_VERSION = 4;

export function sampleCalendar() {
  const t = todayIso();
  return [
    { id: 's1', title: 'SUPER GT 第8戦 もてぎ', from: t, to: addDaysIso(t, 1), place: 'モビリティリゾートもてぎ', tab: 'スーパーGT', color: '#c2410c', open: '', start: '' },
    { id: 's2', title: 'Ado ライブ', from: addDaysIso(t, 1), to: addDaysIso(t, 1), place: '有明アリーナ', tab: 'Ado', color: '#3a4cc4', open: '17:00', start: '18:00' }
  ];
}

export function sampleForecast(pos) {
  const t = todayIso();
  const venue = pos.lat > 36;
  const days = {};
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => {
    days[addDaysIso(t, i)] = venue
      ? { code: i === 0 ? 61 : 2, max: 14 - i, min: 6, feelMax: 12 - i, feelMin: 3, pop: i === 0 ? 60 : 20, uv: 3, wind: 6 }
      : { code: i === 1 ? 63 : 1, max: 17, min: 9, feelMax: 15, feelMin: 6, pop: i === 1 ? 70 : 10, uv: 4, wind: 4 };
  });
  const hours = [];
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => { for (let h = 6; h <= 23; h++) hours.push({ date: addDaysIso(t, i), hour: h, code: h > 14 && venue ? 61 : 1, temp: Math.round(9 + 6 * Math.sin(((h - 8) / 12) * Math.PI)), pop: venue && h > 13 ? 60 : 10 }); });
  return { days, hours };
}

/**
 * 見本のアイテム（確認用）。写真は samples/ の実際の服（key = sample-images.js の名前）。
 * 見本のトップスはシャツジャケット1着だけなので、チェックのウールシャツを「トップス」に入れてある。
 */
export function sampleItems() {
  const list = [
    // 名前, 種類, 細かい種類, 暖かさ, 格, 主色, 副色, 雨OK, 写真の名前, サイズ
    ['コンバース オールスター ハイ', 'shoes', 'sneakers', 2, 'casual', '#d9d4c4', '', false, 'converse', ''],
    ['Wrangler デニムジャケット', 'outer', 'jacket', 2, 'casual', '#4a6794', '', false, 'wrangler', 'M'],
    ['スタジャン（紺×黒レザー）', 'outer', 'jacket', 4, 'casual', '#1f2447', '#17171a', false, 'varsity', 'L'],
    ['ブルーチェックのウールシャツ', 'tops', 'shirt', 4, 'casual', '#2f4fb0', '#e6e4de', false, 'plaid', 'M'],
    ['紺デジカモのカーゴパンツ', 'bottoms', 'pants', 3, 'casual', '#3a4d6a', '#9fb0c8', false, 'camo', 'M'],
    ['インディゴのジーンズ', 'bottoms', 'pants', 3, 'casual', '#27395e', '', false, 'jeans', '32']
  ];
  return list.map(([name, category, sub_category, warmth, formality, color_main, color_sub, rain_ok, photoKey, size], i) => ({
    pattern: { plaid: 'check', camo: 'print' }[photoKey] || 'plain', material: { plaid: 'wool', jeans: 'denim', wrangler: 'denim', varsity: 'wool', camo: 'cotton' }[photoKey] || 'other',
    id: `s${i}`, name, category, sub_category, warmth, formality, color_main, color_sub, rain_ok, photoKey, size, status: 'active',
    createdAt: `2026-01-${String(30 - i).padStart(2, '0')}`
  }));
}

/** 見本のお気に入り（アイテムの id の組・評価・メモ・タグ）。画像は sample-seed.js が合成する。 */
export function sampleFavorites() {
  return [
    { id: 'sf1', items: { outer: 's2', tops: 's3', bottoms: 's5', shoes: 's0', accessories: [] }, stars: 5, memo: '寒い日の観戦に', tags: ['観戦', '寒い日'] },
    { id: 'sf2', items: { outer: 's1', tops: 's3', bottoms: 's4', shoes: 's0', accessories: [] }, stars: 4, memo: '重ね着の定番', tags: ['古着'] }
  ];
}

/** 見本の「着た記録」：3日前（評価済み）・2日前（評価済み）・昨日（まだ評価していない）。 */
export function sampleWears() {
  const t = todayIso();
  return [
    { date: addDaysIso(t, -1), mode: 'suggest', items: { outer: 's1', tops: 's3', bottoms: 's5', shoes: 's0', accessories: [] }, rating: '' },
    { date: addDaysIso(t, -2), mode: 'self', items: { outer: 's1', tops: 's3', bottoms: 's4', shoes: 's0', accessories: [] }, rating: 'cold' },
    { date: addDaysIso(t, -3), mode: 'suggest', items: { outer: 's2', tops: 's3', bottoms: 's5', shoes: 's0', accessories: [] }, rating: 'good' }
  ];
}
