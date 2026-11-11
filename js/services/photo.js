// 写真の取り込み：小さくして保存用の文字（data URL）にし、主色・副色を推定する。
// AIは使わず、写真の中央付近の色を数えて決める（あとで自分で直せる）。
import { PHOTO } from '../config.js';

const toHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

function loadImage(file) { // blob: の URL は埋め込み表示で禁止されることがあるので、data URL で開く
  return new Promise((ok, ng) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => ok(img); img.onerror = () => ng(new Error('image')); img.src = fr.result; };
    fr.onerror = () => ng(new Error('image'));
    fr.readAsDataURL(file);
  });
}

/** 写真を長い辺 PHOTO.max に縮めて、JPEG の data URL にする。 */
export async function shrinkPhoto(file) {
  const img = await loadImage(file);
  const k = Math.min(1, PHOTO.max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL('image/jpeg', PHOTO.quality), canvas: c };
}

/**
 * 主色・副色の推定。中央の 70% だけを見て、背景に多い白っぽい色（四隅の色）は数えない。
 * 返す: { main, sub, ratio }（sub は無ければ ''）
 */
export function guessColors(canvas) {
  const n = PHOTO.sample;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0, n, n);
  const px = g.getImageData(0, 0, n, n).data;
  const at = (x, y) => { const i = (y * n + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const corners = [at(1, 1), at(n - 2, 1), at(1, n - 2), at(n - 2, n - 2)];
  const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60;
  const buckets = new Map();
  const m = Math.round(n * 0.15);
  for (let y = m; y < n - m; y++) for (let x = m; x < n - m; x++) {
    const p = at(x, y);
    if (corners.some((q) => near(p, q))) continue; // 背景らしい色は数えない
    const key = p.map((v) => v >> 5).join(',');
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += p[0]; b.g += p[1]; b.b += p[2];
    buckets.set(key, b);
  }
  const list = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => ({ n: b.n, rgb: [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)] }));
  if (!list.length) return { main: '#808080', sub: '', ratio: 1 };
  const total = list.reduce((a, b) => a + b.n, 0);
  const main = list[0];
  const sub = list.find((x) => !near(x.rgb, main.rgb) && x.n / total >= 0.12);
  return { main: toHex(...main.rgb), sub: sub ? toHex(...sub.rgb) : '', ratio: Math.round((main.n / total) * 10) / 10 };
}
