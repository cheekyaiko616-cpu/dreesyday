// コーデ作成画面：部位ごとに手持ちから選ぶ（自分で選ぶモード）。おまかせ提案と同じ判定で、点数をその場で出す。
// 色相環・色のバランス・マネキンで、見た目も確かめられる。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { RULES } from '../data/rules.js';
import { eventsOn, formalityOf } from '../data/calendar-feed.js';
import { dayWeather } from '../data/weather-load.js';
import { chooseOutfit } from '../data/learning.js';
import { saveFavorite, idsOf } from '../data/favorites.js';
import { upgradeWithGemini, aiEvaluation } from '../data/evaluation.js';
import { scoreOutfit, formalityNeed } from '../engine/score.js';
import { eventKinds } from '../engine/suggest.js';
import { reasonText } from '../engine/reason.js';
import { todayIso } from '../util/date.js';
import { thumbEl, itemName } from './thumb.js';
import { scoreBars, colorViz } from './outfit-card.js';
import { openMannequin } from './mannequin-sheet.js';
import { drawMannequin } from './mannequin.js';
import { toast } from './toast.js';

const SLOTS = [['outer', 'アウター', true], ['tops', 'トップス', false], ['bottoms', 'ボトムス', false], ['shoes', 'シューズ', true], ['accessory', '小物', true]];

function picks() {
  if (!state.ui.builder) state.ui.builder = { outer: null, tops: null, bottoms: null, shoes: null, accessory: [] };
  return state.ui.builder;
}

/** 選んだ id → コーデ（アイテムの実体）。 */
function fitNow() {
  const p = picks();
  const by = (id) => state.items.find((x) => x.id === id) || null;
  return { outer: by(p.outer), tops: by(p.tops), bottoms: by(p.bottoms), shoes: by(p.shoes), accessories: p.accessory.map(by).filter(Boolean) };
}

function slotRow([key, label, optional]) {
  const p = picks();
  const list = state.items.filter((x) => x.category === key && x.status === 'active');
  const selected = (id) => (key === 'accessory' ? p.accessory.includes(id) : p[key] === id);
  const pick = (id) => {
    if (key === 'accessory') p.accessory = selected(id) ? p.accessory.filter((x) => x !== id) : [...p.accessory, id];
    else p[key] = p[key] === id ? null : id;
    notify();
  };
  return el('section', { class: 'slot' },
    el('h2', { class: 'slot-title' }, label, optional ? el('small', { text: '（なしでも可）' }) : null),
    list.length
      ? el('ul', { class: 'picker' }, list.map((it) => el('li', null, el('button', {
        type: 'button', class: 'pick' + (selected(it.id) ? ' on' : ''), 'aria-pressed': String(selected(it.id)), onclick: () => pick(it.id)
      }, thumbEl(it, 'm'), el('small', { text: itemName(it) })))))
      : el('p', { class: 'muted', text: 'なし' }));
}

export function renderBuilder(root) {
  clear(root);
  root.append(el('div', { class: 'page-head' }, el('h1', { class: 'page-title', text: 'コーデを作る' }),
    el('button', { type: 'button', class: 'ghost', text: 'クリア', onclick: () => { state.ui.builder = null; notify(); } })));

  const date = todayIso();
  const events = eventsOn(date);
  const wx = dayWeather(date, events);
  const fit = fitNow();
  const ready = fit.tops && fit.bottoms;

  // 判定（今日の天気と予定で）
  const result = el('section', { class: 'card judge' });
  const mini = el('div', { class: 'judge-mini', role: 'status' });
  if (!ready) mini.append(el('span', { class: 'muted', text: 'トップスとボトムスを選択' }));
  else if (!wx) mini.append(el('span', { class: 'muted', text: '天気が読めないため、点数は出せません' })), result.append(colorViz(fit));
  else {
    const kinds = eventKinds(events.map((ev) => ({ formality: formalityOf(ev) })));
    const need = formalityNeed(kinds, RULES.formality);
    const r = scoreOutfit(fit, { rules: RULES, adjust: state.adjust, weather: wx, need, favorites: state.favorites });
    const low = [fit.tops, fit.bottoms, fit.outer, fit.shoes].filter(Boolean).filter((it) => (RULES.formality.level[it.formality] ?? 0) < need.need);
    mini.append(el('b', { text: String(Math.round(r.score.total * 100)) }), el('span', { text: reasonText(fit, r, wx, RULES.rain.popThreshold) }));
    result.append(...[
      el('h2', { class: 'card-title', text: '判定（今日の天気・予定で）' }),
      low.length ? el('p', { class: 'note', text: `予定に対して、くだけすぎのアイテムがあります：${low.map(itemName).join('、')}` }) : null,
      scoreBars(r.score), colorViz(fit),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn solid', text: '今日はこれを着る', onclick: async () => { await chooseOutfit(date, fit, 'self'); toast('今日のコーデにしました'); } }),
        el('button', { type: 'button', class: 'btn', text: 'マネキン', onclick: () => openMannequin(fit) }),
        el('button', { type: 'button', class: 'btn', text: '☆ 保存', onclick: async () => {
          const img = await drawMannequin(fit);
          const saved = await saveFavorite({ items: idsOf(fit), image: img.toDataURL('image/jpeg', 0.9), ai: aiEvaluation(fit, date) });
  upgradeWithGemini(saved, fit, date);
          toast('お気に入りに保存しました');
        } }))].filter(Boolean)); // 要素の append は null を飛ばさないので、先に除く
  }
  root.append(mini, ...SLOTS.map(slotRow));
  if (ready) root.append(result);
}
