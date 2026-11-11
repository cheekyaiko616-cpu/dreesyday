"""見本の写真（samples/）を、画面に入れる形に整える。
  python3 tools/make_sample_images.py
  → js/data/sample-images.js（写真を data URL にして書き出す。確認用のビルドにだけ入る）
samples/ の写真は、元の写真からスマホの画面の枠などを切り落としたもの。差し替えるときは、同じ名前で置き直して実行する。"""
import base64, io, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
LONG = 600  # 長い辺（本物の登録と同じく、小さくして保存する）
names = ['converse', 'wrangler', 'varsity', 'plaid', 'camo', 'jeans']
out = ['// 見本の写真（確認用）。tools/make_sample_images.py が samples/ から作る。手で直さない。',
       '// 本番のビルドには入らない（js/ui/sample-seed.js が確認用のときだけ読む）。', 'export const SAMPLE_PHOTOS = {']
for n in names:
    img = Image.open(root / 'samples' / f'{n}.jpg').convert('RGB')
    k = LONG / max(img.size)
    if k < 1:
        img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=80, optimize=True)
    out.append(f"  {n}: 'data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}',")
out.append('};')
(root / 'js/data/sample-images.js').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('ok', (root / 'js/data/sample-images.js').stat().st_size // 1024, 'KB')
