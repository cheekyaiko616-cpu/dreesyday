// コーデ作成画面：部位ごとに手持ちから選ぶ（自分で選ぶモード）。おまかせ提案と同じ判定で、点数をその場で出す。
// 色相環・色のバランスで、見た目も確かめられる。
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
import { toast } from './toast.js';
import { reviewOutfit, hasReviewKey } from '../data/review.js';

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

// Gemini のレビュー：同じ組み合わせ・天気なら使い回し、選び直している間は呼ばない（無料枠を使いすぎないため）
const reviews = new Map();
const inflight = new Map();
function reviewBox(fit, wx, events, appScore, scoreB) {
  const box = el('div', { class: 'review', 'aria-live': 'polite' });
  if (!hasReviewKey()) { box.append(el('p', { class: 'muted', text: '設定でGeminiのキーを入れると、Geminiの厳しめレビューが付きます' })); return box; }
  const names = events.map((e) => e.title || e.name || '').filter(Boolean);
  const key = JSON.stringify([['outer', 'tops', 'bottoms', 'shoes'].map((k) => (fit[k] ? [fit[k].id, fit[k].color_main, fit[k].color_sub, fit[k].warmth, fit[k].formality] : 0)), fit.accessories.map((a) => a.id), Math.round(wx.feels), Math.round(wx.pop), names]);
  const show = (rv) => {
    const mix = Math.round((appScore + rv.score) / 2);
    scoreB.textContent = String(mix);
    clear(box);
    box.append(el('h3', { class: 'card-title', text: `Geminiレビュー ${rv.score}点` }),
      el('p', { class: 'muted', text: `総合 ${mix}点（アプリ ${appScore}点 と Gemini ${rv.score}点の平均）` }),
      rv.good ? el('p', { text: `◎ ${rv.good}` }) : null, rv.bad ? el('p', { text: `△ ${rv.bad}` }) : null, rv.fix ? el('p', { text: `→ ${rv.fix}` }) : null);
  };
  if (reviews.has(key)) { show(reviews.get(key)); return box; }
  box.append(el('p', { class: 'muted', text: 'Geminiがレビュー中…' }));
  setTimeout(async () => {
    if (!box.isConnected) return; // もう選び直されている
    try {
      if (!inflight.has(key)) inflight.set(key, reviewOutfit(fit, wx, names, appScore).finally(() => inflight.delete(key)));
      const rv = await inflight.get(key);
      reviews.set(key, rv);
      if (reviews.size > 30) reviews.delete(reviews.keys().next().value);
      if (box.isConnected) show(rv);
    } catch (e) { if (box.isConnected) { clear(box); box.append(el('p', { class: 'muted', text: `Geminiのレビューは出せませんでした：${e.message}` })); } }
  }, 900);
  return box;
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
    const appScore = Math.round(r.score.total * 100);
    const scoreB = el('b', { text: String(appScore) });
    mini.append(scoreB, el('span', { text: reasonText(fit, r, wx, RULES.rain.popThreshold) }));
    result.append(...[
      el('h2', { class: 'card-title', text: '判定（今日の天気・予定で）' }),
      low.length ? el('p', { class: 'note', text: `予定に対して、くだけすぎのアイテムがあります：${low.map(itemName).join('、')}` }) : null,
      scoreBars(r.score), colorViz(fit), reviewBox(fit, wx, events, appScore, scoreB),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn solid', text: '今日はこれを着る', onclick: async () => { await chooseOutfit(date, fit, 'self'); toast('今日のコーデにしました'); } }),
        el('button', { type: 'button', class: 'btn', text: '☆ 保存', onclick: async (e) => {
          const btn = e.currentTarget;
          if (btn.disabled) return;
          btn.disabled = true; // 連打で二重に保存しない
          try {
            const saved = await saveFavorite({ items: idsOf(fit), ai: aiEvaluation(fit, date) });
            upgradeWithGemini(saved, fit, date);
            toast('お気に入りに保存しました');
          } finally { btn.disabled = false; }
        } }))].filter(Boolean)); // 要素の append は null を飛ばさないので、先に除く
  }
  root.append(mini, ...SLOTS.map(slotRow));
  if (ready) root.append(result);
}
