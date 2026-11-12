// アイテムの画像の保存と取り出し（アイテム本体とは別の保存棚 'images' に入れる）。
//   photo … 写真（JPEG）／ thumb … 一覧用の小さな写真（JPEG）／ cut … 切り抜き（色 JPEG + 透明度の別画像 PNG）
// 画像は文字（data URL）ではなくバイト列のまま保存し、使うときだけ読み込む。
import { get, put, del } from './db.js';

const KINDS = ['photo', 'thumb', 'cut', 'cthumb'];
const key = (id, kind) => `${id}:${kind}`;
const THUMB = { max: 360, quality: 0.82 };
const CUT_JPEG = 0.92;

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const toBlob = (c, type, q) => new Promise((ok, ng) => c.toBlob((b) => (b ? ok(b) : ng(new Error('blob'))), type, q));
const pack = async (blob) => ({ type: blob.type, buf: await blob.arrayBuffer() });
const unpack = (r) => new Blob([r.buf], { type: r.type });
const loadFrom = (url) => new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ng(new Error('image')); i.src = url; });

/** data URL → { type, buf }（fetch を使わず自分で読む） */
export function dataUrlToPacked(dataUrl) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error('dataurl');
  const raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return { type: m[1], buf: buf.buffer };
}
const packedToDataUrl = (r) => new Promise((ok, ng) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => ng(f.error); f.readAsDataURL(unpack(r)); });

// 画像を開く。blob: の URL は、埋め込み表示（Claude 上のプレビューなど）で禁止されていることがあるので使わない。
async function decodeBlobImage(rec) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(unpack(rec)); } catch (e) { /* 下の方法で開く */ }
  }
  return loadFrom(await packedToDataUrl(rec));
}

// ---- 読み出しの覚え書き（使ったものを少しだけ覚えておく） ----
const memo = { thumb: new Map(), photo: new Map(), cut: new Map(), cthumb: new Map() };
const LIMIT = { thumb: 400, photo: 24, cut: 16, cthumb: 400 };
function remember(kind, id, promise, onDrop) {
  const m = memo[kind];
  promise.catch(() => { if (m.get(id) === promise) m.delete(id); }); // 失敗は覚えない（次にもう一度読む）
  m.delete(id); m.set(id, promise);
  while (m.size > LIMIT[kind]) { const [k0, v0] = m.entries().next().value; m.delete(k0); if (onDrop) v0.then(onDrop, () => {}); }
  return promise;
}
const recall = (kind, id) => { const m = memo[kind]; if (!m.has(id)) return null; const v = m.get(id); m.delete(id); m.set(id, v); return v; };
const stamps = new Map(); // 画像が差し替わったことが分かる印（描画の使い回しの判定に使う）
const imgMemo = new Map(); // デコード済みの写真 Image（小物など、毎回つくり直さない）
const touch = (id) => { stamps.set(id, (stamps.get(id) || 0) + 1); imgMemo.delete(id); };
const forget = (id) => { touch(id); KINDS.forEach((k) => memo[k].delete(id)); };
export const imageStamp = (id) => stamps.get(id) || 0;

// ---- 保存 ----
async function makeThumb(img) {
  const k = Math.min(1, THUMB.max / Math.max(img.width, img.height));
  const c = mk(Math.round(img.width * k), Math.round(img.height * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return pack(await toBlob(c, 'image/jpeg', THUMB.quality));
}

/** 写真（JPEG の data URL）と、一覧用の小さな写真を保存する。 */
export async function storePhoto(id, dataUrl) {
  const packed = dataUrlToPacked(dataUrl);
  const img = await decodeBlobImage(packed);
  const thumb = await makeThumb(img);
  await put('images', key(id, 'photo'), packed);
  await put('images', key(id, 'thumb'), thumb);
  if (img.close) img.close();
  touch(id); memo.photo.delete(id); memo.thumb.delete(id);
}

/** 切り抜きを保存する。rgb: 不透明な色の canvas。alpha: 0〜255 の透明度（w*h）。 */
export async function storeCut(id, rgb, alpha) {
  const w = rgb.width, h = rgb.height;
  const ac = mk(w, h), ag = ac.getContext('2d'), ad = ag.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { ad.data[i * 4] = ad.data[i * 4 + 1] = ad.data[i * 4 + 2] = alpha[i]; ad.data[i * 4 + 3] = 255; }
  ag.putImageData(ad, 0, 0);
  const [c, a] = await Promise.all([toBlob(rgb, 'image/jpeg', CUT_JPEG), toBlob(ac, 'image/png')]);
  await put('images', key(id, 'cut'), { rgb: await pack(c), a: await pack(a), w, h });
  await del('images', key(id, 'cthumb'));
  touch(id); memo.cut.delete(id); memo.cthumb.delete(id);
}

/** 透明な所の色を、まわりの服の色でうめる（JPEG にしたとき、縁が黒ずまないように）。 */
function bleed(px, alpha, w, h) {
  let known = Uint8Array.from(alpha, (a) => (a > 0 ? 1 : 0));
  for (let pass = 0; pass < 10; pass++) {
    const next = Uint8Array.from(known);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (known[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && known[j]) { r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++; }
      }
      if (n) { px[i * 4] = r / n; px[i * 4 + 1] = g / n; px[i * 4 + 2] = b / n; next[i] = 1; }
    }
    known = next;
  }
}

/** 透明PNG（data URL）から切り抜きを保存する（古いデータの引っ越し・見本用）。 */
export async function storeCutFromPng(id, dataUrl) {
  const img = await loadFrom(dataUrl);
  const w = img.width, h = img.height, c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h), alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) { alpha[i] = d.data[i * 4 + 3]; d.data[i * 4 + 3] = 255; }
  bleed(d.data, alpha, w, h);
  g.putImageData(d, 0, 0);
  await storeCut(id, c, alpha);
}

