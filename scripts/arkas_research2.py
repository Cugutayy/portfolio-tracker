import json, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}

QUERIES = {
    "courbet_a": "Courbet hallali cerf neige",
    "courbet_b": "Courbet renard neige fox snow",
    "courbet_c": "Gustave Courbet chevreuils ruisseau",
    "bouguereau_a": "Bouguereau Pêcheuse",
    "bouguereau_b": "Bouguereau fishergirl young girl 1890",
    "cross_a": "Henri-Edmond Cross Pérouse",
    "cross_b": "Henri Edmond Cross church bell tower Italy",
    "lauge_a": "Achille Laugé nature morte fruits",
    "lauge_b": "Achille Laugé still life oranges apples",
}

def fetch(query):
    params = {
        "action": "query", "format": "json",
        "generator": "search", "gsrsearch": query,
        "gsrnamespace": "6", "gsrlimit": "6",
        "prop": "imageinfo", "iiprop": "url|size|mime",
        "iiurlwidth": "1920",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

for key, q in QUERIES.items():
    print("\n=== " + key + "  | " + q)
    try:
        data = fetch(q)
    except Exception as e:
        print("  ERROR:", e); time.sleep(2); continue
    pages = (data.get("query") or {}).get("pages") or {}
    rows = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [{}])[0]
        if not ii.get("mime","").startswith("image"): continue
        rows.append((p.get("title",""), ii.get("width",0), ii.get("height",0), ii.get("thumburl","")))
    rows.sort(key=lambda x: x[1], reverse=True)
    for t, w, h, thumb in rows[:5]:
        print(f"  [{w}x{h}] {t}")
        print(f"     1920: {thumb}")
    time.sleep(1.5)
