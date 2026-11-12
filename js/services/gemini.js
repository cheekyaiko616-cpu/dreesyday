// Gemini API を呼ぶ（無料枠のモデル）。キーはヘッダーで送る。失敗したら理由つきのエラーを投げる。
// 無料枠で写真も読めるモデル。前のモデルは新しいアカウントでは使えない（404）ので、使えるものが見つかるまで順に試す
const MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest'];
let working = '';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/** parts: 文章や画像。config: 追加の生成設定（JSONで返させるときなど）。 */
export async function askGemini(prompt, key, timeoutMs = 20000, extra = {}) {
  const order = working ? [working, ...MODELS.filter((m) => m !== working)] : MODELS;
  let last = null;
  for (const model of order) {
    const r = await post(model, prompt, key, timeoutMs, extra);
    if (r.res.status === 404) { last = r; continue; } // このモデルは使えない → 次のモデルへ
    return read(r.res, model);
  }
  return read(last.res, '');
}

async function post(model, prompt, key, timeoutMs, extra) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${URL_BASE}${model}:generateContent`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...(extra.parts || [])] }], generationConfig: { temperature: extra.temperature ?? 0.7, maxOutputTokens: extra.maxOutputTokens || 1024, ...(extra.json ? { responseMimeType: 'application/json' } : {}) } })
    });
    return { model, res };
  } catch (e) {
    throw new Error(e && e.name === 'AbortError' ? '時間内に返事がありませんでした' : '通信できませんでした');
  } finally { clearTimeout(timer); }
}

async function read(res, model) {
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error('キーが使えません（設定のキーを確認してください）');
  if (res.status === 404) throw new Error('使えるモデルが見つかりませんでした（404）');
  if (res.status === 429) throw new Error('無料枠の上限に達しました。しばらくしてからお試しください');
  if (!res.ok) throw new Error(`Geminiがエラーを返しました（${res.status}）`);
  working = model;
  const data = await res.json();
  const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
    ? data.candidates[0].content.parts.map((p) => p.text || '').join('').trim() : '';
  if (!text) throw new Error('評価文が返ってきませんでした');
  return text;
}

/** 画像（data URL）を見せて、JSONで答えてもらう。 */
export async function askGeminiAboutImage(prompt, dataUrl, key) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) throw new Error('写真を読み込めませんでした');
  const text = await askGemini(prompt, key, 30000, { parts: [{ inline_data: { mime_type: m[1], data: m[2] } }], json: true, temperature: 0.2, maxOutputTokens: 1024 });
  try { return JSON.parse(text.replace(/^```json\s*|```$/g, '')); } catch (e) { throw new Error('判定の答えを読み取れませんでした'); }
}
