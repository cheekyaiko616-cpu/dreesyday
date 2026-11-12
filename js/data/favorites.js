// お気に入りのコーデ（組み合わせ・評価・メモ・タグ）。
import { state, notify } from '../state.js';
import { getAll, put, del } from './db.js';

const SLOTS = ['tops', 'bottoms', 'outer', 'shoes'];

/** コーデ（アイテムの実体）→ 保存用の id の組。 */
export function idsOf(fit) {
  const out = {};
  SLOTS.forEach((k) => { out[k] = fit[k] ? fit[k].id : null; });
  out.accessories = (fit.accessories || []).map((a) => a.id);
  return out;
}

function clean(f) {
  if (!f || typeof f.id !== 'string') return null;
  const items = {};
  SLOTS.forEach((k) => { items[k] = f.items && typeof f.items[k] === 'string' ? f.items[k] : null; });
  items.accessories = f.items && Array.isArray(f.items.accessories) ? f.items.accessories.filter((x) => typeof x === 'string') : [];
  return {
    id: f.id, items,
    stars: Math.max(0, Math.min(5, Math.round(+f.stars || 0))),
    ai: String(f.ai || '').slice(0, 600), // AI評価（アプリ内の判定が書く）
    memo: String(f.memo || '').slice(0, 300), // 自分のメモ
    tags: (Array.isArray(f.tags) ? f.tags : []).map((t) => String(t).trim().slice(0, 20)).filter(Boolean).slice(0, 10),
    createdAt: String(f.createdAt || new Date().toISOString()).slice(0, 30)
  };
}

export async function loadFavorites() {
  state.favorites = (await getAll('favorites')).map(clean).filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveFavorite(data, { quiet = false } = {}) {
  const f = clean({ ...data, id: data.id || `f${Date.now().toString(36)}` });
  await put('favorites', f.id, f);
  const i = state.favorites.findIndex((x) => x.id === f.id);
  if (i >= 0) state.favorites[i] = f; else state.favorites.unshift(f);
  if (!quiet) notify();
  return f;
}

export async function removeFavorite(id) {
  await del('favorites', id);
  state.favorites = state.favorites.filter((x) => x.id !== id);
  notify();
}
