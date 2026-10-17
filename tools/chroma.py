"""Вырезает героя с зелёного фона (хромакей) и убирает зелёный отсвет с краёв.

    python3 tools/chroma.py вход.jpg выход.webp [ширина]

Фон может быть неровным (квадраты разных оттенков, дымка): прозрачность считается по «зелёности»
пикселя — насколько зелёный канал выше красного и синего, а не по одному цвету.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 760

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
green = g - np.maximum(r, b)                      # >0 — пиксель зеленее, чем красный и синий

# прозрачность: совсем зелёное — фон, слегка зеленоватое — край героя
alpha = np.clip((62 - green) / 34, 0, 1)
mask = Image.fromarray((alpha * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # срезаем зелёную кайму

# убираем зелёный отсвет: зелёный канал не выше max(красный, синий)
lim = np.maximum(r, b)
keep = 0.0                                                   # зелёный канал не выше красного и синего — никакой зелени на герое
g2 = np.where(green > 0, lim + np.clip(green, 0, None) * keep, g)
out = np.stack([r, g2, b], -1).clip(0, 255).astype(np.uint8)

res = Image.fromarray(out).convert('RGBA')
res.putalpha(mask)
bbox = res.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
if bbox:
    res = res.crop((bbox[0], bbox[1], bbox[2], res.height))   # по бокам и сверху обрезаем пустоту, низ оставляем
h = round(res.height * width / res.width)
res.resize((width, h), Image.LANCZOS).save(dst, quality=88, method=6)
print(dst, (width, h))
