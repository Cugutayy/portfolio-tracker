import urllib.request, urllib.parse, json, time

UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}
API = "https://commons.wikimedia.org/w/api.php"

def api(params):
    params = dict(params); params["format"] = "json"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def cat_files(cat, limit=80):
    """List files in a Commons category with a 960px thumburl + original dims."""
    try:
        d = api({
            "action": "query", "generator": "categorymembers",
            "gcmtitle": "Category:" + cat, "gcmtype": "file", "gcmlimit": str(limit),
            "prop": "imageinfo", "iiprop": "url|size|mime", "iiurlwidth": "960",
        })
    except Exception as e:
        print(f"  !! {cat}: {e}"); return []
    pages = (d.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii or ii.get("mime") != "image/jpeg": continue
        out.append((p["title"], ii.get("width"), ii.get("height"), ii.get("thumburl")))
    return out

def search_files(q, limit=12):
    try:
        d = api({"action": "query", "list": "search", "srsearch": q,
                 "srnamespace": "6", "srlimit": str(limit)})
    except Exception as e:
        print(f"  !! search {q}: {e}"); return []
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

CATS = [
    "Archaeological Museum of İzmir",
    "Archaeology Museum of Izmir",
    "İzmir Archaeology Museum",
    "Sculptures in the İzmir Archaeology Museum",
    "Statues in the İzmir Archaeology Museum",
    "Istanbul Archaeology Museums",
    "Sculptures in the Istanbul Archaeology Museums",
]
for c in CATS:
    show("CAT " + c, cat_files(c)); time.sleep(2)

SEARCHES = [
    "İzmir Arkeoloji Müzesi building",
    "Izmir Archaeology Museum exterior",
    "Istanbul Archaeology Museum building facade",
    "Pera Museum Istanbul building",
]
for q in SEARCHES:
    show("SEARCH " + q, search_files(q)); time.sleep(2)
