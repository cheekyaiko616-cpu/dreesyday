// アプリの「今の状態」を1か所にまとめる。画面は state を見て描き直すだけにする。
export const state = {
  ready: false,
  screen: 'brief',     // brief（朝ブリーフ）/ calendar（カレンダー）/ closet（クローゼット）/ builder（コーデ作成）/ favorites（お気に入り）/ settings（設定）
  items: [],           // 手持ちのアイテム
  favorites: [],       // お気に入りのコーデ
  settings: null,      // 設定（data/settings.js）
  adjust: null,        // 学習の補正（engine/feedback.js）
  wears: [],           // 着たコーデの記録（選択と結果）
  checks: {},          // 持ち物チェック { 'YYYY-MM-DD': { 名前: true } }
  calendar: { status: 'loading', items: [], at: '' }, // Event list の「カレンダーに追加した予定」
  weather: { status: 'loading', home: null, venues: {} }, // 天気（自宅と、今日・明日の予定の会場）
  ui: { closetFilter: 'all', closetQuery: '', closetSort: 'new', closetUnworn: false, briefDate: null, calMonth: '', calSel: '', builder: null }
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  listeners.forEach((fn) => fn(state));
}
