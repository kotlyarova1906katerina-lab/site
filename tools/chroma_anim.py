"""Делает из ролика на зелёном фоне ленту кадров (WebP с прозрачностью, по 8 кадров в ряд) (для игры «Поймай сердечки»).

    python3 tools/chroma_anim.py ролик.mp4 lovi/img/anim-idle.webp [ширина] [кадров_в_секунду]

В консоль печатается число кадров и размер кадра — их нужно вписать в ANIMS в lovi/index.html.

Кадры вырезаются так же, как в tools/chroma.py: прозрачность по «зелёности» пикселя, зелёный отсвет убирается.
WebP с прозрачностью показывают все современные браузеры, включая Safari на iPhone.
"""
import subprocess, sys, tempfile, glob, os
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 360
fps = int(sys.argv[4]) if len(sys.argv) > 4 else 12

def key(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    alpha = np.clip((62 - green) / 34, 0, 1)
    mask = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    g2 = np.where(green > 0, np.maximum(r, b), g)
    out = Image.fromarray(np.stack([r, g2, b], -1).clip(0, 255).astype(np.uint8)).convert('RGBA')
    out.putalpha(mask)
    return out

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps={fps},scale={width * 2}:-2:flags=lanczos', f'{tmp}/f%03d.png'], check=True)
    frames = [key(Image.open(f)) for f in sorted(glob.glob(f'{tmp}/f*.png'))]
# общая рамка по всем кадрам: обрезаем пустоту сверху и по бокам, низ оставляем
box = None
for f in frames:
    bb = f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if bb: box = bb if not box else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
frames = [f.crop((box[0], box[1], box[2], f.height)) for f in frames]
h = round(frames[0].height * width / frames[0].width)
frames = [f.resize((width, h), Image.LANCZOS) for f in frames]
# лента кадров: кадры по 8 в ряд в одной картинке, игра сама показывает нужный
cols = 8; rows = -(-len(frames) // cols)
sheet = Image.new('RGBA', (width * cols, h * rows), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f, ((i % cols) * width, (i // cols) * h))
sheet.save(dst, quality=int(os.environ.get("Q", 60)), method=6, alpha_quality=80)
print(dst, len(frames), 'кадров', (width, h), 'лента', sheet.size, os.path.getsize(dst) // 1024, 'КБ')
