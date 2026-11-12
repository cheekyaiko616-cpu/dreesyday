// 天気予報（Event list と同じ Open-Meteo・同じ絵文字と言葉）。
// 服装を決めるため、体感温度・紫外線・風の強さも取る。
import { WX } from '../config.js';
import { cacheGet, cacheSet } from './cache.js';

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

/**
 * 場所(lat/lon)の今日から8日分（1週間先まで）と、1時間ごと。通信できなければ例外。
 * 返す: { days: { 'YYYY-MM-DD': { code, max, min, feelMax, feelMin, pop, wind } }, hours: [{ date, hour, code, temp, pop }] }
 */
export async function forecast(pos) {
  const key = `${pos.lat.toFixed(2)},${pos.lon.toFixed(2)}`;
  const hit = cacheGet('wx', key, WX.ttl);
  if (hit) return hit;
  const daily = 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max';
  const url = `${WX.api}?latitude=${pos.lat}&longitude=${pos.lon}&daily=${daily}&hourly=weather_code,temperature_2m,precipitation_probability&wind_speed_unit=ms&timezone=auto&forecast_days=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather');
  const body = await res.json();
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
    hours.push({ date: t.slice(0, 10), hour, code: h.weather_code[i], temp: Math.round(h.temperature_2m[i]), pop: h.precipitation_probability[i] ?? 0 });
  });
  const out = { days, hours };
  cacheSet('wx', key, out, 20);
  return out;
}
