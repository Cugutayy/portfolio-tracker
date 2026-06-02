import urllib.request, time

UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}
T = "https://upload.wikimedia.org/wikipedia/commons/thumb/"

# key -> (path, filename)  -> we test 1920 (full) and 960 (thumb)
FILES = {
 "ist_tortoise": ("4/4a", "Osman_Hamdi_Bey_-_The_Tortoise_Trainer_-_Google_Art_Project.jpg"),
 "ist_musicians":("8/87", "Osman_Hamdi_Bey_-_Two_Musician_Girls_-_Google_Art_Project.jpg"),
 "ist_carpet":   ("1/16", "1888_Bey_Persischer_Teppichh%C3%A4ndler_auf_der_Stra%C3%9Fe_anagoria.JPG"),
 "ist_scribe":   ("4/45", "Osman_Hamdi_Bey_-_Arzuhalci_%2C_Public_Scribe_-_Google_Art_Project.jpg"),
 "ist_quran":    ("6/61", "Osman_Hamdi_Bey_-_Kur%E2%80%99an_Tilaveti_%2C_Reciting_the_Quran_-_Google_Art_Project.jpg"),
 "ist_reading":  ("7/72", "Young_woman_reading_%281880%29%2C_by_Osman_Hamdi_Bey.jpg"),
 "ist_uskudar":  ("4/4d", "Fausto_Zonaro_Istanbul_-_an_den_H%C3%A4ngen_von_%C3%9Csk%C3%BCdar.jpg"),
 "ist_string":   ("e/ea", "Fausto_Zonaro_-_Woman_Playing_a_String_Instrument_-_Google_Art_Project.jpg"),
 "ist_alexsarc": ("3/31", "Alexander_Sarcophagus%2C_Istanbul_Archaeological_Museums_2024_%281%29.jpg"),
 "ist_mourning": ("f/fc", "Sarcophagus_of_the_mourning_women_in_the_Istanbul_Archaeological_Museums.jpg"),
 "ist_lycian":   ("5/58", "Istanbul_Archaeological_Museum_Lycian_sarcophagus_Long_side_with_boar_hunt_031.jpg"),
 "ist_alexbust": ("3/3e", "Alexander_the_Great_portrait_Istanbul_Archaeological_Museum_-_inv._1138_T_02.jpg"),
 "ist_sappho":   ("9/98", "Sappho_portrait_Istanbul_Archaeological_Museum_-_inv._358_T_01.jpg"),
 "izm_sculpt1":  ("1/19", "Izmir_Archaeology_museum_Hellenistic_sculpture_2489.jpg"),
 "izm_sculpt2":  ("3/30", "Izmir_Archaeology_museum_Hellenistic_sculpture_2487_1.jpg"),
 "izm_eksponat": ("d/d8", "%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2848%29.jpg"),
}

def head(u):
    try:
        req = urllib.request.Request(u, headers=UA)
        with urllib.request.urlopen(req, timeout=45) as r:
            return f"{r.status} {r.headers.get('Content-Type','')}"
    except Exception as e:
        return f"ERR {e}"

for k,(p,f) in FILES.items():
    full = f"{T}{p}/{f}/1920px-{f}"
    thmb = f"{T}{p}/{f}/960px-{f}"
    print(f"  {k:14} full={head(full):28} thumb={head(thmb)}")
    time.sleep(0.5)
