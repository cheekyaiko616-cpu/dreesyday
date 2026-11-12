// 朝ブリーフの上に出す、バックアップのお知らせ（しばらく取っていないときだけ）。ボタン1つで保存できる。
import { el } from '../util/dom.js';
import { notify } from '../state.js';
import { needsBackup, daysSinceBackup, runBackup } from '../data/backup-run.js';
import { toast } from './toast.js';

let busy = false;

export function backupCard() {
  if (!needsBackup()) return null;
  const d = daysSinceBackup();
  const btn = el('button', { type: 'button', class: 'btn solid', text: 'いま保存する', onclick: async () => {
    if (busy) return;
    busy = true; btn.disabled = true;
    try {
      const how = await runBackup();
      if (how !== 'cancelled') { toast(how === 'shared' ? 'バックアップを保存しました' : 'バックアップをダウンロードしました'); notify(); }
    } catch (e) { toast('バックアップを作れませんでした'); } finally { busy = false; btn.disabled = false; }
  } });
  return el('section', { class: 'card backup-card' },
    el('p', { text: d === null ? 'バックアップをまだ取っていません。服や写真は、この端末の中にしかありません' : `バックアップを取ってから${d}日たっています` }), btn);
}
