// アプリ全体の定数。数や初期値を変えたいときは、まずここを直す。判定の重みは config/rules.json。
export const APP = { id: 'morning-brief', name: 'Dressy Day', schema: 1 };

// Event list が保存する「カレンダーに追加した予定」の一覧（同じ github.io の中なので、そのまま読める）
// Event list アプリの場所（予定の詳細を開くときに使う）
export const EVENT_LIST_URL = 'https://cheekyaiko616-cpu.github.io/event-list/';

export const CALENDAR = {
  url: 'https://cheekyaiko616-cpu.github.io/event-list/calendar.json',
  cacheKey: 'morningbrief.calendar.v1' // 最後に読めた内容（通信できないときに使う）
};

// 天気（Event list と同じ Open-Meteo と、場所の検索）
export const WX = {
  api: 'https://api.open-meteo.com/v1/forecast',
  geoApi: 'https://nominatim.openstreetmap.org/search',
  ttl: 1 * 3600 * 1000,          // 天気の保存期間（1時間）
  geoTtl: 90 * 86400 * 1000,     // 場所の保存期間（90日）
  hoursFrom: 6, hoursTo: 23,     // 1時間ごとの天気で出す時間帯
  cacheKey: 'morningbrief.wx.v1',
  offline: /オンライン|配信|未発表|未定/ // 現地がない予定
};

export const DB = { name: 'morning-brief', version: 2 };

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// アイテムの種類（画面の言葉）
export const CATEGORIES = [
  { id: 'tops', label: 'トップス' }, { id: 'bottoms', label: 'ボトムス' }, { id: 'outer', label: 'アウター' },
  { id: 'shoes', label: 'シューズ' }, { id: 'accessory', label: '小物' }
];
export const SUBS = {
  tops: [['shirt', 'シャツ'], ['knit', 'ニット'], ['other', 'その他']],
  bottoms: [['pants', 'パンツ'], ['skirt', 'スカート'], ['other', 'その他']],
  outer: [['jacket', 'ジャケット'], ['other', 'その他']],
  shoes: [['sneakers', 'スニーカー'], ['boots', 'ブーツ'], ['other', 'その他']],
  accessory: [['umbrella', '傘'], ['hat', '帽子'], ['other', 'その他']]
};
export const FORMALITY = [['casual', 'カジュアル'], ['neat', 'きれいめ'], ['formal', 'フォーマル']];
export const EVENT_FORMALITY = [['casual', 'カジュアル'], ['neat', 'きれいめ'], ['formal', 'フォーマル'], ['sports', '観戦・アウトドア'], ['home', '家で過ごす']];
// 柄と素材（AI判定でも入る。空は「無地」「その他」）
export const DEFAULT_PATTERNS = [['plain', '無地'], ['stripe', 'ストライプ'], ['check', 'チェック'], ['border', 'ボーダー'], ['dot', 'ドット'], ['print', '柄・プリント']];
// 設定で追加・削除できる分類（settings.js が中身を入れ替える。配列そのものは変えない）
export const PATTERNS = DEFAULT_PATTERNS.map((x) => [...x]);
export const DEFAULT_MATERIALS = [['other', 'その他'], ['cotton', '綿'], ['linen', '麻'], ['wool', 'ウール'], ['denim', 'デニム'], ['poly', 'ポリエステル'], ['nylon', 'ナイロン'], ['leather', 'レザー'], ['down', 'ダウン']];
export const MATERIALS = DEFAULT_MATERIALS.map((x) => [...x]);
export const STATUS = [['active', '使える'], ['laundry', '洗濯中'], ['cleaning', 'クリーニング'], ['retired', 'しまっている']];

// ワンタップ評価
export const RATINGS = [
  ['good', 'よかった'], ['bad', 'いまいち'], ['cold', '寒かった'], ['hot', '暑かった'], ['color_mismatch', '色が合わない'], ['did_not_use', '着なかった']
];

// 写真の大きさ（長い辺）と、色を調べるときの縮小サイズ
export const PHOTO = { max: 720, quality: 0.82, sample: 56 };

// 確認用のビルドかどうかは、各ファイルで __PREVIEW__ と書く（tools/build.py が true/false に置き換える。
// 公開用は false になり、見本のコードと写真は丸ごと入らない）。
