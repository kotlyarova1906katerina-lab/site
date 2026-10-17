"""Словарь для игры «Слова из слова» (slova/words.js).

Длинные слова для уровней берутся из «Осколков первой любви» (тексты игры igra/story*.js),
засчитываются существительные из книг автора на сайте (knigi/*/chapters.js) и «Осколков»
и просто употребительные существительные русского языка (частоты wordfreq), чтобы не злить игрока отказом на «кино».
Нужны pymorphy3 и wordfreq:  pip install pymorphy3 pymorphy3-dicts-ru wordfreq
Запуск:  python3 tools/slova_build.py [текст_книги.txt ...]
Полный текст «Осколков» в репозиторий не кладём: его передают путём к .txt или .docx.
Без него слова уровней берутся из текстов игры (igra/story*.js).
"""
import base64, collections, glob, html, json, os, re, sys, zipfile
import pymorphy3
from wordfreq import top_n_list, zipf_frequency

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
morph = pymorphy3.MorphAnalyzer()

def fnv(s):
    h = 0x811c9dc5
    for b in s.encode():
        h ^= b; h = (h * 16777619) & 0xffffffff
    return h or 0x9E3779B9

def unlock(b64, seed):
    data = base64.b64decode(b64); x = fnv(seed); out = bytearray(len(data))
    for i, c in enumerate(data):
        x ^= (x << 13) & 0xffffffff; x ^= x >> 17; x ^= (x << 5) & 0xffffffff
        out[i] = c ^ (x & 255)
    return out.decode()

def book_text(path):
    s = open(path, encoding="utf-8").read()
    m = re.search(r"window\.BOOK_ENC\s*=\s*(\{.*\})\s*;?\s*$", s, re.S)
    if m:
        e = json.loads(m.group(1))
        return "\n".join(" ".join(json.loads(unlock(c, f"{e['k']}:{i}"))) if True else "" for i, c in enumerate(e["c"]))
    return s

WORD = re.compile(r"[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?")
SKIP = {"Name", "Surn", "Patr", "Geox", "Orgn", "Abbr", "Trad", "Erro", "Dist", "Init", "Infr", "Slng", "Arch"}

# грубые, обидные и странные для игры слова
BAN = set("""сука сучка блядь хер жопа дерьмо говно срач член зад задница пизда мудак урод дебил идиот тупица дура дурак
шлюха стерва телка соска тварь гад гадина сволочь скотина козел черт ад бес труп смерть убийца гроб могила наркотик пиво водка
лох жид негр псих бомж секс урод хрен срать рвота сопля понос глист вошь клоп кокаин сосок
ублюдок девственница возбуждение уродство дурочка дурь фифа ана
карел лорак телок астон камаз нолан никсон лиама старое костра марши ном зам дим""".split())

def nouns(text):
    cnt, seen = collections.Counter(), set()
    for w in WORD.findall(text):
        lw = w.lower().replace("ё", "е")
        seen.add(lw)
        p = morph.parse(w.lower())[0]
        if p.tag.POS != "NOUN" or SKIP & set(str(p.tag).replace(" ", ",").split(",")): continue
        if p.score < 0.4: continue
        lemma = p.normal_form.replace("ё", "е")
        if "-" in lemma or not 3 <= len(lemma) <= 14: continue
        cnt[lemma] += 1
    # только те, что хоть раз стоят в тексте в начальной форме: так отсеиваются ошибки разбора вроде «тена»
    return collections.Counter({w: n for w, n in cnt.items() if w in seen and w not in BAN})

def is_lemma_noun(w):
    """Слово само по себе — существительное в начальной форме из словаря pymorphy, без частых разборов другой частью речи и без имён."""
    ps = morph.parse(w)
    if type(ps[0].methods_stack[0][0]).__name__ != "DictionaryAnalyzer" or ps[0].tag.POS != "NOUN": return False
    tg = lambda q: set(str(q.tag).replace(" ", ",").split(","))
    if SKIP & tg(ps[0]) or any(q.score >= 0.25 and q.tag.POS != "NOUN" for q in ps): return False
    return any(q.normal_form.replace("ё", "е") == w and "nomn" in tg(q) and ("sing" in tg(q) or "Pltm" in tg(q)) and not SKIP & tg(q) for q in ps)

def read_text(f):
    if f.endswith(".docx"):
        x = zipfile.ZipFile(f).read("word/document.xml").decode("utf-8")
        return "\n".join(html.unescape("".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S))) for p in re.findall(r"<w:p[ >].*?</w:p>", x, re.S))
    return open(f, encoding="utf-8").read()

game = sorted(glob.glob(os.path.join(ROOT, "igra/story*.js")))
oskolki = "\n".join(read_text(f) for f in (sys.argv[1:] or game))
books = "\n".join(book_text(f) for f in sorted(glob.glob(os.path.join(ROOT, "knigi/*/chapters.js"))))
osk, allc = nouns(oskolki), nouns(books)
allc.update(osk)
freq = lambda w: zipf_frequency(w, "ru")
common = {w.replace("ё", "е") for w in top_n_list("ru", 60000) if re.fullmatch(r"[а-яё]{3,12}", w)}
# короткие слова — только из книг (в частотных списках среди них много имён, марок и английского), длинные — ещё и просто частые
common = {w for w in common if len(w) >= 5 and w not in BAN and freq(w) >= 3.0 and is_lemma_noun(w)}
dic = common | {w for w in allc if w not in BAN and is_lemma_noun(w)}

def fits(small, big):
    b = collections.Counter(big)
    return all(b[c] >= n for c, n in collections.Counter(small).items())

# эти годятся как найденные слова, но не как слово уровня
NOT_LEVEL = set("постель беременность анестезия реанимация сотрясение ругательство".split())

levels = []
for w in osk:
    if w in NOT_LEVEL: continue
    if not 7 <= len(w) <= 12 or freq(w) < 2.5 or not is_lemma_noun(w): continue
    subs = [s for s in dic if s != w and fits(s, w)]
    known = [s for s in subs if freq(s) >= 3.0]
    if len(known) < 8: continue
    # сначала самые известные: подсказка «Показать слово» открывает их первыми
    subs.sort(key=lambda s: (-(freq(s) + (0.5 if s in allc else 0)), s))
    levels.append((w, subs, len(known)))
# уровни: от коротких слов с большим выбором к длинным и трудным
levels.sort(key=lambda x: (len(x[0]) + (2 if x[2] < 15 else 0), -x[2]))
out = [{"w": w, "s": subs, "k": k} for w, subs, k in levels]
with open(os.path.join(ROOT, "slova/words.js"), "w", encoding="utf-8") as f:
    f.write("/* Сгенерировано tools/slova_build.py — руками не править.\n   w — слово уровня из «Осколков», s — слова, которые из него собираются (самые известные первыми), k — сколько из них известных. */\n")
    f.write("window.SLOVA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"Слов в словаре: {len(dic)}, уровней: {len(out)}")
