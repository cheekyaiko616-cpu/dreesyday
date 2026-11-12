// Gemini に送る文章（プロンプト）を作る（純関数）。写真・顔・体型の数字は送らない。服の名前・種類・色・点数・天気だけ。
import { PATTERNS, MATERIALS } from '../config.js';
const PAT = Object.fromEntries(PATTERNS), MAT = Object.fromEntries(MATERIALS);
const SLOT = { outer: 'アウター', tops: 'トップス', bottoms: 'ボトムス', shoes: '靴' };

export function buildPrompt(fit, ruleText, weather, eventNames) {
  const rows = Object.keys(SLOT).filter((k) => fit[k]).map((k) => `- ${SLOT[k]}: ${fit[k].name || '名前なし'}（色 ${fit[k].color_main}${fit[k].color_sub ? ' / ' + fit[k].color_sub : ''}${fit[k].pattern && fit[k].pattern !== 'plain' ? '、柄 ' + (PAT[fit[k].pattern] || fit[k].pattern) : ''}${fit[k].material && fit[k].material !== 'other' ? '、素材 ' + (MAT[fit[k].material] || fit[k].material) : ''}）`);
  (fit.accessories || []).forEach((a) => rows.push(`- 小物: ${a.name || '名前なし'}`));
  const wx = weather ? `体感${Math.round(weather.feels)}℃、降水確率${Math.round(weather.pop)}%` : '天気は不明';
  return [
    'あなたは親しみやすいスタイリストです。次の服の組み合わせを評価して、日本語で3〜4文の短い評価文を書いてください。',
    'お世辞は言わず、合っていない所ははっきり伝える。よい点を先に、気をつける点は最後に。専門用語は使わず、箇条書きや見出しは使わないでください。',
    '', '【コーデ】', ...rows, '', `【その日】${wx}${eventNames && eventNames.length ? '、予定: ' + eventNames.slice(0, 3).join('、') : ''}`,
    '', '【アプリの採点結果（参考）】', ruleText
  ].join('\n');
}
