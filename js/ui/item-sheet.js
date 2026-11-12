// アイテムの登録・編集の画面（下から出る）。写真を選ぶと、主色・副色を自動で入れる（あとで直せる）。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { CATEGORIES, SUBS, FORMALITY, STATUS, PATTERNS, MATERIALS } from '../config.js';
import { saveItem, removeItem, newItemId } from '../data/closet.js';
import { storePhoto, storeCut, removeCut } from '../data/images.js';
import { shrinkPhoto, guessColors } from '../services/photo.js';
import { cutOut } from '../services/cutout.js';
import { thumbEl } from './thumb.js';
import { toast } from './toast.js';
import { judgeItem } from '../data/item-judge.js';
import { geminiKey } from '../data/gemini-key.js';
import { photoURL } from '../data/images.js';

const MARKUP = `
  <div class="sheet" id="it-sheet" role="dialog" aria-modal="true" aria-labelledby="it-heading">
    <div class="sheet-head">
      <h2 id="it-heading">アイテム</h2>
      <button type="button" class="ghost" id="it-close">閉じる</button>
    </div>
    <div id="it-body"></div>
  </div>`;

let wrap = null;

export function initItemSheet() {
  wrap = mountSheet(MARKUP);
  $('#it-close').addEventListener('click', () => hideSheet(wrap));
}

const field = (label, input) => el('div', { class: 'field' }, el('span', { class: 'lbl', text: label }), input);

function seg(name, options, value) {
  return el('div', { class: 'seg-row', role: 'radiogroup' }, options.map(([v, label]) => el('label', { class: 'seg-opt' },
    el('input', { type: 'radio', name, value: v, checked: v === value || null }), el('span', { text: label }))));
}
const segValue = (root, name) => { const r = root.querySelector(`input[name="${name}"]:checked`); return r ? r.value : ''; };

