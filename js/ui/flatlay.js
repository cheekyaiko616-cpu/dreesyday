// 切り抜いた服だけを平置きに並べた画像（背景は透明）。コーデ提案カードに出す。
import { el } from '../util/dom.js';
import { flatLayout } from '../engine/flatlay.js';
import { itemPicture, imageStamp } from '../data/images.js';

/** fit: { outer, tops, bottoms, shoes, accessories } → canvas */
export async function drawFlatlay(fit) {
  const list = [fit.outer, fit.tops, fit.bottoms, fit.shoes, ...(fit.accessories || [])].filter(Boolean);
  const pics = await Promise.all(list.map(itemPicture));
  const ok = list.map((it, i) => (pics[i] ? { it, img: pics[i].img, cut: pics[i].cut } : null)).filter(Boolean);
  const lay = flatLayout(ok.map(({ it, img }) => ({ category: it.category, w: img.width, h: img.height })));
  const c = document.createElement('canvas');
  c.width = lay.width; c.height = lay.height;
  const g = c.getContext('2d');
  for (const r of lay.rects) {
    const { img, cut } = ok[r.index];
    g.save();
    g.shadowColor = 'rgba(30,25,20,.28)'; g.shadowBlur = cut ? 12 : 3; g.shadowOffsetY = cut ? 5 : 1;
    g.drawImage(img, r.x, r.y, r.w, r.h);
    g.restore();
  }
  return c;
}

/** 平置きの画像要素（描けたら差し替わる）。 */
const shown = new Map(); // 描いた画像（data URL）を少しだけ覚える。同じ組み合わせなら描き直さない
const keyOf = (fit) => [fit.outer, fit.tops, fit.bottoms, fit.shoes, ...(fit.accessories || [])].filter(Boolean)
  .map((it) => `${it.id}.${it.category}.${it.hasCut ? 1 : 0}.${imageStamp(it.id)}`).join('|');

export function flatlayEl(fit) {
  const img = el('img', { class: 'flatlay-img', alt: 'コーデの平置き（切り抜き）' });
  const key = keyOf(fit);
  if (shown.has(key)) { img.src = shown.get(key); } else {
    drawFlatlay(fit).then((c) => {
      const url = c.toDataURL('image/png');
      shown.set(key, url); if (shown.size > 12) shown.delete(shown.keys().next().value);
      img.src = url;
    }).catch(() => {});
  }
  return el('figure', { class: 'flatlay' }, img);
}
