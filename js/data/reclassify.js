// 分類を追加したとき、すでに保存してある服にも当てはめる。
//  1) 名前に分類の名前が入っている服は、すぐ当てはめる。
//  2) 写真がある服は、Geminiに「これは○○か」を聞いて当てはめる（頼んだときだけ。服1着につき1回）。
import { state } from '../state.js';
import { saveItem } from './closet.js';
import { geminiKey } from './gemini-key.js';
import { thumbURL } from './images.js';
import { askGeminiAboutImage } from '../services/gemini.js';

// 柄は無地・柄プリントの服が、素材はその他の服が、新しい分類に当てはまる可能性がある
const KIND = {
  pattern: { word: '柄', def: ['plain', 'print'] },
  material: { word: '素材', def: ['other'] }
};

/** 名前に分類名が入っている服（まだ当てはめていないもの）。 */
export const byName = (kind, label) => state.items.filter((x) => KIND[kind].def.includes(x[kind]) && x.name.includes(label));

/** 写真で確認できる服（名前では決まらなかったもの）。 */
export const byPhoto = (kind, label) => state.items.filter((x) => x.hasPhoto && KIND[kind].def.includes(x[kind]) && !x.name.includes(label));

export async function applyByName(kind, id, label) {
  const list = byName(kind, label);
  for (const it of list) await saveItem({ ...it, [kind]: id }, { quiet: true });
  return list.length;
}

/** onProgress(done, total)。返す: { applied, error }（途中で止まったときは error に理由） */
export async function applyByPhoto(kind, id, label, onProgress) {
  const key = geminiKey();
  if (!key) return { applied: 0, error: 'Geminiのキーが未登録です' };
  const list = byPhoto(kind, label);
  const prompt = `写真の服の${KIND[kind].word}は「${label}」ですか？ 服1点だけを見て、背景や影は無視し、JSONだけで {"match": true} か {"match": false} で答えてください。自信がなければ false。`;
  let applied = 0;
  for (let i = 0; i < list.length; i++) {
    try {
      const url = await thumbURL(list[i].id);
      if (url) {
        const r = await askGeminiAboutImage(prompt, url, key);
        if (r && r.match === true) { await saveItem({ ...list[i], [kind]: id }, { quiet: true }); applied++; }
      }
    } catch (e) { return { applied, error: e.message }; }
    if (onProgress) onProgress(i + 1, list.length);
  }
  return { applied, error: '' };
}
