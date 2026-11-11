// アイテムの小さな絵：写真があれば写真、無ければ主色・副色の色見本。
import { el } from '../util/dom.js';
import { CATEGORIES } from '../config.js';
import { thumbURL } from '../data/images.js';

const catLabel = (c) => (CATEGORIES.find((x) => x.id === c) || { label: '' }).label;

/** item: アイテム（写真は読めたときに差し替わる）（null なら「なし」）。size: 's' | 'm' | 'l'。 */
export function thumbEl(item, size = 'm') {
  if (!item) return el('span', { class: `thumb ${size} none`, text: 'なし' });
  const box = el('span', { class: `thumb ${size}`, title: item.name || catLabel(item.category) });
  const swatch = () => {
    box.style.background = item.color_sub
      ? `linear-gradient(135deg, ${item.color_main} 0 62%, ${item.color_sub} 62% 100%)`
      : item.color_main;
    box.append(el('span', { class: 'thumb-cat', text: catLabel(item.category) }));
  };
  if (item.hasPhoto && item.id) {
    swatch(); // 写真が届くまでは色見本を出しておく
    const img = el('img', { alt: item.name || catLabel(item.category), decoding: 'async' });
    thumbURL(item.id).then((u) => { if (!u) return; img.onload = () => { box.replaceChildren(img); box.style.background = ''; }; img.src = u; }).catch(() => {});
  } else swatch();
  return box;
}

/** 名前（無ければ種類）。 */
export const itemName = (item) => (item ? item.name || catLabel(item.category) : 'なし');
