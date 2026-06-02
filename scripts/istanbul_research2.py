import json, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}

QUERIES = {
    "ohb_quran":    "Osman Hamdi Bey Girl Reciting Quran",
    "ohb_genesis":  "Osman Hamdi Bey Genesis Mihrab painting",
    "ohb_mosque":   "Osman Hamdi Bey At the Mosque Door",
    "ohb_persian":  "Osman Hamdi Bey Persian carpet dealer",
    "ohb_lady":     "Osman Hamdi Bey woman Constantinople",
    "ohb_general":  "Osman Hamdi Bey painting",
    "zonaro":       "Fausto Zonaro painting Istanbul",
    "izmir_stat2":  "Izmir Archaeology museum statue Roman marble",
}

def fetch(query):
    params = {"action":"query","format":"json","generator":"search","gsrsearch":query,
        "gsrnamespace":"6","gsrlimit":"7","prop":"imageinfo","iiprop":"url|size|mime","iiurlwidth":"1920"}
    req = urllib.request.Request(API+"?"+urllib.parse.urlencode(params), headers=UA)
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
        rows.append((p.get("title",""), ii.get("width",0), ii.get("height",0), ii.get("url","")))
    rows.sort(key=lambda x: x[1], reverse=True)
    for t, w, h, url in rows[:5]:
        print(f"  [{w}x{h}] {t}")
        print(f"     {url}")
    time.sleep(1.4)
