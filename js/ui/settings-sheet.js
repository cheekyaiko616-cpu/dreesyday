// 設定の画面（下から出る）：項目の一覧。項目をタップすると、入力用の画面（settings-detail）が開く。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { state } from '../state.js';
import { EVENT_FORMALITY, APP } from '../config.js';
import { saveSettings } from '../data/settings.js';
import { formalityOf } from '../data/calendar-feed.js';
import { loadWeather } from '../data/weather-load.js';
import { resetLearning } from '../data/learning.js';
import { restoreBackup } from '../data/backup.js';
import { runBackup, lastBackupAt } from '../data/backup-run.js';
import { seedSamples } from './sample-seed.js';
import { isMemoryOnly } from '../data/db.js';
import { geminiKey, saveGeminiKey } from '../data/gemini-key.js';
import { locate, whereAmI } from '../services/geo.js';
import { toast } from './toast.js';
import { openDetail } from './settings-detail.js';
import { ensureCuts } from '../services/ensure-cut.js';
import { cutoutSupported } from '../services/cutout.js';

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

const group = (_title, ...children) => el('div', { class: 'st-group' }, ...children);

function homeGroup(done) {
  const s = state.settings;
  const input = el('input', { type: 'text', 'aria-label': '場所の名前', placeholder: '例: 名古屋駅、豊田市', value: s.home ? s.home.name : '' });
  const msg = el('p', { class: 'hint', text: s.home ? `いまの場所：${s.home.name}` : '未設定' });
  const set = async (home) => { await saveSettings({ home }); msg.textContent = `いまの場所：${home.name}`; loadWeather(); toast('天気の場所を設定しました'); done(); };
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

function bodyGroup(done) {
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
      toast('保存しました'); done();
    } }));
}

function geminiGroup(done) {
  const key = el('input', { type: 'password', autocomplete: 'off', 'aria-label': 'Gemini APIキー', placeholder: 'AQ.…（Google AI Studioで作成）', value: geminiKey() });
  return group('Gemini APIキー',
    key,
    el('div', { class: 'form-actions' },
      el('button', { type: 'button', class: 'btn', text: '保存', onclick: async () => { await saveGeminiKey(key.value); toast(key.value.trim() ? 'キーを保存しました' : 'キーを消しました'); done(); } })));
}

function dailyGroup(done) {
  const ta = el('textarea', { rows: 2, 'aria-label': '毎日の持ち物' });
  ta.value = state.settings.daily.join('、');
  return group('毎日の持ち物', ta,
    el('button', { type: 'button', class: 'btn', text: '保存', onclick: async () => { await saveSettings({ daily: ta.value.split(/[\s、,]+/) }); toast('保存しました'); done(); } }));
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

const running_msg = () => cutoutSupported() ? 'すでに切り抜き中です' : 'この端末では切り抜きが使えません';

function dataGroup(done) {
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
          if (ok) { loadWeather(); done(); hideSheet(wrap); }
        } }),
        el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: () => { confirm.hidden = true; } })));
    file.value = '';
  });
  return group('データ',
    el('p', { class: 'muted', text: lastBackupAt() ? `前回のバックアップ：${lastBackupAt().slice(0, 10).replace(/-/g, '/')}` : 'まだバックアップを取っていません' }),
    isMemoryOnly() ? el('p', { class: 'note', text: 'この環境では保存できないため、閉じるとデータが消えます' }) : null,
    el('div', { class: 'inline-row' },
      el('button', { type: 'button', class: 'btn solid', text: 'バックアップを保存', onclick: async (e) => {
        const b = e.currentTarget; b.disabled = true;
        try {
          const how = await runBackup();
          if (how !== 'cancelled') toast(how === 'shared' ? 'バックアップを保存しました' : 'バックアップをダウンロードしました');
        } catch (err) { toast('バックアップを作れませんでした'); } finally { b.disabled = false; }
      } }),
      el('label', { class: 'btn', for: 'st-file', text: '読み込む' }), file),
    el('button', { type: 'button', class: 'btn', text: '登録済みの服を切り抜く', onclick: async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = '切り抜き中…';
      const r = await ensureCuts();
      b.disabled = false; b.textContent = '登録済みの服を切り抜く';
      toast(!r ? (running_msg()) : r.todo === 0 ? '切り抜く服はありません（すべて済み）' : `${r.done}/${r.todo}件を切り抜きました`);
    } }),
    confirm,
    el('button', { type: 'button', class: 'btn', text: '学習をはじめからにする', onclick: async () => { await resetLearning(); toast('学習をはじめからにしました'); } }),
    __PREVIEW__ ? el('button', { type: 'button', class: 'btn', text: '見本を入れ直す（確認用）', onclick: async () => {
      await seedSamples(true);
      done(); hideSheet(wrap);
      toast('見本のクローゼット・コーデを入れ直しました');
    } }) : null);
}

const shorten = (t, n = 14) => (t.length > n ? `${t.slice(0, n)}…` : t);

/** 一覧の1行：項目名・いまの値・›。タップで入力用の画面を開く。 */
function row(title, value, build, refresh) {
  const val = el('span', { class: 'st-val', text: value() });
  const btn = el('button', { type: 'button', class: 'st-row', onclick: () => openDetail(title, (close) => build(() => { close(); refresh(); })) },
    el('span', { class: 'st-title', text: title }), val, el('span', { class: 'st-go', text: '›', 'aria-hidden': 'true' }));
  btn.refreshValue = () => { val.textContent = value(); };
  return btn;
}

export function openSettings() {
  const body = $('#st-body');
  clear(body);
  const rows = [];
  const refresh = () => rows.forEach((r) => r.refreshValue());
  const b = () => state.settings.body;
  const tabs = [...new Set(state.calendar.items.map((x) => x.tab).filter(Boolean))];
  rows.push(
    row('天気の場所', () => (state.settings.home ? state.settings.home.name : '未設定'), homeGroup, refresh),
    row('からだとサイズ', () => [b().height && `${b().height}cm`, b().top].filter(Boolean).join('・') || '未登録', bodyGroup, refresh),
    row('毎日の持ち物', () => shorten(state.settings.daily.join('、')) || 'なし', dailyGroup, refresh),
    row('Gemini APIキー', () => (geminiKey() ? '登録済み' : '未登録'), geminiGroup, refresh));
  if (tabs.length) rows.push(row('タブごとの服装', () => `${tabs.length}件`, tabGroup, refresh));
  rows.push(row('データ', () => '', dataGroup, refresh));
  body.append(el('div', { class: 'st-list' }, rows));
  showSheet(wrap);
}
