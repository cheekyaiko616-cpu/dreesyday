// Gemini に「厳しめのレビュー」を頼むための文章と、返ってきた答えの検査（純関数）。写真・顔・体型の数字は送らない。
const SLOT = { outer: 'アウター', tops: 'トップス', bottoms: 'ボトムス', shoes: '靴' };

export function buildReviewPrompt(fit, weather, eventNames, appScore) {
  const rows = Object.keys(SLOT).filter((k) => fit[k]).map((k) => {
    const x = fit[k];
    return `- ${SLOT[k]}: ${x.name || '名前なし'}（色 ${x.color_main}${x.color_sub ? ' / ' + x.color_sub : ''}、暖かさ${x.warmth}/5、格 ${x.formality}）`;
  });
  (fit.accessories || []).forEach((a) => rows.push(`- 小物: ${a.name || '名前なし'}`));
  const wx = weather ? `体感${Math.round(weather.feels)}℃、降水確率${Math.round(weather.pop)}%` : '天気は不明';
  const ev = eventNames && eventNames.length ? `、予定: ${eventNames.slice(0, 3).join('、')}` : '';
  return [
    'あなたは率直で目の肥えたスタイリストです。次のコーデを、お世辞なしで厳しめに採点してレビューしてください。JSONだけで答えます。',
    '採点の目安: 90点以上は文句なし、70点台は無難、60点以下は色・季節・場面のどれかが明らかに合っていない。迷ったら低めに。',
    'score: 0〜100の整数',
    'good: よい点を1文（なければ空文字）',
    'bad: 気になる点・合っていない点を1〜2文。専門用語は使わず、具体的に',
    'fix: 直すならどうするかを1文（直す所がなければ空文字）',
    '', '【コーデ】', ...rows, '', `【その日】${wx}${ev}`, '', `【アプリの採点（参考。納得できなければ変えてよい）】${appScore}点`
  ].join('\n');
}

/** 答えを整える。点数が読めなければ null。 */
export function parseReview(o) {
  if (!o || typeof o !== 'object' || !Number.isFinite(+o.score)) return null;
  const t = (v) => (typeof v === 'string' ? v.trim().slice(0, 200) : '');
  return { score: Math.max(0, Math.min(100, Math.round(+o.score))), good: t(o.good), bad: t(o.bad), fix: t(o.fix) };
}
