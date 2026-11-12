// 画面の枠：上のタイトル、下のタブ（ブリーフ・クローゼット・コーデ・お気に入り・設定）。
import { $, el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { openSettings } from './settings-sheet.js';

// 下のタブは文字なしの絵だけ（読み上げ用の名前は aria-label）。絵は固定の線画（currentColor で色が変わる）
const SVG = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  brief: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
  closet: SVG('<path d="M9 4.5 3 8.2l2 3.3 2-1V20h10v-9.5l2 1 2-3.3-6-3.7a3.2 3.2 0 0 1-6 0Z"/>'),
  builder: SVG('<path d="M12 3a2 2 0 0 1 1.4 3.4L12 7.5v1.2l8.5 5.6a1.6 1.6 0 0 1-.9 2.9H4.4a1.6 1.6 0 0 1-.9-2.9L12 8.7"/>'),
  favorites: SVG('<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"/>'),
  settings: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.6l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.6-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0V20a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.6.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.6 1.5 1.5 0 0 0-1.4-.9h-.2a1.8 1.8 0 1 1 0-3.6H4a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.6.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0V4a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.6-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.6v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6H20a1.5 1.5 0 0 0-1.4.9Z"/>')
};
const NAV = [['brief', 'ブリーフ'], ['closet', 'クローゼット'], ['builder', 'コーデ'], ['favorites', 'お気に入り'], ['settings', '設定']];

export function initShell() {
  $('#app-header').append(el('p', { class: 'brand', text: 'Dressy Day' }));
}

export function renderNav() {
  const nav = $('#app-nav');
  clear(nav);
  NAV.forEach(([id, label]) => {
    const on = state.screen === id;
    const i = el('span', { class: 'nav-i', 'aria-hidden': 'true' });
    i.innerHTML = ICONS[id]; // 上の固定の絵だけ（入力された内容は入れない）
    nav.append(el('button', {
      type: 'button', class: 'nav-btn' + (on ? ' on' : ''), 'aria-label': label, title: label, 'aria-current': on ? 'page' : null,
      onclick: () => {
        if (id === 'settings') { openSettings(); return; } // 設定は全画面の画面として開く
        if (on) return;
        state.screen = id; $('#app-main').scrollTop = 0; notify();
      }
    }, i));
  });
}
