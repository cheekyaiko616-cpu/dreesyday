// 会場の名前（場所の欄に含まれる文字）から、緯度・経度を引く表。Event list の js/services/venues.js の写し。
// Event list 側で会場を足したら、ここにも同じ行を足す。
// station は乗り換え案内の到着駅、stationKm は会場までの距離(km)。海外などは駅なし。
export const VENUES = [
  { match: "もてぎ", name: "モビリティリゾートもてぎ", lat: 36.5326, lon: 140.2276, station: "茂木", stationKm: 4.1 },
  { match: "富士スピードウェイ", name: "富士スピードウェイ", lat: 35.3717, lon: 138.9272, station: "御殿場", stationKm: 8 },
  { match: "鈴鹿サーキット", name: "鈴鹿サーキット", lat: 34.8431, lon: 136.5407, station: "鈴鹿サーキット稲生", stationKm: 1.3 },
  { match: "岡山国際", name: "岡山国際サーキット", lat: 34.915, lon: 134.2211, station: "美作土居", stationKm: 9.6 },
  { match: "オートポリス", name: "オートポリス", lat: 33.0378, lon: 131.0656, station: "内牧", stationKm: 10.8 },
  { match: "SUGO", name: "スポーツランドSUGO", lat: 38.1397, lon: 140.7756, station: "槻木", stationKm: 7.4 },
  { match: "吹上ホール", name: "吹上ホール", lat: 35.1606, lon: 136.9378, station: "吹上", stationKm: 0.3 },
  { match: "ポートメッセなごや", name: "ポートメッセなごや", lat: 35.0453, lon: 136.8478, station: "金城ふ頭", stationKm: 0.4 },
  { match: "ツインメッセ静岡", name: "ツインメッセ静岡", lat: 34.96, lon: 138.4069, station: "静岡", stationKm: 2.1 },
  { match: "有明アリーナ", name: "有明アリーナ", lat: 35.6386, lon: 139.7903, station: "有明テニスの森", stationKm: 0.2 },
  { match: "国立代々木競技場", name: "国立代々木競技場 第一体育館", lat: 35.6678, lon: 139.7003, station: "原宿", stationKm: 0.5 },
  { match: "日産スタジアム", name: "日産スタジアム", lat: 35.51, lon: 139.6064, station: "新横浜", stationKm: 1.1 },
  { match: "Asueアリーナ大阪", name: "Asueアリーナ大阪", lat: 34.6628, lon: 135.4482, station: "朝潮橋", stationKm: 0.2 },
  { match: "東京国立博物館", name: "東京国立博物館", lat: 35.7188, lon: 139.7765, station: "上野", stationKm: 0.6 },
  { match: "箱根湯本", name: "箱根湯本駅", lat: 35.2327, lon: 139.106, station: "箱根湯本", stationKm: 0.2 },
  { match: "セパン", name: "セパン・インターナショナル・サーキット", lat: 2.7608, lon: 101.7382 },
  { match: "バーレーン", name: "バーレーン・インターナショナル・サーキット", lat: 26.0325, lon: 50.5106 },
  { match: "カタール", name: "ルサイル・インターナショナル・サーキット", lat: 25.49, lon: 51.4542 },
  { match: "イモラ", name: "イモラ・サーキット", lat: 44.3439, lon: 11.7167 },
  { match: "スパ・フランコルシャン", name: "スパ・フランコルシャン", lat: 50.4372, lon: 5.9714 },
  { match: "ル・マン", name: "サルト・サーキット（ル・マン）", lat: 47.9561, lon: 0.2078 },
  { match: "シルバーストン", name: "シルバーストン・サーキット", lat: 52.0786, lon: -1.0169 },
  { match: "サンパウロ", name: "インテルラゴス・サーキット", lat: -23.7036, lon: -46.6997 }
];
