// 通信に時間制限をつける。返事が来ないまま「読み込み中」で止まらないようにする（既定12秒）。
export function fetchT(url, opts = {}, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return fetch(url, { ...opts, signal: ac.signal }).finally(() => clearTimeout(t));
}
