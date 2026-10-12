"""Чистое вырезание героя без ореола старого фона.
python3 cutout2.py <вход.jpg> <выход.webp> [ширина=760]
1) маска нейросетью (rembg, isnet), 2) уточнение края матированием (pymatting),
3) очистка цвета краёв от старого фона (estimate_foreground), 4) обрезка и ресайз."""
import sys, os, numpy as np, cv2
from PIL import Image
os.environ.setdefault('U2NET_HOME', '/root/.rembg/models/isnet-general-use')
from rembg import remove, new_session
from pymatting import estimate_alpha_cf, estimate_foreground_ml

def clean_rim(rgb, a, depth=5, tint=18):
    """Край героя часто подсвечен цветом старого фона (оранжевое сияние, белая обводка).
    1) самую кромку (depth px) перекрашиваем цветами чуть глубже внутри силуэта;
    2) в полосе шириной tint px убираем цветной оттенок фона, сохраняя светотень (меняем только цвет в Lab)."""
    solid = (a > .5).astype(np.uint8)
    dist = cv2.distanceTransform(solid, cv2.DIST_L2, 5)
    img8 = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    out = rgb.copy()
    if tint:
        band = ((a > 0) & (dist < tint)).astype(np.uint8)
        lab = cv2.cvtColor(img8, cv2.COLOR_RGB2LAB)
        ab = cv2.inpaint(lab, band, tint, cv2.INPAINT_TELEA)
        wl = (np.clip(1 - dist / tint, 0, 1) ** .7) * band
        mix = lab.astype(np.float64)
        mix[..., 1:] = ab[..., 1:]                                        # цвет — изнутри
        mix[..., 0] = lab[..., 0] * (1 - .55 * wl) + ab[..., 0] * .55 * wl  # блик края приглушаем наполовину
        rec = cv2.cvtColor(np.clip(mix, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float64) / 255
        w = wl[..., None]
        out = out * (1 - w) + rec * w
    if depth:
        rim = ((a > 0) & (dist < depth)).astype(np.uint8)
        o8 = (np.clip(out, 0, 1) * 255).astype(np.uint8)
        fixed = cv2.inpaint(o8, rim, depth + 2, cv2.INPAINT_TELEA).astype(np.float64) / 255
        w = np.clip(1 - dist / depth, 0, 1)[..., None] * rim[..., None]
        out = out * (1 - w) + fixed * w
    return out

def cutout(path, width=760, work=1400, band=7, rim=5, tint=18):
    im = Image.open(path).convert('RGB')
    s = work / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    rgb = np.asarray(im).astype(np.float64) / 255
    m = np.asarray(remove(im, session=new_session('isnet-general-use'), only_mask=True)).astype(np.float64) / 255
    k = np.ones((3, 3), np.uint8)
    fg = cv2.erode((m > .9).astype(np.uint8), k, iterations=band)
    bg = cv2.erode((m < .1).astype(np.uint8), k, iterations=band)
    tri = np.full(m.shape, .5); tri[fg > 0] = 1; tri[bg > 0] = 0
    a = estimate_alpha_cf(rgb, tri)
    a = np.clip((a - .06) / .94, 0, 1)                      # убираем почти прозрачную «пыль» по краю
    f = estimate_foreground_ml(rgb, a)                       # цвет края без примеси старого фона
    f = clean_rim(f, a, rim, tint)
    out = np.dstack([np.clip(f, 0, 1), a])
    img = Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')
    bb = Image.fromarray((a > .02).astype(np.uint8) * 255).getbbox()
    img = img.crop(bb)
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)

if __name__ == '__main__':
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 760
    t = int(sys.argv[4]) if len(sys.argv) > 4 else 18
    r = cutout(sys.argv[1], w, tint=t); r.save(sys.argv[2], quality=90); print(sys.argv[2], r.size)
