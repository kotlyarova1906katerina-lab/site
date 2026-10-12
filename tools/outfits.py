"""Перекраска одежды спрайтов: python3 outfits.py <путь к img>  — делает <герой>_<наряд>[-эмоция].webp из базовых."""
import numpy as np, cv2, sys, glob, os
from PIL import Image
IMG = sys.argv[1]
def comp(m, minarea):
    m = m.astype(np.uint8) * 255
    n, c, st, _ = cv2.connectedComponentsWithStats(m)
    k = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > minarea: k[c == i] = 255
    return k
def mask_anya(a):  # голубой свитер
    hsv = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2HSV); h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = (h >= 95) & (h <= 125) & (s >= 25) & (v >= 30) & (a[..., 3] > 10); m[:int(a.shape[0] * .5)] = False
    k = comp(cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)) > 0, 3000)
    return cv2.GaussianBlur(k, (5, 5), 0) / 255.
def mask_artur(a):  # красная толстовка
    R, G, B = [a[..., i].astype(float) for i in range(3)]
    m = (R > 35) & (G < .42 * R) & (B < .45 * R) & (a[..., 3] > 10); m[:int(a.shape[0] * .45)] = False
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    k = cv2.morphologyEx(comp(m, 2000), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return cv2.GaussianBlur(k, (3, 3), 0) / 255.
def recolor(a, m, hue=None, sat=1., val=1., add=0):
    n = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2HSV).astype(np.float32)
    if hue is not None: n[..., 0] = hue
    n[..., 1] = np.clip(n[..., 1] * sat, 0, 255); n[..., 2] = np.clip(n[..., 2] * val + add, 0, 255)
    rgb = cv2.cvtColor(n.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    o = a.astype(np.float32); mm = m[..., None]; o[..., :3] = o[..., :3] * (1 - mm) + rgb * mm
    return o.astype(np.uint8)
OUTFITS = {
  'anya':  (mask_anya,  {'pink': (168, 1.1, 1, 0), 'cream': (20, .35, 1.05, 10), 'lavender': (135, .9, 1, 0), 'mint': (75, .7, 1, 0)}),
  'artur': (mask_artur, {'black': (0, .12, .35, 0), 'grey': (0, .05, .75, 40), 'navy': (115, .8, .6, 0), 'green': (60, .6, .55, 0)}),
}
for hero, (fn, outs) in OUTFITS.items():
    for src in glob.glob(f'{IMG}/{hero}.webp') + glob.glob(f'{IMG}/{hero}-*.webp'):
        emo = os.path.basename(src)[len(hero):-5]  # '' или '-smile'
        a = np.asarray(Image.open(src).convert('RGBA')).copy(); m = fn(a)
        for name, p in outs.items():
            Image.fromarray(recolor(a, m, *p)).save(f'{IMG}/{hero}_{name}{emo}.webp', quality=88)
            print(hero, name, emo or '(обычная)')
