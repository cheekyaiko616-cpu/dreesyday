// 日付まわりの計算と表示。日付は 'YYYY-MM-DD' の文字列で持つ。
import { WEEKDAYS } from '../config.js';

const pad = (n) => (n < 10 ? '0' : '') + n;
export const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => toIso(new Date());

export function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + n));
}

/** 'YYYY-MM-DD' → '11/15(土)'。 */
export function md(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

/** 'YYYY-MM-DD' → '11月15日(土)'。 */
export function mdLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}月${d}日(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}
