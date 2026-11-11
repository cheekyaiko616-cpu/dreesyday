#!/usr/bin/env python3
"""見本の服の切り抜き（透明PNG）を作り、js/data/sample-cuts.js に書き出す。
アプリと同じ js/services/cutout.js を、ヘッドレス Chrome（WebGL）で動かして作る。
使い方: python3 tools/make_sample_cutouts.py   （写真は samples/*.jpg。数分かかる）"""
import base64, http.server, io, json, os, subprocess, sys, threading, tempfile, shutil
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESBUILD = os.environ.get('ESBUILD', '/opt/npm-tools/node_modules/.bin/esbuild')
NAMES = ['converse', 'wrangler', 'varsity', 'plaid', 'camo', 'jeans']
LONG = 560  # 保存する大きさ（長い辺）
THUMB = 360  # 一覧用の小さな写真（長い辺）

def durl(im, fmt, **kw):
    b = io.BytesIO(); im.save(b, fmt, **kw)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()

def pack(png, name):
    """透明PNG → 保存の形（色JPEG＋透明度PNG）と、一覧用の小さな写真。透明な所の色は、まわりの服の色でうめる。"""
    im = png.convert('RGBA'); k = min(1, LONG / max(im.size))
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    a = np.array(im); alpha = a[..., 3]; rgb = a[..., :3].copy()
    idx = ndimage.distance_transform_edt(alpha == 0, return_distances=False, return_indices=True)
    rgb = rgb[idx[0], idx[1]]
    photo = Image.open(f'{ROOT}/samples/{name}.jpg').convert('RGB'); photo.thumbnail((THUMB, THUMB), Image.LANCZOS)
    return dict(rgb=durl(Image.fromarray(rgb), 'JPEG', quality=92), alpha=durl(Image.fromarray(alpha), 'PNG', optimize=True), w=im.width, h=im.height, thumb=durl(photo, 'JPEG', quality=82))

def write(out):
    body = '// 自動生成（tools/make_sample_cutouts.py）。確認用の見本だけで使う（本番の bundle には入らない）。\n// 保存の形（色JPEG・透明度PNG・一覧用の小さな写真）まで作ってあり、開き直さずにそのまま入れられる。\nexport const SAMPLE_CUTS = ' + json.dumps(out, ensure_ascii=False) + ';\n'
    open(f'{ROOT}/js/data/sample-cuts.js', 'w').write(body)

if len(sys.argv) > 2 and sys.argv[1] == '--from-dir':  # Chrome を動かさず、作ってある透明PNGから組み直す
    write({n: pack(Image.open(f'{sys.argv[2]}/{n}.png'), n) for n in NAMES}); sys.exit(0)

from playwright.sync_api import sync_playwright

tmp = tempfile.mkdtemp()
open(f'{tmp}/entry.js', 'w').write(f"import {{ cutOut }} from '{ROOT}/js/services/cutout.js'; window.cutOut = cutOut;")
subprocess.run([ESBUILD, f'{tmp}/entry.js', '--bundle', '--format=iife', f'--outfile={tmp}/cut.js', '--log-level=warning'], check=True)
shutil.copytree(f'{ROOT}/models', f'{tmp}/models'); shutil.copytree(f'{ROOT}/samples', f'{tmp}/samples')
open(f'{tmp}/c.html', 'w').write('<script src="cut.js"></script>')

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=tmp, **k)
    def log_message(s, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]

out = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(); pg.goto(f'http://127.0.0.1:{port}/c.html')
    for n in NAMES:
        r = pg.evaluate("""async n=>{const img=new Image();img.src='samples/'+n+'.jpg';await img.decode();
          const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);
          return await window.cutOut(c, {png: true})}""", n)
        assert r['method'] == 'ai', n
        im = Image.open(io.BytesIO(base64.b64decode(r['dataUrl'].split(',')[1]))).convert('RGBA')
        out[n] = pack(im, n); im.save(f'{tmp}/{n}.png'); print(n, im.size, flush=True)
    b.close()
write(out)
os.makedirs('/tmp/cuts', exist_ok=True)
for n in NAMES: shutil.copy(f'{tmp}/{n}.png', f'/tmp/cuts/{n}.png')
shutil.rmtree(tmp)
