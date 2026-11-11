// お気に入りの評価・メモ・タグを直す画面（下から出る）。削除もここ。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { saveFavorite, removeFavorite } from '../data/favorites.js';
import { toast } from './toast.js';
import { geminiEvaluation } from '../data/evaluation.js';
import { geminiKey } from '../data/gemini-key.js';
import { fitOf } from '../data/learning.js';

const MARKUP = `
  <div class="sheet" id="fv-sheet" role="dialog" aria-modal="true" aria-labelledby="fv-heading">
    <div class="sheet-head">
      <h2 id="fv-heading">評価メモ</h2>
      <button type="button" class="ghost" id="fv-close">閉じる</button>
    </div>
    <div id="fv-body"></div>
  </div>`;

let wrap = null;

export function initFavSheet() {
  wrap = mountSheet(MARKUP);
  $('#fv-close').addEventListener('click', () => hideSheet(wrap));
}

export function openFavSheet(f) {
  const body = $('#fv-body');
  clear(body);
  let stars = f.stars;
  const starRow = el('div', { class: 'star-row', role: 'radiogroup', 'aria-label': '評価' });
  const drawStars = () => {
    clear(starRow);
    for (let i = 1; i <= 5; i++) starRow.append(el('button', { type: 'button', class: 'star' + (i <= stars ? ' on' : ''), 'aria-label': `${i}`, text: i <= stars ? '★' : '☆', onclick: () => { stars = stars === i ? 0 : i; drawStars(); } }));
  };
  drawStars();
  let ai = f.ai || '';
  const aiBox = el('p', { class: 'ai-memo', text: ai || 'まだ評価がありません' });
  const memo = el('textarea', { rows: 3, maxlength: 300, 'aria-label': 'メモ（自分で追加）', placeholder: '例: 雨の日のライブにちょうどよかった' });
  memo.value = f.memo;
  const tags = el('input', { type: 'text', 'aria-label': 'タグ', placeholder: '例: ライブ 雨の日（空白で区切る）', value: f.tags.join(' ') });
  const confirm = el('div', { class: 'confirm-box', hidden: true },
    el('p', { text: 'このお気に入りを削除しますか？' }),
    el('div', { class: 'form-actions' },
      el('button', { type: 'button', class: 'btn danger grow', text: '削除する', onclick: async () => { await removeFavorite(f.id); hideSheet(wrap); toast('削除しました'); } }),
      el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: () => { confirm.hidden = true; } })));
  body.append(
    el('div', { class: 'field' }, el('span', { class: 'lbl', text: '評価' }), starRow),
    el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'AI評価（今日の天気・予定で）' }), aiBox,
      el('button', { type: 'button', class: 'btn', text: 'Geminiで評価文を作り直す', onclick: async (e) => {
        if (!geminiKey()) { toast('設定でGeminiのキーを入れると使えます'); return; }
        const b = e.currentTarget; b.disabled = true; b.textContent = '作成中…';
        const r = await geminiEvaluation(fitOf(f.items));
        ai = r.text; aiBox.textContent = ai;
        b.disabled = false; b.textContent = 'Geminiで評価文を作り直す';
        if (r.error) toast(`${r.error}（アプリ内の評価にしました）`);
      } })),
    el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'メモ（自分で追加）' }), memo),
    el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'タグ' }), tags),
    confirm,
    el('div', { class: 'form-actions sticky' },
      el('button', { type: 'button', class: 'btn solid grow', text: '保存', onclick: async () => {
        await saveFavorite({ ...f, ai, stars, memo: memo.value.trim(), tags: tags.value.split(/[\s、,]+/) });
        hideSheet(wrap);
        toast('保存しました');
      } }),
      el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: () => hideSheet(wrap) }),
      el('button', { type: 'button', class: 'btn ghost-danger', text: '削除', onclick: () => { confirm.hidden = false; } })));
  showSheet(wrap);
}
