// 切り抜いた服だけを並べる「平置き」の配置（計算だけ）。コーデに見える並べ方にする。
//   左の列（上から）：アウター → パンツ → 靴。アウターが無いときは、トップスがアウターの場所に来る。
//   右の列（上から）：インナーにするトップス（アウターの右隣）→ アクセサリー。

export const FLAT_W = 600;
const H = { top: 330, bottoms: 400, shoes: 130, inner: 300, acc: 190 };
const PAD = 14;

/** items: [{ category, w, h }]（w,h は画像の大きさ）。返す: { width, height, rects: [{ index, x, y, w, h }] } */
export function flatLayout(items) {
  const find = (c) => items.findIndex((it) => it.category === c);
  const outer = find('outer'), tops = find('tops'), bottoms = find('bottoms'), shoes = find('shoes');
  const accs = items.map((it, i) => (it.category === 'accessory' ? i : -1)).filter((i) => i >= 0);
  const main = outer >= 0 ? outer : tops;          // アウターの場所に置くもの
  const inner = outer >= 0 && tops >= 0 ? tops : -1; // アウターの右隣に置くインナー

  const left = [];
  if (main >= 0) left.push([main, H.top]);
  if (bottoms >= 0) left.push([bottoms, H.bottoms]);
  if (shoes >= 0) left.push([shoes, H.shoes]);
  const right = [];
  if (inner >= 0) right.push([inner, H.inner]);
  accs.forEach((i) => right.push([i, H.acc]));
  // 左が空（服が小物だけ）のときは右の内容を左へ
  const leftCol = left.length ? left : right.splice(0);
  const hasRight = right.length > 0;
  const lw = hasRight ? FLAT_W * 0.62 : FLAT_W, rw = FLAT_W - lw;

  const rects = [];
  const column = (cells, x0, cw) => {
    let y = 0;
    for (const [index, h] of cells) {
      const it = items[index];
      const k = Math.min((cw - PAD * 2) / it.w, (h - PAD * 2) / it.h);
      const w = it.w * k, hh = it.h * k;
      rects.push({ index, x: x0 + (cw - w) / 2, y: y + (h - hh) / 2, w, h: hh });
      y += h;
    }
    return y;
  };
  const hl = column(leftCol, 0, lw), hr = hasRight ? column(right, lw, rw) : 0;
  return { width: FLAT_W, height: Math.max(hl, hr, 1), rects };
}
