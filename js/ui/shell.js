// 画面の枠：上のタイトルと設定ボタン、下の切り替えボタン（ブリーフ・クローゼット・コーデ・お気に入り）。
import { $, el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { openSettings } from './settings-sheet.js';

const NAV = [['brief', 'ブリーフ', '☀︎'], ['closet', 'クローゼット', '▦'], ['builder', 'コーデ', '✚'], ['favorites', 'お気に入り', '☆']];

export function initShell() {
  $('#app-header').append(
    el('p', { class: 'brand', text: 'Dressy Day' }),
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': '設定', text: '⚙︎', onclick: openSettings }));
}

export function renderNav() {
  const nav = $('#app-nav');
  clear(nav);
  NAV.forEach(([id, label, icon]) => nav.append(el('button', {
    type: 'button', class: 'nav-btn' + (state.screen === id ? ' on' : ''), 'aria-current': state.screen === id ? 'page' : null,
    onclick: () => { if (state.screen === id) return; state.screen = id; window.scrollTo(0, 0); notify(); }
  }, el('span', { class: 'nav-i', 'aria-hidden': 'true', text: icon }), el('span', { text: label }))));
}
