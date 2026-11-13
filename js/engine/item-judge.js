// 服の写真をAIに判定してもらうための文章と、返ってきた答えの検査（純関数）。
import { CATEGORIES, SUBS, FORMALITY, PATTERNS, MATERIALS } from '../config.js';

export const judgePrompt = () => [
  '写真に写っている服を1点だけ判定し、JSONだけで答えてください。背景や影、モデルの肌は無視します。',
  `category: ${CATEGORIES.map((c) => c.id).join(' | ')}`,
  `sub: ${Object.entries(SUBS).map(([k, v]) => `${k}は ${v.map((x) => x[0]).join('/')}`).join('、')}`,
  'name: 日本語の短い名前（例: ネイビーのニット）',
  'color_main: 服の本体のいちばん大きな色（#rrggbb）',
  'color_sub: 別の目立つ色（柄や切り替え）。なければ空文字',
  'warmth: 1（薄手）〜5（真冬）の整数',
  `formality: ${FORMALITY.map((f) => f[0]).join(' | ')}`,
  `pattern: ${PATTERNS.map((x) => (x[0] === x[1] ? x[0] : `${x[0]}（${x[1]}）`)).join(' | ')}（無地は plain）`,
  `material: ${MATERIALS.map((x) => (x[0] === x[1] ? x[0] : `${x[0]}（${x[1]}）`)).join(' | ')}（見て分からなければ other）`,
  'rain_ok: 撥水・防水の服なら true'
].join('\n');

const HEX = /^#[0-9a-f]{6}$/i;

/** AIの答えを、アプリで使える形に整える。使えない項目は入れない。 */
export function parseJudge(o) {
  const r = {};
  if (!o || typeof o !== 'object') return r;
  const cat = CATEGORIES.find((c) => c.id === o.category);
  if (cat) {
    r.category = cat.id;
    r.sub = SUBS[cat.id].some((x) => x[0] === o.sub) ? o.sub : 'other';
  }
  if (typeof o.name === 'string' && o.name.trim()) r.name = o.name.trim().slice(0, 40);
  if (HEX.test(o.color_main)) r.color_main = o.color_main.toLowerCase();
  r.color_sub = HEX.test(o.color_sub) ? o.color_sub.toLowerCase() : '';
  if (Number.isFinite(+o.warmth)) r.warmth = Math.max(1, Math.min(5, Math.round(+o.warmth)));
  if (FORMALITY.some((f) => f[0] === o.formality)) r.formality = o.formality;
  if (PATTERNS.some((x) => x[0] === o.pattern)) r.pattern = o.pattern;
  if (MATERIALS.some((x) => x[0] === o.material)) r.material = o.material;
  if (typeof o.rain_ok === 'boolean') r.rain_ok = o.rain_ok;
  return r;
}
