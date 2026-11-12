// コーデの Gemini レビュー（厳しめの点数と一言）。キーが無ければ null。失敗したら理由つきで投げる。
import { buildReviewPrompt, parseReview } from '../engine/review.js';
import { askGemini } from '../services/gemini.js';
import { geminiKey } from './gemini-key.js';

export const hasReviewKey = () => !!geminiKey();

export async function reviewOutfit(fit, weather, eventNames, appScore) {
  const key = geminiKey();
  if (!key) return null;
  const text = await askGemini(buildReviewPrompt(fit, weather, eventNames, appScore), key, 25000, { json: true, temperature: 0.3, maxOutputTokens: 1024 });
  let o; try { o = JSON.parse(text.replace(/^```json\s*|```$/g, '')); } catch (e) { throw new Error('レビューの答えを読み取れませんでした'); }
  const r = parseReview(o);
  if (!r) throw new Error('レビューの答えを読み取れませんでした');
  return r;
}
