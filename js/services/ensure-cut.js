// 切り抜きがまだ無いアイテム（前のバージョンで登録したもの）を、裏で 1 つずつ切り抜く。
import { state } from '../state.js';
import { saveItem, itemById } from '../data/closet.js';
import { notify } from '../state.js';
import { photoImage, storeCut } from '../data/images.js';
import { cutOut, cutoutSupported } from './cutout.js';

let running = false;

// 戻り値: { todo: 対象数, done: 切り抜けた数 }（すでに実行中なら null）
export async function ensureCuts() {
  if (running || !cutoutSupported()) return null;
  running = true;
  let changed = false, done = 0, todo = 0;
  try {
    const list = state.items.filter((x) => x.hasPhoto && !x.hasCut && x.category !== 'accessory');
    todo = list.length;
    for (const it of list) {
      try {
        const img = await photoImage(it.id);
        if (!img) continue;
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        const r = await cutOut(c);
        if (r.method !== 'ai') continue;
        const now = itemById(it.id); // 処理中に直したり消したりした内容を壊さないよう、最新を読み直す
        if (!now || now.category === 'accessory') continue;
        await storeCut(it.id, r.rgb, r.alpha);
        await saveItem({ ...now, hasCut: true }, { quiet: true });
        changed = true; done++;
      } catch { /* 1つ失敗しても続ける */ }
    }
  } finally { running = false; if (changed) notify(); }
  return { todo, done };
}
