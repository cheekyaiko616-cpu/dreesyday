// コーデの配置を決める（描画なし・純粋な計算）。
// 切り抜いた服の「形」（幅・高さ・重心）を読み取り、マネキン上のどこに、どの大きさで置くかを返す。

export const CANVAS = { w: 600, h: 1000 };
export const BODY = {
  cx: 300, headY: 96, neckY: 150, shoulderY: 190, waistY: 420, hipY: 520, kneeY: 720, ankleY: 905, floorY: 958
};

/** 切り抜き（RGBA）から形の特徴を測る。rgba は Uint8ClampedArray。 */
export function measure(w, h, rgba) {
  let sx = 0, n = 0;
  const y0 = Math.floor(h * 0.3), y1 = Math.ceil(h * 0.8);
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const a = rgba[(y * w + x) * 4 + 3];
    if (a > 128) { sx += x; n++; }
  }
  const cx = n ? sx / n : w / 2;          // 中ほどの重心（左右の中心の目安）
  let cnt = 0; for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 128) cnt++;
  return { w, h, cx, fill: cnt / (w * h) };
}

const fit = (m, boxW, boxH) => Math.min(boxW / m.w, boxH / m.h);

/**
 * 1 つの服の置き場所。stats = measure() の結果（無ければ写真の大きさだけ）。
 * 返す: { x, y, w, h, flip }（キャンバス座標。x,y は左上）
 */
export function place(item, m, ctx = {}) {
  const r = placeBase(item, m, ctx);
  const c = item.category;
  if (Array.isArray(r) || !(c === 'tops' || c === 'outer' || c === 'bottoms')) return r;
  // 体型とサイズ感：身幅（ws＝体の横幅、wk＝サイズの差）と着丈を、重心と固定側（上端／下端）を保ったまま変える
  const wk = (ctx.ws || 1) * (ctx.wk || 1), hk = ctx.hk || 1;
  const nw = r.w * wk, nh = r.h * hk;
  const cxPix = (r.x + (m.cx / m.w) * r.w);
  const bottomAnchored = ctx.hemY != null && c === 'bottoms';
  return { ...r, x: cxPix - (m.cx / m.w) * nw, w: nw, y: bottomAnchored ? r.y + r.h - nh : r.y, h: nh };
}

function placeBase(item, m, ctx) {
  const c = item.category, sub = item.sub_category;
  const cx = BODY.cx;
  const rect = (k, anchorY, anchor = 'top', dx = 0) => {
    const w = m.w * k, h = m.h * k;
    const left = cx - (m.cx / m.w) * w + dx;       // 重心を体の中心に合わせる
    const top = anchor === 'top' ? anchorY : anchor === 'bottom' ? anchorY - h : anchorY - h / 2;
    return { x: left, y: top, w, h, flip: false };
  };
  if (c === 'tops') {
    const H = ctx.hasOuter ? 380 : 340;
    return rect(fit(m, ctx.hasOuter ? 330 : 360, H), BODY.shoulderY - 14);
  }
  if (c === 'outer') return rect(fit(m, 410, 330), BODY.shoulderY - 20);
  if (c === 'bottoms') {
    if (sub === 'skirt') return rect(fit(m, 300, 300), BODY.waistY - 6);
    const k = fit(m, 310, 520);
    if (ctx.hemY != null) { // 靴にかぶさる位置に裾をそろえる
      const r = rect(k, ctx.hemY, 'bottom'), waist = BODY.waistY - 6, want = ctx.hemY - waist;
      if (r.y > waist) { // 腰まで届かない：2割ちょっとまでなら丈をのばして、腰から裾までつなぐ
        if (r.h >= want * 0.75) { const ratio = want / r.h; const w = r.w * (1 + (ratio - 1) * 0.5); return { ...r, x: BODY.cx - (m.cx / m.w) * w, w, y: waist, h: want }; }
        return rect(k, waist); // 短い（ハーフパンツなど）：腰から下げる
      }
      return r;
    }
    return rect(k, BODY.waistY - 6);
  }
  if (c === 'shoes') {
    const pair = m.w / m.h > 2.4; // 横長すぎるときだけ「両足が写った写真」とみなす
    if (pair) { const k = 270 / m.w; return [{ ...rect(k, BODY.floorY, 'bottom'), flip: false }]; }
    const k = Math.min(118 / m.w, 84 / m.h), w = m.w * k, h = m.h * k;
    return [
      { x: 232 - w / 2, y: BODY.floorY - h, w, h, flip: false },
      { x: 368 - w / 2, y: BODY.floorY - h, w, h, flip: true }
    ];
  }
  if (c === 'accessory') {
    if (sub === 'hat') { const k = fit(m, 150, 76); return rect(k, BODY.headY - 40, 'top'); }
    if (sub === 'umbrella') { const k = fit(m, 120, 520); const r = rect(k, 500, 'top'); r.x = 470 - r.w / 2; return r; }
    const k = fit(m, 110, 130); const r = rect(k, 520, 'top'); r.x = 470 - r.w / 2; return r;
  }
  return rect(fit(m, 120, 120), 300);
}
