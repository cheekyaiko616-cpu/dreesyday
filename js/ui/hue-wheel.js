// 色相環（SVG）。コーデの色を、輪の上の点で見せる。白黒系（無彩色）は中央に並べる。
import { hexToHsl, isChromatic } from '../engine/color.js';
import { RULES } from '../data/rules.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
};

/** hexes: [{ hex, label }]。size: 画面上の大きさ(px)。 */
export function hueWheelEl(hexes, size = 120) {
  const root = svg('svg', { viewBox: '0 0 120 120', width: size, height: size, class: 'hue-wheel', role: 'img', 'aria-label': '色相環' });
  // 輪（24色）
  for (let i = 0; i < 24; i++) {
    const a0 = ((i * 15 - 90) * Math.PI) / 180, a1 = (((i + 1) * 15 - 90) * Math.PI) / 180;
    const p = (r, a) => `${60 + r * Math.cos(a)},${60 + r * Math.sin(a)}`;
    root.append(svg('path', { d: `M${p(56, a0)} A56,56 0 0 1 ${p(56, a1)} L${p(44, a1)} A44,44 0 0 0 ${p(44, a0)} Z`, fill: `hsl(${i * 15 + 7.5} 70% 55%)`, opacity: '.55' }));
  }
  root.append(svg('circle', { cx: 60, cy: 60, r: 40, fill: 'var(--surface)', stroke: 'var(--line)' }));
  const neutrals = [];
  hexes.forEach(({ hex }) => {
    if (!isChromatic(hex, RULES.color)) { neutrals.push(hex); return; }
    const a = ((hexToHsl(hex).h - 90) * Math.PI) / 180;
    root.append(svg('line', { x1: 60, y1: 60, x2: 60 + 50 * Math.cos(a), y2: 60 + 50 * Math.sin(a), stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }));
    root.append(svg('circle', { cx: 60 + 50 * Math.cos(a), cy: 60 + 50 * Math.sin(a), r: 7, fill: hex, stroke: 'var(--fg)', 'stroke-width': 1.5 }));
  });
  const uniq = [...new Set(neutrals)].slice(0, 5);
  uniq.forEach((hex, i) => {
    root.append(svg('circle', { cx: 60 + (i - (uniq.length - 1) / 2) * 13, cy: 60, r: 6, fill: hex, stroke: 'var(--muted)', 'stroke-width': 1 }));
  });
  return root;
}
