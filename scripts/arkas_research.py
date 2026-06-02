import json, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}

# key -> search query on Wikimedia Commons (public-domain artists / works in Arkas collection)
QUERIES = {
    "cross_perugia":   "Henri-Edmond Cross Perugia campanile Santa Maria",
    "picabia_martigues": "Francis Picabia Martigues 1903",
    "sisley_mammes":   "Alfred Sisley Saint-Mammès 1880",
    "courbet_deer":    "Courbet deer snow chevreuils neige",
    "bouguereau_fisher": "Bouguereau fisher girl pêcheuse 1890",
    "gerome_alcibiades": "Gérôme Socrates Alcibiades Aspasia",
    "godward_heart":   "Godward When the Heart is Young 1902",
    "lauge_stilllife": "Achille Laugé nature morte pommes",
    "rodin_kiss":      "Rodin The Kiss Le Baiser bronze",
    "rodin_bronzeage": "Rodin Age of Bronze L'âge d'airain",
    "claudel_waltz":   "Camille Claudel La Valse waltz",
    "claudel_paulbust":"Camille Claudel Paul Claudel buste",
    "maillol_torso":   "Aristide Maillol torso bronze",
}

def fetch(query):
    params = {
        "action": "query", "format": "json",
        "generator": "search", "gsrsearch": query,
        "gsrnamespace": "6", "gsrlimit": "6",
        "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": "1920",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

for key, q in QUERIES.items():
    print("\n=== " + key + "  | query: " + q)
    try:
        data = fetch(q)
    except Exception as e:
        print("  ERROR:", e); time.sleep(2); continue
    pages = (data.get("query") or {}).get("pages") or {}
    rows = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [{}])[0]
        mime = ii.get("mime", "")
        if not mime.startswith("image"): continue
        rows.append((p.get("title",""), ii.get("width",0), ii.get("height",0),
                     ii.get("url",""), ii.get("thumburl","")))
    # prefer largest by width
    rows.sort(key=lambda x: x[1], reverse=True)
    for t, w, h, url, thumb in rows[:4]:
        print(f"  [{w}x{h}] {t}")
        print(f"     orig:  {url}")
        print(f"     1920:  {thumb}")
    time.sleep(1.5)
