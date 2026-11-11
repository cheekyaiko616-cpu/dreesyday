// コーデの「AI評価」の文章を組み立てる（純関数）。点数と色の関係・サイズ感から、よい点と気をつける点を短く書く。
// ここでいう AI は、アプリの中の判定のこと（通信はしない）。
import { REL } from './reason.js';
import { sizeFeel } from './fit.js';

const AXES = [['warmth', '暖かさ', true], ['rain', '雨への備え', true], ['formality', '服装の格', false], ['color_items', '色（アイテム）', false], ['color_total', '色のまとまり', false]];
const GOOD = 0.75, WEAK = 0.55;

/**
 * fit: コーデ。r: scoreOutfit の結果。hasWeather: 天気を使って点数を出したか。body: 体型と自分のサイズ。
 * 返す: 数行の文章（かならず1行以上）。
 */
export function evaluateText(fit, r, hasWeather, body) {
  const axes = AXES.filter(([, , needsWeather]) => hasWeather || !needsWeather);
  const good = axes.filter(([k]) => r.score[k] >= GOOD).map(([, l]) => l);
  const weak = axes.filter(([k]) => r.score[k] < WEAK).map(([, l]) => l);
  const lines = [`総合 ${Math.round(r.score.total * 100)}点${hasWeather ? '' : '（天気を使わない評価）'}`];
  if (good.length) lines.push(`◎ ${good.join('・')}`);
  if (weak.length) lines.push(`△ ${weak.join('・')}は見直す余地あり`);
  const rel = REL[r.color_summary && r.color_summary.relationship];
  if (rel) lines.push(`色: ${rel}`);
  const items = [fit.outer, fit.tops, fit.bottoms].filter(Boolean);
  const loose = items.filter((it) => sizeFeel(it, body).wk >= 1.1).map((it) => it.name || '服');
  const tight = items.filter((it) => sizeFeel(it, body).wk <= 0.92).map((it) => it.name || '服');
  if (loose.length) lines.push(`サイズ感: ${loose.join('・')}はゆったり`);
  if (tight.length) lines.push(`サイズ感: ${tight.join('・')}はぴったり〜小さめ`);
  return lines.join('\n');
}
