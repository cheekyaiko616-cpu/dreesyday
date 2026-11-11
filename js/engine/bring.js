// 持ち物の候補（純関数）。天気・予定・毎日の持ち物から作る。重複は1つにまとめる。

/**
 * weather: { pop, uv, wind }。events: [{ title, tab }]。daily: 毎日の持ち物。umbrellaName: クローゼットの傘の名前（無ければ ''）。
 */
export function bringList({ weather, events, daily, umbrellaName }, R) {
  const out = [...(daily || [])];
  if (weather) {
    if (weather.pop >= R.rain.popThreshold) out.push(umbrellaName || '傘');
    else if (weather.pop >= R.rain.foldingUmbrellaFrom) out.push('折りたたみ傘');
    if (weather.uv >= R.bring.uvFrom) out.push('帽子', '日焼け止め');
    if (weather.wind >= R.bring.windFrom) out.push('風よけの上着');
  }
  (events || []).forEach((e) => {
    const text = `${e.tab || ''} ${e.title || ''}`;
    R.bring.event.forEach((rule) => { if (new RegExp(rule.match).test(text)) out.push(...rule.items); });
  });
  return [...new Set(out.map((x) => String(x).trim()).filter(Boolean))];
}
