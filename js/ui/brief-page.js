// 朝ブリーフ画面：天気・予定・今日のコーデ（おまかせ提案 or 着たコーデの評価）・持ち物チェック。
// 「今日／明日」を切り替えられる（夜に明日の準備をするため）。
import { el, clear } from '../util/dom.js';
import { state, notify } from '../state.js';
import { RULES } from '../data/rules.js';
import { eventsOn, formalityOf } from '../data/calendar-feed.js';
import { dayWeather } from '../data/weather-load.js';
import { wearOn, chooseOutfit } from '../data/learning.js';
import { saveFavorite, idsOf } from '../data/favorites.js';
import { upgradeWithGemini, aiEvaluation } from '../data/evaluation.js';
import { suggest } from '../engine/suggest.js';
import { bringList } from '../engine/bring.js';
import { todayIso, addDaysIso, mdLong } from '../util/date.js';
import { weatherCard } from './weather-card.js';
import { eventsCard } from './events-card.js';
import { bringCard } from './bring-card.js';
import { feedbackCard } from './feedback-card.js';
import { outfitCard } from './outfit-card.js';
import { openSettings } from './settings-sheet.js';
import { toast } from './toast.js';

let sugKey = '';      // 提案の計算結果を使い回すための印（入力が同じなら、同じ結果）
let sugRes = null;
let day = 0;          // 0=今日, 1=明日
let redo = false;     // 着たコーデを「選び直す」中か

function dayTabs() {
  const b = (n, label) => el('button', { type: 'button', class: 'seg-btn' + (day === n ? ' on' : ''), 'aria-pressed': String(day === n), text: label,
    onclick: () => { day = n; redo = false; notify(); } });
  return el('div', { class: 'seg-bar' }, b(0, '今日'), b(1, '明日'));
}

let saving = false; // ☆の連打で二重に保存しない
async function addFavorite(fit) {
  if (saving) return;
  saving = true;
  try {
    const saved = await saveFavorite({ items: idsOf(fit), ai: aiEvaluation(fit, addDaysIso(todayIso(), day)) });
    upgradeWithGemini(saved, fit, addDaysIso(todayIso(), day));
    toast('お気に入りに保存しました（AI評価つき。メモはお気に入り画面で足せます）');
  } finally { saving = false; }
}

function outfitSection(date, events, wx) {
  const rec = wearOn(date);
  if (rec && !redo) return feedbackCard(rec, day === 0 ? '今日のコーデ' : '明日のコーデ', () => { redo = true; notify(); });
  const box = el('section', { class: 'sect' }, el('h2', { class: 'sect-title', text: 'コーデの提案' }));
  if (!wx) { box.append(el('p', { class: 'muted card', text: '天気が読めないため、提案を出せません' })); return box; }
  const kinds = events.map((ev) => ({ formality: formalityOf(ev) }));
  // 入力（手持ち・学習・お気に入りの中身・天気・予定）が同じなら、前回の計算結果を使う
  const key = JSON.stringify([state.items, state.adjust, state.favorites.map((f) => f.items), wx, kinds]);
  if (key !== sugKey) { sugRes = suggest({ items: state.items, weather: wx, events: kinds, adjust: state.adjust, favorites: state.favorites }, RULES); sugKey = key; }
  const res = sugRes;
  if (res.note) box.append(el('p', { class: 'note', text: res.note }));
  res.outfits.forEach((o) => box.append(outfitCard(o, [
    el('button', { type: 'button', class: 'btn solid', text: 'これを着る', onclick: () => { redo = false; chooseOutfit(date, o.items, 'suggest'); } }),
    el('button', { type: 'button', class: 'btn', text: '☆ 保存', 'aria-label': 'お気に入りに保存', onclick: () => addFavorite(o.items) })
  ])));
  return box;
}

export function renderBrief(root) {
  clear(root);
  const date = addDaysIso(todayIso(), day);
  const events = eventsOn(date);
  const wx = dayWeather(date, events);
  const umbrella = state.items.find((x) => x.category === 'accessory' && x.sub_category === 'umbrella' && x.status === 'active');
  const bring = bringList({ weather: wx, events, daily: state.settings.daily, umbrellaName: umbrella ? umbrella.name : '' }, RULES);

  root.append(el('div', { class: 'brief-top' }, el('h1', { class: 'page-title', text: `${mdLong(date)}` }), dayTabs()));

  // 昨日のコーデの評価がまだなら、先にお願いする（今日を見ているときだけ）
  const y = day === 0 ? wearOn(addDaysIso(date, -1)) : null;
  if (y && !y.rating) root.append(feedbackCard(y, '昨日のコーデ'));

  root.append(weatherCard(date, events, openSettings), eventsCard(date, events), outfitSection(date, events, wx), bringCard(date, bring));
}
