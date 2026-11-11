// 天気・場所の検索結果を、端末に一時保存する小さな入れ物（Event list の trip-cache.js と同じ仕組み）。
// 期限が切れたら使わない。保存できない環境でも、メモリ上だけで動く。バックアップには入らない。
import { WX } from '../config.js';

let mem = null;

function load() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(WX.cacheKey) || '{}') || {}; } catch (e) { mem = {}; }
  return mem;
}

export function cacheGet(group, key, ttl) {
  const hit = (load()[group] || {})[key];
  return hit && Date.now() - hit.at < ttl ? hit.v : undefined;
}

export function cacheSet(group, key, v, max) {
  const all = load();
  const g = all[group] || (all[group] = {});
  delete g[key];
  g[key] = { at: Date.now(), v };
  const keys = Object.keys(g);
  for (let i = 0; i < keys.length - max; i++) delete g[keys[i]]; // 古いものから消す
  try { localStorage.setItem(WX.cacheKey, JSON.stringify(all)); } catch (e) { /* 保存できなくても動く */ }
}