/** item: 編集するアイテム（新規は null）。 */
export function openItemSheet(item) {
  const d = item ? { ...item } : { category: 'tops', sub_category: 'other', warmth: 3, formality: 'casual', pattern: 'plain', material: 'other', color_main: '#808080', color_sub: '', rain_ok: false, status: 'active', hasPhoto: false, hasCut: false, name: '' };
  $('#it-heading').textContent = item ? 'アイテムを編集' : 'アイテムを追加';
  const body = $('#it-body');
  clear(body);

  const pending = { photoUrl: '', cut: null, canvas: null }; // 新しく選んだ写真と、その切り抜き（保存まで画像の保存棚には入れない）
  const picture = () => (pending.photoUrl ? el('span', { class: 'thumb l' }, el('img', { src: pending.photoUrl, alt: '' })) : thumbEl(d, 'l'));
  const preview = el('div', { class: 'it-photo' }, picture());
  const file = el('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', id: 'it-file' });
  const name = el('input', { type: 'text', maxlength: 40, value: d.name, placeholder: '例: ネイビーのニット', 'aria-label': '名前' });
  const main = el('input', { type: 'color', value: d.color_main, 'aria-label': '主色' });
  const hasSub = el('input', { type: 'checkbox', checked: d.color_sub ? true : null });
  const sub = el('input', { type: 'color', value: d.color_sub || '#ffffff', disabled: d.color_sub ? null : true, 'aria-label': '副色' });
  const sizeInput = el('input', { type: 'text', maxlength: 8, value: d.size || '', placeholder: '例: M／32', list: 'it-sizes', 'aria-label': 'サイズ' });
  const warmth = el('input', { type: 'range', min: 1, max: 5, step: 1, value: d.warmth, 'aria-label': '暖かさ' });
  const warmthOut = el('output', { text: String(d.warmth) });
  const rain = el('input', { type: 'checkbox', checked: d.rain_ok || null });
  const subBox = el('div');
  const pattern = el('select', { 'aria-label': '柄' }, PATTERNS.map(([v, l]) => el('option', { value: v, selected: v === d.pattern || null, text: l })));
  const material = el('select', { 'aria-label': '素材' }, MATERIALS.map(([v, l]) => el('option', { value: v, selected: v === d.material || null, text: l })));
  const status = el('select', { 'aria-label': '状態' }, STATUS.map(([v, l]) => el('option', { value: v, selected: v === d.status || null, text: l })));

  let cutting = null; // 背景の切り抜き（保存の前に終わるのを待つ）
  // 小物以外は、背景を切り抜いて登録する。小物は写真のまま
  const startCut = () => {
    if (!pending.canvas || cutting || pending.cut) return;
    if (segValue(body, 'it-cat') === 'accessory') return;
    const cv = pending.canvas;
    cutting = cutOut(cv).then((r) => { if (pending.canvas !== cv || segValue(body, 'it-cat') === 'accessory') return; pending.cut = r; toast(r.method === 'ai' ? '背景を切り抜きました' : '背景を簡易的に切り抜きました'); })
      .catch(() => { pending.cut = null; toast('背景の切り抜きはできませんでした（写真のまま使います）'); })
      .finally(() => { if (pending.canvas === cv) cutting = null; });
  };
  const onCategory = () => { if (segValue(body, 'it-cat') === 'accessory') pending.cut = null; else startCut(); };
  const refreshPreview = () => {
    d.color_main = main.value; d.color_sub = hasSub.checked ? sub.value : '';
    clear(preview); preview.append(picture());
  };
  const refreshSubs = (cat) => {
    clear(subBox);
    subBox.append(field('細かい種類', seg('it-sub', SUBS[cat], SUBS[cat].some((x) => x[0] === d.sub_category) ? d.sub_category : 'other')));
  };
  // AIの判定結果を入力欄に入れる
  const applyJudge = (r) => {
    if (r.name) name.value = r.name;
    if (r.category) { d.category = r.category; d.sub_category = r.sub; const radio = body.querySelector(`input[name="it-cat"][value="${r.category}"]`); if (radio) radio.checked = true; refreshSubs(d.category); onCategory(); }
    if (r.color_main) main.value = r.color_main;
    hasSub.checked = !!r.color_sub; sub.disabled = !r.color_sub; if (r.color_sub) sub.value = r.color_sub;
    if (r.warmth) { warmth.value = r.warmth; warmthOut.textContent = String(r.warmth); }
    if (r.pattern) pattern.value = r.pattern;
    if (r.material) material.value = r.material;
    if (r.formality) body.querySelectorAll('input[name="it-form"]').forEach((x) => { x.checked = x.value === r.formality; });
    if (typeof r.rain_ok === 'boolean') rain.checked = r.rain_ok;
    refreshPreview();
  };
  const aiBtn = el('button', { type: 'button', class: 'btn', text: 'AIで判定' });
  const runJudge = async (url) => {
    if (!geminiKey()) { toast('設定でGeminiのキーを入れると使えます'); return; }
    if (!url) { toast('先に写真を選んでください'); return; }
    aiBtn.disabled = true; aiBtn.textContent = '判定中…';
    const { result, error } = await judgeItem(url);
    aiBtn.disabled = false; aiBtn.textContent = 'AIで判定';
    if (result) { applyJudge(result); toast('AIが判定しました。違っていたら直してください'); } else toast(`${error}（色は写真から入れています）`);
  };
  aiBtn.addEventListener('click', async () => runJudge(pending.photoUrl || (d.id && d.hasPhoto ? await photoURL(d.id) : '')));
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    try {
      const { dataUrl, canvas } = await shrinkPhoto(f);
      const c = guessColors(canvas);
      pending.photoUrl = dataUrl; pending.cut = null;
      main.value = c.main;
      hasSub.checked = !!c.sub; sub.disabled = !c.sub; if (c.sub) sub.value = c.sub;
      refreshPreview();
      if (geminiKey()) runJudge(dataUrl); else toast('写真から色を入れました。違っていたら直してください');
      pending.canvas = canvas; cutting = null;
      startCut();
    } catch (e) { toast('写真を読み込めませんでした'); }
  });
  main.addEventListener('input', refreshPreview);
  sub.addEventListener('input', refreshPreview);
  hasSub.addEventListener('change', () => { sub.disabled = !hasSub.checked; refreshPreview(); });
  warmth.addEventListener('input', () => { warmthOut.textContent = warmth.value; });

  const cats = seg('it-cat', CATEGORIES.map((c) => [c.id, c.label]), d.category);
  cats.addEventListener('change', () => { d.category = segValue(body, 'it-cat'); refreshSubs(d.category); onCategory(); });
  refreshSubs(d.category);

  const save = el('button', { type: 'button', class: 'btn solid grow', text: '保存', onclick: async () => {
    if (cutting) { save.disabled = true; await cutting; save.disabled = false; }
    d.id = d.id || newItemId();
    if (pending.photoUrl) { // 新しい写真：古い切り抜きは捨てて、新しいものを保存する
      await storePhoto(d.id, pending.photoUrl); d.hasPhoto = true;
      if (pending.cut) { await storeCut(d.id, pending.cut.rgb, pending.cut.alpha); d.hasCut = true; }
      else { await removeCut(d.id); d.hasCut = false; }
    }
    await saveItem({ ...d, name: name.value.trim(), category: segValue(body, 'it-cat'), sub_category: segValue(body, 'it-sub'), warmth: +warmth.value,
      formality: segValue(body, 'it-form'), color_main: main.value, color_sub: hasSub.checked ? sub.value : '', rain_ok: rain.checked, pattern: pattern.value, material: material.value, status: status.value, size: sizeInput.value.trim() });
    hideSheet(wrap);
    toast('保存しました');
  } });
  const actions = [save, el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: () => hideSheet(wrap) })];
  // 削除は、下に固定したボタンの場所で確認する（スクロール不要）
  const bar = el('div', { class: 'form-actions sticky' });
  const showActions = () => { clear(bar); bar.append(...actions); };
  if (item) {
    const askDelete = () => {
      clear(bar);
      bar.append(el('span', { class: 'confirm-text', text: 'このアイテムを削除しますか？' }),
        el('button', { type: 'button', class: 'btn danger grow', text: '削除する', onclick: async () => { await removeItem(item.id); hideSheet(wrap); toast('削除しました'); } }),
        el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: showActions }));
    };
    actions.push(el('button', { type: 'button', class: 'btn ghost-danger', text: '削除', onclick: askDelete }));
  }
  showActions();

  body.prepend(
    el('div', { class: 'it-top' }, preview, el('label', { class: 'btn', for: 'it-file', text: item && item.hasPhoto ? '写真を変える' : '写真を選ぶ' }), aiBtn, file),
    field('名前', name),
    field('種類', cats), subBox,
    el('div', { class: 'two' },
      el('div', { class: 'field' }, el('span', { class: 'lbl', text: '主色' }), main),
      el('div', { class: 'field' }, el('label', { class: 'inline' }, hasSub, '副色あり'), sub)),
    field('暖かさ（1=薄手〜5=真冬）', el('div', { class: 'range-row' }, warmth, warmthOut)),
    el('datalist', { id: 'it-sizes' }, ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'].map((v) => el('option', { value: v }))),
    field('服装の格', seg('it-form', FORMALITY, d.formality)),
    el('div', { class: 'two' }, field('柄', pattern), field('素材', material)),
    field('サイズ（S/M/L や 32 など。空でもOK）', sizeInput),
    el('label', { class: 'check' }, rain, '雨に強い（撥水・防水）'),
    field('状態', status),
    bar);
  showSheet(wrap);
}
