import urllib.request, urllib.parse, json, time

UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}
API = "https://commons.wikimedia.org/w/api.php"

def api(params):
    params = dict(params); params["format"] = "json"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def search_files(q, limit=12):
    d = api({"action": "query", "list": "search", "srsearch": q,
             "srnamespace": "6", "srlimit": str(limit)})
    titles = [s["title"] for s in (d.get("query") or {}).get("search") or []]
    if not titles: return []
    d2 = api({"action": "query", "titles": "|".join(titles[:25]),
              "prop": "imageinfo", "iiprop": "url|size|mime", "iiurlwidth": "960"})
    pages = (d2.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii or ii.get("mime") != "image/jpeg": continue
        out.append((p["title"], ii.get("width"), ii.get("height"), ii.get("thumburl")))
    return out

def show(label, rows):
    print(f"\n===== {label} ({len(rows)}) =====", flush=True)
    for t, w, h, u in rows:
        ori = "L" if (w or 0) >= (h or 0) else "P"
        print(f"  [{ori} {w}x{h}] {t}\n       {u}", flush=True)

for q in ["Pera Museum Istanbul", "Pera Müzesi", "Arkas Sanat Merkezi Izmir",
          "Hallwyl Museum Stockholm exterior"]:
    show("SEARCH " + q, search_files(q)); time.sleep(2)

# verify the URLs we intend to use actually return 200/image (HEAD via GET range)
print("\n===== VERIFY =====", flush=True)
URLS = {
 "izm_athena":   "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Head_of_Athena_Izmir_Archaeology_Museum_2024.jpg/1920px-Head_of_Athena_Izmir_Archaeology_Museum_2024.jpg",
 "izm_herakles": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/%C4%B0zmir_Arkeoloji_M%C3%BCzesi_-_Herakles%27in_Ba%C5%9F%C4%B1.jpg/1920px-%C4%B0zmir_Arkeoloji_M%C3%BCzesi_-_Herakles%27in_Ba%C5%9F%C4%B1.jpg",
 "izm_eks3":     "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%283%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%283%29.jpg",
 "izm_eks4":     "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%284%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%284%29.jpg",
 "izm_eks16":    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2816%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2816%29.jpg",
 "izm_eks26":    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2826%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2826%29.jpg",
 "izm_building": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Museo_archeologico_di_izmir%2C_veduta.JPG/1280px-Museo_archeologico_di_izmir%2C_veduta.JPG",
 "ist_building": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Istanbul_Archaeology_Museums_%2816034419320%29.jpg/1280px-Istanbul_Archaeology_Museums_%2816034419320%29.jpg",
}
for k, u in URLS.items():
    try:
        req = urllib.request.Request(u, headers=UA)
        with urllib.request.urlopen(req, timeout=45) as r:
            print(f"  {k:14} {r.status} {r.headers.get('Content-Type','')}", flush=True)
    except Exception as e:
        print(f"  {k:14} ERR {e}", flush=True)
    time.sleep(2)
