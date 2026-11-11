// バックアップ（写真を含むすべて）の書き出しと読み込み。機種変更や、データが消えたときのため。
import { APP } from '../config.js';
import { state } from '../state.js';
import { put, clearStore } from './db.js';
import { exportImages, importImages } from './images.js';
import { cleanItem, loadItems } from './closet.js';
import { loadFavorites } from './favorites.js';
import { loadSettings } from './settings.js';
import { loadLearning } from './learning.js';

/** 書き出す文字。画像はそれぞれ data URL にして、アイテムに添える。 */
export async function backupText() {
  const items = [];
  for (const it of state.items) items.push({ ...it, ...(await exportImages(it.id)) });
  return JSON.stringify({
    app: APP.id, schema: APP.schema, savedAt: new Date().toISOString(),
    items, favorites: state.favorites, settings: state.settings, adjust: state.adjust, wears: state.wears
  });
}

/** 読み込む（今のデータは置き換わる）。成功したら true。 */
export async function restoreBackup(text) {
  let body;
  try { body = JSON.parse(text); } catch (e) { return false; }
  if (!body || body.app !== APP.id) return false;
  await clearStore('items');
  await clearStore('favorites');
  await clearStore('images');
  for (const x of Array.isArray(body.items) ? body.items : []) {
    if (!x || typeof x.id !== 'string') continue;
    let flags = {};
    try { flags = await importImages(x.id.slice(0, 40), x); } catch (e) { /* 画像だけ読めなかった */ }
    const it = cleanItem({ ...x, hasPhoto: flags.hasPhoto === true, hasCut: flags.hasCut === true });
    if (it) await put('items', it.id, it);
  }
  for (const f of Array.isArray(body.favorites) ? body.favorites : []) if (f && typeof f.id === 'string') await put('favorites', f.id, f);
  if (body.settings) await put('kv', 'settings', body.settings);
  if (body.adjust) await put('kv', 'adjust', body.adjust);
  if (Array.isArray(body.wears)) await put('kv', 'wears', body.wears);
  await Promise.all([loadItems(), loadFavorites(), loadSettings(), loadLearning()]);
  return true;
}
