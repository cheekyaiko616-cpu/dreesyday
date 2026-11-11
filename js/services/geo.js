// 場所の文字 → 緯度・経度。Event list の geo.js と同じ順で探す（会場表 → 地図の検索）。
// 検索は1秒に1回までのお願いがあるので、間をあけて呼ぶ。結果は保存して、同じ場所は二度調べない。
import { WX } from '../config.js';
import { VENUES } from './venues.js';
import { cacheGet, cacheSet } from './cache.js';

/** 現地がある予定の場所か（オンライン・未定などは対象外）。 */
export const hasPlace = (place) => !!place && !WX.offline.test(place);

let last = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 場所を引く。見つからなければ null、通信できなければ例外。 */
export async function locate(place) {
  if (!hasPlace(place)) return null;
  const v = VENUES.find((x) => place.includes(x.match));
  if (v) return { lat: v.lat, lon: v.lon, name: v.name };
  const hit = cacheGet('geo', place, WX.geoTtl);
  if (hit !== undefined) return hit;
  const gap = 1100 - (Date.now() - last);
  if (gap > 0) await wait(gap);
  last = Date.now();
  const q = place.replace(/[（(].*?[）)]/g, ' ').trim();
  const res = await fetch(`${WX.geoApi}?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('geo');
  const list = await res.json();
  const top = Array.isArray(list) && list[0];
  const found = top && Number.isFinite(+top.lat) ? { lat: +top.lat, lon: +top.lon, name: place } : null;
  cacheSet('geo', place, found, 200);
  return found;
}

/** 現在地（許可が必要）。 */
export function whereAmI() {
  return new Promise((ok, ng) => {
    if (!navigator.geolocation) { ng(new Error('geo')); return; }
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), ng, { timeout: 10000, maximumAge: 600000 });
  });
}
