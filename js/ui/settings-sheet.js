// 設定の画面（下から出る）：天気の場所・毎日の持ち物・タブごとの服装・バックアップ・学習のやり直し。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { state } from '../state.js';
import { EVENT_FORMALITY, APP } from '../config.js';
import { saveSettings } from '../data/settings.js';
import { formalityOf } from '../data/calendar-feed.js';
import { loadWeather } from '../data/weather-load.js';
import { resetLearning } from '../data/learning.js';
import { backupText, restoreBackup } from '../data/backup.js';
import { seedSamples } from './sample-seed.js';
import { isMemoryOnly } from '../data/db.js';
import { geminiKey, saveGeminiKey } from '../data/gemini-key.js';
import { locate, whereAmI } from '../services/geo.js';
import { toast } from './toast.js';

const MARKUP = `
  <div class="sheet" id="st-sheet" role="dialog" aria-modal="true" aria-labelledby="st-heading">
    <div class="sheet-head">
      <h2 id="st-heading">設定</h2>
      <button type="button" class="ghost" id="st-close">閉じる</button>
    </div>
    <div id="st-body"></div>
  </div>`;

let wrap = null;

export function initSettingsSheet() {
  wrap = mountSheet(MARKUP);
  $('#st-close').addEventListener('click', () => hideSheet(wrap));
}

const group = (title, ...children) => el('section', { class: 'st-group' }, el('h3', { text: title }), ...children);

function homeGroup() {
  const s = state.settings;
  const input = el('input', { type: 'text', 'aria-label': '場所の名前', placeholder: '例: 名古屋駅、豊田市', value: s.home ? s.home.name : '' });
  const msg = el('p', { class: 'hint', text: s.home ? `いまの場所：${s.home.name}` : '未設定' });
  const set = async (home) => { await saveSettings({ home }); msg.textContent = `いまの場所：${home.name}`; loadWeather(); toast('天気の場所を設定しました'); };
  return group('天気の場所', msg,
    el('div', { class: 'inline-row' }, input, el('button', { type: 'button', class: 'btn', text: '探す', onclick: async () => {
      const q = input.value.trim();
      if (!q) return;
      msg.textContent = '探しています…';
      try {
        const pos = await locate(q);
        if (pos) await set({ name: q, lat: pos.lat, lon: pos.lon });
        else msg.textContent = '見つかりませんでした。別の書き方で試してください';
      } catch (e) { msg.textContent = '通信できませんでした'; }
    } })),
    el('button', { type: 'button', class: 'btn', text: '現在地を使う', onclick: async () => {
      msg.textContent = '現在地を調べています…';
      try { const p = await whereAmI(); await set({ name: '現在地', lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100 }); } catch (e) { msg.textContent = '現在地を使えませんでした（位置情報の許可を確認してください）'; }
    } }),
  );
}

