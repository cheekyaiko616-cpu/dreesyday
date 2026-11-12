// 提案の理由（40字以内・やさしい言葉）を、点数から組み立てる（純関数）。

export const REL = { 'neutral+accent': '色は1色＋白黒系でまとまり良好', analogous: '似た色どうしで落ち着いた印象', complement: '反対の色でメリハリあり', neutral: '白黒系でまとめてすっきり', other: '色数は少なめ', many: '色が多めなので小物で調整を' };

/** r: scoreOutfit の結果。o: コーデ。weather: { feels, pop }。 */
export function reasonText(o, r, weather, popThreshold) {
  const parts = [];
  if (weather.pop >= popThreshold && o.outer && o.outer.rain_ok) parts.push(`降水${weather.pop}%なので雨に強い上着に`);
  else if (weather.pop >= popThreshold && o.shoes && o.shoes.rain_ok) parts.push(`降水${weather.pop}%なので雨に強い靴に`);
  if (r.score.warmth >= 0.7) parts.push(`体感${Math.round(weather.feels)}℃にちょうどよい暖かさ`);
  else if (r.warmth_sum < r.band.target) parts.push(`体感${Math.round(weather.feels)}℃。少し薄着なので注意`);
  else parts.push(`体感${Math.round(weather.feels)}℃。暑ければ一枚脱いで`);
  if (weather.swing && weather.swing.range >= 8 && o.outer) parts.push('朝晩の冷えに上着が役立つ');
  if (r.score.pattern < 1) parts.push('柄ものが重なっている');
  if (r.score.material < 1) parts.push('素材が今日の気温に合わない');
  parts.push(REL[r.color_summary.relationship] || '');
  let text = '';
  for (const p of parts.filter(Boolean)) {
    const next = text ? `${text}。${p}` : p;
    if (next.length + 1 > 40) break;
    text = next;
  }
  return `${text}。`;
}
