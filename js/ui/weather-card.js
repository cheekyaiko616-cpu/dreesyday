// 朝ブリーフの天気カード：場所の天気（Event list と同じ絵文字と言葉）・体感・降水・風と、1時間ごとの帯。
// 予定の会場があれば、会場の天気も1行で出す。
import { loadWeather } from '../data/weather-load.js';
import { el } from '../util/dom.js';
import { state, notify } from '../state.js';
import { weatherLabel, daytimeFeels } from '../services/weather.js';
import { daySwing } from '../engine/swing.js';
import { RULES } from '../data/rules.js';

function hoursStrip(hours, date) {
  const list = hours.filter((h) => h.date === date);
  if (!list.length) return null;
  return el('ol', { class: 'hours', 'aria-label': '1時間ごとの天気' }, list.map((h) => {
    const { icon, label } = weatherLabel(h.code);
    return el('li', { 'aria-label': `${h.hour}時 ${label} ${h.temp}度 降水${h.pop}%` },
      el('small', { text: `${h.hour}時` }), el('span', { 'aria-hidden': 'true', text: icon }),
      el('b', { text: `${h.temp}℃` }), el('small', { class: h.pop >= 50 ? 'wet' : '', text: `${h.pop}%` }));
  }));
}

function swingLine(hours, date) {
  const s = daySwing(hours, date);
  if (!s) return null;
  const big = s.range >= RULES.swing.from;
  return el('p', { class: 'wx-swing' + (big ? ' wet' : ''), text: `朝 ${s.morning}℃ → 昼 ${s.noon}℃ → 夜 ${s.night}℃${big ? `（差${s.range}℃。羽織れる上着があると安心）` : ''}` });
}

/** date: 表示する日。events: その日の予定。onSettings: 場所を設定する画面を開く。 */
export function weatherCard(date, events, onSettings) {
  const w = state.weather;
  const box = el('section', { class: 'card wx' }, el('h2', { class: 'card-title', text: '天気' }));
  if (w.status === 'loading') { box.append(el('p', { class: 'muted', text: '読み込み中…' })); return box; }
  if (w.status === 'nohome') {
    box.append(el('p', { class: 'muted', text: '場所が未設定です' }),
      el('button', { class: 'btn', type: 'button', text: '場所を設定', onclick: onSettings }));
    return box;
  }
  const d = w.home && w.home.days[date];
  if (!d) {
    box.append(el('p', { class: 'muted', text: '天気を取得できません' }), w.error ? el('p', { class: 'muted', text: `理由：${w.error}` }) : null,
      el('button', { class: 'btn', type: 'button', text: '再読み込み', onclick: () => loadWeather() }));
    return box;
  }
  box.firstChild.remove(); // 通常時は見出しを省いて、場所と今の天気だけ出す
  // 現在地（自宅）と出先（予定の会場）を、1操作で切り替える
  const away = [];
  const seen = new Set();
  (events || []).forEach((ev) => {
    const v = w.venues[ev.place];
    if (!v || seen.has(ev.place) || !v.data.days[date]) return;
    seen.add(ev.place); away.push({ name: v.name, d: v.data.days[date], color: ev.color });
  });
  const useAway = state.ui.wxMode === 'away' && away.length > 0;
  const cur = useAway ? away[state.ui.wxAway % away.length] : null;
  const dd = cur ? cur.d : d;
  const { icon, label } = weatherLabel(dd.code);
  const seg = el('div', { class: 'seg-bar wx-seg' },
    el('button', { type: 'button', class: 'seg-btn' + (!useAway ? ' on' : ''), 'aria-pressed': String(!useAway), text: '現在地',
      onclick: () => { state.ui.wxMode = 'home'; notify(); } }),
    el('button', { type: 'button', class: 'seg-btn' + (useAway ? ' on' : ''), 'aria-pressed': String(useAway), disabled: away.length ? null : '', // 出先が複数なら、押すたびに次の出先へ
      text: away.length > 1 ? `出先 ${useAway ? (state.ui.wxAway % away.length) + 1 : 1}/${away.length}` : '出先',
      onclick: () => { state.ui.wxAway = state.ui.wxMode === 'away' ? state.ui.wxAway + 1 : 0; state.ui.wxMode = 'away'; notify(); } }));
  box.append(
    el('div', { class: 'wx-main' },
      el('span', { class: 'wx-icon', 'aria-hidden': 'true', text: icon }),
      el('div', { class: 'wx-body' },
        el('p', { class: 'wx-place', text: cur ? cur.name : w.homeName }),
        el('p', { class: 'wx-temp' }, el('b', { text: `${dd.max}℃` }), el('span', { text: ` / ${dd.min}℃　${label}` }))),
      seg),
    el('details', { class: 'more' }, el('summary', { text: cur ? 'くわしく' : '1時間ごとの天気・くわしく' }),
      el('ul', { class: 'wx-facts' },
        el('li', null, el('small', { text: '体感(日中)' }), el('b', { text: `${Math.round(daytimeFeels(dd))}℃` })),
        el('li', null, el('small', { text: '降水' }), el('b', { class: dd.pop >= 50 ? 'wet' : '', text: `${dd.pop}%` })),
        el('li', null, el('small', { text: '風' }), el('b', { text: `${dd.wind}m/s` }))),
      cur ? null : hoursStrip(w.home.hours, date), cur ? null : swingLine(w.home.hours, date)));
  return box;
}
