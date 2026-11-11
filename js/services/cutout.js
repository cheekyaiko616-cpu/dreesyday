// 服の写真から背景を取り除く（端末の中だけで完結）。
// U²-Net-p（Apache-2.0, 約2MB に圧縮）を WebGL2 で動かす。使えない端末では背景色の差で切り抜く簡易版。
import { createGLRunner, glAvailable } from './u2net-gl.js';
import { binarize, largestBlob, fillHoles, feather } from './mask.js';

const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
const PAD = 0.2, TH = 0.2, WORK = 640;
let runner = null, loading = null;

async function getRunner() {
  if (runner) return runner;
  if (!loading) loading = (async () => {
    const [m, b] = await Promise.all([
      fetch('./models/u2netp.json').then((r) => r.json()),
      fetch('./models/u2netp.f16').then((r) => r.arrayBuffer()),
    ]);
    runner = { run: createGLRunner(m, new Uint16Array(b)), size: m.size };
    return runner;
  })();
  return loading;
}

export const cutoutSupported = () => glAvailable();
const nextFrame = () => new Promise((r) => setTimeout(r, 0));

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** 端の色を外側へ延ばして余白をつくる（余白に切れた服が見えないよう、端をそのまま伸ばす） */
function padded(src, p) {
  const w = src.width, h = src.height, c = mk(w + 2 * p, h + 2 * p), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, w, 1, p, 0, w, p); g.drawImage(src, 0, h - 1, w, 1, p, h + p, w, p);
  g.drawImage(src, 0, 0, 1, h, 0, p, p, h); g.drawImage(src, w - 1, 0, 1, h, w + p, p, p, h);
  g.drawImage(src, 0, 0, 1, 1, 0, 0, p, p); g.drawImage(src, w - 1, 0, 1, 1, w + p, 0, p, p);
  g.drawImage(src, 0, h - 1, 1, 1, 0, h + p, p, p); g.drawImage(src, w - 1, h - 1, 1, 1, w + p, h + p, p, p);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, p, p);
  return c;
}

function toInput(canvas, S, flip) {
  const c = mk(S, S), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  if (flip) { g.translate(S, 0); g.scale(-1, 1); }
  g.drawImage(canvas, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data, o = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let k = 0; k < 3; k++) o[k * S * S + i] = (d[i * 4 + k] / 255 - MEAN[k]) / STD[k];
  return o;
}

/** AI で 0..1 のマスク（src と同じ大きさ）を得る */
async function aiMask(src) {
  const { run, size } = await getRunner();
  const p = Math.round(Math.max(src.width, src.height) * PAD);
  const pc = padded(src, p), S = size;
  const a = run(toInput(pc, S, false));
  await nextFrame();
  const bf = run(toInput(pc, S, true));
  const m = new Float32Array(S * S);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = (a[y * S + x] + bf[y * S + (S - 1 - x)]) / 2; m[y * S + x] = v;
    if (v < lo) lo = v; if (v > hi) hi = v;
  }
  for (let i = 0; i < m.length; i++) m[i] = (m[i] - lo) / (hi - lo + 1e-8);
  // 余白つきの大きさへ拡大（双一次）→ 元の範囲だけ切り出す
  const W = pc.width, H = pc.height, out = new Float32Array(src.width * src.height);
  for (let y = 0; y < src.height; y++) {
    const fy = Math.min(S - 1, Math.max(0, (y + p + 0.5) * S / H - 0.5)), y0 = Math.floor(fy), y1 = Math.min(S - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < src.width; x++) {
      const fx = Math.min(S - 1, Math.max(0, (x + p + 0.5) * S / W - 0.5)), x0 = Math.floor(fx), x1 = Math.min(S - 1, x0 + 1), tx = fx - x0;
      out[y * src.width + x] = (m[y0 * S + x0] * (1 - tx) + m[y0 * S + x1] * tx) * (1 - ty) + (m[y1 * S + x0] * (1 - tx) + m[y1 * S + x1] * tx) * ty;
    }
  }
  return out;
}

/** AIが使えないとき：四隅の色に近い画素を背景として外側から取り除く */
function simpleMask(src) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const cs = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]].map(([x, y]) => [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2]]);
  const near = (i) => cs.some((c) => Math.hypot(d[i * 4] - c[0], d[i * 4 + 1] - c[1], d[i * 4 + 2] - c[2]) < 38);
  const bg = new Uint8Array(w * h), st = [];
  const push = (p) => { if (!bg[p] && near(p)) { bg[p] = 1; st.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (st.length) {
    const p = st.pop(), x = p % w;
    if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w);
  }
  const m = new Float32Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = bg[i] ? 0 : 1;
  return m;
}

/**
 * 写真（canvas）を切り抜く。返す: { rgb, alpha, w, h, method }
 * rgb: 切り抜き範囲の色（不透明の canvas）、alpha: 同じ範囲の透明度（0〜255）。余白は最小限に切り詰め済み。
 * png: true のときだけ、透明PNGの dataUrl も返す（見本づくり用）。
 */
export async function cutOut(photo, { png = false } = {}) {
  const k = Math.min(1, WORK / Math.max(photo.width, photo.height));
  const src = mk(Math.round(photo.width * k), Math.round(photo.height * k));
  src.getContext('2d').drawImage(photo, 0, 0, src.width, src.height);
  const w = src.width, h = src.height;
  let method = 'ai', m;
  try { if (!glAvailable()) throw new Error('nogl'); m = await aiMask(src); }
  catch { method = 'simple'; m = simpleMask(src); }
  let b = binarize(m, method === 'ai' ? TH : 0.5);
  b = largestBlob(b, w, h);
  b = fillHoles(b, w, h, Math.round(w * h * 0.002));
  const alpha = feather(b, w, h, 2, 1);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x] > 8) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 <= x0 || y1 <= y0) throw new Error('empty');
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const rgb = mk(cw, ch); rgb.getContext('2d').drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);
  const a = new Uint8ClampedArray(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) a[y * cw + x] = alpha[(y + y0) * w + x + x0];
  const res = { rgb, alpha: a, w: cw, h: ch, method };
  if (png) {
    const img = rgb.getContext('2d').getImageData(0, 0, cw, ch);
    for (let i = 0; i < cw * ch; i++) img.data[i * 4 + 3] = a[i];
    const o = mk(cw, ch); o.getContext('2d').putImageData(img, 0, 0);
    res.dataUrl = o.toDataURL('image/png');
  }
  return res;
}
