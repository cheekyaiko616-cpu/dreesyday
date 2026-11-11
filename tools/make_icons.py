"""アプリのアイコンを作る（朝日とハンガーの、シンプルな絵）。
  python3 tools/make_icons.py
  → icons/icon-192.png / icons/icon-512.png / icons/apple-touch-icon.png"""
import pathlib
from PIL import Image, ImageDraw

root = pathlib.Path(__file__).resolve().parent.parent
S = 1024
img = Image.new('RGB', (S, S), '#f2f3ef')
d = ImageDraw.Draw(img)
# 朝日（半分だけ見える丸と、光の線）
d.ellipse((312, 250, 712, 650), fill='#f0b95a')
d.rectangle((0, 450, S, S), fill='#f2f3ef')
for x0, y0, x1, y1 in [(512, 120, 512, 200), (300, 210, 345, 270), (724, 210, 679, 270), (190, 380, 260, 405), (834, 380, 764, 405)]:
    d.line((x0, y0, x1, y1), fill='#f0b95a', width=34)
# ハンガー
ink = '#1a1d1b'
d.arc((462, 340, 562, 440), 180, 450, fill=ink, width=30)
d.line((512, 425, 512, 500), fill=ink, width=30)
d.line((512, 500, 200, 720), fill=ink, width=40)
d.line((512, 500, 824, 720), fill=ink, width=40)
d.line((190, 730, 834, 730), fill=ink, width=40)
for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')]:
    img.resize((size, size), Image.LANCZOS).save(root / 'icons' / name)
print('ok')
