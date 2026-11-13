// 乗り換え・ナビ・マップのリンクを作る（通信はしない。タップで外のアプリ／ページが開く）。
import { TRIP } from '../config.js';

/**
 * Yahoo!乗換案内の検索ページ。出発駅・到着駅だけを渡す（日時は渡さない。アプリで開くと、現在の日時で検索の画面が開く）。
 * アプリが入っていればアプリで、なければブラウザで開く。
 */
export function transitUrl({ from, to }) {
  return `${TRIP.transit}?${new URLSearchParams({ from, to })}`;
}

/** Yahoo!カーナビ（入っている端末だけで開く）。現在地から会場までの道順。 */
export function carnaviUrl(pos, label) {
  const name = String(label || '目的地').replace(/,/g, ' ');
  return `${TRIP.carnaviScheme}?point=current&point=${pos.lat.toFixed(7)},${pos.lon.toFixed(7)},${encodeURIComponent(name)}`;
}

/** マップ（iPhoneの標準マップ）。場所が分かれば印を付けて開く。 */
export function mapUrl(pos, place) {
  const q = encodeURIComponent(place || '会場');
  return pos ? `https://maps.apple.com/?ll=${pos.lat},${pos.lon}&q=${q}` : `https://maps.apple.com/?q=${q}`;
}

/** 日本国内か（乗り換え案内は国内だけ使える）。 */
const JAPAN = [[23.8, 28.6, 122.8, 131.4], [28.6, 34, 128, 132.1], [34.05, 34.75, 129.1, 129.55], [32.6, 36.5, 130.6, 136], [32.3, 41.6, 136, 142.2], [41.3, 45.6, 139.3, 145.9], [24, 27.8, 140.8, 142.5]];
export const inJapan = (pos) => !!pos && JAPAN.some(([a, b, c, d]) => pos.lat >= a && pos.lat <= b && pos.lon >= c && pos.lon <= d);

/** 現在地（許可が必要）。 */
export function whereAmI() {
  return new Promise((ok, ng) => {
    if (!('geolocation' in navigator)) { ng(new Error('この端末では現在地を使えません')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => ng(new Error(e.code === 1 ? '位置情報が許可されていません。設定で許可するか、駅名を入力してください' : '現在地を取得できませんでした。駅名を入力してください')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
  });
}
