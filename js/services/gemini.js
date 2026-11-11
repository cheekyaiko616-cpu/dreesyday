// Gemini API を呼ぶ（無料枠のモデル）。キーはヘッダーで送る。失敗したら理由つきのエラーを投げる。
const MODEL = 'gemini-2.5-flash';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

export async function askGemini(prompt, key, timeoutMs = 20000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${URL_BASE}${MODEL}:generateContent`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } } })
    });
  } catch (e) {
    throw new Error(e && e.name === 'AbortError' ? '時間内に返事がありませんでした' : '通信できませんでした');
  } finally { clearTimeout(timer); }
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error('キーが使えません（設定のキーを確認してください）');
  if (res.status === 429) throw new Error('無料枠の上限に達しました。しばらくしてからお試しください');
  if (!res.ok) throw new Error(`Geminiがエラーを返しました（${res.status}）`);
  const data = await res.json();
  const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
    ? data.candidates[0].content.parts.map((p) => p.text || '').join('').trim() : '';
  if (!text) throw new Error('評価文が返ってきませんでした');
  return text;
}
