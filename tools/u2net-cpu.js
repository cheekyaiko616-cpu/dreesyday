// U²-Net-p（Apache-2.0）を純JSで動かす推論器。外部ライブラリなし。
// model: {size, ops, input, output, nt} ／ weights: Uint16Array（半精度）

const h2f = new Float32Array(65536);
(() => {
  for (let i = 0; i < 65536; i++) {
    const s = (i & 0x8000) ? -1 : 1, e = (i >> 10) & 31, m = i & 1023;
    h2f[i] = e === 0 ? s * m * 2 ** -24 : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * 2 ** (e - 15);
  }
})();

function conv(x, o, W, B, op) {
  const { ci, co, k, d, p, h, wd } = op;
  const out = new Float32Array(co * h * wd);
  const plane = h * wd;
  const half = (k - 1) / 2;
  const wf = op.wf || (op.wf = Float32Array.from(W.subarray(op.w, op.w + co * ci * k * k), (v) => h2f[v]));
  const kk = k * k;
  let oc = 0;
  for (; oc + 4 <= co; oc += 4) { // 出力4チャンネルずつ：入力の読み込みを共有して速くする
    const o0 = oc * plane, o1 = o0 + plane, o2 = o1 + plane, o3 = o2 + plane;
    for (let q = 0; q < 4; q++) out.fill(h2f[B[op.b + oc + q]], (oc + q) * plane, (oc + q + 1) * plane);
    for (let ic = 0; ic < ci; ic++) {
      const ib = ic * plane;
      for (let ky = 0; ky < k; ky++) {
        const dy = (ky - half) * d;
        const y0 = Math.max(0, -dy), y1 = Math.min(h, h - dy);
        for (let kx = 0; kx < k; kx++) {
          const dx = (kx - half) * d;
          const wi = ic * kk + ky * k + kx;
          const w0 = wf[(oc * ci) * kk + wi], w1 = wf[((oc + 1) * ci) * kk + wi];
          const w2 = wf[((oc + 2) * ci) * kk + wi], w3 = wf[((oc + 3) * ci) * kk + wi];
          const x0 = Math.max(0, -dx), x1 = Math.min(wd, wd - dx);
          for (let y = y0; y < y1; y++) {
            let a = y * wd + x0, b = ib + (y + dy) * wd + x0 + dx;
            for (let xx = x0; xx < x1; xx++, a++) {
              const v = x[b++];
              out[o0 + a] += w0 * v; out[o1 + a] += w1 * v;
              out[o2 + a] += w2 * v; out[o3 + a] += w3 * v;
            }
          }
        }
      }
    }
  }
  for (; oc < co; oc++) {
    const ob = oc * plane;
    out.fill(h2f[B[op.b + oc]], ob, ob + plane);
    for (let ic = 0; ic < ci; ic++) {
      const ib = ic * plane;
      for (let ky = 0; ky < k; ky++) {
        const dy = (ky - half) * d;
        const y0 = Math.max(0, -dy), y1 = Math.min(h, h - dy);
        for (let kx = 0; kx < k; kx++) {
          const dx = (kx - half) * d;
          const w = wf[(oc * ci + ic) * kk + ky * k + kx];
          const x0 = Math.max(0, -dx), x1 = Math.min(wd, wd - dx);
          for (let y = y0; y < y1; y++) {
            let a = ob + y * wd + x0, b = ib + (y + dy) * wd + x0 + dx;
            for (let xx = x0; xx < x1; xx++) out[a++] += w * x[b++];
          }
        }
      }
    }
  }
  return out;
}

function pool(x, c, h, w) { // 2x2, stride 2, ceil
  const nh = Math.ceil(h / 2), nw = Math.ceil(w / 2);
  const o = new Float32Array(c * nh * nw);
  for (let ch = 0; ch < c; ch++) for (let y = 0; y < nh; y++) for (let xx = 0; xx < nw; xx++) {
    let m = -Infinity;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const yy = y * 2 + dy, x2 = xx * 2 + dx;
      if (yy < h && x2 < w) { const v = x[ch * h * w + yy * w + x2]; if (v > m) m = v; }
    }
    o[ch * nh * nw + y * nw + xx] = m;
  }
  return o;
}

function resize(x, c, h, w, nh, nw) { // 双一次・half-pixel
  const o = new Float32Array(c * nh * nw);
  const sy = h / nh, sx = w / nw;
  for (let y = 0; y < nh; y++) {
    const fy = Math.max(0, (y + 0.5) * sy - 0.5);
    const y0 = Math.min(h - 1, Math.floor(fy)), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
    for (let xx = 0; xx < nw; xx++) {
      const fx = Math.max(0, (xx + 0.5) * sx - 0.5);
      const x0 = Math.min(w - 1, Math.floor(fx)), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
      for (let ch = 0; ch < c; ch++) {
        const b = ch * h * w;
        const v = (x[b + y0 * w + x0] * (1 - tx) + x[b + y0 * w + x1] * tx) * (1 - ty) +
                  (x[b + y1 * w + x0] * (1 - tx) + x[b + y1 * w + x1] * tx) * ty;
        o[ch * nh * nw + y * nw + xx] = v;
      }
    }
  }
  return o;
}

/** input: Float32Array(3*size*size) 正規化済みCHW → Float32Array(size*size) 0..1 */
export function runU2Net(model, weights, input) {
  const T = new Array(model.nt);
  const S = new Array(model.nt); // [c,h,w]
  T[model.input] = input; S[model.input] = [3, model.size, model.size];
  for (const op of model.ops) {
    if (op.op === 'conv') {
      T[op.o] = conv(T[op.i], op.o, weights, weights, op);
      S[op.o] = [op.co, op.h, op.wd];
    } else if (op.op === 'relu') {
      const a = T[op.i], o = new Float32Array(a.length);
      for (let i = 0; i < a.length; i++) o[i] = a[i] > 0 ? a[i] : 0;
      T[op.o] = o; S[op.o] = S[op.i];
    } else if (op.op === 'sig') {
      const a = T[op.i], o = new Float32Array(a.length);
      for (let i = 0; i < a.length; i++) o[i] = 1 / (1 + Math.exp(-a[i]));
      T[op.o] = o; S[op.o] = S[op.i];
    } else if (op.op === 'pool') {
      const [c, h, w] = S[op.i];
      T[op.o] = pool(T[op.i], c, h, w); S[op.o] = [c, Math.ceil(h / 2), Math.ceil(w / 2)];
    } else if (op.op === 'add') {
      const a = T[op.i], b = T[op.j], o = new Float32Array(a.length);
      for (let i = 0; i < a.length; i++) o[i] = a[i] + b[i];
      T[op.o] = o; S[op.o] = S[op.i];
    } else if (op.op === 'resize') {
      const [c, h, w] = S[op.i];
      T[op.o] = resize(T[op.i], c, h, w, op.h, op.wd); S[op.o] = [c, op.h, op.wd];
    } else if (op.op === 'cat') {
      const parts = op.i.map((i) => T[i]);
      const o = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
      let off = 0, c = 0;
      parts.forEach((p, n) => { o.set(p, off); off += p.length; c += S[op.i[n]][0]; });
      const [, h, w] = S[op.i[0]];
      T[op.o] = o; S[op.o] = [c, h, w];
    }
  }
  return T[model.output];
}
