import json, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}

QUERIES = {
    # Pera Müzesi — Osman Hamdi Bey (PD, d.1910) + Orientalists
    "ohb_tortoise":  "Osman Hamdi Bey Tortoise Trainer kaplumbağa",
    "ohb_arms":      "Osman Hamdi Bey Arms Merchant",
    "ohb_mihrab":    "Osman Hamdi Bey Mihrab",
    "ohb_musicians": "Osman Hamdi Bey Two Musician Girls",
    "ohb_theologian":"Osman Hamdi Bey theologian young emir reciting Quran",
    "ohb_fountain":  "Osman Hamdi Bey Fountain of Life",
    "zonaro_ortakoy":"Fausto Zonaro Ortaköy Istanbul",
    "vanmour":       "Jean Baptiste van Mour Istanbul ambassador",
    "preziosi":      "Amedeo Preziosi Constantinople watercolour",
    # İstanbul Arkeoloji Müzeleri (objects)
    "alex_sarc":     "Alexander Sarcophagus Istanbul",
    "mourning_sarc": "Sarcophagus of the Mourning Women Sidon Istanbul",
    "lycian_sarc":   "Lycian Sarcophagus Sidon Istanbul",
    "alex_bust":     "Alexander the Great bust Istanbul Archaeological",
    # İzmir Arkeoloji Müzesi
    "izmir_demeter": "İzmir Archaeological Museum statue Demeter",
    "izmir_runner":  "İzmir Archaeological Museum bronze runner Poseidon",
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
        rows.append((p.get("title",""), ii.get("width",0), ii.get("height",0), ii.get("url","")))
    rows.sort(key=lambda x: x[1], reverse=True)
    for t, w, h, url in rows[:4]:
        print(f"  [{w}x{h}] {t}")
        print(f"     {url}")
    time.sleep(1.4)
