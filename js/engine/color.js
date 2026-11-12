// 色の判定（純関数）。色相環の角度や、無彩色かどうか、組み合わせの点数を出す。
// 数値の基準は config/rules.json の color にある。

/** #rrggbb → { h: 0-360, s: 0-1, l: 0-1 }。 */
const hslMemo = new Map(); // 同じ色の計算を繰り返さない
export function hexToHsl(hex) {
  const hit = hslMemo.get(hex);
  if (hit) return hit;
  const v = computeHsl(hex);
  if (hslMemo.size < 500) hslMemo.set(hex, v);
  return v;
}

function computeHsl(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

/** 色みのある色か（白・黒・灰色・ごく淡い色は「無彩色」）。 */
export function isChromatic(hex, rc) {
  if (!hex) return false;
  const { s, l } = hexToHsl(hex);
  return s >= rc.achromaticSat && l >= rc.achromaticDark && l <= rc.achromaticLight;
}

/** 色相の差（0〜180度）。 */
export function hueDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 2つの色相の関係。'analogous'（似た色）/ 'complement'（反対の色）/ 'other'。 */
export function relation(h1, h2, rc) {
  const d = hueDist(h1, h2);
  if (d <= rc.analogousDeg) return 'analogous';
  if (Math.abs(d - 180) <= rc.complementTol) return 'complement';
  return 'other';
}

/** アイテム1つの中の色（主色＋副色）の点数。 */
export function itemColorScore(item, rc) {
  const a = item.color_main, b = item.color_sub;
  if (!b || !isChromatic(a, rc) || !isChromatic(b, rc)) return rc.item.single;
  return rc.item[relation(hexToHsl(a).h, hexToHsl(b).h, rc)];
}

/** 色みのある色を、近い色相ごとにまとめる。まとまりの代表の色相を返す。 */
export function hueGroups(hexes, rc) {
  const groups = [];
  hexes.filter((x) => isChromatic(x, rc)).forEach((x) => {
    const h = hexToHsl(x).h;
    if (groups.findIndex((y) => hueDist(y, h) <= rc.mergeDeg) < 0) groups.push(h);
  });
  return groups;
}

/** コーデ全体の色の点数。{ score, chromatic_count, relationship }。 */
export function totalColorScore(hexes, rc) {
  const groups = hueGroups(hexes, rc);
  const n = groups.length;
  const t = rc.total;
  if (n === 0) return { score: t.none, chromatic_count: 0, relationship: 'neutral' };
  if (n === 1) return { score: t.one, chromatic_count: 1, relationship: 'neutral+accent' };
  if (n === 2) {
    const rel = relation(groups[0], groups[1], rc);
    return { score: rel === 'other' ? t.two_other : t[rel], chromatic_count: 2, relationship: rel };
  }
  const neutral = hexes.filter((x) => !isChromatic(x, rc)).length / Math.max(1, hexes.length);
  return { score: neutral >= 0.5 ? t.many_neutral : t.many, chromatic_count: n, relationship: 'many' };
}

/** 色の呼び名（大まかな言葉）。 */
export function colorWord(hex, rc) {
  const { h, s, l } = hexToHsl(hex);
  if (!isChromatic(hex, rc)) return l > 0.8 ? '白' : l < 0.25 ? '黒' : 'グレー';
  if (h >= 15 && h < 55 && l < 0.4) return '茶';
  if (h >= 15 && h < 55 && s < 0.55 && l >= 0.55) return 'ベージュ';
  if (h >= 190 && h < 255 && l < 0.3) return 'ネイビー';
  const names = [[15, '赤'], [40, 'オレンジ'], [65, '黄'], [160, '緑'], [200, '水色'], [255, '青'], [290, '紫'], [335, 'ピンク'], [360, '赤']];
  return names.find(([max]) => h < max)[1];
}
