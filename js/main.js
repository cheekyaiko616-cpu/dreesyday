// 起動の入口：保存データを読み、天気と予定を取りに行き、画面を描く。
import { $ } from './util/dom.js';
import { state, subscribe } from './state.js';
import { requestPersistence } from './data/db.js';
import { loadSettings } from './data/settings.js';
import { loadItems } from './data/closet.js';
import { loadFavorites } from './data/favorites.js';
import { loadGeminiKey } from './data/gemini-key.js';
import { loadReviews } from './data/review-store.js';
import { loadBackupInfo } from './data/backup-run.js';
import { loadLearning } from './data/learning.js';
import { loadChecks } from './data/checklist.js';
import { loadCalendar } from './data/calendar-feed.js';
import { loadWeather } from './data/weather-load.js';
import { initShell, renderNav } from './ui/shell.js';
import { renderBrief } from './ui/brief-page.js';
import { renderCloset } from './ui/closet-page.js';
import { renderCalendar } from './ui/calendar-page.js';
import { renderBuilder } from './ui/builder-page.js';
import { renderFavorites } from './ui/favorites-page.js';
import { initItemSheet } from './ui/item-sheet.js';
import { initFavSheet } from './ui/fav-sheet.js';
import { initMonthWheel } from './ui/month-wheel.js';
import { initTransitSheet } from './ui/transit-sheet.js';
import { initSettingsSheet } from './ui/settings-sheet.js';
import { initSettingsDetail } from './ui/settings-detail.js';
import { todayIso } from './util/date.js';
import { ensureCuts } from './services/ensure-cut.js';
import { seedIfNeeded } from './ui/sample-seed.js';

const PAGES = { brief: renderBrief, calendar: renderCalendar, closet: renderCloset, builder: renderBuilder, favorites: renderFavorites };

let frame = 0;
function render() {
  if (!state.ready) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => { renderNav(); PAGES[state.screen]($('#app-main')); });
}

async function start() {
  initShell();
  initItemSheet();
  initFavSheet();
  initMonthWheel();
  initSettingsSheet();
  initTransitSheet();
  initSettingsDetail();
  try { // 読み込みに失敗しても、画面は出す（空の状態で動く）
    await Promise.all([loadSettings(), loadItems(), loadFavorites(), loadLearning(), loadChecks(), loadGeminiKey(), loadReviews(), loadBackupInfo()]);
  } catch (e) { console.error(e); }
  if (__PREVIEW__) { try { await seedIfNeeded(); } catch (e) { console.error(e); } } // 確認用：クローゼット・コーデの見本（本番では入れない）
  state.ready = true;
  subscribe(render);
  render();
  requestPersistence();
  if (!__PREVIEW__) ensureCuts(); // 切り抜きが無い古いアイテムを裏で切り抜く
  const cal = loadCalendar(); // 予定は並行して読む（天気は予定を待たずに出す。会場の天気だけ、予定が分かってから）
  await loadWeather(cal);
}

// 日付が変わったら（朝アプリを開き直したとき）、予定と天気を取り直す
let day = todayIso();
let calAt = Date.now(); // 予定を最後に読んだ時刻
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (todayIso() !== day) { day = todayIso(); calAt = Date.now(); const cal = loadCalendar(); loadWeather(cal); return; }
  // Event list で予定を足して戻ってきたときのために、画面に戻るたび（30秒以上たっていれば）予定だけ読み直す。小さなファイル1つだけ
  if (Date.now() - calAt > 30000) { calAt = Date.now(); const cal = loadCalendar(); loadWeather(cal); } // 新しい予定の会場の天気も取る（取得済みの天気は使い回す）
});

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

start();
