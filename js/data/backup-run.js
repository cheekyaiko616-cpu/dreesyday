// ワンタップのバックアップ：共有シート（ファイルに保存・iCloud Drive など）を開く。使えない端末ではダウンロードする。
// 保存した日を覚えておき、しばらく取っていないときは朝ブリーフで知らせる。
import { APP } from '../config.js';
import { state } from '../state.js';
import { get, put } from './db.js';
import { backupText } from './backup.js';

let last = '';
export async function loadBackupInfo() { try { last = String((await get('kv', 'lastBackup')) || ''); } catch { last = ''; } }
export const lastBackupAt = () => last;

/** 前回から何日か（取ったことがなければ null）。 */
export function daysSinceBackup(now = Date.now()) {
  const t = Date.parse(last);
  return Number.isFinite(t) ? Math.floor((now - t) / 86400000) : null;
}

/** 知らせるか：データがあって、1回も取っていないか7日以上たっている。 */
export const needsBackup = () => (state.items.length > 0 || state.favorites.length > 0) && (last === '' || daysSinceBackup() >= 7);

/** 戻り値: 'shared'（共有シートで保存）/ 'downloaded' / 'cancelled'。失敗は例外。 */
export async function runBackup() {
  const text = await backupText();
  const name = `${APP.id}-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([text], name, { type: 'application/json' });
  let how = 'downloaded';
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `${APP.name}のバックアップ` }); how = 'shared'; } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'; // 共有シートを閉じた
      how = 'downloaded'; // 共有できなければダウンロードに切り替える
    }
  }
  if (how === 'downloaded') {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  last = new Date().toISOString();
  try { await put('kv', 'lastBackup', last); } catch { /* 日付が残せなくても続ける */ }
  return how;
}
