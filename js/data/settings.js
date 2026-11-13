// 設定（天気の場所・毎日の持ち物・タブごとの服装）。kv の 'settings' に保存する。
import { state, notify } from '../state.js';
import { get, put } from './db.js';
import { PATTERNS, MATERIALS, DEFAULT_PATTERNS, DEFAULT_MATERIALS } from '../config.js';

const DEFAULT = {
  home: null,              // { name, lat, lon } 天気を出す場所（自宅など）
  daily: ['財布', '鍵', 'スマホ'], // 毎日の持ち物
  body: { height: 0, weight: 0, top: '', waist: 0 }, // 身長cm・体重kg・トップスのサイズ(S/M…)・ウエストinch。0や空は未登録
  tabFormality: {}         // Event list のタブ名 → 服装の種類（rules.json の tabFormality より優先）
};

function normalize(s) {
  const src = s && typeof s === 'object' ? s : {};
  const home = src.home && Number.isFinite(src.home.lat) && Number.isFinite(src.home.lon)
    ? { name: String(src.home.name || '').slice(0, 60), lat: src.home.lat, lon: src.home.lon } : null;
  const daily = Array.isArray(src.daily) ? src.daily.map((x) => String(x).trim().slice(0, 30)).filter(Boolean).slice(0, 30) : DEFAULT.daily;
  const tabFormality = src.tabFormality && typeof src.tabFormality === 'object' ? { ...src.tabFormality } : {};
  const b = src.body && typeof src.body === 'object' ? src.body : {};
  const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v * 10) / 10 : 0);
  const body = { height: num(b.height, 100, 230), weight: num(b.weight, 25, 250), top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(b.top) ? b.top : '', waist: num(b.waist, 22, 46) };
  const list = (v, def, must) => {
    const out = Array.isArray(v) ? v.filter((x) => Array.isArray(x) && typeof x[0] === 'string' && typeof x[1] === 'string' && x[0] && x[1].trim()).map((x) => [x[0].slice(0, 24), x[1].trim().slice(0, 12)]).slice(0, 40) : [];
    if (!out.length) return def.map((x) => [...x]);
    if (!out.some((x) => x[0] === must[0])) out.unshift([...must]); // 「無地」「その他」は必ず残す
    return out;
  };
  return { home, daily, body, tabFormality, patterns: list(src.patterns, DEFAULT_PATTERNS, DEFAULT_PATTERNS[0]), materials: list(src.materials, DEFAULT_MATERIALS, DEFAULT_MATERIALS[0]) };
}

/** 設定の分類を、画面や判定が使う一覧（config の PATTERNS / MATERIALS）に反映する。 */
function applyClasses(s) {
  PATTERNS.splice(0, PATTERNS.length, ...s.patterns.map((x) => [...x]));
  MATERIALS.splice(0, MATERIALS.length, ...s.materials.map((x) => [...x]));
}

export async function loadSettings() {
  state.settings = normalize(await get('kv', 'settings'));
  applyClasses(state.settings);
}

export async function saveSettings(patch) {
  state.settings = normalize({ ...state.settings, ...patch });
  applyClasses(state.settings);
  await put('kv', 'settings', state.settings);
  notify();
}
