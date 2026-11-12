// コーデに AI評価（アプリ内の判定）の文章をつける。保存する時と、つけ直す時に使う。
import { state } from '../state.js';
import { RULES } from './rules.js';
import { eventsOn, formalityOf } from './calendar-feed.js';
import { dayWeather } from './weather-load.js';
import { scoreOutfit, formalityNeed } from '../engine/score.js';
import { eventKinds } from '../engine/suggest.js';
import { evaluateText } from '../engine/evaluate.js';
import { buildPrompt } from '../engine/gemini-prompt.js';
import { askGemini } from '../services/gemini.js';
import { geminiKey } from './gemini-key.js';
import { saveFavorite } from './favorites.js';
import { todayIso } from '../util/date.js';

/** fit: コーデ（アイテムの実体）。今日の天気と予定で評価する。天気が読めないときは、色と服装の格だけで評価する。 */
export function aiEvaluation(fit, date = todayIso(), withMeta = false) {
  const events = eventsOn(date);
  const wx = dayWeather(date, events);
  const need = formalityNeed(eventKinds(events.map((ev) => ({ formality: formalityOf(ev) }))), RULES.formality);
  const weather = wx || { feels: 15, pop: 0, wind: 0 };
  // お気に入り（自分自身）で点が上がらないよう、favorites は渡さない
  const r = scoreOutfit(fit, { rules: RULES, adjust: state.adjust, weather, need, favorites: [] });
  const text = evaluateText(fit, r, !!wx, state.settings.body);
  return withMeta ? { text, weather: wx, events } : text;
}

/** Gemini で評価文を作る。キーが無い・失敗したときは、アプリ内の評価文を返す（error に理由）。 */
export async function geminiEvaluation(fit, date = todayIso()) {
  const base = aiEvaluation(fit, date, true);
  const key = geminiKey();
  if (!key) return { text: base.text, error: 'キー未登録' };
  try {
    const prompt = buildPrompt(fit, base.text, base.weather, base.events.map((e) => e.title || e.name || '').filter(Boolean));
    return { text: await askGemini(prompt, key), error: '' };
  } catch (e) { return { text: base.text, error: e.message }; }
}

/** 保存したお気に入りの評価文を、キーがあれば裏で Gemini の文章に置き換える（失敗したらそのまま）。 */
export async function upgradeWithGemini(f, fit, date = todayIso()) {
  if (!geminiKey()) return;
  try {
    const r = await geminiEvaluation(fit, date);
    const now = state.favorites.find((x) => x.id === f.id); // その間に付けた星・メモを壊さない
    if (!r.error && now) await saveFavorite({ ...now, ai: r.text });
  } catch (e) { console.error(e); }
}
