// 服の写真をGeminiで判定する（キーが無い・失敗したときは null と理由を返す）。
import { askGeminiAboutImage } from '../services/gemini.js';
import { judgePrompt, parseJudge } from '../engine/item-judge.js';
import { geminiKey } from './gemini-key.js';

export async function judgeItem(dataUrl) {
  const key = geminiKey();
  if (!key) return { result: null, error: 'キー未登録' };
  try {
    const result = parseJudge(await askGeminiAboutImage(judgePrompt(), dataUrl, key));
    return Object.keys(result).length > 1 ? { result, error: '' } : { result: null, error: '判定できませんでした' };
  } catch (e) { return { result: null, error: e.message }; }
}
