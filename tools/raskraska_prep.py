"""Turn an illustration into paint-by-numbers data: label map, palette, regions."""
import cv2, numpy as np, json, sys, base64, io
from scipy import ndimage
from sklearn.cluster import KMeans
from PIL import Image

src, name, K, N, MIN_AREA = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])

img = cv2.imread(src)
img = cv2.resize(img, (N, N), interpolation=cv2.INTER_AREA)
flat = cv2.pyrMeanShiftFiltering(img, 10, 22)
flat = cv2.bilateralFilter(flat, 9, 40, 9)
lab = cv2.cvtColor(flat, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
km = KMeans(n_clusters=K, n_init=4, random_state=0).fit(lab[::7])
lbl = km.predict(lab).reshape(N, N)
centers_lab = km.cluster_centers_

# majority filter to kill speckle
def majority(l, k, r=2):
    best = np.zeros_like(l); bestc = np.full(l.shape, -1.0)
    ker = np.ones((2 * r + 1, 2 * r + 1), np.float32)
    for c in range(k):
        cnt = cv2.filter2D((l == c).astype(np.float32), -1, ker, borderType=cv2.BORDER_REFLECT)
        m = cnt > bestc
        best[m] = c; bestc[m] = cnt[m]
    return best
lbl = majority(lbl, K, 2)

# merge small components into the dominant neighbouring colour
for it in range(12):
    changed = 0
    for c in range(K):
        mask = (lbl == c).astype(np.uint8)
        n, comp, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=4)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] >= MIN_AREA: continue
            x, y, w, h = stats[i, :4]
            x0, y0, x1, y1 = max(x - 2, 0), max(y - 2, 0), min(x + w + 2, N), min(y + h + 2, N)
            sub = comp[y0:y1, x0:x1] == i
            ring = cv2.dilate(sub.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~sub
            neigh = lbl[y0:y1, x0:x1][ring]
            neigh = neigh[neigh != c]
            if len(neigh) == 0: continue
            lbl[y0:y1, x0:x1][sub] = np.bincount(neigh, minlength=K).argmax()
            changed += 1
    if changed == 0: break

# drop unused colours, renumber palette by lightness (light -> dark)
used = np.unique(lbl)
order = sorted(used, key=lambda c: -centers_lab[c][0])
remap = np.zeros(K, int)
for new, old in enumerate(order): remap[old] = new
lbl = remap[lbl]
pal_lab = np.array([centers_lab[c] for c in order], np.float32).reshape(-1, 1, 3)
pal_bgr = cv2.cvtColor(pal_lab.astype(np.uint8), cv2.COLOR_LAB2BGR).reshape(-1, 3)
palette = ['#%02x%02x%02x' % (b[2], b[1], b[0]) for b in pal_bgr]

# final region ids
rid = np.zeros((N, N), np.int32); regions = []; nid = 0
for c in range(len(order)):
    n, comp = cv2.connectedComponents((lbl == c).astype(np.uint8), connectivity=4)
    for i in range(1, n):
        m = comp == i
        rid[m] = nid; regions.append([c]); nid += 1

# number positions: farthest point from any boundary inside each region
bnd = np.zeros((N, N), bool)
bnd[:, :-1] |= rid[:, :-1] != rid[:, 1:]; bnd[:-1, :] |= rid[:-1, :] != rid[1:, :]
bnd[0, :] = bnd[-1, :] = True; bnd[:, 0] = bnd[:, -1] = True
dist = cv2.distanceTransform((~bnd).astype(np.uint8), cv2.DIST_L2, 5)
idx = np.arange(nid)
pos = ndimage.maximum_position(dist, rid, idx)
mx = ndimage.maximum(dist, rid, idx)
for i in range(nid):
    y, x = pos[i]
    regions[i] += [int(x), int(y), round(float(mx[i]), 1)]

# label map png: id in R,G
enc = np.zeros((N, N, 3), np.uint8)
enc[..., 0] = rid >> 8; enc[..., 1] = rid & 255
buf = io.BytesIO(); Image.fromarray(enc).save(buf, 'PNG', optimize=True)
labels_b64 = base64.b64encode(buf.getvalue()).decode()

# preview of the finished painting
done = pal_bgr[lbl][..., ::-1]
Image.fromarray(done.astype(np.uint8)).save(f'{name}_gotovo.png')
thumb = Image.open(src).convert('RGB').resize((360, 360), Image.LANCZOS)
tb = io.BytesIO(); thumb.save(tb, 'JPEG', quality=82)

json.dump({'id': name, 'size': N, 'palette': palette, 'regions': regions,
           'labels': labels_b64, 'thumb': base64.b64encode(tb.getvalue()).decode()},
          open(f'{name}.json', 'w'), separators=(',', ':'))
print(name, 'colours', len(palette), 'regions', nid, 'labels kB', len(labels_b64) // 1024,
      'tiny(<4px max dist)', int((mx < 4).sum()))
