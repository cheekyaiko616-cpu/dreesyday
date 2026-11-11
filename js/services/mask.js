// 切り抜きマスクの後処理（純粋な関数）：しきい値 → 最大の塊だけ残す → 穴埋め → 縁をなめらかに。

/** m: Float32Array(w*h) 0..1 → Uint8Array(0/1) */
export function binarize(m, th) {
  const b = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) b[i] = m[i] > th ? 1 : 0;
  return b;
}

/** 一番大きい塊だけ残す（4近傍） */
export function largestBlob(b, w, h) {
  const lab = new Int32Array(b.length);
  const stack = new Int32Array(b.length);
  let best = 0, bestSize = 0, id = 0;
  for (let s = 0; s < b.length; s++) {
    if (!b[s] || lab[s]) continue;
    id++; let sp = 0, size = 0;
    stack[sp++] = s; lab[s] = id;
    while (sp) {
      const p = stack[--sp]; size++;
      const x = p % w, y = (p - x) / w;
      if (x > 0 && b[p - 1] && !lab[p - 1]) { lab[p - 1] = id; stack[sp++] = p - 1; }
      if (x < w - 1 && b[p + 1] && !lab[p + 1]) { lab[p + 1] = id; stack[sp++] = p + 1; }
      if (y > 0 && b[p - w] && !lab[p - w]) { lab[p - w] = id; stack[sp++] = p - w; }
      if (y < h - 1 && b[p + w] && !lab[p + w]) { lab[p + w] = id; stack[sp++] = p + w; }
    }
    if (size > bestSize) { bestSize = size; best = id; }
  }
  const o = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) o[i] = lab[i] === best ? 1 : 0;
  return o;
}

/** 外から届かない穴（背景扱いされた内側）を埋める。minHole 画素より大きい穴は残す（袖と胴のすき間など）。 */
export function fillHoles(b, w, h, minHole = 0) {
  const seen = new Uint8Array(b.length);
  const stack = new Int32Array(b.length);
  const o = Uint8Array.from(b);
  const flood = (s, mark) => {
    let sp = 0; const cells = [];
    stack[sp++] = s; seen[s] = 1;
    while (sp) {
      const p = stack[--sp]; cells.push(p);
      const x = p % w, y = (p - x) / w;
      if (x > 0 && !b[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[sp++] = p - 1; }
      if (x < w - 1 && !b[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[sp++] = p + 1; }
      if (y > 0 && !b[p - w] && !seen[p - w]) { seen[p - w] = 1; stack[sp++] = p - w; }
      if (y < h - 1 && !b[p + w] && !seen[p + w]) { seen[p + w] = 1; stack[sp++] = p + w; }
    }
    return cells;
  };
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const s = y * w + x; if (!b[s] && !seen[s]) flood(s); }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const s = y * w + x; if (!b[s] && !seen[s]) flood(s); }
  for (let s = 0; s < b.length; s++) {
    if (b[s] || seen[s]) continue;
    const cells = flood(s);
    if (cells.length <= minHole) for (const p of cells) o[p] = 1;
  }
  return o;
}

/** 箱ぼかし（半径 r）を横→縦に */
function boxBlur(src, w, h, r) {
  const t = new Float32Array(src.length), o = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      t[y * w + x] = acc / n;
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      o[y * w + x] = acc / n;
      acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
    }
  }
  return o;
}

/** 0/1 → 0..255 の縁がなめらかなアルファ。1回だけ内側へ寄せて背景のにじみ（ハロー）を消す。 */
export function feather(b, w, h, r = 2, erode = 1) {
  let f = Float32Array.from(b);
  if (erode > 0) { // 内側へ erode 画素：ぼかして 1 に近いところだけ残す
    f = boxBlur(f, w, h, erode);
    for (let i = 0; i < f.length; i++) f[i] = f[i] > 0.99 ? 1 : 0;
  }
  f = boxBlur(f, w, h, r);
  const a = new Uint8ClampedArray(f.length);
  for (let i = 0; i < f.length; i++) a[i] = Math.round(Math.min(1, Math.max(0, (f[i] - 0.15) / 0.7)) * 255);
  return a;
}
