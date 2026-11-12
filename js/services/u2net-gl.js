// U²-Net-p を WebGL2 で動かす（CPU版 u2net.js と同じ結果、数十倍速い）。
// テンソルは RGBA32F の2D配列テクスチャ（4チャンネル/層）で持つ。

const VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0,0,1); }`;
const HEAD = `#version 300 es
precision highp float; precision highp int; precision highp sampler2DArray;
out vec4 o; uniform int uLayer;`;
const FS = {
  conv: `${HEAD}
uniform sampler2DArray uIn; uniform sampler2D uW; uniform int uG,uK,uD,uW_,uH_;
void main(){ ivec2 p=ivec2(gl_FragCoord.xy); int kk=uK*uK, hf=(uK-1)/2;
  vec4 acc=texelFetch(uW,ivec2(uG*kk*4,uLayer),0);
  for(int g=0;g<uG;g++) for(int ky=0;ky<uK;ky++) for(int kx=0;kx<uK;kx++){
    ivec2 q=p+ivec2((kx-hf)*uD,(ky-hf)*uD);
    if(q.x<0||q.y<0||q.x>=uW_||q.y>=uH_) continue;
    vec4 v=texelFetch(uIn,ivec3(q,g),0); int b=(g*kk+ky*uK+kx)*4;
    acc+=vec4(dot(v,texelFetch(uW,ivec2(b,uLayer),0)),dot(v,texelFetch(uW,ivec2(b+1,uLayer),0)),
              dot(v,texelFetch(uW,ivec2(b+2,uLayer),0)),dot(v,texelFetch(uW,ivec2(b+3,uLayer),0))); }
  o=acc; }`,
  relu: `${HEAD} uniform sampler2DArray uIn;
void main(){ o=max(texelFetch(uIn,ivec3(ivec2(gl_FragCoord.xy),uLayer),0),0.0); }`,
  add: `${HEAD} uniform sampler2DArray uIn,uIn2;
void main(){ ivec3 c=ivec3(ivec2(gl_FragCoord.xy),uLayer); o=texelFetch(uIn,c,0)+texelFetch(uIn2,c,0); }`,
  copy: `${HEAD} uniform sampler2DArray uIn; uniform int uSrc;
void main(){ o=texelFetch(uIn,ivec3(ivec2(gl_FragCoord.xy),uSrc),0); }`,
  pool: `${HEAD} uniform sampler2DArray uIn; uniform int uW_,uH_;
void main(){ ivec2 p=ivec2(gl_FragCoord.xy)*2; vec4 m=vec4(-1e30);
  for(int dy=0;dy<2;dy++) for(int dx=0;dx<2;dx++){ ivec2 q=p+ivec2(dx,dy);
    if(q.x<uW_&&q.y<uH_) m=max(m,texelFetch(uIn,ivec3(q,uLayer),0)); }
  o=m; }`,
  resize: `${HEAD} uniform sampler2DArray uIn; uniform ivec2 uSrc; uniform vec2 uS;
void main(){ vec2 f=max((gl_FragCoord.xy-0.5+0.5)*uS-0.5,0.0); // half-pixel
  ivec2 a=min(ivec2(floor(f)),uSrc-1), b=min(a+1,uSrc-1); vec2 t=f-vec2(a);
  vec4 v=mix(mix(texelFetch(uIn,ivec3(a,uLayer),0),texelFetch(uIn,ivec3(b.x,a.y,uLayer),0),t.x),
             mix(texelFetch(uIn,ivec3(a.x,b.y,uLayer),0),texelFetch(uIn,ivec3(b,uLayer),0),t.x),t.y);
  o=v; }`,
  fuse: `${HEAD} uniform sampler2DArray uA,uB,uC,uD,uE,uF; uniform float uWt[6]; uniform float uBias;
