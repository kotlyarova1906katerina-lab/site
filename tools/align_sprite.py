"""Подгоняет эмоции и наряды под базовый спрайт по силуэту головы: python3 align.py <папка вырезанных> <img сайта> <имена...>"""
import sys, re, numpy as np
from PIL import Image
src, img, names = sys.argv[1], sys.argv[2], sys.argv[3:]
def fit(b, c):
    H, W = b.shape; k = int(H * .7); best = None
    for sc in np.linspace(.90, 1.06, 17):
        cc = np.asarray(Image.fromarray(c.astype(np.uint8) * 255).resize((round(c.shape[1] * sc), round(c.shape[0] * sc)))) > 128
        for dy in range(-60, 61, 2):
            for dx in range(-40, 41, 2):
                can = np.zeros_like(b); x0 = (W - cc.shape[1]) // 2 + dx; y0 = dy
                ys = slice(max(0, y0), min(H, y0 + cc.shape[0])); xs = slice(max(0, x0), min(W, x0 + cc.shape[1]))
                can[ys, xs] = cc[ys.start - y0:ys.stop - y0, xs.start - x0:xs.stop - x0]
                iou = (can[:k] & b[:k]).sum() / max(1, (can[:k] | b[:k]).sum())
                if best is None or iou > best[0]: best = (iou, sc, dx, dy)
    return best
for n in names:
    hero = re.split('[-_]', n)[0]
    base = Image.open(f'{img}/{hero}.webp').convert('RGBA'); b = np.asarray(base)[..., 3] > 128
    im = Image.open(f'{src}/{n}.webp').convert('RGBA'); c = np.asarray(im)[..., 3] > 128
    iou, sc, dx, dy = fit(b, c)
    t = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    can = Image.new('RGBA', base.size, (0, 0, 0, 0)); can.alpha_composite(t, ((base.width - t.width) // 2 + dx, dy)) if dy >= 0 else can.alpha_composite(t.crop((0, -dy, t.width, t.height)), ((base.width - t.width) // 2 + dx, 0))
    can.save(f'{img}/{n}.webp', quality=88)
    print(n, 'совпадение %.3f масштаб %.2f сдвиг %d,%d' % (iou, sc, dx, dy), flush=True)
