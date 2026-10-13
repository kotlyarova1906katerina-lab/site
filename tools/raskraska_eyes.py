"""Возвращает раскраске настоящий цвет глаз.

K-means на 20–24 цвета не видит маленькую серую радужку: она уходит в ближайший
коричневый цвет кожи или волос, и в готовой раскраске серые глаза становятся карими.
Скрипт находит глаза (MediaPipe Face Mesh), внутри контура глаза сравнивает цвета
исходника и раскраски и, где они сильно расходятся, вырезает новые области
с правильными цветами (при необходимости добавляет цвета в палитру).

Номера старых областей сохраняются, поэтому прогресс читательниц не сбрасывается:
новые области просто добавляются в конец списка.

    python3 tools/raskraska_eyes.py raskraska/data/<id>.json raskraska/full/<id>.jpg [--preview out.png]

Нужен mediapipe==0.10.14 (в нём модель лица лежит внутри пакета).
"""
import sys, json, io, base64, argparse
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from sklearn.cluster import KMeans
import mediapipe as mp

ap = argparse.ArgumentParser()
ap.add_argument("data"); ap.add_argument("src")
ap.add_argument("--preview")
ap.add_argument("--min-area", type=int, default=0, help="минимальная новая область, px (по умолчанию ~N/90)")
ap.add_argument("--dry", action="store_true")
a = ap.parse_args()

D = json.load(open(a.data))
N = int(D["size"])
pal = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in D["palette"]]
regions = D["regions"]
R0 = len(regions)
enc = np.array(Image.open(io.BytesIO(base64.b64decode(D["labels"]))).convert("RGB"))
rid = (enc[..., 0].astype(np.int32) << 8) | enc[..., 1]
assert rid.max() < R0

src = cv2.imread(a.src)
src = cv2.resize(src, (N, N), interpolation=cv2.INTER_AREA)
smooth = cv2.bilateralFilter(src, 5, 30, 5)

def to_lab(rgb_list):
    arr = np.array(rgb_list, np.uint8).reshape(-1, 1, 3)[..., ::-1]
    return cv2.cvtColor(arr, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)

def lab_l(lab):  # OpenCV 8-bit Lab -> настоящие единицы для ΔE
    out = lab.astype(np.float32).copy(); out[..., 0] *= 100 / 255; out[..., 1:] -= 128; return out

src_lab = lab_l(cv2.cvtColor(smooth, cv2.COLOR_BGR2LAB))
pal_lab = lab_l(to_lab(pal))
col = np.array([g[0] for g in regions])[rid]          # индекс цвета каждой точки сейчас

# ---------- глаза ----------
fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=6, refine_landmarks=True,
                                     min_detection_confidence=0.3)
big = cv2.imread(a.src)
res = fm.process(cv2.cvtColor(big, cv2.COLOR_BGR2RGB))
FM = mp.solutions.face_mesh
eyes_idx = [sorted({i for e in FM.FACEMESH_LEFT_EYE for i in e}), sorted({i for e in FM.FACEMESH_RIGHT_EYE for i in e})]
mask = np.zeros((N, N), np.uint8)
n_faces = 0
for f in (res.multi_face_landmarks or []):
    n_faces += 1
    for idx in eyes_idx:
        pts = np.array([[f.landmark[i].x * N, f.landmark[i].y * N] for i in idx], np.float32)
        hull = cv2.convexHull(pts).astype(np.int32)
        cv2.fillConvexPoly(mask, hull, 1)
