// 1日の気温差（純関数）。朝・昼・夜の気温と、いちばん高い／低いの差。羽織りものの目安に使う。
const near = (list, hour) => list.reduce((a, h) => (!a || Math.abs(h.hour - hour) < Math.abs(a.hour - hour) ? h : a), null);

/** hours: [{ date, hour, temp }]。date: 日付。1時間ごとの天気が足りなければ null。 */
export function daySwing(hours, date) {
  const list = (hours || []).filter((h) => h.date === date);
  if (list.length < 6) return null;
  const temps = list.map((h) => h.temp);
  return { morning: near(list, 8).temp, noon: Math.max(...list.filter((h) => h.hour >= 11 && h.hour <= 15).map((h) => h.temp), near(list, 13).temp), night: near(list, 20).temp, range: Math.max(...temps) - Math.min(...temps) };
}
