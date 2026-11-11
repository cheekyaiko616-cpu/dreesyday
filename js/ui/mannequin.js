// マネキンに、切り抜いた服を重ねて 1 枚の画像にする。
// 服の形は engine/layout.js が測って置き場所を決め、ここでは重ね順・影・体の描画を担当する。
import { CANVAS, BODY, measure, place } from '../engine/layout.js';
import { bodyDims, sizeFeel } from '../engine/fit.js';
import { state } from '../state.js';
import { itemPicture } from '../data/images.js';

const { w: W, h: H } = CANVAS;

/** アイテム → { img, m, cut }。切り抜きがあればそれを、無ければ写真をそのまま（四角のまま）使う。 */
async function prepare(item) {
  const pic = await itemPicture(item);
  if (!pic) return null;
  const img = pic.img;
  const c = document.createElement('canvas');
  c.width = Math.min(img.width, 200); c.height = Math.round(c.width * img.height / img.width);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, c.width, c.height);
  const m = measure(c.width, c.height, g.getImageData(0, 0, c.width, c.height).data);
  return { img, m: { ...m, w: img.width, h: img.height, cx: (m.cx / c.width) * img.width }, cut: pic.cut, item };
}

function drawBody(g, ws) {
  const cx = BODY.cx;
  // 床の影
  const sh = g.createRadialGradient(cx, BODY.floorY + 4, 10, cx, BODY.floorY + 4, 190);
  sh.addColorStop(0, 'rgba(60,50,40,.28)'); sh.addColorStop(1, 'rgba(60,50,40,0)');
  g.save(); g.scale(1, 0.16); g.translate(0, (BODY.floorY + 4) * (1 / 0.16 - 1)); g.fillStyle = sh;
  g.beginPath(); g.arc(cx, BODY.floorY + 4, 190, 0, Math.PI * 2); g.fill(); g.restore();

  const gr = g.createLinearGradient(170, 0, 430, 0);
  gr.addColorStop(0, '#cfc9c0'); gr.addColorStop(0.5, '#e6e1d9'); gr.addColorStop(1, '#c7c1b8');
  g.fillStyle = gr;
  const p = (f) => { g.beginPath(); f(); g.fill(); };
  g.save(); g.translate(cx, 0); g.scale(ws, 1); g.translate(-cx, 0); // 体の横幅（体重しだい）
  // 脚
  p(() => { g.moveTo(236, 500); g.bezierCurveTo(226, 620, 240, 760, 246, 905); g.lineTo(290, 905);
    g.bezierCurveTo(292, 780, 296, 640, 300, 560); g.bezierCurveTo(304, 640, 308, 780, 310, 905); g.lineTo(354, 905);
    g.bezierCurveTo(360, 760, 374, 620, 364, 500); g.closePath(); });
  // 胴（肩〜腰〜腰まわり）
  p(() => { g.moveTo(206, 192); g.bezierCurveTo(250, 176, 350, 176, 394, 192); g.bezierCurveTo(388, 280, 366, 360, 364, 430);
    g.bezierCurveTo(372, 470, 380, 500, 376, 530); g.lineTo(224, 530); g.bezierCurveTo(220, 500, 228, 470, 236, 430);
    g.bezierCurveTo(234, 360, 212, 280, 206, 192); g.closePath(); });
  // 腕（少し開いて、袖が体にかぶらないように）
  p(() => { g.moveTo(206, 194); g.bezierCurveTo(186, 206, 180, 250, 176, 330); g.bezierCurveTo(172, 400, 166, 450, 162, 492);
    g.lineTo(188, 498); g.bezierCurveTo(194, 440, 206, 380, 216, 320); g.bezierCurveTo(222, 270, 226, 230, 228, 200); g.closePath(); });
  p(() => { g.moveTo(394, 194); g.bezierCurveTo(414, 206, 420, 250, 424, 330); g.bezierCurveTo(428, 400, 434, 450, 438, 492);
    g.lineTo(412, 498); g.bezierCurveTo(406, 440, 394, 380, 384, 320); g.bezierCurveTo(378, 270, 374, 230, 372, 200); g.closePath(); });
  g.restore();
  // 首・頭
  p(() => { g.moveTo(278, 136); g.lineTo(322, 136); g.lineTo(330, 192); g.lineTo(270, 192); g.closePath(); });
  p(() => { g.ellipse(cx, BODY.headY, 40, 50, 0, 0, Math.PI * 2); });
}

function drawItem(g, prep, r, { shadow = 1 } = {}) {
  g.save();
  g.shadowColor = `rgba(30,25,20,${0.34 * shadow})`; g.shadowBlur = prep.cut ? 14 : 4; g.shadowOffsetY = prep.cut ? 6 : 1;
  if (r.flip) { g.translate(r.x + r.w / 2, 0); g.scale(-1, 1); g.drawImage(prep.img, -r.w / 2, r.y, r.w, r.h); }
  else g.drawImage(prep.img, r.x, r.y, r.w, r.h);
  g.restore();
}

/** fit: { tops, bottoms, outer, shoes, accessories }。描いた canvas（600×1000）を返す。 */
export async function drawMannequin(fit) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f6f4f0'); bg.addColorStop(1, '#eae6df');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const body = (state.settings && state.settings.body) || {};
  const { S, ws } = bodyDims(body);
  g.save(); g.translate(BODY.cx, BODY.floorY); g.scale(S, S); g.translate(-BODY.cx, -BODY.floorY); // 身長に合わせた縮尺
  drawBody(g, ws);

  const [tops, bottoms, outer, shoes] = await Promise.all([fit.tops, fit.bottoms, fit.outer, fit.shoes].map(prepare));
  const acc = await Promise.all((fit.accessories || []).map(prepare));
  const ctx = { hasOuter: !!outer, ws };
  if (shoes) { const r = [].concat(place(shoes.item, shoes.m, ctx))[0]; ctx.hemY = r.y + r.h * 0.4; } // パンツの裾の高さ（靴の上端より少し下。靴を後から重ねて裾にかぶせる）
  const each = (prep, f) => { if (!prep) return; const feel = sizeFeel(prep.item, body); [].concat(place(prep.item, prep.m, { ...ctx, wk: feel.wk, hk: feel.hk })).forEach((r) => f(r)); };

  each(bottoms, (r) => drawItem(g, bottoms, r));
  each(shoes, (r) => drawItem(g, shoes, r, { shadow: 0.7 })); // 靴がパンツの裾にかぶさる
  if (outer && tops) { // 上着の下のトップスは、袖を隠して胴まわりだけ見せる（襟元と裾がのぞく）
    g.save(); g.beginPath(); g.rect(BODY.cx - 88, 100, 176, 600); g.clip();
    each(tops, (r) => drawItem(g, tops, r)); g.restore();
  } else each(tops, (r) => drawItem(g, tops, r));
  each(outer, (r) => drawItem(g, outer, r));
  acc.filter(Boolean).forEach((a) => { if (a.item.sub_category !== 'hat') each(a, (r) => drawItem(g, a, r)); });
  acc.filter(Boolean).forEach((a) => { if (a.item.sub_category === 'hat') each(a, (r) => drawItem(g, a, r)); });
  g.restore();
  return c;
}
