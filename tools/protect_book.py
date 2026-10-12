"""Шифрует текст книги для читалки: python3 tools/protect_book.py knigi/<папка>/chapters.js [...]
Берёт chapters.js с window.BOOK_TEXT = [...] и переписывает его в window.BOOK_ENC — текст глав
превращается в нечитаемый набор символов, а читалка (assets/reader.js) собирает его обратно на экране.
Уже зашифрованные файлы пропускаются. Запускать после каждого добавления или обновления книги."""
import sys, json, re, base64

def stream(seed, n):
    # тот же генератор, что в assets/reader.js (xorshift32)
    x = 0x811C9DC5                       # FNV-1a от строки «папка:номер главы»
    for b in seed.encode('utf-8'): x = ((x ^ b) * 16777619) & 0xFFFFFFFF
    x = x or 0x9E3779B9
    out = bytearray(n)
    for i in range(n):
        x ^= (x << 13) & 0xFFFFFFFF; x ^= x >> 17; x ^= (x << 5) & 0xFFFFFFFF
        out[i] = x & 0xFF
    return out

def enc(text, seed):
    b = text.encode('utf-8'); k = stream(seed, len(b))
    return base64.b64encode(bytes(a ^ c for a, c in zip(b, k))).decode()

for path in sys.argv[1:]:
    src = open(path, encoding='utf-8').read()
    if 'window.BOOK_ENC' in src: print('уже защищён:', path); continue
    m = re.match(r'\s*window\.BOOK_TEXT\s*=\s*(.*?);?\s*$', src, re.S)
    chapters = json.loads(m.group(1))
    key = path.replace('\\', '/').split('/')[-2]
    meta = [{k: v for k, v in c.items() if k != 'p'} for c in chapters]
    body = [enc(json.dumps(c['p'], ensure_ascii=False), f'{key}:{i}') for i, c in enumerate(chapters)]
    out = 'window.BOOK_ENC=' + json.dumps({'k': key, 'm': meta, 'c': body}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(path, 'w', encoding='utf-8').write(out)
    print('защищён:', path, len(chapters), 'глав')
