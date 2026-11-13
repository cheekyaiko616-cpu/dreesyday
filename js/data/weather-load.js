// 天気を読み込む：設定した場所（自宅など）と、今日・明日の予定の会場。
// 服装の判定には、両方のうち「寒いほう・雨が多いほう」を使う（出かける先で困らないように）。
import { state, notify } from '../state.js';
import { forecast, daytimeFeels } from '../services/weather.js';
import { locate, hasPlace } from '../services/geo.js';
import { eventsOn } from './calendar-feed.js';
import { todayIso, addDaysIso } from '../util/date.js';
import { sampleForecast } from './sample.js';
import { daySwing } from '../engine/swing.js';

const get = (pos, light) => (__PREVIEW__ ? Promise.resolve(sampleForecast(pos)) : forecast(pos, light));

export async function loadWeather(calendarReady) {
  const home = state.settings.home || (__PREVIEW__ ? { name: '名古屋（見本）', lat: 35.17, lon: 136.88 } : null);
  const w = { status: 'loading', home: null, homeName: home ? home.name : '', venues: {} };
  state.weather = w;
  notify();
  try {
    if (home) w.home = await get(home);
  } catch (e) { w.status = 'error'; w.error = (e && e.message) || ''; }
  // 自宅の天気が読めたら、すぐ表示する（会場の天気を待たない）
  if (w.status !== 'error') w.status = home ? 'ok' : 'nohome';
  notify();
  try { if (calendarReady) await calendarReady; } catch { /* 予定が読めなくても続ける */ }
  if (state.weather !== w) return;
  // 1週間先までの予定の会場は、あとから1か所ずつ足していく（多すぎると遅いので最大6か所。近い日の予定が先）
  // 会場ごとに、予定がある一番遠い日までの分だけ取る（1時間ごとの天気は取らない）
  const places = new Map();
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => eventsOn(addDaysIso(todayIso(), i)).forEach((ev) => { if (hasPlace(ev.place)) places.set(ev.place, i + 1); }));
  for (const [place, need] of [...places].slice(0, 6)) {
    if (state.weather !== w) return; // 読み直しが始まっていたら、古いほうは打ち切る
    try {
      const pos = __PREVIEW__ ? { lat: 36.53, lon: 140.23, name: place } : await locate(place);
      w.venues[place] = pos ? { name: pos.name || place, data: await get(pos, need) } : null;
    } catch (e) { w.venues[place] = null; }
    notify();
  }
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
