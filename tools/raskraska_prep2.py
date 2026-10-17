"""Раскраска по номерам из иллюстрации — без обрезки и без смены размера.

Карта областей строится в натуральном размере картинки (w × h). Готовые области
на сайте закрашиваются пикселями самой иллюстрации (full/<id>.jpg), поэтому
раскрашенная картинка совпадает с оригиналом точь-в-точь. Цвет кружка в палитре —
средний цвет оригинала в областях этого номера.

    python3 tools/raskraska_prep2.py <картинка> <id> [цветов=22] [мин. площадь=0 → авто]

Пишет raskraska/data/<id>.json, raskraska/full/<id>.jpg, raskraska/thumbs/<id>.jpg.
"""
import sys, json, io, base64, os
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from sklearn.cluster import KMeans

src, name = sys.argv[1], sys.argv[2]
K = int(sys.argv[3]) if len(sys.argv) > 3 else 22
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "raskraska")

pil = Image.open(src).convert("RGB")
W, H = pil.size
MIN_AREA = int(sys.argv[4]) if len(sys.argv) > 4 and int(sys.argv[4]) > 0 else int(W * H / 2800)
orig = cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR)

flat = cv2.pyrMeanShiftFiltering(orig, 12, 24)
flat = cv2.bilateralFilter(flat, 9, 40, 9)
lab = cv2.cvtColor(flat, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
km = KMeans(n_clusters=K, n_init=4, random_state=0).fit(lab[::9])
lbl = km.predict(lab).reshape(H, W)

def majority(l, k, r=2):
    best = np.zeros_like(l); bestc = np.full(l.shape, -1.0, np.float32)
    ker = np.ones((2 * r + 1, 2 * r + 1), np.float32)
    for c in range(k):
        cnt = cv2.filter2D((l == c).astype(np.float32), -1, ker, borderType=cv2.BORDER_REFLECT)
        m = cnt > bestc; best[m] = c; bestc[m] = cnt[m]
    return best
lbl = majority(lbl, K, 3)

# мелкие кусочки вливаем в соседний цвет
for it in range(14):
    changed = 0
    for c in range(K):
        n, comp, stats, _ = cv2.connectedComponentsWithStats((lbl == c).astype(np.uint8), connectivity=4)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] >= MIN_AREA: continue
            x, y, w, h = stats[i, :4]
            x0, y0, x1, y1 = max(x - 2, 0), max(y - 2, 0), min(x + w + 2, W), min(y + h + 2, H)
            sub = comp[y0:y1, x0:x1] == i
            ring = cv2.dilate(sub.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~sub
            neigh = lbl[y0:y1, x0:x1][ring]; neigh = neigh[neigh != c]
            if len(neigh) == 0: continue
            lbl[y0:y1, x0:x1][sub] = np.bincount(neigh, minlength=K).argmax(); changed += 1
    if changed == 0: break

# палитра: средний цвет ОРИГИНАЛА в каждом номере, по светлоте (светлые — первые)
olab = cv2.cvtColor(orig, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float64)
used = np.unique(lbl)
means = {c: olab[(lbl == c).ravel()].mean(0) for c in used}
order = sorted(used, key=lambda c: -means[c][0])
remap = np.zeros(K, int)
for new, old in enumerate(order): remap[old] = new
lbl = remap[lbl]
pal_lab = np.array([means[c] for c in order]).round().clip(0, 255).astype(np.uint8).reshape(-1, 1, 3)
pal_rgb = cv2.cvtColor(pal_lab, cv2.COLOR_LAB2RGB).reshape(-1, 3)
palette = ["#%02x%02x%02x" % tuple(c) for c in pal_rgb]

rid = np.zeros((H, W), np.int32); regions = []; nid = 0
for c in range(len(order)):
    n, comp = cv2.connectedComponents((lbl == c).astype(np.uint8), connectivity=4)
    for i in range(1, n):
        rid[comp == i] = nid; regions.append([c]); nid += 1

bnd = np.zeros((H, W), bool)
bnd[:, :-1] |= rid[:, :-1] != rid[:, 1:]; bnd[:-1, :] |= rid[:-1, :] != rid[1:, :]
bnd[0, :] = bnd[-1, :] = True; bnd[:, 0] = bnd[:, -1] = True
dist = cv2.distanceTransform((~bnd).astype(np.uint8), cv2.DIST_L2, 5)
idx = np.arange(nid)
pos = ndimage.maximum_position(dist, rid, idx); mx = ndimage.maximum(dist, rid, idx)
for i in range(nid):
    y, x = pos[i]; regions[i] += [int(x), int(y), round(float(mx[i]), 1)]

enc = np.zeros((H, W, 3), np.uint8); enc[..., 0] = rid >> 8; enc[..., 1] = rid & 255
buf = io.BytesIO(); Image.fromarray(enc).save(buf, "PNG", optimize=True)

pil.save(f"{root}/full/{name}.jpg", "JPEG", quality=93, subsampling=0)
tw = 360; th = round(H * tw / W)
pil.resize((tw, th), Image.LANCZOS).save(f"{root}/thumbs/{name}.jpg", "JPEG", quality=84)

json.dump({"w": W, "h": H, "reveal": True, "palette": palette, "regions": regions,
           "labels": base64.b64encode(buf.getvalue()).decode()},
          open(f"{root}/data/{name}.json", "w"), separators=(",", ":"))
print(name, f"{W}x{H}", "цветов", len(palette), "областей", nid, "мелких(<4px)", int((mx < 4).sum()))
