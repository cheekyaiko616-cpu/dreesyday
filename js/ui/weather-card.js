// 朝ブリーフの天気カード：場所の天気（Event list と同じ絵文字と言葉）・体感・降水・風と、1時間ごとの帯。
// 予定の会場があれば、会場の天気も1行で出す。
import { loadWeather } from '../data/weather-load.js';
import { el } from '../util/dom.js';
import { state } from '../state.js';
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
  const { icon, label } = weatherLabel(d.code);
  box.firstChild.remove(); // 通常時は見出しを省いて、場所と今の天気だけ出す
  box.append(
    el('div', { class: 'wx-main' },
      el('span', { class: 'wx-icon', 'aria-hidden': 'true', text: icon }),
      el('div', null,
        el('p', { class: 'wx-place', text: w.homeName }),
        el('p', { class: 'wx-temp' }, el('b', { text: `${d.max}℃` }), el('span', { text: ` / ${d.min}℃　${label}` })))),
    el('details', { class: 'more' }, el('summary', { text: '1時間ごとの天気・くわしく' }),
      el('ul', { class: 'wx-facts' },
        el('li', null, el('small', { text: '体感(日中)' }), el('b', { text: `${Math.round(daytimeFeels(d))}℃` })),
        el('li', null, el('small', { text: '降水' }), el('b', { class: d.pop >= 50 ? 'wet' : '', text: `${d.pop}%` })),
        el('li', null, el('small', { text: '風' }), el('b', { text: `${d.wind}m/s` }))),
      hoursStrip(w.home.hours, date), swingLine(w.home.hours, date)));
  // 予定の会場の天気
  const seen = new Set();
  events.forEach((ev) => {
    if (seen.has(ev.place)) return;
    seen.add(ev.place);
    const v = w.venues[ev.place];
    const vd = v && v.data.days[date];
    if (!vd) return;
    const x = weatherLabel(vd.code);
    box.append(el('p', { class: 'wx-venue' },
      el('span', { class: 'chip', style: `--c:${ev.color}`, text: '会場' }),
      ` ${v.name}　${x.icon} ${vd.max}℃/${vd.min}℃　体感${Math.round(daytimeFeels(vd))}℃　降水${vd.pop}%`));
  });
  return box;
}