export async function removeCut(id) { touch(id); memo.cut.delete(id); memo.cthumb.delete(id); await del('images', key(id, 'cut')); await del('images', key(id, 'cthumb')); }

export async function removeImages(id) {
  forget(id);
  for (const k of KINDS) await del('images', key(id, k));
}

// ---- 取り出し ----
const dataUrlOf = async (id, kind) => {
  const r = await get('images', key(id, kind));
  return r ? packedToDataUrl(r) : '';
};

/** 一覧用の小さな写真（data URL。無ければ ''）。 */
export const thumbURL = (id) => recall('thumb', id) || remember('thumb', id, dataUrlOf(id, 'thumb'));
/** 写真（data URL）。 */
export const photoURL = (id) => recall('photo', id) || remember('photo', id, dataUrlOf(id, 'photo'));

/** 一覧用の切り抜き（服の部分だけを正方形に収めた透明PNG の data URL。無ければ ''）。初回だけ作って保存する。 */
export const cutThumbURL = (id) => recall('cthumb', id) || remember('cthumb', id, (async () => {
  const saved = await get('images', key(id, 'cthumb'));
  if (saved) return packedToDataUrl(saved);
  const c = await cutCanvas(id);
  if (!c) return '';
  const { width: w, height: h } = c;
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return '';
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh) * 1.1, S = THUMB.max;
  const out = mk(S, S), g = out.getContext('2d');
  const k = S / side;
  g.drawImage(c, x0, y0, bw, bh, (S - bw * k) / 2, (S - bh * k) / 2, bw * k, bh * k);
  const packed = await pack(await toBlob(out, 'image/png'));
  await put('images', key(id, 'cthumb'), packed);
  return packedToDataUrl(packed);
})());

/** 切り抜き（透明）を canvas で返す。無ければ null。 */
export function cutCanvas(id) {
  const hit = recall('cut', id);
  if (hit) return hit;
  const p = (async () => {
    const r = await get('images', key(id, 'cut'));
    if (!r) return null;
    const [rgb, a] = await Promise.all([decodeBlobImage(r.rgb), decodeBlobImage(r.a)]);
    const w = r.w, h = r.h, c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(rgb, 0, 0, w, h);
    if (rgb.close) rgb.close();
    const d = g.getImageData(0, 0, w, h);
    const ac = mk(w, h), ag = ac.getContext('2d', { willReadFrequently: true });
    ag.drawImage(a, 0, 0, w, h);
    if (a.close) a.close();
    const ad = ag.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) d.data[i * 4 + 3] = ad[i * 4];
    g.putImageData(d, 0, 0);
    return c;
  })();
  return remember('cut', id, p);
}

/** 写真を Image で（切り抜きの生成・マネキンの代用に使う）。 */
export async function photoImage(id) {
  if (imgMemo.has(id)) return imgMemo.get(id);
  const url = await photoURL(id);
  const img = url ? await loadFrom(url) : null;
  if (img) { imgMemo.set(id, img); if (imgMemo.size > 12) imgMemo.delete(imgMemo.keys().next().value); }
  return img;
}

// ---- バックアップ用 ----
/** そのアイテムの画像をまとめて data URL にする。 */
export async function exportImages(id) {
  const out = {};
  const p = await get('images', key(id, 'photo'));
  if (p) out.photo = await packedToDataUrl(p);
  const t = await get('images', key(id, 'thumb'));
  if (t) out.thumb = await packedToDataUrl(t);
  const c = await get('images', key(id, 'cut'));
  if (c) { out.cutRgb = await packedToDataUrl(c.rgb); out.cutAlpha = await packedToDataUrl(c.a); out.cutW = c.w; out.cutH = c.h; }
  return out;
}

/** exportImages の逆。古い形式（photo と cut が data URL）も受ける。返す: { hasPhoto, hasCut } */
export async function importImages(id, x) {
  let hasPhoto = false, hasCut = false;
  if (typeof x.photo === 'string' && x.photo.startsWith('data:image/')) {
    if (typeof x.thumb === 'string' && x.thumb.startsWith('data:image/')) { // 小さな写真も付いているときは、開かずにそのまま入れる（速い）
      await put('images', key(id, 'photo'), dataUrlToPacked(x.photo));
      await put('images', key(id, 'thumb'), dataUrlToPacked(x.thumb));
      touch(id); memo.photo.delete(id); memo.thumb.delete(id);
    } else await storePhoto(id, x.photo);
    hasPhoto = true;
  }
  if (typeof x.cutRgb === 'string' && typeof x.cutAlpha === 'string' && x.cutW > 0 && x.cutH > 0) {
    await put('images', key(id, 'cut'), { rgb: dataUrlToPacked(x.cutRgb), a: dataUrlToPacked(x.cutAlpha), w: x.cutW, h: x.cutH });
    await del('images', key(id, 'cthumb'));
    touch(id); memo.cut.delete(id); memo.cthumb.delete(id); hasCut = true;
  } else if (typeof x.cut === 'string' && x.cut.startsWith('data:image/png')) { await storeCutFromPng(id, x.cut); hasCut = true; }
  return { hasPhoto, hasCut };
}

/** 服の絵として使う画像：切り抜きがあればそれ（cut: true）、無ければ写真。どちらも無ければ null。 */
export async function itemPicture(item) {
  if (!item || !item.id) return null;
  if (item.hasCut) { const c = await cutCanvas(item.id); if (c) return { img: c, cut: true }; }
  if (item.hasPhoto) { const i = await photoImage(item.id); if (i) return { img: i, cut: false }; }
  return null;
}
