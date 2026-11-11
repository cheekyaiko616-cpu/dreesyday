// Gemini のAPIキー。この端末の中だけに保存する（バックアップ・ソース・GitHub には入れない）。
import { get, put, del } from './db.js';

let cached = null;

export async function loadGeminiKey() {
  try { cached = String((await get('kv', 'geminiKey')) || ''); } catch { cached = ''; }
  return cached;
}
export const geminiKey = () => cached || '';

export async function saveGeminiKey(key) {
  const k = String(key || '').trim().slice(0, 200);
  cached = k;
  if (k) await put('kv', 'geminiKey', k); else await del('kv', 'geminiKey');
}
