// 切り抜いた服だけを平置きに並べた画像（背景は透明）。コーデ提案カードに出す。
import { el } from '../util/dom.js';
import { flatLayout } from '../engine/flatlay.js';
import { itemPicture } from '../data/images.js';

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
export function flatlayEl(fit) {
  const img = el('img', { class: 'flatlay-img', alt: 'コーデの平置き（切り抜き）' });
  drawFlatlay(fit).then((c) => { img.src = c.toDataURL('image/png'); }).catch(() => {});
  return el('figure', { class: 'flatlay' }, img);
}
