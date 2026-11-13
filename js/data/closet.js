// 手持ちのアイテムの追加・変更・削除。写真（data URL）も一緒に保存する。
import { state, notify } from '../state.js';
import { getAll, put, del } from './db.js';
import { storePhoto, storeCutFromPng, removeImages } from './images.js';
import { CATEGORIES, SUBS, FORMALITY, STATUS, PATTERNS, MATERIALS } from '../config.js';

const HEX = /^#[0-9a-f]{6}$/i;
const pick = (v, list, def) => (list.some((x) => (Array.isArray(x) ? x[0] : x.id) === v) ? v : def);

/** 保存データを安全な形に整える。 */
export function cleanItem(x) {
  if (!x || typeof x.id !== 'string') return null;
  const category = pick(x.category, CATEGORIES, 'tops');
  return {
    id: x.id.slice(0, 40),
    name: String(x.name || '').slice(0, 40),
    category,
    sub_category: pick(x.sub_category, SUBS[category], 'other'),
    warmth: Math.max(1, Math.min(5, Math.round(+x.warmth || 3))),
    formality: pick(x.formality, FORMALITY, 'casual'),
    pattern: typeof x.pattern === 'string' && x.pattern ? x.pattern.slice(0, 24) : 'plain', // 一覧は設定で変えられるので、中身の確認はしない
    material: typeof x.material === 'string' && x.material ? x.material.slice(0, 24) : 'other',
    color_main: HEX.test(x.color_main) ? x.color_main.toLowerCase() : '#808080',
    color_sub: HEX.test(x.color_sub) ? x.color_sub.toLowerCase() : '',
    rain_ok: x.rain_ok === true,
    status: pick(x.status, STATUS, 'active'),
    hasPhoto: x.hasPhoto === true, // 写真は別の保存棚（images）に入れてある
    size: String(x.size || '').trim().slice(0, 8), // S/M/L や 32 など（空は未登録）
    hasCut: x.hasCut === true,     // 背景を取った切り抜きがあるか
    createdAt: String(x.createdAt || new Date().toISOString()).slice(0, 30)
  };
}

/** 前のバージョンの形（写真が文字で、アイテムの中に入っている）を、新しい形に1回だけ引っ越す。失敗したら元のまま残す。 */
async function migrate(raw) {
  const ph = typeof raw.photo === 'string' && raw.photo.startsWith('data:image/') ? raw.photo : '';
  const cut = typeof raw.cut === 'string' && raw.cut.startsWith('data:image/png') ? raw.cut : '';
  if (!ph && !cut) return raw;
  try {
    const next = { ...raw, hasPhoto: raw.hasPhoto === true, hasCut: raw.hasCut === true };
    if (ph) { await storePhoto(raw.id, ph); next.hasPhoto = true; }
    if (cut) { await storeCutFromPng(raw.id, cut); next.hasCut = true; }
    delete next.photo; delete next.cut;
    await put('items', next.id, next);
    return next;
  } catch (e) { return raw; }
}

export async function loadItems() {
  const raws = [];
  for (const r of await getAll('items')) raws.push(r && typeof r.id === 'string' ? await migrate(r) : r);
  state.items = raws.map(cleanItem).filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export const itemById = (id) => state.items.find((x) => x.id === id) || null;

export const newItemId = () => `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function saveItem(data, { quiet = false } = {}) {
  const item = cleanItem({ ...data, id: data.id || newItemId() });
  await put('items', item.id, item);
  const i = state.items.findIndex((x) => x.id === item.id);
  if (i >= 0) state.items[i] = item; else state.items.unshift(item);
  if (!quiet) notify();
  return item;
}

export async function removeItem(id) {
  await del('items', id);
  await removeImages(id);
  state.items = state.items.filter((x) => x.id !== id);
  notify();
}
