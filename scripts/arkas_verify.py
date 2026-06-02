import urllib.request, time

UA = {"User-Agent": "MaviAtlas-research/1.0 (personal art archive; contact dadas0564@gmail.com)"}
B = "https://upload.wikimedia.org/wikipedia/commons/"
T = B + "thumb/"

URLS = {
 "picabia_full":  B + "6/69/Francis_picabia_le_retour_de_la_peche_les_martigues_2016_PAR_12609_0228_000%28114513%29.jpg",
 "picabia_thumb": T + "6/69/Francis_picabia_le_retour_de_la_peche_les_martigues_2016_PAR_12609_0228_000%28114513%29.jpg/960px-Francis_picabia_le_retour_de_la_peche_les_martigues_2016_PAR_12609_0228_000%28114513%29.jpg",
 "sisley_full":   T + "3/37/Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp/1920px-Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp.png",
 "sisley_thumb":  T + "3/37/Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp/960px-Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp.png",
 "gerome_full":   T + "c/cb/AspasiaAlcibiades.jpg/3840px-AspasiaAlcibiades.jpg",
 "gerome_thumb":  T + "c/cb/AspasiaAlcibiades.jpg/960px-AspasiaAlcibiades.jpg",
 "godward_full":  B + "5/5a/When_the_heart_is_young%2C_by_John_William_Godward.jpg",
 "godward_thumb": T + "5/5a/When_the_heart_is_young%2C_by_John_William_Godward.jpg/960px-When_the_heart_is_young%2C_by_John_William_Godward.jpg",
 "rodinkiss_full":  B + "f/f1/Auguste_Rodin%2C_The_Kiss_%28Le_Baiser%29%2C_model_1880-1887%2C_cast_c._1898-1902%2C_NGA_1008.jpg",
 "rodinkiss_thumb": T + "f/f1/Auguste_Rodin%2C_The_Kiss_%28Le_Baiser%29%2C_model_1880-1887%2C_cast_c._1898-1902%2C_NGA_1008.jpg/960px-Auguste_Rodin%2C_The_Kiss_%28Le_Baiser%29%2C_model_1880-1887%2C_cast_c._1898-1902%2C_NGA_1008.jpg",
 "agebronze_full":  T + "d/d8/Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg/3840px-Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg",
 "agebronze_thumb": T + "d/d8/Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg/960px-Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg",
 "valse_full":   B + "c/cd/La_Valse%2C_Camille_Claudel.jpg",
 "valse_thumb":  T + "c/cd/La_Valse%2C_Camille_Claudel.jpg/960px-La_Valse%2C_Camille_Claudel.jpg",
 "paulbust_full":  T + "a/a4/Buste_Claudel_Paul_par_Claudel_Camille.jpg/3840px-Buste_Claudel_Paul_par_Claudel_Camille.jpg",
 "paulbust_thumb": T + "a/a4/Buste_Claudel_Paul_par_Claudel_Camille.jpg/960px-Buste_Claudel_Paul_par_Claudel_Camille.jpg",
 "maillol_full":  T + "5/54/Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg/3840px-Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg",
 "maillol_thumb": T + "5/54/Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg/960px-Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg",
}

for k, u in URLS.items():
    try:
        req = urllib.request.Request(u, headers=UA)
        with urllib.request.urlopen(req, timeout=40) as r:
            ct = r.headers.get("Content-Type","")
            cl = r.headers.get("Content-Length","?")
            print(f"  {r.status}  {ct:14} {cl:>9}  {k}")
    except Exception as e:
        print(f"  ERR  {k}: {e}")
    time.sleep(0.6)