void main(){ ivec3 c=ivec3(ivec2(gl_FragCoord.xy),0);
  float s=uBias+uWt[0]*texelFetch(uA,c,0).x+uWt[1]*texelFetch(uB,c,0).x+uWt[2]*texelFetch(uC,c,0).x
    +uWt[3]*texelFetch(uD,c,0).x+uWt[4]*texelFetch(uE,c,0).x+uWt[5]*texelFetch(uF,c,0).x;
  o=vec4(1.0/(1.0+exp(-s)),0,0,1); }`,
};

const h2f = new Float32Array(65536);
for (let i = 0; i < 65536; i++) {
  const s = (i & 0x8000) ? -1 : 1, e = (i >> 10) & 31, m = i & 1023;
  h2f[i] = e === 0 ? s * m * 2 ** -24 : s * (1 + m / 1024) * 2 ** (e - 15);
}

let glOk = null; // 対応しているかは1回だけ調べる
export function glAvailable() {
  if (glOk === null) glOk = probeGL();
  return glOk;
}

function probeGL() {
  try {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
    const gl = c.getContext('webgl2');
    return !!(gl && gl.getExtension('EXT_color_buffer_float'));
  } catch { return false; }
}

export function createGLRunner(model, weights) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, alpha: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('webgl2');
  const progs = {};
  const prog = (name) => {
    if (progs[name]) return progs[name];
    const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS[name]));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return (progs[name] = { p, u: {} });
  };
  const loc = (P, n) => (n in P.u ? P.u[n] : (P.u[n] = gl.getUniformLocation(P.p, n)));
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const fbo = gl.createFramebuffer();
  const pool = new Map();
  const getTex = (w, h, L) => {
    const key = `${w}x${h}x${L}`; const a = pool.get(key);
    if (a && a.length) return a.pop();
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA32F, w, h, L);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, k, v);
    return { t, key };
  };
  const putTex = (x) => { if (!pool.has(x.key)) pool.set(x.key, []); pool.get(x.key).push(x); };

  // 重みテクスチャ（畳み込みごと）
  const wtex = new Map();
  const weightTex = (op, idx) => {
    if (wtex.has(idx)) return wtex.get(idx);
    const { ci, co, k } = op, kk = k * k, G = Math.ceil(ci / 4), CO = Math.ceil(co / 4);
    const W = 4 * G * kk + 1, data = new Float32Array(W * CO * 4);
    for (let oc = 0; oc < co; oc++) for (let ic = 0; ic < ci; ic++) for (let t = 0; t < kk; t++) {
      const col = ((ic >> 2) * kk + t) * 4 + (oc & 3);
      data[((oc >> 2) * W + col) * 4 + (ic & 3)] = h2f[weights[op.w + (oc * ci + ic) * kk + t]];
    }
    for (let oc = 0; oc < co; oc++) data[((oc >> 2) * W + 4 * G * kk) * 4 + (oc & 3)] = h2f[weights[op.b + oc]];
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, W, CO);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, CO, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    wtex.set(idx, { t, G }); return wtex.get(idx);
  };

  // 各テンソルの最後の使用位置
  const ops = model.ops;
  let last = ops.length;
  const outIdx = ops.findIndex((o) => o.o === model.output);
  const lastUse = {};
  ops.slice(0, outIdx + 1).forEach((op, n) => {
    for (const i of [op.i, op.j].flat().filter((v) => v !== undefined)) lastUse[i] = n;
  });

  const bindTex = (unit, tex, target) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(target || gl.TEXTURE_2D_ARRAY, tex); };
  const draw = (out, layer, w, h) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, out.t, 0, layer);
    gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const use = (name) => { const P = prog(name); gl.useProgram(P.p); return P; };

  return function run(input) {
    const T = {};
    const S = model.size;
    const inTex = getTex(S, S, 1);
    const pix = new Float32Array(S * S * 4);
    for (let i = 0; i < S * S; i++) { pix[i * 4] = input[i]; pix[i * 4 + 1] = input[S * S + i]; pix[i * 4 + 2] = input[2 * S * S + i]; }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, inTex.t);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, S, S, 1, gl.RGBA, gl.FLOAT, pix);
    T[model.input] = { tex: inTex, w: S, h: S, L: 1, c: 3 };
    const release = (n) => {
      for (const i of [ops[n].i, ops[n].j].flat()) {
        if (i !== undefined && lastUse[i] === n && T[i] && i !== model.input) { putTex(T[i].tex); delete T[i]; }
      }
    };
    let result = null;
    for (let n = 0; n <= outIdx; n++) {
      const op = ops[n];
      if (op.op === 'conv') {
        const src = T[op.i], { t: wt, G } = weightTex(op, n), CO = Math.ceil(op.co / 4);
        const out = getTex(op.wd, op.h, CO), P = use('conv');
        bindTex(0, src.tex.t); bindTex(1, wt, gl.TEXTURE_2D);
        gl.uniform1i(loc(P, 'uIn'), 0); gl.uniform1i(loc(P, 'uW'), 1);
        gl.uniform1i(loc(P, 'uG'), G); gl.uniform1i(loc(P, 'uK'), op.k); gl.uniform1i(loc(P, 'uD'), op.d);
        gl.uniform1i(loc(P, 'uW_'), op.wd); gl.uniform1i(loc(P, 'uH_'), op.h);
        for (let l = 0; l < CO; l++) { gl.uniform1i(loc(P, 'uLayer'), l); draw(out, l, op.wd, op.h); }
        T[op.o] = { tex: out, w: op.wd, h: op.h, L: CO, c: op.co };
      } else if (op.op === 'relu' || op.op === 'pool' || op.op === 'resize' || op.op === 'add') {
        const src = T[op.i];
        let w = src.w, h = src.h;
        if (op.op === 'pool') { w = Math.ceil(w / 2); h = Math.ceil(h / 2); }
        if (op.op === 'resize') { w = op.wd; h = op.h; }
        const out = getTex(w, h, src.L), P = use(op.op);
        bindTex(0, src.tex.t); gl.uniform1i(loc(P, 'uIn'), 0);
        if (op.op === 'add') { bindTex(1, T[op.j].tex.t); gl.uniform1i(loc(P, 'uIn2'), 1); }
        if (op.op === 'pool') { gl.uniform1i(loc(P, 'uW_'), src.w); gl.uniform1i(loc(P, 'uH_'), src.h); }
        if (op.op === 'resize') { gl.uniform2i(loc(P, 'uSrc'), src.w, src.h); gl.uniform2f(loc(P, 'uS'), src.w / w, src.h / h); }
        for (let l = 0; l < src.L; l++) { gl.uniform1i(loc(P, 'uLayer'), l); draw(out, l, w, h); }
        T[op.o] = { tex: out, w, h, L: src.L, c: src.c };
      } else if (op.op === 'cat') {
        if (op.i.length === 6) { // 最終：6本のサイド出力を 1x1 畳み込みで混ぜて sigmoid
          const fc = ops[n + 1]; // conv 6->1
          const wv = Array.from({ length: 6 }, (_, q) => h2f[weights[fc.w + q]]);
          const P = use('fuse'), out = getTex(S, S, 1);
          op.i.forEach((id, q) => { bindTex(q, T[id].tex.t); gl.uniform1i(loc(P, `u${'ABCDEF'[q]}`), q); });
          gl.uniform1fv(loc(P, 'uWt'), wv); gl.uniform1f(loc(P, 'uBias'), h2f[weights[fc.b]]);
          gl.uniform1i(loc(P, 'uLayer'), 0); draw(out, 0, S, S);
          const res = new Float32Array(S * S * 4);
          gl.readPixels(0, 0, S, S, gl.RGBA, gl.FLOAT, res);
          result = new Float32Array(S * S); for (let i = 0; i < S * S; i++) result[i] = res[i * 4];
          for (const k of Object.keys(T)) putTex(T[k].tex);
          return result;
        }
        const a = T[op.i[0]], b = T[op.i[1]];
        const out = getTex(a.w, a.h, a.L + b.L), P = use('copy');
        gl.uniform1i(loc(P, 'uIn'), 0);
        let l = 0;
        for (const s of [a, b]) {
          bindTex(0, s.tex.t);
          for (let q = 0; q < s.L; q++, l++) { gl.uniform1i(loc(P, 'uSrc'), q); gl.uniform1i(loc(P, 'uLayer'), l); draw(out, l, a.w, a.h); }
        }
        T[op.o] = { tex: out, w: a.w, h: a.h, L: a.L + b.L, c: a.c + b.c };
      }
      release(n);
    }
    return result;
  };
}
