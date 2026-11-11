// 見本のデータを入れる（Claude上・手元のファイルで開いたときだけ。github.io の本番では入れない）。
// クローゼット（実際の服の写真つき）・お気に入りのコーデ（マネキン画像つき）・着た記録と評価をまとめて入れる。
import { state } from '../state.js';
import { put, get, clearStore } from '../data/db.js';
import { importImages } from '../data/images.js';
import { sampleItems, sampleFavorites, sampleWears, SAMPLE_VERSION } from '../data/sample.js';
import { saveSettings } from '../data/settings.js';
import { loadItems, cleanItem } from '../data/closet.js';
import { loadFavorites } from '../data/favorites.js';
import { loadLearning, fitOf } from '../data/learning.js';
import { RULES } from '../data/rules.js';
import { applyFeedback, emptyAdjust } from '../engine/feedback.js';
import { SAMPLE_PHOTOS } from '../data/sample-images.js';
import { SAMPLE_CUTS } from '../data/sample-cuts.js';
import { drawMannequin } from './mannequin.js';

/** 見本を入れる。replace=true なら、今のアイテム・お気に入り・学習を消してから入れる。 */
export async function seedSamples(replace = false) {
  if (replace) { await clearStore('items'); await clearStore('favorites'); await clearStore('images'); }
  for (const it of sampleItems()) {
    // 見本の画像は、保存の形（色JPEG＋透明度PNG＋小さな写真）まで作ってあるので、開き直さずにそのまま入れる
    const c = SAMPLE_CUTS[it.photoKey] || {};
    const { hasPhoto, hasCut } = await importImages(it.id, { photo: SAMPLE_PHOTOS[it.photoKey], thumb: c.thumb, cutRgb: c.rgb, cutAlpha: c.alpha, cutW: c.w, cutH: c.h });
    const item = cleanItem({ ...it, hasPhoto, hasCut });
    await put('items', item.id, item);
  }
  if (!state.settings.body.height) await saveSettings({ body: { height: 172, weight: 62, top: 'M', waist: 30 } }); // 確認用の体型
  await loadItems();
  for (const f of sampleFavorites()) {
    const img = await drawMannequin(fitOf(f.items));
    await put('favorites', f.id, { ...f, image: img.toDataURL('image/jpeg', 0.9), createdAt: new Date().toISOString() });
  }
  // 着た記録と、評価から学習した補正
  const wears = sampleWears().map((w) => ({ ...w, key: '', at: new Date().toISOString() }));
  let adjust = emptyAdjust();
  wears.filter((w) => w.rating).forEach((w) => { adjust = applyFeedback(adjust, { mode: w.mode, rating: w.rating, outfit: fitOf(w.items) }, RULES).adjust; });
  await put('kv', 'wears', wears);
  await put('kv', 'adjust', adjust);
  await put('kv', 'sampleVersion', SAMPLE_VERSION);
  await Promise.all([loadFavorites(), loadLearning()]);
}

/** 起動時（確認用だけ）：何も無いとき、または見本の版が古いとき（前に開いた古い見本が端末に残っているとき）に、見本を入れ直す。 */
export async function seedIfNeeded() {
  const v = await get('kv', 'sampleVersion');
  if (!state.items.length && !state.favorites.length) await seedSamples(true);
  else if (v !== SAMPLE_VERSION) await seedSamples(true);
}
