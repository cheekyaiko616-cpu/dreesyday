// 天気を読み込む：設定した場所（自宅など）と、今日・明日の予定の会場。
// 服装の判定には、両方のうち「寒いほう・雨が多いほう」を使う（出かける先で困らないように）。
import { state, notify } from '../state.js';
import { forecast, daytimeFeels } from '../services/weather.js';
import { locate, hasPlace } from '../services/geo.js';
import { eventsOn } from './calendar-feed.js';
import { todayIso, addDaysIso } from '../util/date.js';
import { sampleForecast } from './sample.js';
import { daySwing } from '../engine/swing.js';

const get = (pos) => (__PREVIEW__ ? Promise.resolve(sampleForecast(pos)) : forecast(pos));

export async function loadWeather() {
  const home = state.settings.home || (__PREVIEW__ ? { name: '名古屋（見本）', lat: 35.17, lon: 136.88 } : null);
  const w = { status: 'loading', home: null, homeName: home ? home.name : '', venues: {} };
  state.weather = w;
  notify();
  try {
    if (home) w.home = await get(home);
  } catch (e) { w.status = 'error'; }
  // 1週間先までの予定の会場（多すぎると遅くなるので、最大6か所）
  const places = new Set();
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => addDaysIso(todayIso(), i)).forEach((d) => eventsOn(d).forEach((ev) => { if (hasPlace(ev.place)) places.add(ev.place); }));
  for (const place of [...places].slice(0, 6)) {
    try {
      const pos = __PREVIEW__ ? { lat: 36.53, lon: 140.23, name: place } : await locate(place);
      w.venues[place] = pos ? { name: pos.name || place, data: await get(pos) } : null;
    } catch (e) { w.venues[place] = null; }
  }
  if (w.status !== 'error') w.status = home ? 'ok' : 'nohome';
  notify();
}

/**
 * その日の服装用の天気（自宅と会場のうち、厳しいほう）。無ければ null。
 * 返す: { feels, pop, wind, code, max, min, from: ['自宅', '会場名'] }
 */
export function dayWeather(date, events) {
  const list = [];
  if (state.weather.home && state.weather.home.days[date]) list.push({ name: state.weather.homeName, d: state.weather.home.days[date] });
  (events || []).forEach((ev) => {
    const v = state.weather.venues[ev.place];
    if (v && v.data.days[date]) list.push({ name: v.name, d: v.data.days[date] });
  });
  if (!list.length) return null;
  const pickCold = list.reduce((a, b) => (daytimeFeels(b.d) < daytimeFeels(a.d) ? b : a));
  return {
    feels: Math.min(...list.map((x) => daytimeFeels(x.d))),
    pop: Math.max(...list.map((x) => x.d.pop)),
    wind: Math.max(...list.map((x) => x.d.wind)),
    code: pickCold.d.code, max: pickCold.d.max, min: pickCold.d.min,
    from: list.map((x) => x.name),
    swing: state.weather.home ? daySwing(state.weather.home.hours, date) : null // 朝・昼・夜の気温と差
  };
}