eye_px = int(mask.sum())
mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=max(1, N // 450)).astype(bool)

min_area = a.min_area or max(8, N // 90)
added_colors = 0; new_regions = 0; reused = 0; changed_px = 0
if mask.any():
    pts = src_lab[mask]
    k = min(6, max(2, len(pts) // 40))
    km = KMeans(n_clusters=k, n_init=4, random_state=0).fit(pts)
    centers = km.cluster_centers_
    # цвет кластера -> индекс в палитре (свой или новый)
    cmap = []
    for c in centers:
        d = np.linalg.norm(pal_lab - c, axis=1)
        j = int(d.argmin())
        if d[j] < 7:
            cmap.append(j)
        else:
            L, A, B = c
            lab8 = np.array([[[L * 255 / 100, A + 128, B + 128]]], np.float32).clip(0, 255).astype(np.uint8)
            bgr = cv2.cvtColor(lab8, cv2.COLOR_LAB2BGR)[0, 0]
            pal.append((int(bgr[2]), int(bgr[1]), int(bgr[0])))
            pal_lab = np.vstack([pal_lab, c[None]])
            cmap.append(len(pal) - 1); added_colors += 1
    cmap = np.array(cmap)
    lab_k = km.predict(src_lab.reshape(-1, 3)).reshape(N, N)
    target = cmap[lab_k]
    err_now = np.linalg.norm(src_lab - pal_lab[col], axis=2)
    err_new = np.linalg.norm(src_lab - pal_lab[target], axis=2)
    want = mask & (target != col) & (err_now > 12) & (err_new + 6 < err_now)

    newid = rid.copy()
    next_id = R0
    lbl_new = np.full((N, N), -1, np.int32)
    for c in np.unique(target[want]):
        m = (want & (target == c)).astype(np.uint8)
        # линии толщиной в 1–2 точки не раскрасить пальцем — убираем их
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        n, comp, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=4)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] < min_area: continue
            sub = comp == i
            lbl_new[sub] = c
    keep = lbl_new >= 0
    changed_px = int(keep.sum())

    # старые области, которые исчезли целиком, отдают свой номер новой области
    old_left = np.bincount(rid[~keep].ravel(), minlength=R0)
    old_all = np.bincount(rid.ravel(), minlength=R0)
    vanished = set(np.where((old_left == 0) & (old_all > 0))[0].tolist())

    for c in np.unique(lbl_new[keep]):
        m = (lbl_new == c).astype(np.uint8)
        n, comp = cv2.connectedComponents(m, connectivity=4)
        for i in range(1, n):
            sub = comp == i
            # соседняя неизменённая область того же цвета — присоединяемся к ней
            ring = cv2.dilate(sub.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~sub & ~keep
            same = [r for r in np.unique(rid[ring]) if regions[r][0] == c]
            if same:
                best = max(same, key=lambda r: int((rid[ring] == r).sum()))
                newid[sub] = best; reused += 1; continue
            # исчезнувшая старая область того же места
            under = np.bincount(rid[sub], minlength=R0)
            cand = [r for r in vanished if under[r] > 0]
            if cand:
                r = max(cand, key=lambda r: under[r]); vanished.discard(r)
                regions[r][0] = int(c); newid[sub] = r; reused += 1; continue
            newid[sub] = next_id; regions.append([int(c), 0, 0, 0]); next_id += 1; new_regions += 1
    # если старая область всё же исчезла (бывает очень редко) — отдаём ей одну точку обратно
    cnt = np.bincount(newid.ravel(), minlength=len(regions))
    for r in np.where(cnt == 0)[0]:
        yy, xx = np.where(rid == r); newid[yy[0], xx[0]] = r
    rid = newid

# ---------- палитра по светлоте (номера областей не меняются, меняются только номера цветов) ----------
used = {g[0] for g in regions}
order = sorted((i for i in range(len(pal)) if i in used), key=lambda i: -pal_lab[i][0])
added_colors = sum(1 for i in order if i >= len(D["palette"]))
remap = {old: new for new, old in enumerate(order)}
pal = [pal[i] for i in order]
for g in regions: g[0] = remap[g[0]]

# ---------- позиции номеров ----------
nid = len(regions)
bnd = np.zeros((N, N), bool)
bnd[:, :-1] |= rid[:, :-1] != rid[:, 1:]; bnd[:-1, :] |= rid[:-1, :] != rid[1:, :]
bnd[0, :] = bnd[-1, :] = True; bnd[:, 0] = bnd[:, -1] = True
dist = cv2.distanceTransform((~bnd).astype(np.uint8), cv2.DIST_L2, 5)
idx = np.arange(nid)
pos = ndimage.maximum_position(dist, rid, idx)
mx = ndimage.maximum(dist, rid, idx)
for i in range(nid):
    y, x = pos[i]
    regions[i][1:4] = [int(x), int(y), round(float(mx[i]), 1)]

D["palette"] = ['#%02x%02x%02x' % p for p in pal]
D["regions"] = regions
e = np.zeros((N, N, 3), np.uint8); e[..., 0] = rid >> 8; e[..., 1] = rid & 255
buf = io.BytesIO(); Image.fromarray(e).save(buf, "PNG", optimize=True)
D["labels"] = base64.b64encode(buf.getvalue()).decode()

print(f"{a.data}: лиц {n_faces}, точек глаз {eye_px}, перекрашено {changed_px}px, "
      f"новых цветов {added_colors}, новых областей {new_regions}, присоединено {reused}, "
      f"итого цветов {len(pal)}, областей {nid} (было {R0})")
if a.preview:
    P = np.array(pal, np.uint8)[np.array([g[0] for g in regions])[rid]]
    Image.fromarray(P).save(a.preview)
if not a.dry:
    json.dump(D, open(a.data, "w"), separators=(",", ":"))
