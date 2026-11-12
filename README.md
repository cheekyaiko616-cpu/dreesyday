# Dressy Day（旧称: 朝の支度ブリーフ）

朝に開くダッシュボード（内部の名前・保存先の名前・リポジトリ名は `morning-brief` のまま）。天気・予定・コーデ提案・持ち物チェックを1画面にまとめる。iPhoneのホーム画面から使うWebアプリ（GitHub Pages）。

- **予定**：Event list で「カレンダーに追加」した予定だけを出す（Event list が GitHub に保存する `calendar.json` を読む）
- **天気**：Event list と同じ Open-Meteo・同じ絵文字。設定した場所（自宅など）と、予定の会場の天気。服装は「寒いほう・雨が多いほう」で選ぶ
- **Gmail 連携・通知**：今回は入れていない（サーバーと鍵が必要なため、後から追加）

## 構成と、直したいときの目安

| 直したいこと | ファイル |
|---|---|
| 判定の重み・色の基準・持ち物・タブごとの服装の初期値 | `config/rules.json` |
| 判定エンジン（点数・提案・理由・持ち物・学習）。画面を持たない純関数 | `js/engine/score.js` / `js/engine/suggest.js` / `js/engine/color.js` / `js/engine/reason.js` / `js/engine/bring.js` / `js/engine/feedback.js` |
| 予定（calendar.json）の読み込み・タブごとの服装 | `js/data/calendar-feed.js` |
| 天気の読み込み（自宅と会場） | `js/data/weather-load.js` / `js/services/weather.js` / `js/services/geo.js` / `js/services/venues.js` / `js/services/cache.js` |
| アイテム・お気に入り・設定・学習・持ち物チェック・バックアップの保存 | `js/data/closet.js` / `js/data/favorites.js` / `js/data/settings.js` / `js/data/learning.js` / `js/data/checklist.js` / `js/data/backup.js` / `js/data/db.js` / `js/data/rules.js` |
| 見本のデータ（確認用のビルドにだけ入る。予定・天気・クローゼット・お気に入り・着た記録） | `js/data/sample.js` / `js/data/sample-images.js` / `js/data/sample-cuts.js` / `js/ui/sample-seed.js` / `samples/` |
| 写真の縮小と、主色・副色の推定 | `js/services/photo.js` |
| 朝ブリーフ画面 | `js/ui/brief-page.js` / `js/ui/weather-card.js` / `js/ui/events-card.js` / `js/ui/bring-card.js` / `js/ui/feedback-card.js` |
| コーデのカード・色相環・色のバランス・アイテムの絵 | `js/ui/outfit-card.js` / `js/ui/hue-wheel.js` / `js/ui/color-balance.js` / `js/ui/thumb.js` |
| 背景の切り抜き（端末内。U²-Net-p を WebGL2 で実行／使えない端末は簡易版）と、その後処理 | `js/services/cutout.js` / `js/services/u2net-gl.js` / `js/services/mask.js` / `js/services/ensure-cut.js` / `models/u2netp.*` |
| 服の形を測って置き場所を決める／体型とサイズ感／平置きの配置（計算だけ） | `js/engine/layout.js` / `js/engine/fit.js` / `js/engine/flatlay.js` |
| 画像の保存と取り出し（写真・一覧用の小さな写真・切り抜き（色JPEG＋透明度PNG）を別の保存棚 images にバイト列で入れ、使うときだけ読む） | `js/data/images.js` |
| 切り抜いた服だけの平置き画像（コーデ提案カード） | `js/ui/flatlay.js` |
| マネキンへの重ね着の描画（重ね順・影・体） | `js/ui/mannequin.js` / `js/ui/mannequin-sheet.js` |
| クローゼット・アイテムの編集 | `js/ui/closet-page.js` / `js/ui/item-sheet.js` |
| コーデ作成（自分で選ぶ） | `js/ui/builder-page.js` |
| お気に入り | `js/ui/favorites-page.js` / `js/ui/fav-sheet.js` |
| 設定 | `js/ui/settings-sheet.js` |
| 画面の枠・下から出る画面・お知らせ | `js/ui/shell.js` / `js/ui/sheet.js` / `js/ui/toast.js` |
| 起動・状態・定数・道具 | `js/main.js` / `js/state.js` / `js/config.js` / `js/util/dom.js` / `js/util/date.js` |
| 見た目 | `css/tokens.css`（色・文字。Event list と同じ値） / `css/base.css` / `css/outfit.css` / `css/brief.css` / `css/closet.css` / `css/sheets.css` / `css/fonts.css` |
| ビルド・テスト・アイコン・見本の写真 | `tools/build.py` / `tools/test.mjs` / `tools/make_icons.py` / `tools/make_sample_images.py` / `tools/make_sample_cutouts.py`（見本の切り抜きを生成）/ `tools/u2net-cpu.js`（検証用のCPU版） |

## ビルド

```
python3 tools/build.py
```
自動テスト（`tools/test.mjs`）のあと、公開用の `dist/app.min.js`・`dist/app.min.css`（見本は入らない）と、見本入りの確認用の1枚 `dist/preview.html` を作る。見本の写真を差し替えたときは、先に `python3 tools/make_sample_images.py` を実行する。ソースや `config/rules.json` を直したら、必ず実行してから公開する。

## 公開（GitHub Pages）

1. GitHub に `morning-brief` リポジトリを作り、このフォルダの中身を置く
2. Settings → Pages で `main` ブランチを公開 → `https://cheekyaiko616-cpu.github.io/morning-brief/`
3. iPhone の Safari で開き、共有 → ホーム画面に追加

Event list と同じ `cheekyaiko616-cpu.github.io` の中なので、`calendar.json` は鍵なしで読める。

## 保存先

アイテム（写真を含む）・お気に入り・学習は、端末の中（IndexedDB）に保存する。機種変更に備えて、設定の「バックアップを書き出す」を時々使う。


## 切り抜きモデルについて
`models/u2netp.*` は U²-Net-p（Apache-2.0、Xuebin Qin ら）の重みを半精度にしたもの（約2.3MB）。出典: https://github.com/xuebinqin/U-2-Net 。端末の中だけで動き、写真は外へ送られない。

- `js/engine/evaluate.js` / `js/data/evaluation.js`: お気に入りの「AI評価」文章（アプリ内の判定。通信なし）
- `js/services/gemini.js` / `js/engine/gemini-prompt.js` / `js/data/gemini-key.js`: Geminiで評価文を作る（キーは端末内のみ。設定画面で入力）
- `js/engine/item-judge.js` / `js/data/item-judge.js`: 服の写真をGeminiで判定（種類・色・名前・暖かさなど）
- `js/ui/settings-detail.js`: 設定の項目をタップして開く入力用の画面