function bodyGroup() {
  const b = state.settings.body;
  const num = (v, label, ph, min, max, step) => el('input', { type: 'number', inputmode: 'decimal', 'aria-label': label, placeholder: ph, min, max, step, value: v || '' });
  const height = num(b.height, '身長', '例: 172', 100, 230, 0.5);
  const weight = num(b.weight, '体重', '例: 62', 25, 250, 0.5);
  const waist = num(b.waist, 'ウエスト（インチ）', '例: 30', 22, 46, 1);
  const top = el('select', { 'aria-label': 'トップスのサイズ' }, [['', '未登録'], ...['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((x) => [x, x])].map(([v, l]) => el('option', { value: v, text: l })));
  top.value = b.top;
  const row = (label, ...c) => el('div', { class: 'inline-row' }, el('span', { class: 'tab-name', text: label }), ...c);
  return group('からだとサイズ',
    row('身長 cm', height), row('体重 kg', weight), row('トップス', top), row('ウエスト inch', waist),
    el('button', { type: 'button', class: 'btn', text: '保存', onclick: async () => {
      await saveSettings({ body: { height: +height.value || 0, weight: +weight.value || 0, top: top.value, waist: +waist.value || 0 } });
      toast('保存しました');
    } }));
}

function geminiGroup() {
  const key = el('input', { type: 'password', autocomplete: 'off', 'aria-label': 'Gemini APIキー', placeholder: 'AQ.…（Google AI Studioで作成）', value: geminiKey() });
  return group('Gemini APIキー',
    key,
    el('div', { class: 'form-actions' },
      el('button', { type: 'button', class: 'btn', text: '保存', onclick: async () => { await saveGeminiKey(key.value); toast(key.value.trim() ? 'キーを保存しました' : 'キーを消しました'); } })));
}

function dailyGroup() {
  const ta = el('textarea', { rows: 2, 'aria-label': '毎日の持ち物' });
  ta.value = state.settings.daily.join('、');
  return group('毎日の持ち物', ta,
    el('button', { type: 'button', class: 'btn', text: '保存', onclick: async () => { await saveSettings({ daily: ta.value.split(/[\s、,]+/) }); toast('保存しました'); } }));
}

function tabGroup() {
  const tabs = [...new Set(state.calendar.items.map((x) => x.tab).filter(Boolean))];
  if (!tabs.length) return null;
  return group('タブごとの服装',
    tabs.map((t) => {
      const sel = el('select', { 'aria-label': `${t}の服装` }, EVENT_FORMALITY.map(([v, l]) => el('option', { value: v, text: l })));
      sel.value = formalityOf({ tab: t, title: '' });
      sel.addEventListener('change', async () => { await saveSettings({ tabFormality: { ...state.settings.tabFormality, [t]: sel.value } }); toast(`${t}：${sel.selectedOptions[0].text}`); });
      return el('div', { class: 'inline-row' }, el('span', { class: 'tab-name', text: t }), sel);
    }));
}

function dataGroup() {
  const file = el('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', id: 'st-file' });
  const confirm = el('div', { class: 'confirm-box', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const text = await f.text();
    clear(confirm);
    confirm.hidden = false;
    confirm.append(el('p', { text: 'いまのアイテム・お気に入り・設定を、このファイルの内容で置き換えますか？' }),
      el('div', { class: 'form-actions' },
        el('button', { type: 'button', class: 'btn solid grow', text: '置き換える', onclick: async () => {
          const ok = await restoreBackup(text);
          confirm.hidden = true;
          toast(ok ? '読み込みました' : 'このアプリのバックアップではありません');
          if (ok) { loadWeather(); hideSheet(wrap); }
        } }),
        el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: () => { confirm.hidden = true; } })));
    file.value = '';
  });
  return group('データ',
    isMemoryOnly() ? el('p', { class: 'note', text: 'この環境では保存できないため、閉じるとデータが消えます' }) : null,
    el('div', { class: 'inline-row' },
      el('button', { type: 'button', class: 'btn', text: 'バックアップを書き出す', onclick: async () => {
        const url = URL.createObjectURL(new Blob([await backupText()], { type: 'application/json' }));
        const a = el('a', { href: url, download: `${APP.id}-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } }),
      el('label', { class: 'btn', for: 'st-file', text: '読み込む' }), file),
    confirm,
    el('button', { type: 'button', class: 'btn', text: '学習をはじめからにする', onclick: async () => { await resetLearning(); toast('学習をはじめからにしました'); } }),
    __PREVIEW__ ? el('button', { type: 'button', class: 'btn', text: '見本を入れ直す（確認用）', onclick: async () => {
      await seedSamples(true);
      hideSheet(wrap);
      toast('見本のクローゼット・コーデを入れ直しました');
    } }) : null);
}

export function openSettings() {
  const body = $('#st-body');
  clear(body);
  body.append(...[homeGroup(), bodyGroup(), geminiGroup(), dailyGroup(), tabGroup(), dataGroup()].filter(Boolean));
  showSheet(wrap);
}
