"""配信用の部品と、動作確認用の1枚のHTMLを作る。ソース（js/ と css/ の機能ごとのファイル）はそのまま。
  python3 tools/build.py
  → dist/app.min.js と dist/app.min.css（公開用。index.html はこの2つだけを読む。見本のデータは入らない）
  → dist/preview.html（CSS・JS・書体・見本の写真を1枚にまとめた確認用。開くと見本のデータで動く）
ソースや config/rules.json を直したら、必ずこれを実行してから公開する。"""
import base64, os, pathlib, re, shutil, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
ESB = os.environ.get('ESBUILD') or shutil.which('esbuild') or '/opt/npm-tools/node_modules/.bin/esbuild'

# 判定エンジンの自動テスト（node が無い環境では、飛ばす）
if shutil.which('node') and subprocess.run(['node', str(root / 'tools' / 'test.mjs')]).returncode != 0:
    print('自動テストが失敗しました')
    sys.exit(1)

dist = root / 'dist'
dist.mkdir(exist_ok=True)
CSS = ['css/tokens.css', 'css/fonts.css', 'css/base.css', 'css/outfit.css', 'css/brief.css', 'css/closet.css', 'css/sheets.css']
tmp = dist / '_all.css'
tmp.write_text('\n'.join((root / p).read_text(encoding='utf-8') for p in CSS), encoding='utf-8')
subprocess.run([ESB, str(tmp), '--minify', '--loader:.css=css', f'--outfile={dist / "app.min.css"}'], check=True)
tmp.unlink()
def bundle(out, preview):
    subprocess.run([ESB, str(root / 'js/main.js'), '--bundle', '--minify', '--format=iife', '--target=es2020', '--charset=utf8',
                    f'--define:__PREVIEW__={"true" if preview else "false"}', f'--outfile={out}'], check=True)
bundle(dist / 'app.min.js', False)                 # 公開用：見本のデータ・写真は入らない
bundle(dist / '_preview.js', True)                 # 確認用：見本の予定・天気・服の写真つき

# 確認用の1枚：書体は data URL にして埋め込む
css = (dist / 'app.min.css').read_text(encoding='utf-8')
for f in (root / 'fonts').glob('*.woff'):
    css = css.replace(f'../fonts/{f.name}', 'data:font/woff;base64,' + base64.b64encode(f.read_bytes()).decode())
js = (dist / '_preview.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
(dist / '_preview.js').unlink()
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n', '', html)
html = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n', '', html)
html = html.replace('<link rel="stylesheet" href="dist/app.min.css">', '<style>' + css + '</style>')
html = html.replace('<script src="dist/app.min.js" defer></script>', '<script>' + js + '</script>')
(dist / 'preview.html').write_text(html, encoding='utf-8')
for f in ('app.min.js', 'app.min.css', 'preview.html'):
    print(f, (dist / f).stat().st_size // 1024, 'KB')
