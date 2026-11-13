// サイズ感（計算だけ）。服のサイズ表記と自分のサイズの差から、着丈・身幅の比を決める。

export const LETTERS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** サイズ表記 → { kind: 'letter', n } か { kind: 'inch', n }。読めなければ null */
export function parseSize(text) {
  const t = String(text || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!t) return null;
  const L = t.replace(/^(2XL)$/, 'XXL').replace(/^(XXS)$/, 'XS');
  if (LETTERS.includes(L)) return { kind: 'letter', n: LETTERS.indexOf(L) };
  const m = t.match(/^(\d{2})(?:IN|INCH|インチ|")?$/);
  if (m && +m[1] >= 22 && +m[1] <= 46) return { kind: 'inch', n: +m[1] };
  return null;
}

/**
 * アイテムのサイズと自分のサイズの差 → { wk, hk }（身幅の比・着丈の比）。
 * 大きめなら 1 より大きく（ゆったり）、小さめなら 1 より小さく（ぴったり）。
 */
export function sizeFeel(item, body) {
  const none = { wk: 1, hk: 1 };
  const b = body || {};
  const s = parseSize(item && item.size);
  if (!s) return none;
  let d = 0, step = 0.07;
  if (s.kind === 'inch') {
    if (!(b.waist > 0)) return none;
    d = s.n - b.waist; step = 0.025;
  } else {
    const mine = parseSize(b.top);
    if (!mine) return none;
    d = s.n - mine.n;
  }
  const wk = clamp(1 + d * step, 0.8, 1.25);
  return { wk, hk: 1 + (wk - 1) * 0.5 };
}
