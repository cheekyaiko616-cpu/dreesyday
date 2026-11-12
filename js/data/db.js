// 保存先（IndexedDB）との出し入れだけを担当する。写真も入るので localStorage ではなく IndexedDB を使う。
// 使えない環境（Claude上のプレビューなど）では、メモリ上だけで動く（閉じると消える）。
import { DB } from '../config.js';

const STORES = ['items', 'favorites', 'kv', 'images'];
let dbp = null;
const mem = { items: new Map(), favorites: new Map(), kv: new Map(), images: new Map() };
let memoryOnly = false;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((ok) => {
    let done = false;
    const finish = (db) => { if (done) { if (db) db.close(); return; } done = true; clearTimeout(timer); if (!db) memoryOnly = true; ok(db); };
    // 古い版を開いたままの別のタブがあると、開くのが終わらないことがある。待ち続けず、メモリ上だけで動く。
    const timer = setTimeout(() => finish(null), 3000);
    try {
      const req = indexedDB.open(DB.name, DB.version);
      req.onupgradeneeded = () => STORES.forEach((s) => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); });
      req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); dbp = null; }; finish(req.result); };
      req.onerror = () => finish(null);
      req.onblocked = () => { /* タイマーで見切る */ };
    } catch (e) { finish(null); }
  });
  return dbp;
}

/** メモリ上だけで動いているか（画面に注意を出すため）。 */
export const isMemoryOnly = () => memoryOnly;

function run(store, mode, fn) {
  return open().then((db) => {
    if (!db) return fn(null);
    return new Promise((ok, ng) => {
      const tx = db.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      tx.oncomplete = () => ok(r && 'result' in r ? r.result : undefined);
      tx.onerror = () => ng(tx.error);
      tx.onabort = () => ng(tx.error || new Error('保存が中断されました'));
    });
  });
}

export async function getAll(store) {
  const db = await open();
  if (!db) return [...mem[store].values()];
  return new Promise((ok, ng) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => ok(req.result || []);
    req.onerror = () => ng(req.error);
  });
}

export async function get(store, key) {
  const db = await open();
  if (!db) return mem[store].get(key);
  return new Promise((ok, ng) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => ng(req.error);
  });
}

export function put(store, key, value) {
  return run(store, 'readwrite', (s) => (s ? s.put(value, key) : mem[store].set(key, value)));
}

export function del(store, key) {
  return run(store, 'readwrite', (s) => (s ? s.delete(key) : mem[store].delete(key)));
}

export function clearStore(store) {
  return run(store, 'readwrite', (s) => (s ? s.clear() : mem[store].clear()));
}

/** ブラウザに「このデータは消さないで」と頼む。通らなくても支障はない。 */
export async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* 何もしない */ }
}
