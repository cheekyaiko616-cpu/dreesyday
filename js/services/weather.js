// 天気予報（Event list と同じ Open-Meteo・同じ絵文字と言葉）。
// 服装を決めるため、体感温度・紫外線・風の強さも取る。
import { WX } from '../config.js';
import { cacheGet, cacheSet } from './cache.js';
import { fetchT } from '../util/net.js';

/** 天気の番号（WMO）→ 絵文字と言葉。Event list の weatherLabel と同じ。 */
export function weatherLabel(code) {
  if (code === 0) return { icon: '☀️', label: '晴れ' };
  if (code <= 2) return { icon: '⛅️', label: '晴れ曇り' };
  if (code === 3) return { icon: '☁️', label: '曇り' };
  if (code <= 48) return { icon: '😶‍🌫️', label: '霧' };
  if (code <= 57 || code === 61 || code === 80) return { icon: '🌂', label: '小雨' };
  if (code === 63 || code === 81) return { icon: '☂️', label: '雨' };
  if (code <= 67 || code === 65 || code === 82) return { icon: '☔️', label: '大雨' };
  if (code <= 77 || code === 85 || code === 86) return { icon: '⛄️', label: '雪' };
  return { icon: '⚡️', label: '雷' };
}

/** 体感温度の最高・最低から、日中の体感（服装の目安）を出す。 */
export const daytimeFeels = (d) => Math.round((d.feelMin + (d.feelMax - d.feelMin) * 0.6) * 10) / 10;

/** 前に取れた天気（古くてもよい）。無ければ undefined。開いた直後に、読み込み中ではなく前回の天気をすぐ出すために使う。 */
export const cachedForecast = (pos) => cacheGet('wx', `${pos.lat.toFixed(2)},${pos.lon.toFixed(2)}`, Infinity);

/**
 * 場所(lat/lon)の今日から8日分（1週間先まで）と、1時間ごと。通信できなければ例外。
 * 返す: { days: { 'YYYY-MM-DD': { code, max, min, feelMax, feelMin, pop, wind } }, hours: [{ date, hour, code, temp, pop, rain(mm), wind(m/s) }] }
 */
export async function forecast(pos, light = 0) {
  // light：会場用の軽い取得。必要な日数（light日）だけ取る
  const base = `${pos.lat.toFixed(2)},${pos.lon.toFixed(2)}`;
  const key = light ? `${base}:${light}` : base;
  const fresh = (v) => v && (!v.hours.length || v.hours[0].wind !== undefined); // 降水量・風が入っていない古い保存は使わない
  const full = cacheGet('wx', base, WX.ttl); // 同じ場所の完全版があれば、それを使う
  if (fresh(full)) return full;
  const hit = cacheGet('wx', key, WX.ttl);
  if (fresh(hit)) return hit;
  const daily = 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max';
  const url = `${WX.api}?latitude=${pos.lat}&longitude=${pos.lon}&daily=${daily}&hourly=weather_code,temperature_2m,precipitation_probability,precipitation,wind_speed_10m&wind_speed_unit=ms&timezone=auto&forecast_days=${light || 8}`;
  // 通信が弱いときのために、2回まで試す。それでもだめなら、前に取れた天気（古くても）を使う
  let body = null, fail = null;
  for (let i = 0; i < 2 && !body; i++) {
    try {
      const res = await fetchT(url, {}, 15000);
      if (!res.ok) throw new Error(`天気サーバーの返事が異常です（${res.status}）`);
      body = await res.json();
    } catch (e) { fail = e; }
  }
  if (!body) {
    const old = cacheGet('wx', key, Infinity);
    if (old) return old;
    throw new Error(fail && fail.name === 'AbortError' ? '通信に時間がかかりすぎました' : (fail && fail.message) || '通信できませんでした');
  }
  const d = body.daily, h = body.hourly;
  if (!d || !Array.isArray(d.time)) throw new Error('weather');
  const days = {};
  d.time.forEach((t, i) => {
    days[t] = {
      code: d.weather_code[i], max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]),
      feelMax: Math.round(d.apparent_temperature_max[i]), feelMin: Math.round(d.apparent_temperature_min[i]),
      pop: d.precipitation_probability_max[i] ?? 0, wind: Math.round(d.wind_speed_10m_max[i] ?? 0)
    };
  });
  const hours = [];
  (h && h.time ? h.time : []).forEach((t, i) => {
    const hour = +t.slice(11, 13);
    if (hour < WX.hoursFrom || hour > WX.hoursTo) return;
    hours.push({ date: t.slice(0, 10), hour, code: h.weather_code[i], temp: Math.round(h.temperature_2m[i]), pop: h.precipitation_probability[i] ?? 0, rain: Math.round((h.precipitation ? h.precipitation[i] ?? 0 : 0) * 10) / 10, wind: Math.round(h.wind_speed_10m ? h.wind_speed_10m[i] ?? 0 : 0) });
  });
  const out = { days, hours };
  cacheSet('wx', key, out, 30);
  return out;
}
