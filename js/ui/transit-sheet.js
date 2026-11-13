// 「乗り換え」の入力画面（下から出る）。出発駅と到着駅を入れると、Yahoo!乗換案内が開く。
// 日時は入れない（開いた先で、現在の日時で検索の画面になる）。出発駅は毎回空欄から始める（前回の入力は覚えない）。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { nearStations } from '../services/stations.js';
import { transitUrl, inJapan, whereAmI } from '../services/trip-links.js';

const MARKUP = `
  <div class="sheet" id="tr-sheet" role="dialog" aria-modal="true" aria-labelledby="tr-heading">
    <div class="sheet-head">
      <h2 id="tr-heading">乗り換え案内</h2>
      <button type="button" class="ghost" id="tr-close">閉じる</button>
    </div>
    <div id="tr-body"></div>
  </div>`;

let wrap = null;

export function initTransitSheet() {
  wrap = mountSheet(MARKUP);
  $('#tr-close').addEventListener('click', () => hideSheet(wrap));
}

const field = (label, input) => el('div', { class: 'field flush' }, el('label', { text: label }), input);

/** e: 予定。getPos: 会場の位置を返す関数（会場表／検索の結果。分からなければ null）。 */
export function openTransit(e, getPos) {
  const inp = (name, value, extra) => el('input', { class: 'input', name, type: 'text', value, autocomplete: 'off', ...extra });
  const from = inp('from', '', { placeholder: '例）新宿', enterkeyhint: 'next' });
  const to = inp('to', '', { placeholder: '到着駅', enterkeyhint: 'go' });
  const err = el('p', { class: 'err', role: 'alert' });
  const near = el('div', { class: 'chips' });
  const go = el('a', { class: 'btn solid wide', target: '_blank', rel: 'noopener', href: '#', text: 'Yahoo!乗換案内で検索' });

  const read = () => ({ from: from.value.trim(), to: to.value.trim() });
  const problem = (v) => (!v.from ? ['出発駅を入力してください', from] : !v.to ? ['到着駅を入力してください', to] : null);
  const refresh = () => {
    const v = read();
    go.href = problem(v) ? '#' : transitUrl(v);
    return v;
  };
  const chip = (name, km) => el('button', { type: 'button', class: 'pick', onclick: () => { to.value = name; err.textContent = ''; refresh(); } },
    name, el('small', { text: km < 1 ? ` ${Math.round(km * 1000)}m` : ` ${km.toFixed(1)}km` }));

  const here = el('button', { type: 'button', class: 'btn', text: '現在地の駅', onclick: async (ev) => {
    const b = ev.currentTarget;
    b.disabled = true; err.textContent = '';
    try {
      const pos = await whereAmI();
      if (!inJapan(pos)) throw new Error('現在地が日本国外のため使えません。駅名を入力してください');
      const list = await nearStations(pos, 1);
      if (!list.length) throw new Error('近くの駅が見つかりませんでした。駅名を入力してください');
      from.value = list[0].name; refresh();
    } catch (x) { err.textContent = x.message || '現在地を取得できませんでした'; }
    finally { b.disabled = false; }
  } });

  const form = el('form', { class: 'tform', novalidate: true },
    el('p', { class: 'help', text: e.place ? `行き先：${e.place}` : '' }),
    el('div', { class: 'tr-row' }, field('出発駅', from), here),
    field('到着駅', to), near,
    el('p', { class: 'help', text: '日時は、開いたあとの画面で指定します。' }),
    err, go);
  form.addEventListener('input', () => { err.textContent = ''; refresh(); });
  form.addEventListener('submit', (ev) => { ev.preventDefault(); go.click(); });
  go.addEventListener('click', (ev) => {
    const v = refresh();
    const bad = problem(v);
    err.textContent = bad ? bad[0] : '';
    if (bad) { ev.preventDefault(); bad[1].focus(); }
  });

  const body = $('#tr-body');
  clear(body);
  body.append(form);
  refresh();
  showSheet(wrap);

  // 到着駅：会場表にあればそれ、なければ近い駅の候補を出す（入力済みなら上書きしない）
  getPos().then(async (pos) => {
    if (!pos || !form.isConnected) return;
    const list = pos.station ? [{ name: pos.station, km: pos.stationKm ?? 0 }] : await nearStations(pos, 3).catch(() => []);
    if (!list.length || !form.isConnected) return;
    if (!to.value) { to.value = list[0].name; refresh(); }
    near.replaceChildren(...list.map((s) => chip(s.name, s.km)));
  });
}
