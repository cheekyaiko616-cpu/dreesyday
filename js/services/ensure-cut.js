// 切り抜きがまだ無いアイテム（前のバージョンで登録したもの）を、裏で 1 つずつ切り抜く。
import { state } from '../state.js';
import { saveItem } from '../data/closet.js';
import { photoImage, storeCut } from '../data/images.js';
import { cutOut, cutoutSupported } from './cutout.js';

let running = false;

export async function ensureCuts() {
  if (running || !cutoutSupported()) return;
  running = true;
  try {
    for (const it of state.items.filter((x) => x.hasPhoto && !x.hasCut)) {
      try {
        const img = await photoImage(it.id);
        if (!img) continue;
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        const r = await cutOut(c);
        if (r.method !== 'ai') continue;
        await storeCut(it.id, r.rgb, r.alpha);
        await saveItem({ ...it, hasCut: true });
      } catch { /* 1つ失敗しても続ける */ }
    }
  } finally { running = false; }
}
