import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import type { GalleryArt, GalleryVariant } from './Gallery3D'

// three.js is heavy — only pull it in when a visitor actually opens the 3D hall
const Gallery3D = lazy(() => import('./Gallery3D').then((m) => ({ default: m.Gallery3D })))
// Leaflet map flyover — only loaded when a 3D salon with real coordinates opens
const MuseumIntro = lazy(() => import('./MuseumIntro'))

// ═══════════════════════════════════════════════════
// X — cinematic digital-atlas page
// Hero: Botticelli · La Nascita di Venere (4K gigapixel scan)
// Below: manifesto + collections grid (museum-catalog feel)
// Routing (3 levels):
//   #/x                  → atlas (hero + collections grid)
//   #/x/<cat>            → collection index (named entries: paintings + 3D museums)
//   #/x/<cat>/<itemId>   → an opened entry: a 4K painting OR a walkable 3D museum
// 3D museums are walkable Sketchfab embeds, loaded ONLY when opened (light by default).
// Transitions: door / corridor (random) + settings panel.
// ═══════════════════════════════════════════════════

// An entry inside a collection: either a flat 4K artwork/photo or a walkable 3D museum.
type ArtItem = {
  kind: 'art'; id: string; title: string; artist: string; year: string; museum: string;
  medium: string; img: string; thumb: string; objPos: string; tag?: string; noWall?: boolean
}
type MuseumItem = {
  kind: '3d'; id: string; title: string; scanId: string; author: string;
  kindLabel: string; loc: string; note: string; thumb: string; objPos?: string
  // real-world anchor for the cinematic "fly over the map to the museum" intro
  geo?: { lat: number; lng: number; zoom?: number }; address?: string; placePhoto?: string
}
type Item = ArtItem | MuseumItem
type Cat = { n: string; slug: string; tr: string; it: string; d: string; img: string; objPos: string; items: Item[] }

// A real Sketchfab scan has a 32-char hex UID; our own procedural salons use short slugs.
const isSketchfab = (id: string) => /^[0-9a-f]{32}$/i.test(id)
const sketchfabSrc = (id: string) =>
  `https://sketchfab.com/models/${id}/embed?autostart=1&preload=1&ui_theme=dark` +
  `&ui_infos=0&ui_controls=1&ui_stop=0&ui_hint=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=1&dnt=1`

const GALLERY_THUMB = 'https://media.sketchfab.com/models/231fdb3e9e354c6faaa3c250f8c9988f/thumbnails/885b79c3b12e4b488e7908b1184e69a0/ede0e7da6a5a45529c38af5bca95b5ae.jpeg'

// A real, beautifully scanned museum hall (The Hallwyl Museum picture gallery) shown small under
// every salon's dossier as a reference for what a true photogrammetry scan looks like.
const SAMPLE_SCAN_ID = '231fdb3e9e354c6faaa3c250f8c9988f'
const SAMPLE_SCAN_AUTHOR = 'The Hallwyl Museum'

// An interactive OpenStreetMap embed (no API key) centred on the museum, with a marker on the spot.
const osmEmbedSrc = (lat: number, lng: number, d = 0.006) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}` +
  `&layer=mapnik&marker=${lat}%2C${lng}`
const osmLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`

// Verified Wikimedia Commons renditions — `full` is a true-4K (3840px) view loaded only when an
// entry is opened; `thumb` is a light 960px crop for the collection grid. (Public domain / CC.)
const IMG: Record<string, { full: string; thumb: string }> = {
  pearl_earring: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/3840px-1665_Girl_with_a_Pearl_Earring.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/960px-1665_Girl_with_a_Pearl_Earring.jpg' },
  kiss: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg/3840px-The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg/960px-The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg' },
  starry: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/3840px-Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/960px-Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
  mona: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/3840px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/960px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
  milkmaid: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg/3840px-Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg/960px-Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg' },
  nightwatch: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/La_ronda_de_noche%2C_por_Rembrandt_van_Rijn.jpg/3840px-La_ronda_de_noche%2C_por_Rembrandt_van_Rijn.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/La_ronda_de_noche%2C_por_Rembrandt_van_Rijn.jpg/960px-La_ronda_de_noche%2C_por_Rembrandt_van_Rijn.jpg' },
  bacchus: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bacchus_by_Caravaggio_1.jpg/3840px-Bacchus_by_Caravaggio_1.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bacchus_by_Caravaggio_1.jpg/960px-Bacchus_by_Caravaggio_1.jpg' },
  redvineyard: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Vincent_van_Gogh_-_Red_Vineyard_at_Arles_%281888%29.jpg/3840px-Vincent_van_Gogh_-_Red_Vineyard_at_Arles_%281888%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Vincent_van_Gogh_-_Red_Vineyard_at_Arles_%281888%29.jpg/960px-Vincent_van_Gogh_-_Red_Vineyard_at_Arles_%281888%29.jpg' },
  grapeharvest: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Javier_shows_part_of_the_grape_harvest_in_his_Lysekil_vineyard_1_-_cropped.jpg/3840px-Javier_shows_part_of_the_grape_harvest_in_his_Lysekil_vineyard_1_-_cropped.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Javier_shows_part_of_the_grape_harvest_in_his_Lysekil_vineyard_1_-_cropped.jpg/960px-Javier_shows_part_of_the_grape_harvest_in_his_Lysekil_vineyard_1_-_cropped.jpg' },
  ninthwave: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Aivazovsky%2C_Ivan_-_The_Ninth_Wave.jpg/3840px-Aivazovsky%2C_Ivan_-_The_Ninth_Wave.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Aivazovsky%2C_Ivan_-_The_Ninth_Wave.jpg/960px-Aivazovsky%2C_Ivan_-_The_Ninth_Wave.jpg' },
  greatwave: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/3840px-Tsunami_by_hokusai_19th_century.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/960px-Tsunami_by_hokusai_19th_century.jpg' },
  rainbow_aiv: { full: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/%D0%90%D0%B9%D0%B2%D0%B0%D0%B7%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%28%D0%93%D0%B0%D0%B9%D0%B2%D0%B0%D0%B7%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%29_%D0%98%D0%B2%D0%B0%D0%BD_%28%D0%9E%D0%B3%D0%B0%D0%BD%D0%B5%D1%81%29_%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B0%D0%BD%D1%82%D0%B8%D0%BD%D0%BE%D0%B2%D0%B8%D1%87_%D0%A0%D0%B0%D0%B4%D1%83%D0%B3%D0%B0.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/%D0%90%D0%B9%D0%B2%D0%B0%D0%B7%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%28%D0%93%D0%B0%D0%B9%D0%B2%D0%B0%D0%B7%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%29_%D0%98%D0%B2%D0%B0%D0%BD_%28%D0%9E%D0%B3%D0%B0%D0%BD%D0%B5%D1%81%29_%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B0%D0%BD%D1%82%D0%B8%D0%BD%D0%BE%D0%B2%D0%B8%D1%87_%D0%A0%D0%B0%D0%B4%D1%83%D0%B3%D0%B0.jpg/960px-%D0%90%D0%B9%D0%B2%D0%B0%D0%B7%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%28%D0%93%D0%B0%D0%B9%D0%B2%D0%B0%D0%B7%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%29_%D0%98%D0%B2%D0%B0%D0%BD_%28%D0%9E%D0%B3%D0%B0%D0%BD%D0%B5%D1%81%29_%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B0%D0%BD%D1%82%D0%B8%D0%BD%D0%BE%D0%B2%D0%B8%D1%87_%D0%A0%D0%B0%D0%B4%D1%83%D0%B3%D0%B0.jpg' },
  canalgrande: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ca%27_Rezzonico_-_Canal_Grande_da_Palazzo_Balbi_a_Rialto_C.1722_-_Canaletto.jpg/3840px-Ca%27_Rezzonico_-_Canal_Grande_da_Palazzo_Balbi_a_Rialto_C.1722_-_Canaletto.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Ca%27_Rezzonico_-_Canal_Grande_da_Palazzo_Balbi_a_Rialto_C.1722_-_Canaletto.jpg/960px-Ca%27_Rezzonico_-_Canal_Grande_da_Palazzo_Balbi_a_Rialto_C.1722_-_Canaletto.jpg' },
  piazza: { full: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Canaletto_-_The_Piazza_San_Marco_in_Venice_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Canaletto_-_The_Piazza_San_Marco_in_Venice_-_Google_Art_Project.jpg/960px-Canaletto_-_The_Piazza_San_Marco_in_Venice_-_Google_Art_Project.jpg' },
  florence_street: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Impressions_from_the_historic_center_of_Florence_%2898612%29.jpg/3840px-Impressions_from_the_historic_center_of_Florence_%2898612%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Impressions_from_the_historic_center_of_Florence_%2898612%29.jpg/960px-Impressions_from_the_historic_center_of_Florence_%2898612%29.jpg' },
  pompeii_street: { full: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Fountain_in_Pompeii_01.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Fountain_in_Pompeii_01.jpg/960px-Fountain_in_Pompeii_01.jpg' },
  delft_courtyard: { full: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Pieter_de_Hooch_-_The_Courtyard_of_a_House_in_Delft.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Pieter_de_Hooch_-_The_Courtyard_of_a_House_in_Delft.jpg/960px-Pieter_de_Hooch_-_The_Courtyard_of_a_House_in_Delft.jpg' },
  hammershoi: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Vilhelm_Hammersh%C3%B8i_-_A_Room_in_the_Artist%27s_Home_in_Strandgade%2C_Copenhagen%2C_with_the_Artist%27s_Wife_-_Google_Art_Project.jpg/3840px-Vilhelm_Hammersh%C3%B8i_-_A_Room_in_the_Artist%27s_Home_in_Strandgade%2C_Copenhagen%2C_with_the_Artist%27s_Wife_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Vilhelm_Hammersh%C3%B8i_-_A_Room_in_the_Artist%27s_Home_in_Strandgade%2C_Copenhagen%2C_with_the_Artist%27s_Wife_-_Google_Art_Project.jpg/960px-Vilhelm_Hammersh%C3%B8i_-_A_Room_in_the_Artist%27s_Home_in_Strandgade%2C_Copenhagen%2C_with_the_Artist%27s_Wife_-_Google_Art_Project.jpg' },
  art_of_painting: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Jan_Vermeer_-_The_Art_of_Painting_-_Google_Art_Project.jpg/3840px-Jan_Vermeer_-_The_Art_of_Painting_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Jan_Vermeer_-_The_Art_of_Painting_-_Google_Art_Project.jpg/960px-Jan_Vermeer_-_The_Art_of_Painting_-_Google_Art_Project.jpg' },
  teniers_gallery: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/David_Teniers_the_Younger_-_Archduke_Leopold_William_in_his_Gallery_at_Brussels_-_Google_Art_Project.jpg/3840px-David_Teniers_the_Younger_-_Archduke_Leopold_William_in_his_Gallery_at_Brussels_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/David_Teniers_the_Younger_-_Archduke_Leopold_William_in_his_Gallery_at_Brussels_-_Google_Art_Project.jpg/960px-David_Teniers_the_Younger_-_Archduke_Leopold_William_in_his_Gallery_at_Brussels_-_Google_Art_Project.jpg' },
  panini_roma: { full: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Giovanni_Paolo_Panini_%E2%80%93_Ancient_Rome.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Giovanni_Paolo_Panini_%E2%80%93_Ancient_Rome.jpg/960px-Giovanni_Paolo_Panini_%E2%80%93_Ancient_Rome.jpg' },
  wunderkammer: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Natural_history_museum_of_Ferrante_Imperato_of_Naples_Wellcome_L0000088.jpg/3840px-Natural_history_museum_of_Ferrante_Imperato_of_Naples_Wellcome_L0000088.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Natural_history_museum_of_Ferrante_Imperato_of_Naples_Wellcome_L0000088.jpg/960px-Natural_history_museum_of_Ferrante_Imperato_of_Naples_Wellcome_L0000088.jpg' },
  pergamon_altar: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Berlin_-_Pergamonmuseum_-_Altar_01.jpg/3840px-Berlin_-_Pergamonmuseum_-_Altar_01.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Berlin_-_Pergamonmuseum_-_Altar_01.jpg/960px-Berlin_-_Pergamonmuseum_-_Altar_01.jpg' },
  pergamon_theatre: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Theatre_-_Pergamon%2C_Bergama%2C_Bergama_District%2C_%C4%B0zmir_Province%2C_Turkey_-_October_8%2C_2025_04.jpg/1920px-Theatre_-_Pergamon%2C_Bergama%2C_Bergama_District%2C_%C4%B0zmir_Province%2C_Turkey_-_October_8%2C_2025_04.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Theatre_-_Pergamon%2C_Bergama%2C_Bergama_District%2C_%C4%B0zmir_Province%2C_Turkey_-_October_8%2C_2025_04.jpg/960px-Theatre_-_Pergamon%2C_Bergama%2C_Bergama_District%2C_%C4%B0zmir_Province%2C_Turkey_-_October_8%2C_2025_04.jpg' },
  pergamon_acropolis: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Pergamon_Ruins.jpg/3840px-Pergamon_Ruins.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Pergamon_Ruins.jpg/960px-Pergamon_Ruins.jpg' },
  asklepion: { full: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Asclepion_-_Bergama_%28Pergamon%29_-_Turkey_-_03_%285747769152%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Asclepion_-_Bergama_%28Pergamon%29_-_Turkey_-_03_%285747769152%29.jpg/960px-Asclepion_-_Bergama_%28Pergamon%29_-_Turkey_-_03_%285747769152%29.jpg' },
  ephesus_celsus: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/3840px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/960px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg' },
  aphrodisias: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Aphrodisias_Tetrapylon_4593.jpg/3840px-Aphrodisias_Tetrapylon_4593.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Aphrodisias_Tetrapylon_4593.jpg/960px-Aphrodisias_Tetrapylon_4593.jpg' },
  corinthian_helmet: { full: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Corinthian_helmet_15153_NAMAthens.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Corinthian_helmet_15153_NAMAthens.jpg/960px-Corinthian_helmet_15153_NAMAthens.jpg' },
  greek_coin: { full: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Athens_-_450-400_BC_-_silver_tetradrachm_-_head_of_Athena_-_owl_-_Athens_Agora_Museum.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Athens_-_450-400_BC_-_silver_tetradrachm_-_head_of_Athena_-_owl_-_Athens_Agora_Museum.jpg/960px-Athens_-_450-400_BC_-_silver_tetradrachm_-_head_of_Athena_-_owl_-_Athens_Agora_Museum.jpg' },
  roman_coin: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Gold_coin_issued_by_Emperor_Nero..jpg/3840px-Gold_coin_issued_by_Emperor_Nero..jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Gold_coin_issued_by_Emperor_Nero..jpg/960px-Gold_coin_issued_by_Emperor_Nero..jpg' },
  lydian_coin: { full: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Lydian_electrum_Lion_coins_-_Flickr_-_brewbooks.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Lydian_electrum_Lion_coins_-_Flickr_-_brewbooks.jpg/960px-Lydian_electrum_Lion_coins_-_Flickr_-_brewbooks.jpg' },
  troy: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/%C3%87anakkale%2C_Turkey_-_Trojan_Horse%2C_March_2022.jpg/1920px-%C3%87anakkale%2C_Turkey_-_Trojan_Horse%2C_March_2022.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/%C3%87anakkale%2C_Turkey_-_Trojan_Horse%2C_March_2022.jpg/960px-%C3%87anakkale%2C_Turkey_-_Trojan_Horse%2C_March_2022.jpg' },
  hattusa: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Lion_Gate%2C_Hattusa_01.jpg/1920px-Lion_Gate%2C_Hattusa_01.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Lion_Gate%2C_Hattusa_01.jpg/960px-Lion_Gate%2C_Hattusa_01.jpg' },
  aspendos: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Aspendos_Theatre_-_panoramio.jpg/1920px-Aspendos_Theatre_-_panoramio.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Aspendos_Theatre_-_panoramio.jpg/960px-Aspendos_Theatre_-_panoramio.jpg' },
  nemrut: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/APOLLON_NEMRUT_MOUNTAIN.jpg/1920px-APOLLON_NEMRUT_MOUNTAIN.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/APOLLON_NEMRUT_MOUNTAIN.jpg/960px-APOLLON_NEMRUT_MOUNTAIN.jpg' },
  karahantepe: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Enclosure_with_T_Shaped_Pillars%2C_Karahantepe_%28Karahan_Tepe%29%2C_Turkey_%282%29.jpg/1920px-Enclosure_with_T_Shaped_Pillars%2C_Karahantepe_%28Karahan_Tepe%29%2C_Turkey_%282%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Enclosure_with_T_Shaped_Pillars%2C_Karahantepe_%28Karahan_Tepe%29%2C_Turkey_%282%29.jpg/960px-Enclosure_with_T_Shaped_Pillars%2C_Karahantepe_%28Karahan_Tepe%29%2C_Turkey_%282%29.jpg' },
  side_apollo: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Sunrise_apollo_side.jpg/1920px-Sunrise_apollo_side.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Sunrise_apollo_side.jpg/960px-Sunrise_apollo_side.jpg' },
  parthenon: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg/1920px-Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg/960px-Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg' },
  colosseum: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg/1920px-Colosseum_in_Rome-April_2007-1-_copie_2B.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg/960px-Colosseum_in_Rome-April_2007-1-_copie_2B.jpg' },
  sphinx_giza: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Great_Sphinx_%28%D8%A3%D8%A8%D9%88_%D8%A7%D9%84%D9%87%D9%88%D9%84%29.jpg/1920px-Great_Sphinx_%28%D8%A3%D8%A8%D9%88_%D8%A7%D9%84%D9%87%D9%88%D9%84%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Great_Sphinx_%28%D8%A3%D8%A8%D9%88_%D8%A7%D9%84%D9%87%D9%88%D9%84%29.jpg/960px-Great_Sphinx_%28%D8%A3%D8%A8%D9%88_%D8%A7%D9%84%D9%87%D9%88%D9%84%29.jpg' },
  petra: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Petra_%2C_Al-Khazneh_2.jpg/1920px-Petra_%2C_Al-Khazneh_2.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Petra_%2C_Al-Khazneh_2.jpg/960px-Petra_%2C_Al-Khazneh_2.jpg' },
  nefertiti: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/The_bust_of_Nefertiti_from_the_Egyptian_Museum_of_Berlin_collection_in_the_Neues_Museum.jpg/1920px-The_bust_of_Nefertiti_from_the_Egyptian_Museum_of_Berlin_collection_in_the_Neues_Museum.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/The_bust_of_Nefertiti_from_the_Egyptian_Museum_of_Berlin_collection_in_the_Neues_Museum.jpg/960px-The_bust_of_Nefertiti_from_the_Egyptian_Museum_of_Berlin_collection_in_the_Neues_Museum.jpg' },
  tutankhamun: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Tutankhamun_also_referred_to_as_king_Tut_was_the_pharaoh_of_the_18th_dynasty_of_ancient_Egypt.jpg/1920px-Tutankhamun_also_referred_to_as_king_Tut_was_the_pharaoh_of_the_18th_dynasty_of_ancient_Egypt.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Tutankhamun_also_referred_to_as_king_Tut_was_the_pharaoh_of_the_18th_dynasty_of_ancient_Egypt.jpg/960px-Tutankhamun_also_referred_to_as_king_Tut_was_the_pharaoh_of_the_18th_dynasty_of_ancient_Egypt.jpg' },
  // ── Arkas Koleksiyonu (Arkas Sanat Urla) — telifsiz eserlerin Wikimedia render'ları ──
  arkas_picabia: { full: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Francis_picabia_le_retour_de_la_peche_les_martigues_2016_PAR_12609_0228_000%28114513%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Francis_picabia_le_retour_de_la_peche_les_martigues_2016_PAR_12609_0228_000%28114513%29.jpg/960px-Francis_picabia_le_retour_de_la_peche_les_martigues_2016_PAR_12609_0228_000%28114513%29.jpg' },
  arkas_sisley: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp/1920px-Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp.png', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp/960px-Les_hauteurs_de_Saint-Mamm%C3%A8s_au_printemps_-_Alfred_Sisley.webp.png' },
  arkas_gerome: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/AspasiaAlcibiades.jpg/3840px-AspasiaAlcibiades.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/AspasiaAlcibiades.jpg/960px-AspasiaAlcibiades.jpg' },
  arkas_godward: { full: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/When_the_heart_is_young%2C_by_John_William_Godward.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/When_the_heart_is_young%2C_by_John_William_Godward.jpg/960px-When_the_heart_is_young%2C_by_John_William_Godward.jpg' },
  arkas_rodinkiss: { full: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Auguste_Rodin%2C_The_Kiss_%28Le_Baiser%29%2C_model_1880-1887%2C_cast_c._1898-1902%2C_NGA_1008.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Auguste_Rodin%2C_The_Kiss_%28Le_Baiser%29%2C_model_1880-1887%2C_cast_c._1898-1902%2C_NGA_1008.jpg/960px-Auguste_Rodin%2C_The_Kiss_%28Le_Baiser%29%2C_model_1880-1887%2C_cast_c._1898-1902%2C_NGA_1008.jpg' },
  arkas_agebronze: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg/1920px-Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg/960px-Bemberg_Fondation_Toulouse_-_L%27Age_d%27Airain_-_Auguste_Rodin_%281875-1876%29_Inv.3084_Bronze_%C3%A0_patine_brune.jpg' },
  arkas_valse: { full: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/La_Valse%2C_Camille_Claudel.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/La_Valse%2C_Camille_Claudel.jpg/960px-La_Valse%2C_Camille_Claudel.jpg' },
  arkas_paulbust: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Buste_Claudel_Paul_par_Claudel_Camille.jpg/3840px-Buste_Claudel_Paul_par_Claudel_Camille.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Buste_Claudel_Paul_par_Claudel_Camille.jpg/960px-Buste_Claudel_Paul_par_Claudel_Camille.jpg' },
  arkas_maillol: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg/3840px-Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg/960px-Torso_of_a_female_figure%2C_Aristide_Maillol%2C_1930%2C_bronze_-_Hessisches_Landesmuseum_Darmstadt_-_Darmstadt%2C_Germany_-_DSC09990.jpg' },
  // ── İstanbul · Pera & Oryantalizm (Osman Hamdi Bey, Fausto Zonaro — telifsiz) ──
  ist_tortoise: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Osman_Hamdi_Bey_-_The_Tortoise_Trainer_-_Google_Art_Project.jpg/1920px-Osman_Hamdi_Bey_-_The_Tortoise_Trainer_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Osman_Hamdi_Bey_-_The_Tortoise_Trainer_-_Google_Art_Project.jpg/960px-Osman_Hamdi_Bey_-_The_Tortoise_Trainer_-_Google_Art_Project.jpg' },
  ist_musicians: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Osman_Hamdi_Bey_-_Two_Musician_Girls_-_Google_Art_Project.jpg/1920px-Osman_Hamdi_Bey_-_Two_Musician_Girls_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Osman_Hamdi_Bey_-_Two_Musician_Girls_-_Google_Art_Project.jpg/960px-Osman_Hamdi_Bey_-_Two_Musician_Girls_-_Google_Art_Project.jpg' },
  ist_carpet: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/1888_Bey_Persischer_Teppichh%C3%A4ndler_auf_der_Stra%C3%9Fe_anagoria.JPG/1920px-1888_Bey_Persischer_Teppichh%C3%A4ndler_auf_der_Stra%C3%9Fe_anagoria.JPG', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/1888_Bey_Persischer_Teppichh%C3%A4ndler_auf_der_Stra%C3%9Fe_anagoria.JPG/960px-1888_Bey_Persischer_Teppichh%C3%A4ndler_auf_der_Stra%C3%9Fe_anagoria.JPG' },
  ist_scribe: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Osman_Hamdi_Bey_-_Arzuhalci_%2C_Public_Scribe_-_Google_Art_Project.jpg/1920px-Osman_Hamdi_Bey_-_Arzuhalci_%2C_Public_Scribe_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Osman_Hamdi_Bey_-_Arzuhalci_%2C_Public_Scribe_-_Google_Art_Project.jpg/960px-Osman_Hamdi_Bey_-_Arzuhalci_%2C_Public_Scribe_-_Google_Art_Project.jpg' },
  ist_quran: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Osman_Hamdi_Bey_-_Kur%E2%80%99an_Tilaveti_%2C_Reciting_the_Quran_-_Google_Art_Project.jpg/1920px-Osman_Hamdi_Bey_-_Kur%E2%80%99an_Tilaveti_%2C_Reciting_the_Quran_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Osman_Hamdi_Bey_-_Kur%E2%80%99an_Tilaveti_%2C_Reciting_the_Quran_-_Google_Art_Project.jpg/960px-Osman_Hamdi_Bey_-_Kur%E2%80%99an_Tilaveti_%2C_Reciting_the_Quran_-_Google_Art_Project.jpg' },
  ist_reading: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Young_woman_reading_%281880%29%2C_by_Osman_Hamdi_Bey.jpg/1920px-Young_woman_reading_%281880%29%2C_by_Osman_Hamdi_Bey.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Young_woman_reading_%281880%29%2C_by_Osman_Hamdi_Bey.jpg/960px-Young_woman_reading_%281880%29%2C_by_Osman_Hamdi_Bey.jpg' },
  ist_uskudar: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Fausto_Zonaro_Istanbul_-_an_den_H%C3%A4ngen_von_%C3%9Csk%C3%BCdar.jpg/1920px-Fausto_Zonaro_Istanbul_-_an_den_H%C3%A4ngen_von_%C3%9Csk%C3%BCdar.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Fausto_Zonaro_Istanbul_-_an_den_H%C3%A4ngen_von_%C3%9Csk%C3%BCdar.jpg/960px-Fausto_Zonaro_Istanbul_-_an_den_H%C3%A4ngen_von_%C3%9Csk%C3%BCdar.jpg' },
  ist_string: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Fausto_Zonaro_-_Woman_Playing_a_String_Instrument_-_Google_Art_Project.jpg/1920px-Fausto_Zonaro_-_Woman_Playing_a_String_Instrument_-_Google_Art_Project.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Fausto_Zonaro_-_Woman_Playing_a_String_Instrument_-_Google_Art_Project.jpg/960px-Fausto_Zonaro_-_Woman_Playing_a_String_Instrument_-_Google_Art_Project.jpg' },
  // ── İstanbul Arkeoloji Müzeleri (eserler) ──
  ist_alexsarc: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Alexander_Sarcophagus%2C_Istanbul_Archaeological_Museums_2024_%281%29.jpg/1920px-Alexander_Sarcophagus%2C_Istanbul_Archaeological_Museums_2024_%281%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Alexander_Sarcophagus%2C_Istanbul_Archaeological_Museums_2024_%281%29.jpg/960px-Alexander_Sarcophagus%2C_Istanbul_Archaeological_Museums_2024_%281%29.jpg' },
  ist_mourning: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Sarcophagus_of_the_mourning_women_in_the_Istanbul_Archaeological_Museums.jpg/1920px-Sarcophagus_of_the_mourning_women_in_the_Istanbul_Archaeological_Museums.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Sarcophagus_of_the_mourning_women_in_the_Istanbul_Archaeological_Museums.jpg/960px-Sarcophagus_of_the_mourning_women_in_the_Istanbul_Archaeological_Museums.jpg' },
  ist_lycian: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Istanbul_Archaeological_Museum_Lycian_sarcophagus_Long_side_with_boar_hunt_031.jpg/1920px-Istanbul_Archaeological_Museum_Lycian_sarcophagus_Long_side_with_boar_hunt_031.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Istanbul_Archaeological_Museum_Lycian_sarcophagus_Long_side_with_boar_hunt_031.jpg/960px-Istanbul_Archaeological_Museum_Lycian_sarcophagus_Long_side_with_boar_hunt_031.jpg' },
  ist_alexbust: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Alexander_the_Great_portrait_Istanbul_Archaeological_Museum_-_inv._1138_T_02.jpg/1920px-Alexander_the_Great_portrait_Istanbul_Archaeological_Museum_-_inv._1138_T_02.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Alexander_the_Great_portrait_Istanbul_Archaeological_Museum_-_inv._1138_T_02.jpg/960px-Alexander_the_Great_portrait_Istanbul_Archaeological_Museum_-_inv._1138_T_02.jpg' },
  ist_sappho: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Sappho_portrait_Istanbul_Archaeological_Museum_-_inv._358_T_01.jpg/1920px-Sappho_portrait_Istanbul_Archaeological_Museum_-_inv._358_T_01.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Sappho_portrait_Istanbul_Archaeological_Museum_-_inv._358_T_01.jpg/960px-Sappho_portrait_Istanbul_Archaeological_Museum_-_inv._358_T_01.jpg' },
  // ── İzmir Arkeoloji Müzesi (eserler) ──
  izm_sculpt1: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Izmir_Archaeology_museum_Hellenistic_sculpture_2489.jpg/1920px-Izmir_Archaeology_museum_Hellenistic_sculpture_2489.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Izmir_Archaeology_museum_Hellenistic_sculpture_2489.jpg/960px-Izmir_Archaeology_museum_Hellenistic_sculpture_2489.jpg' },
  izm_sculpt2: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Izmir_Archaeology_museum_Hellenistic_sculpture_2487_1.jpg/1920px-Izmir_Archaeology_museum_Hellenistic_sculpture_2487_1.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Izmir_Archaeology_museum_Hellenistic_sculpture_2487_1.jpg/960px-Izmir_Archaeology_museum_Hellenistic_sculpture_2487_1.jpg' },
  izm_eksponat: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2848%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2848%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2848%29.jpg/960px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2848%29.jpg' },
  izm_athena: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Head_of_Athena_Izmir_Archaeology_Museum_2024.jpg/1920px-Head_of_Athena_Izmir_Archaeology_Museum_2024.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Head_of_Athena_Izmir_Archaeology_Museum_2024.jpg/960px-Head_of_Athena_Izmir_Archaeology_Museum_2024.jpg' },
  izm_herakles: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/%C4%B0zmir_Arkeoloji_M%C3%BCzesi_-_Herakles%27in_Ba%C5%9F%C4%B1.jpg/1920px-%C4%B0zmir_Arkeoloji_M%C3%BCzesi_-_Herakles%27in_Ba%C5%9F%C4%B1.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/%C4%B0zmir_Arkeoloji_M%C3%BCzesi_-_Herakles%27in_Ba%C5%9F%C4%B1.jpg/960px-%C4%B0zmir_Arkeoloji_M%C3%BCzesi_-_Herakles%27in_Ba%C5%9F%C4%B1.jpg' },
  izm_eks3: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%283%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%283%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%283%29.jpg/960px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%283%29.jpg' },
  izm_eks4: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%284%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%284%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%284%29.jpg/960px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%284%29.jpg' },
  izm_eks16: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2816%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2816%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2816%29.jpg/960px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2816%29.jpg' },
  izm_eks26: { full: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2826%29.jpg/1920px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2826%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2826%29.jpg/960px-%C4%B0zmir_arxeologiya_muzeyinin_eksponatlar%C4%B1_%2826%29.jpg' },
}

// Helper to keep item definitions terse: an art/photo entry sourced from the IMG map above.
const art = (id: string, key: keyof typeof IMG | string, title: string, artist: string, year: string,
  museum: string, medium: string, objPos: string, tag?: string, noWall?: boolean): ArtItem => ({
  kind: 'art', id, title, artist, year, museum, medium, objPos, tag, noWall,
  img: IMG[key].full, thumb: IMG[key].thumb,
})

// 3D walkable scans are reserved for the Sanat & Müzeler collection (a museum + its paintings).
// Everything else — and the whole Arkeoloji collection — is presented as 4K stills, which stay
// razor-sharp at any zoom (unlike a baked photogrammetry mesh).
const CATEGORIES: Cat[] = [
  {
    n: '01', slug: 'sanat', tr: 'Sanat & Müzeler', it: 'Arte & Musei',
    d: 'Galeriler, koleksiyonlar ve başyapıtların sessiz salonları — gezilebilir bir müze ve 4K tablolar.',
    img: '/x/rooms/sanat.jpg', objPos: '50% 30%',
    items: [
      { kind: '3d', id: 'picture-gallery', title: 'The Picture Gallery', scanId: '231fdb3e9e354c6faaa3c250f8c9988f',
        author: 'The Hallwyl Museum', kindLabel: 'Müze Galerisi', loc: 'Hallwyl Museum · Stockholm',
        note: 'Hollanda & Flaman Altın Çağı salonu', thumb: GALLERY_THUMB,
        geo: { lat: 59.3340, lng: 18.0745, zoom: 16 }, address: 'Hamngatan 4, Stockholm',
        placePhoto: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Hallwylska_palatset_September_2015_01.jpg/1280px-Hallwylska_palatset_September_2015_01.jpg' },
      art('meisje-met-de-parel', 'pearl_earring', 'Meisje met de parel', 'Johannes Vermeer', 'c. 1665', 'Mauritshuis · Den Haag', 'Olio su tela', '50% 30%'),
      art('la-gioconda', 'mona', 'La Gioconda', 'Leonardo da Vinci', 'c. 1503', 'Musée du Louvre · Paris', 'Olio su tavola', '50% 24%'),
      art('der-kuss', 'kiss', 'Der Kuss', 'Gustav Klimt', '1908', 'Belvedere · Wien', 'Olio e oro su tela', '50% 32%'),
      art('notte-stellata', 'starry', 'The Starry Night', 'Vincent van Gogh', '1889', 'MoMA · New York', 'Olio su tela', '50% 50%'),
      art('het-melkmeisje', 'milkmaid', 'Het melkmeisje', 'Johannes Vermeer', 'c. 1658', 'Rijksmuseum · Amsterdam', 'Olio su tela', '50% 38%'),
      art('de-nachtwacht', 'nightwatch', 'De Nachtwacht', 'Rembrandt van Rijn', '1642', 'Rijksmuseum · Amsterdam', 'Olio su tela', '50% 42%'),
    ],
  },
  {
    n: '02', slug: 'sarap', tr: 'Şarap Bağları', it: 'Vigneti',
    d: 'Tepelere yayılan asmalar, taş mahzenler ve hasat ışığı.',
    img: '/x/rooms/sarap.jpg', objPos: '50% 14%',
    items: [
      art('bacco', 'bacchus', 'Bacco', 'Caravaggio', 'c. 1596', 'Galleria degli Uffizi · Firenze', 'Olio su tela', '50% 30%'),
      art('vigne-rosse', 'redvineyard', 'Vigne rosse ad Arles', 'Vincent van Gogh', '1888', 'Puškin Müzesi · Moskova', 'Olio su tela', '50% 50%'),
      art('vendemmia', 'grapeharvest', 'Bağ Hasadı', 'Asma & Bağ', 'Çağdaş', 'Akdeniz', 'Fotoğraf', '50% 45%', 'Mekân'),
    ],
  },
  {
    n: '03', slug: 'sahil', tr: 'Sahil & Doğa', it: 'Costa & Natura',
    d: 'Kıyılar, koylar ve kesintisiz ufkun dingin genişliği.',
    img: '/x/rooms/sahil.jpg', objPos: '50% 50%',
    items: [
      art('la-nona-onda', 'ninthwave', 'La Nona Onda', 'Ivan Ajvazovskij', '1850', 'Museo di Stato Russo · S. Pietroburgo', 'Olio su tela', '50% 55%'),
      art('grande-onda', 'greatwave', 'Kanagawa-oki Nami Ura', 'Katsushika Hokusai', 'c. 1831', 'Metropolitan Museum · New York', 'Xilografia', '50% 50%'),
      art('arcobaleno', 'rainbow_aiv', 'Gökkuşağı', 'Ivan Ajvazovskij', '1873', 'Tretyakov Galerisi · Moskova', 'Olio su tela', '50% 50%'),
    ],
  },
  {
    n: '04', slug: 'sokak', tr: 'Tarihi Sokaklar', it: 'Strade Storiche',
    d: 'Taş döşeli geçitler, eski cepheler, zamanın patinası.',
    img: '/x/rooms/sokak.jpg', objPos: '50% 55%',
    items: [
      art('il-canal-grande', 'canalgrande', 'Il Canal Grande', 'Canaletto', 'c. 1722', "Ca' Rezzonico · Venezia", 'Olio su tela', '50% 55%'),
      art('piazza-san-marco', 'piazza', 'Piazza San Marco', 'Canaletto', 'c. 1730', 'National Gallery of Art · Washington', 'Olio su tela', '50% 55%'),
      art('firenze-centro', 'florence_street', 'Floransa · Tarihi Merkez', 'Toscana · İtalya', 'UNESCO', 'Firenze', 'Şehir fotoğrafı', '50% 50%', 'Mekân'),
      art('pompeii-via', 'pompeii_street', 'Pompeii · Antik Cadde', 'Roma İmparatorluğu', 'MÖ I. yy', 'Pompeii · İtalya', 'Arkeolojik mekân', '50% 45%', 'Antik Kent'),
    ],
  },
  {
    n: '05', slug: 'mekan', tr: 'Otantik Mekânlar', it: 'Luoghi Autentici',
    d: 'Kafeler, atölyeler, karakterini koruyan iç mekânlar.',
    img: '/x/rooms/mekan.jpg', objPos: '50% 38%',
    items: [
      art('cortile-delft', 'delft_courtyard', 'Cortile di una casa a Delft', 'Pieter de Hooch', '1658', 'National Gallery · London', 'Olio su tela', '50% 45%'),
      art('strandgade', 'hammershoi', "Strandgade'de Bir Oda", 'Vilhelm Hammershøi', '1901', 'SMK · København', 'Olio su tela', '50% 45%'),
      art('arte-della-pittura', 'art_of_painting', "L'Arte della Pittura", 'Johannes Vermeer', 'c. 1666', 'Kunsthistorisches Museum · Wien', 'Olio su tela', '50% 35%'),
    ],
  },
  {
    n: '06', slug: 'koleksiyon', tr: 'Koleksiyonlar', it: 'Collezioni',
    d: 'Temayla kürate edilmiş seçkiler, kabineler ve özel rotalar.',
    img: '/x/rooms/koleksiyon.jpg', objPos: '50% 45%',
    items: [
      art('galleria-arciduca', 'teniers_gallery', "Galleria dell'Arciduca", 'David Teniers il Giovane', 'c. 1651', 'Kunsthistorisches Museum · Wien', 'Olio su tela', '50% 50%'),
      art('roma-antica', 'panini_roma', 'Roma Antica', 'Giovanni Paolo Panini', '1757', 'Metropolitan Museum · New York', 'Olio su tela', '50% 50%'),
      art('wunderkammer', 'wunderkammer', 'Wunderkammer', 'Ferrante Imperato', '1599', 'Napoli', 'Gravür', '50% 45%', 'Kabine'),
    ],
  },
  {
    n: '07', slug: 'arkeoloji', tr: 'Arkeoloji & Antik', it: 'Archeologia & Antichità',
    d: "Toprağın altından gelen sessiz tanıklar — Anadolu'dan Mısır'a antik kentler, tapınaklar, sikkeler ve hazineler.",
    img: IMG.ephesus_celsus.thumb, objPos: '50% 42%',
    items: [
      art('pergamon-akropolis', 'pergamon_acropolis', 'Pergamon Akropolisi', 'Bergama · Anadolu', 'MÖ III. yy', 'İzmir · Türkiye', 'Antik kent', '50% 50%', 'Antik Kent'),
      art('pergamon-tiyatro', 'pergamon_theatre', 'Pergamon Tiyatrosu', 'Bergama · Anadolu', 'Helenistik dönem', 'İzmir · Türkiye', 'Antik tiyatro', '50% 50%', 'Antik Kent'),
      art('zeus-sunagi', 'pergamon_altar', 'Zeus Sunağı', 'Pergamon', 'MÖ II. yy', 'Pergamonmuseum · Berlin', 'Mermer sunak', '50% 50%', 'Eser'),
      art('asklepion', 'asklepion', 'Asklepion', 'Bergama · Anadolu', 'Antik dönem', 'İzmir · Türkiye', 'Şifa merkezi', '50% 50%', 'Antik Kent'),
      art('celsus-kutuphanesi', 'ephesus_celsus', 'Celsus Kütüphanesi', 'Efes · Anadolu', 'MS 117', 'İzmir · Türkiye', 'Antik kent', '50% 45%', 'Antik Kent'),
      art('afrodisias-tetrapylon', 'aphrodisias', 'Afrodisias · Tetrapylon', 'Aydın · Anadolu', 'MS II. yy', 'Aydın · Türkiye', 'Anıtsal kapı', '50% 50%', 'Antik Kent'),
      art('korint-migferi', 'corinthian_helmet', 'Korint Miğferi', 'Antik Yunan', 'MÖ V. yy', 'Ulusal Arkeoloji Müzesi · Atina', 'Bronz miğfer', '50% 45%', 'Eser'),
      art('atina-tetradrahmi', 'greek_coin', 'Atina Tetradrahmi', 'Antik Atina', 'MÖ 450–400', 'Agora Müzesi · Atina', 'Gümüş sikke', '50% 50%', 'Sikke'),
      art('neron-aureus', 'roman_coin', 'Neron Aureusu', 'Roma İmparatorluğu', 'MS I. yy', 'Roma', 'Altın sikke', '50% 50%', 'Sikke'),
      art('lidya-elektron', 'lydian_coin', 'Lidya Elektron Sikkesi', 'Lidya Krallığı', 'MÖ VI. yy', 'Sardis · Anadolu', 'Elektron sikke', '50% 50%', 'Sikke'),
      art('truva-ati', 'troy', 'Truva · Tahta At', 'Çanakkale · Anadolu', 'MÖ XIII. yy (efsane)', 'Çanakkale · Türkiye', 'Antik kent', '50% 50%', 'Antik Kent'),
      art('hattusa-aslanli-kapi', 'hattusa', 'Hattuşa · Aslanlı Kapı', 'Hitit İmparatorluğu', 'MÖ XIV. yy', 'Çorum · Türkiye', 'Anıtsal kapı', '50% 45%', 'Antik Kent'),
      art('aspendos-tiyatro', 'aspendos', 'Aspendos Tiyatrosu', 'Pamfilya · Anadolu', 'MS II. yy', 'Antalya · Türkiye', 'Antik tiyatro', '50% 50%', 'Antik Kent'),
      art('nemrut-apollon', 'nemrut', 'Nemrut · Apollon Başı', 'Kommagene Krallığı', 'MÖ I. yy', 'Adıyaman · Türkiye', 'Anıtsal heykel', '50% 45%', 'Eser'),
      art('karahantepe', 'karahantepe', 'Karahantepe · T-Dikilitaşlar', 'Neolitik · Taş Tepeler', 'MÖ ~9000', 'Şanlıurfa · Türkiye', 'Tören alanı', '50% 50%', 'Antik Kent'),
      art('side-apollon', 'side_apollo', 'Side · Apollon Tapınağı', 'Pamfilya · Anadolu', 'MS II. yy', 'Antalya · Türkiye', 'Antik tapınak', '50% 50%', 'Antik Kent'),
      art('parthenon-akropolis', 'parthenon', 'Parthenon · Akropolis', 'Antik Atina', 'MÖ V. yy', 'Atina · Yunanistan', 'Antik tapınak', '50% 45%', 'Antik Kent'),
      art('kolezyum', 'colosseum', 'Kolezyum', 'Roma İmparatorluğu', 'MS 80', 'Roma · İtalya', 'Amfitiyatro', '50% 50%', 'Antik Kent'),
      art('giza-sfenksi', 'sphinx_giza', 'Giza Büyük Sfenksi', 'Antik Mısır', 'MÖ ~2500', 'Giza · Mısır', 'Anıtsal heykel', '50% 45%', 'Eser'),
      art('petra-hazine', 'petra', 'Petra · El-Hazine', 'Nebati Krallığı', 'MÖ I. yy', 'Petra · Ürdün', 'Kaya mimarisi', '50% 50%', 'Antik Kent'),
      art('nefertiti-bustu', 'nefertiti', 'Nefertiti Büstü', 'Antik Mısır', 'MÖ ~1345', 'Neues Museum · Berlin', 'Boyalı kireçtaşı', '50% 40%', 'Eser'),
      art('tutankhamun-maskesi', 'tutankhamun', 'Tutankhamun Maskesi', 'Antik Mısır', 'MÖ ~1323', 'Mısır Müzesi · Kahire', 'Altın ölüm maskesi', '50% 40%', 'Eser'),
    ],
  },
  {
    n: '08', slug: 'arkas', tr: 'Arkas Sanat', it: 'Collezione Arkas',
    d: "Lucien Arkas'ın koleksiyonundan bir seçki — Arkas Sanat Urla. Empresyonizmden heykele, gezilebilir bir salonda buluşan eserler.",
    img: IMG.arkas_gerome.thumb, objPos: '50% 40%',
    items: [
      { kind: '3d', id: 'arkas-salonu', title: 'Arkas Salonu', scanId: 'arkas',
        author: 'Arkas Koleksiyonu', kindLabel: 'Gezilebilir Salon', loc: 'Arkas Sanat · İzmir',
        note: 'Koleksiyondan tablolar — duvarlarda', thumb: IMG.arkas_gerome.thumb,
        geo: { lat: 38.4287, lng: 27.1389, zoom: 16 }, address: 'Cumhuriyet Bulvarı, Konak, İzmir',
        placePhoto: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Izmir_Akdeniz_Arkas_Sanat_Merkezi_6338.jpg/1280px-Izmir_Akdeniz_Arkas_Sanat_Merkezi_6338.jpg' },
      art('arkas-gerome-alkibiades', 'arkas_gerome', "Sokrates'in Alkibiades'i Arayışı", 'Jean-Léon Gérôme', '1861', 'Arkas Koleksiyonu · Urla', 'Tuval üzerine yağlıboya', '50% 40%', 'Tablo'),
      art('arkas-godward-kalp-genc', 'arkas_godward', 'Kalp Gençken', 'John William Godward', '1902', 'Arkas Koleksiyonu · Urla', 'Tuval üzerine yağlıboya', '50% 45%', 'Tablo'),
      art('arkas-sisley-mammes', 'arkas_sisley', 'İlkbaharda Saint-Mammès Tepeleri', 'Alfred Sisley', '1880', 'Arkas Koleksiyonu · Urla', 'Tuval üzerine yağlıboya', '50% 45%', 'Tablo'),
      art('arkas-picabia-balik-avi', 'arkas_picabia', 'Balık Avı Dönüşü, Martigues', 'Francis Picabia', '1903', 'Arkas Koleksiyonu · Urla', 'Tuval üzerine yağlıboya', '50% 45%', 'Tablo'),
      art('arkas-rodin-opucuk', 'arkas_rodinkiss', 'Öpücük', 'Auguste Rodin', 'mod 1880–87', 'Arkas Koleksiyonu · Urla', 'Patine bronz', '50% 40%', 'Heykel', true),
      art('arkas-rodin-bronz-cagi', 'arkas_agebronze', 'Bronz Çağı', 'Auguste Rodin', '1875–76', 'Arkas Koleksiyonu · Urla', 'Patine bronz', '50% 35%', 'Heykel', true),
      art('arkas-claudel-vals', 'arkas_valse', 'Vals', 'Camille Claudel', '1889–1905', 'Arkas Koleksiyonu · Urla', 'Patine bronz', '50% 35%', 'Heykel', true),
      art('arkas-claudel-paul-bust', 'arkas_paulbust', 'Paul Claudel Büstü', 'Camille Claudel', '1886', 'Arkas Koleksiyonu · Urla', 'Patine bronz', '50% 40%', 'Heykel', true),
      art('arkas-maillol-tors', 'arkas_maillol', 'Tors', 'Aristide Maillol', '1930', 'Arkas Koleksiyonu · Urla', 'Bronz döküm', '50% 45%', 'Heykel', true),
    ],
  },
  {
    n: '09', slug: 'istanbul-pera', tr: 'İstanbul · Oryantalizm', it: 'Istanbul · Orientalismo',
    d: "Pera'nın ışığında Osman Hamdi Bey ve Fausto Zonaro — geç Osmanlı'nın resme bakışı. Gezilebilir bir salonda buluşan tablolar.",
    img: IMG.ist_tortoise.thumb, objPos: '50% 35%',
    items: [
      { kind: '3d', id: 'pera-salonu', title: 'Pera Salonu', scanId: 'ist-pera',
        author: 'Osman Hamdi Bey & Fausto Zonaro', kindLabel: 'Gezilebilir Salon', loc: 'Pera · İstanbul',
        note: 'Oryantalist tablolar — duvarlarda', thumb: IMG.ist_tortoise.thumb,
        geo: { lat: 41.0312, lng: 28.9748, zoom: 16 }, address: 'Meşrutiyet Cd., Tepebaşı, Beyoğlu',
        placePhoto: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Istanbul_Beyoglu_Pera_museum.jpg/1280px-Istanbul_Beyoglu_Pera_museum.jpg' },
      art('ist-kaplumbaga-terbiyecisi', 'ist_tortoise', 'Kaplumbağa Terbiyecisi', 'Osman Hamdi Bey', '1906', 'Pera Müzesi · İstanbul', 'Tuval üzerine yağlıboya', '50% 35%', 'Tablo'),
      art('ist-iki-muzisyen-kiz', 'ist_musicians', 'İki Müzisyen Kız', 'Osman Hamdi Bey', '1880', 'Pera Müzesi · İstanbul', 'Tuval üzerine yağlıboya', '50% 35%', 'Tablo'),
      art('ist-hali-tuccari', 'ist_carpet', 'Sokakta Halı Tüccarı', 'Osman Hamdi Bey', '1888', 'Alte Nationalgalerie · Berlin', 'Tuval üzerine yağlıboya', '50% 40%', 'Tablo'),
      art('ist-arzuhalci', 'ist_scribe', 'Arzuhalci', 'Osman Hamdi Bey', '1910', 'Özel koleksiyon', 'Tuval üzerine yağlıboya', '50% 40%', 'Tablo'),
      art('ist-kuran-tilaveti', 'ist_quran', 'Kur’an Tilâveti', 'Osman Hamdi Bey', '1910', 'Özel koleksiyon', 'Tuval üzerine yağlıboya', '50% 40%', 'Tablo'),
      art('ist-kitap-okuyan-kiz', 'ist_reading', 'Kitap Okuyan Genç Kız', 'Osman Hamdi Bey', '1880', 'Özel koleksiyon', 'Tuval üzerine yağlıboya', '50% 35%', 'Tablo'),
      art('ist-uskudar-yamaclari', 'ist_uskudar', 'Üsküdar Yamaçları', 'Fausto Zonaro', 'c. 1900', 'İstanbul', 'Tuval üzerine yağlıboya', '50% 45%', 'Tablo'),
      art('ist-saz-calan-kadin', 'ist_string', 'Saz Çalan Kadın', 'Fausto Zonaro', 'c. 1900', 'İstanbul', 'Tuval üzerine yağlıboya', '50% 35%', 'Tablo'),
    ],
  },
  {
    n: '10', slug: 'istanbul-arkeoloji', tr: 'İstanbul Arkeoloji Müzeleri', it: 'Musei Archeologici di Istanbul',
    d: "Sultanahmet'in sırtında, Sidon kral nekropolünden gelen lahitler ve antik portreler. Gezilebilir bir salonda taşın belleği.",
    img: IMG.ist_alexsarc.thumb, objPos: '50% 45%',
    items: [
      { kind: '3d', id: 'ist-arkeoloji-salonu', title: 'Lahitler Salonu', scanId: 'ist-ark',
        author: 'İstanbul Arkeoloji Müzeleri', kindLabel: 'Gezilebilir Salon', loc: 'Sultanahmet · İstanbul',
        note: 'Lahitler ve portreler — duvarlarda', thumb: IMG.ist_alexsarc.thumb,
        geo: { lat: 41.0115, lng: 28.9813, zoom: 16 }, address: 'Osman Hamdi Bey Yokuşu, Gülhane, Fatih',
        placePhoto: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Istanbul_Archaeology_Museums_%2816034419320%29.jpg/1280px-Istanbul_Archaeology_Museums_%2816034419320%29.jpg' },
      art('ist-iskender-lahiti', 'ist_alexsarc', 'İskender Lahiti', 'Sidon Kral Nekropolü', 'MÖ ~325', 'İstanbul Arkeoloji Müzeleri', 'Pentelikon mermeri', '50% 45%', 'Eser'),
      art('ist-aglayan-kadinlar-lahiti', 'ist_mourning', 'Ağlayan Kadınlar Lahiti', 'Sidon Kral Nekropolü', 'MÖ IV. yy', 'İstanbul Arkeoloji Müzeleri', 'Mermer lahit', '50% 45%', 'Eser'),
      art('ist-likya-lahiti', 'ist_lycian', 'Likya Lahiti', 'Sidon Kral Nekropolü', 'MÖ V. yy', 'İstanbul Arkeoloji Müzeleri', 'Mermer lahit', '50% 45%', 'Eser'),
      art('ist-iskender-portresi', 'ist_alexbust', 'Büyük İskender Portresi', 'Helenistik dönem', 'MÖ III–II. yy', 'İstanbul Arkeoloji Müzeleri', 'Mermer baş', '50% 35%', 'Eser'),
      art('ist-sappho-portresi', 'ist_sappho', 'Sappho Portresi', 'Roma dönemi kopyası', 'MS I–II. yy', 'İstanbul Arkeoloji Müzeleri', 'Mermer baş', '50% 35%', 'Eser'),
    ],
  },
  {
    n: '11', slug: 'izmir-arkeoloji', tr: 'İzmir Arkeoloji Müzesi', it: 'Museo Archeologico di Smirne',
    d: "Bahribaba Parkı'nın tepesinde, Smyrna ve İonia'nın mermerleri. Helenistik heykelin dinginliği, gezilebilir bir salonda.",
    img: IMG.izm_sculpt1.thumb, objPos: '50% 35%',
    items: [
      { kind: '3d', id: 'izm-arkeoloji-salonu', title: 'Heykel Salonu', scanId: 'izm-ark',
        author: 'İzmir Arkeoloji Müzesi', kindLabel: 'Gezilebilir Salon', loc: 'Konak · İzmir',
        note: 'Helenistik heykeller — duvarlarda', thumb: IMG.izm_sculpt1.thumb,
        geo: { lat: 38.4109, lng: 27.1369, zoom: 16 }, address: 'Bahribaba Parkı, Konak, İzmir',
        placePhoto: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Museo_archeologico_di_izmir%2C_veduta.JPG/1280px-Museo_archeologico_di_izmir%2C_veduta.JPG' },
      art('izm-athena-basi', 'izm_athena', 'Athena Başı', 'Smyrna · İonia', 'Helenistik dönem', 'İzmir Arkeoloji Müzesi', 'Mermer baş', '50% 30%', 'Eser'),
      art('izm-herakles-basi', 'izm_herakles', 'Herakles’in Başı', 'Anadolu · İonia', 'Roma dönemi', 'İzmir Arkeoloji Müzesi', 'Mermer baş', '50% 30%', 'Eser'),
      art('izm-helenistik-heykel-1', 'izm_sculpt1', 'Helenistik Heykel', 'İonia · Anadolu', 'Helenistik dönem', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
      art('izm-helenistik-heykel-2', 'izm_sculpt2', 'Helenistik Heykel', 'İonia · Anadolu', 'Helenistik dönem', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
      art('izm-mermer-heykel-3', 'izm_eks3', 'Mermer Heykel', 'Smyrna · Anadolu', 'Roma dönemi', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
      art('izm-mermer-heykel-4', 'izm_eks4', 'Toga’lı Figür', 'Smyrna · Anadolu', 'Roma dönemi', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
      art('izm-antik-eser-16', 'izm_eks16', 'Mermer Figür', 'Smyrna · Anadolu', 'Antik dönem', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
      art('izm-antik-eser-26', 'izm_eks26', 'Mermer Figür', 'Smyrna · Anadolu', 'Antik dönem', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
      art('izm-eksponat', 'izm_eksponat', 'Antik Portre', 'Smyrna · Anadolu', 'Antik dönem', 'İzmir Arkeoloji Müzesi', 'Mermer heykel', '50% 35%', 'Eser'),
    ],
  },
]

// Short museum-placard narratives, keyed by item id. Shown on the opened-artwork page
// when the visitor scrolls below the 4K image. (Original descriptive text.)
const STORIES: Record<string, string> = {
  'meisje-met-de-parel': "Vermeer'in bir 'tronie'si — bir portre değil, bir an. Karanlık bir zeminden dönen genç kadın, dudakları aralık, sanki az önce adıyla seslenilmiş gibi bize bakar. İnci küpe yalnızca birkaç fırça dokunuşudur; ışığı tutan o leke, üç buçuk yüzyıldır izleyenin gözünü arar.",
  'la-gioconda': "Leonardo'nun yıllarca yanında taşıdığı, asla 'bitti' demediği yüz. 'Sfumato' tekniğiyle eriyen sınırlar, ağzın kenarındaki belirsizliği bir muammaya çevirir. Arkasındaki düşsel manzara ile figürün dinginliği, Rönesans'ın insanı evrenin merkezine koyan bakışını özetler.",
  'der-kuss': "Klimt'in 'Altın Dönem'inin doruğu. Gerçek altın varakla kaplı bir uçurum kenarında diz çökmüş iki figür, desenlerin içinde neredeyse erir — erkeğin dik dörtgenleri, kadının yumuşak halkaları. Aşk burada bir kucaklaşma değil, altından bir kozadır.",
  'notte-stellata': "Saint-Rémy'deki akıl hastanesinin penceresinden, şafaktan önceki gökyüzü. Van Gogh gördüğünü değil, hissettiğini resmetti: burgaçlanan yıldızlar, alev gibi yükselen selvi, uyuyan köyün sükûneti. Hareket ile durgunluğun aynı tuvalde çarpıştığı bir gece.",
  'het-melkmeisje': "Sıradan bir mutfakta, sıradan bir iş — süt dökmek. Ama Vermeer ışığı öyle tutar ki, ekmek kabuğundaki her kırıntı, duvardaki her çivi deliği kutsallaşır. Sessiz emeğin anıtı.",
  'de-nachtwacht': "Aslında bir gece sahnesi değil — yüzyılların isi tuvali karartmıştı. Rembrandt donuk grup portrelerini bir harekete, bir sahneye çevirdi: ileri atılan kaptan, davranan tüfekler, ışıkla seçilen kız. Hollanda'nın özgüveninin destanı.",
  'bacco': "Caravaggio'nun şarap tanrısı, bir tanrıdan çok hovarda bir gençtir — kirli tırnaklar, hafif sarhoş bir bakış. Uzattığı kadeh izleyiciye bir davet; çürümeye başlayan meyveler ise her şeyin geçiciliğine sessiz bir hatırlatma.",
  'vigne-rosse': "Van Gogh'un sağlığında satıldığı bilinen tek tablosu. Arles yakınlarında batan güneşin altında bağ işçileri kıpkızıl bir hasada gömülür. Toprak, gök ve emek tek bir ateş renginde birleşir.",
  'vendemmia': "Akdeniz'in asma sıralarında hasat zamanı — salkımların ağırlığı, ellerin telaşı, güneşin bağ üzerindeki son sıcaklığı. Yüzyıllardır değişmeyen bir ritüelin çağdaş bir karesi.",
  'la-nona-onda': "Denizcilerin inancına göre dalgaların en yıkıcısı dokuzuncusudur. Fırtınadan sağ çıkan birkaç kişi kırık bir direğe tutunmuş, şafağın sıcak ışığına doğru bakar. Ajvazovskij umudu ve dehşeti aynı suyun içine resmeder.",
  'grande-onda': "Pençe gibi kıvrılan dev dalganın altında, uzakta Fuji Dağı küçücük kalır. Hokusai'nin tahta baskısı, doğanın gücü karşısında insanın kırılganlığını üç kayıkla anlatır — dünyanın en çok çoğaltılan imgelerinden biri.",
  'arcobaleno': "Batan bir geminin son anı, ama gökyüzünde solgun bir gökkuşağı. Ajvazovskij burada fırtınanın rengini düşürür; kurtuluş, fırçanın incelttiği bir ışık huzmesinde gizlidir.",
  'il-canal-grande': "Canaletto'nun 'veduta'sı bir kartpostal değil, neredeyse bir mühendislik çizimidir — ışığın, suyun ve mimarinin matematiksel kesinliği. 18. yüzyıl Venedik'i, camera obscura'nın yardımıyla dondurulmuş.",
  'piazza-san-marco': "Avrupa'nın 'salonu' sayılan meydan, Canaletto'nun perspektifinde bütün ihtişamıyla açılır. Bazilikanın mozaikleri, gölgelerin uzunluğu, gezinen figürler — Grand Tour'a çıkan soyluların evlerine götürdüğü Venedik hatırası.",
  'firenze-centro': "Rönesans'ın doğduğu sokaklar — kubbenin gölgesi, taş cepheler, daracık geçitler. Floransa'nın tarihi merkezi bütünüyle UNESCO Dünya Mirası; her köşe başında bir sanat tarihi sayfası.",
  'pompeii-via': "MS 79'da Vezüv'ün külü altında donan kent. Tekerlek izleri hâlâ taş döşemede, çeşmeler hâlâ köşe başında. Pompeii, antik bir günün tam ortasında durdurulmuş bir saattir.",
  'cortile-delft': "De Hooch'un uzmanlığı: iç içe geçen mekânlar ve onları bağlayan ışık. Bir avlu, bir kemer, arkada bir koridor — sıradan bir Hollanda evi düzenin ve huzurun sahnesine dönüşür.",
  'strandgade': "Hammershøi'nin Kopenhag dairesi: solmuş gri tonlar, boş duvarlar, sırtı dönük bir figür. Hiçbir şeyin olmadığı bu odada sessizliğin kendisi konudur — kuzeyin melankolik dinginliği.",
  'arte-della-pittura': "Vermeer'in hiç satmadığı, atölyesinde tuttuğu tablo. Bir ressam, tarih perisi Clio'yu resmederken arkadan görünür; perde aralanır ve resmin nasıl 'yapıldığına' tanık oluruz. Sanatın kendine bakışı.",
  'galleria-arciduca': "Arşidük Leopold Wilhelm'in koleksiyonu, duvardan duvara asılı yüzlerce tabloyla. Teniers bu 'galeri resmi'yle bir envanteri sanata çevirir — resmin içinde resimler, bakışın içinde bakış.",
  'roma-antica': "Panini'nin hayalî galerisi: Roma'nın bütün antik anıtları tek bir kemerli salonda toplanmış. Gerçek değil, bir özlem — Grand Tour gezgininin zihninde taşıdığı ideal Roma.",
  'wunderkammer': "Modern müzenin atası: 'merak odası'. Tavana asılı bir timsah, raflarda mercanlar, fosiller, kitaplar — dünyanın bütün tuhaflıklarını tek bir odaya sığdırma hayali. 1599'dan bir bilim ve şaşkınlık arşivi.",
  'pergamon-akropolis': "Bergama'nın dik yamacına kurulu kent, Helenistik dünyanın en görkemli başkentlerinden. Tapınaklar, saray ve dünyanın en dik antik tiyatrosu, ovaya bakan bir taç gibi yükselir.",
  'pergamon-tiyatro': "Yaklaşık 10.000 kişilik, dünyanın en dik açılı antik tiyatrolarından. Yamaca öyle yaslanmış ki, en üst sıradaki seyirci sahneyle birlikte bütün ovayı görür — mimari ile manzaranın birleştiği yer.",
  'zeus-sunagi': "Tanrılarla devlerin savaşını anlatan dev friziyle Helenistik kabartmanın zirvesi. Bugün Berlin'deki Pergamonmuseum'da yeniden kurulan sunak, taşa kazınmış bir hareket ve acı destanıdır.",
  'asklepion': "Antik dünyanın sağlık merkezi — şifa tanrısı Asklepios'a adanmış. Hastalar kutsal tüneller, tiyatro ve uyku tapınaklarıyla iyileştirilirdi; tıbbın ve inancın iç içe geçtiği bir mekân. Ünlü hekim Galen burada yetişti.",
  'celsus-kutuphanesi': "Efes'in simgesi: bir Roma valisinin babası için yaptırdığı, hem kütüphane hem anıt mezar. İki katlı cephesi Bilgelik, Erdem, Düşünce ve Bilgi heykelleriyle bezeli; antik çağın en büyük üçüncü kütüphanesi.",
  'afrodisias-tetrapylon': "Aşk tanrıçası Afrodit'e adanmış kentin anıtsal kapısı. Dört yöne açılan sütunlu giriş, kutsal alana geçişi işaretler. Afrodisias aynı zamanda ünlü heykeltıraşlık okuluyla anılır — mermer burada cana gelir.",
  'korint-migferi': "Antik Yunan'ın en tanınan miğfer biçimi — tek parça bronzdan dövülmüş, yalnızca gözler ve ağız için açıklık bırakan. Savaşçıyı hem korur hem de onu yüzsüz, ölümsüz bir savaş maskesine çevirir.",
  'atina-tetradrahmi': "Antik dünyanın 'doları'. Bir yüzünde Athena, diğerinde onun baykuşu ve zeytin dalı. Gümüşten basılan bu sikke, Atina'nın deniz gücünü ve zenginliğini Akdeniz'in dört bir yanına taşıdı.",
  'neron-aureus': "İmparator Neron'un altın sikkesi. Bir yüzünde imparatorun profili — propagandanın en saf hali. Her el değiştirişte iktidarın yüzünü hatırlatan minik bir anıt.",
  'lidya-elektron': "Tarihin ilk sikkeleri. Lidya Krallığı, altın-gümüş alaşımı elektrondan bastığı bu damgalı parçalarla parayı icat etti. Üzerindeki aslan başı kralın garantisidir — ticaretin doğduğu an.",
  'truva-ati': "Homeros'un destanlaştırdığı kentin kapısında, tahtadan dev bir at. On yıllık kuşatmayı bir hileyle bitiren efsane burada doğdu. Truva yalnızca bir mit değil — Çanakkale toprağında üst üste binmiş dokuz kentin gerçek katmanları.",
  'hattusa-aslanli-kapi': "Hitit İmparatorluğu'nun başkenti Hattuşa'nın surlarını bekleyen iki aslan. Taşa oyulmuş bu bekçiler, üç bin yıldır kente girenleri karşılar — Anadolu'nun ilk büyük devletinin sessiz nöbetçileri.",
  'aspendos-tiyatro': "Antik dünyadan günümüze en sağlam ulaşan Roma tiyatrosu. Akustiği öyle kusursuz ki, sahnede fısıldanan söz en üst sıraya ulaşır. İki bin yıl sonra hâlâ konserlere ev sahipliği yapan bir mucize.",
  'nemrut-apollon': "Kommagene kralı I. Antiochos'un dağın zirvesine kurdurduğu tanrılar meclisi. Devasa taş başlar, zamanla gövdelerinden ayrılıp toprağa savruldu. 2150 metrede, gün doğumunu bekleyen sessiz devler.",
  'karahantepe': "Göbeklitepe'nin kardeşi — insanlık tarihini yeniden yazan Taş Tepeler'den. Henüz tarım ve yerleşik hayat yokken dikilen T biçimli anıtsal sütunlar, on bir bin yıl önce inancın mimariden önce geldiğini fısıldar.",
  'side-apollon': "Akdeniz'in kıyısında, dalgaların hemen yanında yükselen Apollon Tapınağı. Gün batımında ayakta kalan sütunları altın bir ışıkla yanar — antik Side'nin denize uzanan son selamı.",
  'parthenon-akropolis': "Batı mimarisinin ölçüsü. Atina Akropolisi'nin tepesinde, tanrıça Athena'ya adanmış bu tapınak, kusursuz orantılarıyla bir matematik şiiri gibidir. Demokrasinin doğduğu kentin mermerden tacı.",
  'kolezyum': "Roma'nın gücünün taştan ifadesi. Elli bin seyirciyi ağırlayan bu amfitiyatroda gladyatörler dövüştü, imparatorlar halkı eğlendirdi. İki bin yıl sonra hâlâ bir imparatorluğun ölçeğini hatırlatan dev bir kabuk.",
  'giza-sfenksi': "Aslan gövdeli, insan başlı dev bekçi. Tek bir kaya kütlesinden oyulan Sfenks, dört bin beş yüz yıldır piramitlerin önünde gündoğumuna bakar. Kimin yüzünü taşıdığı hâlâ bir bilmece.",
  'petra-hazine': "Çölün içinde, dar bir kanyonun sonunda aniden beliren pembe kaya cephe. Nebatiler bu tapınağı doğrudan kayaya oydu — bir kenti taşın içine gizlemenin görkemi. El-Hazine, çölün kalbindeki bir sır.",
  'nefertiti-bustu': "Antik Mısır'ın en tanınan yüzü. Üç bin üç yüz yıl önce yontulan bu büst, kraliçe Nefertiti'nin kusursuz hatlarını boyalı kireçtaşında dondurur. Tek gözü tamamlanmamış olsa da, güzelliğin değişmez ölçüsü sayılır.",
  'tutankhamun-maskesi': "Genç firavunun yüzünü kaplayan saf altın maske. 1922'de neredeyse bozulmadan bulunan mezarından çıkan bu maske, lapis lazuli ve değerli taşlarla bezeli — ölümsüzlüğe bakan bir çocuk kralın altın yüzü.",
  // ── Arkas Koleksiyonu ──
  'arkas-gerome-alkibiades': "Akademik resmin ustası Gérôme'dan bir antik sahne: Sokrates, genç Alkibiades'i Aspasia'nın evindeki eğlenceden alıp götürmeye gelir. Işık, kumaş ve mermerin kusursuz işçiliğiyle felsefe ile haz arasındaki gerilim donar.",
  'arkas-godward-kalp-genc': "Neo-klasik İngiliz resminin son temsilcilerinden Godward'ın imzası: mermer bir terasta, klasik kıyafetler içinde uzanan bir genç kadın. Kaplan postu, çiçek ve denizin maviliği — Antik çağa duyulan zarif bir özlem.",
  'arkas-sisley-mammes': "Empresyonizmin sessiz ustası Sisley, Seine kıyısındaki Saint-Mammès tepelerini ilkbahar ışığında yakalar. Gökyüzü ve toprak, kısa fırça vuruşlarıyla titreşen bir ışık dokusuna dönüşür — manzaranın değil, anın resmi.",
  'arkas-picabia-balik-avi': "Picabia'nın erken, henüz empresyonist döneminden bir Akdeniz sahnesi: Martigues'te balık avından dönüş. Sanatçının ilerde Dada'nın öncülerinden olacağını düşününce, bu dingin liman manzarası bir başlangıcın sessizliğini taşır.",
  'arkas-rodin-opucuk': "Modern heykelin miladı. Birbirine sarılan iki bedenin mermerden/bronzdan doğan tutkusu — Dante'nin Cehennem'indeki Paolo ile Francesca'dan ilham alır. Rodin, taşa nefesi ve arzuyu kazıdı.",
  'arkas-rodin-bronz-cagi': "Rodin'i üne kavuşturan ilk büyük yapıt. Uyanan bir genç adamın bedeni o kadar canlıydı ki, sanatçı 'gerçek bir insandan kalıp aldı' diye suçlandı. Aslında bu, heykelin yeniden hayata dönüşüydü.",
  'arkas-claudel-vals': "Camille Claudel'in en lirik eseri: dansın dönüşünde birbirine kapılmış iki figür. Hareketin, dengenin ve tutkunun bronza dökülmüş hali — Rodin'in gölgesinden çıkıp kendi dehasını ilan eden bir yapıt.",
  'arkas-claudel-paul-bust': "Heykeltıraşın, kardeşi şair Paul Claudel'i genç yaşında betimlediği büst. Bir aile bağının ötesinde, iki yaratıcı ruhun birbirine bakışı — Camille'in keskin gözlem gücünün erken bir kanıtı.",
  'arkas-maillol-tors': "Maillol, Rodin'in dramatik hareketine karşı sükûneti seçti. Baş ve kollardan arındırılmış bu kadın torsosu, antik heykelin dinginliğini modern bir sadelikle birleştirir — biçimin saf, dingin müziği.",
  // ── İstanbul · Pera & Oryantalizm ──
  'ist-kaplumbaga-terbiyecisi': "Osman Hamdi Bey'in en tanınan tablosu. Sırtı dönük, ney'iyle kaplumbağaları 'eğitmeye' çalışan derviş kılıklı yaşlı adam — değişime direnen bir toplumun ağır, sabırlı bir hicvi. Mekânın çinileri ve ışığı, bir minyatürün titizliğiyle işlenmiş.",
  'ist-iki-muzisyen-kiz': "Bir iç mekânda saz ve tef çalan iki genç kadın. Osman Hamdi Bey, Batılı oryantalistlerin hayalî harem sahnelerine karşılık, mimari ve kostümü belge titizliğiyle resmeder — egzotizm değil, gözlem.",
  'ist-hali-tuccari': "Bir cami avlusunda halıların serildiği, incelendiği an. Yere yayılan desenler, taşın dokusu ve figürlerin duruşu — Osman Hamdi Bey'in arkeolog gözünün resme taşıdığı belgesel kesinlik.",
  'ist-arzuhalci': "Okuma yazma bilmeyenler için dilekçe yazan arzuhalci, bir cami duvarının dibinde. Kâğıt, kalem ve bekleyişin sessizliği — geç Osmanlı sokağının gündelik bir sahnesi, anıtsal bir dinginlikle kurulmuş.",
  'ist-kuran-tilaveti': "Kur'an okuyan bir figürün önünde açılan kitap, rahle ve duvar çinilerinin ışığı. Osman Hamdi Bey burada da mimari detayı kutsal bir sahneye çevirir; bilgi ve inanç, ışığın düştüğü sayfada buluşur.",
  'ist-kitap-okuyan-kiz': "Okumaya dalmış genç bir kadın — elinde kitap, etrafında sessizlik. Osman Hamdi Bey, kadını bir 'manzara' değil, düşünen bir özne olarak resmeder; dönemine göre cesur, modern bir bakış.",
  'ist-uskudar-yamaclari': "Saray ressamı Fausto Zonaro'nun İstanbul'u: Üsküdar'ın yamaçlarına vuran ışık, evler ve Boğaz'ın serinliği. İtalyan empresyonizminin fırçası, şehre bir yerlinin sıcaklığıyla bakar.",
  'ist-saz-calan-kadin': "Zonaro'nun bir iç mekân sahnesi: saz çalan bir kadın, kumaşların ve ışığın yumuşaklığında. Müziğin sessiz anı, İtalyan ustanın İstanbul yıllarında yakaladığı mahrem bir kare.",
  // ── İstanbul Arkeoloji Müzeleri ──
  'ist-iskender-lahiti': "Aslında İskender'in değil — onu betimleyen kabartmalarıyla ünlü bir kral lahiti. Sidon nekropolünden çıkan bu Pentelikon mermeri, av ve savaş sahneleriyle bezeli; boyasının izleri hâlâ okunur. Müzenin kurucusu Osman Hamdi Bey'in 1887 kazısının başyapıtı.",
  'ist-aglayan-kadinlar-lahiti': "Sütunlu bir tapınak biçiminde yontulmuş lahit; her kemerin altında yas tutan bir kadın figürü. Sidon kralı için yapılan bu mermer, ölümün karşısındaki kederi on sekiz ayrı duruşta dondurur.",
  'ist-likya-lahiti': "Likya tipi sivri, teknevari kapağıyla anıtsal bir lahit. Yan yüzünde domuz avı, kısa yüzünde aslan ve grifon mücadeleleri — Sidon nekropolünün Anadolu'ya bakan yüzü.",
  'ist-iskender-portresi': "Helenistik dünyanın idealleştirilmiş genç hükümdarı: hafifçe yana dönmüş baş, dağınık saçlar, uzaklara bakan gözler. Bergama'da bulunan bu mermer baş, İskender ikonografisinin en güçlü örneklerinden.",
  'ist-sappho-portresi': "Antik çağın en büyük kadın şairi Sappho'nun Roma dönemi kopyası. Lesbos'lu şairin yüzü, yüzyıllar boyunca idealleştirilerek kopyalandı; bu mermer baş, kayıp bir Helenistik özgünün yankısıdır.",
  // ── İzmir Arkeoloji Müzesi ──
  'izm-helenistik-heykel-1': "Smyrna ve çevresinin Helenistik atölyelerinden bir mermer figür. Drapenin akışı, bedenin dengesi — İonia heykeltıraşlığının inceliği, denizden gelen ışığın altında.",
  'izm-helenistik-heykel-2': "İzmir körfezinin antik kentlerinden gelen bir başka Helenistik heykel. Mermerin yumuşatılmış yüzeyi, kumaşın gerçekçiliği — figürü taştan çok bedene yaklaştıran usta işçilik.",
  'izm-eksponat': "Antik Smyrna'nın mirasından bir mermer portre. Yüz hatlarının dinginliği ve oranların ölçüsü, Anadolu'nun Ege'ye açılan yüzündeki klasik geleneği taşır.",
  'izm-athena-basi': "Şehrin koruyucu tanrıçası Athena'nın mermer başı. Miğferin altından bakan dingin yüz, Helenistik Smyrna'nın tanrıçaya duyduğu saygıyı bugüne taşır — kentin kimliğiyle özdeşleşmiş bir imge.",
  'izm-herakles-basi': "Yarı-tanrı kahraman Herakles'in Roma dönemi mermer başı. Gür sakalı ve yorgun, güçlü bakışıyla figür, Anadolu kentlerinde yaygın olan kahraman kültünün izlerini taşır.",
  'izm-mermer-heykel-3': "Smyrna'nın Roma dönemi atölyelerinden bir mermer heykel. Bedenin duruşu ve kumaşın oyulmuş kıvrımları, kentin imparatorluk çağındaki refahını ve sanatsal olgunluğunu yansıtır.",
  'izm-mermer-heykel-4': "Toga'ya bürünmüş bir figür — Roma yurttaşlığının ve kamusal saygınlığın taştaki karşılığı. Kıvrımların ağırlığı ve dökümü, heykeltıraşın kumaşı mermerde canlandırma ustalığını gösterir.",
  'izm-antik-eser-16': "İzmir körfezinin antik kentlerinden gelen bir mermer figür. Aşınmış yüzeyinde bile oranların ölçüsü okunur; Ege kıyısının yüzyıllar süren heykel geleneğinden bir parça.",
  'izm-antik-eser-26': "Smyrna ve çevresinin antik mirasından bir başka mermer figür. Zamanın yumuşattığı hatlar, eserin bir zamanlar bir tapınağı ya da kamusal alanı süslediğini düşündürür.",
}

type TransType = 'door' | 'corridor'
type Theme = 'dark' | 'light'
// [coverMs, holdMs, revealMs] per transition — kept in sync with the CSS keyframe durations below.
// holdMs keeps the closed cover on screen so its detail (the 4 framed artworks) can be seen.
const DUR: Record<TransType, [number, number, number]> = {
  door: [640, 620, 820], corridor: [560, 560, 720],
}

type Route = { cat: string | null; item: string | null }
function parseRoute(): Route {
  const m = window.location.hash.match(/^#\/x\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/)
  return { cat: m?.[1] ?? null, item: m?.[2] ?? null }
}

const CSS = `
@keyframes xUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
@keyframes xKen{0%{transform:scale(1.04)}100%{transform:scale(1.10)}}
@keyframes xPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.9;transform:scale(1.35)}}
@keyframes xScroll{0%{transform:translate(-50%,-40%);opacity:0}40%{opacity:1}100%{transform:translate(-50%,140%);opacity:0}}

.x-page{width:100%;background:#0c0a0b;color:#f3ead6;font-family:'Newsreader',Georgia,serif}

/* ════ HERO / ROOM SHELL ════ */
.x-hero{position:relative;width:100%;height:100vh;height:100svh;overflow:hidden}
.x-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;
  z-index:0;opacity:0;transition:opacity 1.6s cubic-bezier(.16,1,.3,1);
  animation:xKen 40s ease-in-out infinite alternate;will-change:transform,opacity}
.x-bg.ready{opacity:1}
/* ════ 3D MODEL VIEWER ════ */
.x-mv{opacity:1;animation:none;border:0;background-color:transparent;--poster-color:transparent;
  --progress-bar-color:#d8b25a;--progress-mask:transparent}
iframe.x-mv{display:block;background:#0c0a0b}
.x-credit{position:absolute;right:18px;bottom:64px;z-index:4;
  font-family:'DM Mono',monospace;font-size:.5rem;letter-spacing:.18em;text-transform:uppercase;
  color:rgba(243,234,214,.5);text-decoration:none;padding:5px 10px;border-radius:999px;
  background:rgba(13,11,12,.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border:1px solid rgba(216,178,90,.16);transition:color .3s,border-color .3s}
.x-credit:hover{color:rgba(243,234,214,.85);border-color:rgba(216,178,90,.4)}
.x-hero-3d .x-veil{background:
  linear-gradient(180deg,rgba(7,6,10,.35) 0%,rgba(7,6,10,0) 26%,rgba(7,6,10,0) 58%,rgba(12,10,11,.88) 100%),
  radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 58%,rgba(0,0,0,.4) 100%)}
/* let drags reach the model; keep buttons/links clickable */
.x-hero-3d .x-frame{pointer-events:none}
.x-hero-3d .x-frame button,.x-hero-3d .x-frame a{pointer-events:auto}
.x-3dtag{position:absolute;top:18px;left:50%;transform:translateX(-50%);z-index:4;pointer-events:none;
  display:inline-flex;align-items:center;gap:8px;padding:7px 15px;border-radius:999px;
  background:rgba(13,11,12,.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(216,178,90,.3);font-family:'DM Mono',monospace;font-size:.56rem;
  letter-spacing:.22em;text-transform:uppercase;color:rgba(243,234,214,.82)}
.x-3dtag .x-dot{position:relative}
.x-veil{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:
    linear-gradient(180deg,rgba(7,6,10,.55) 0%,rgba(7,6,10,0) 22%,rgba(7,6,10,0) 52%,rgba(12,10,11,.9) 100%),
    linear-gradient(90deg,rgba(7,6,10,.55) 0%,rgba(7,6,10,0) 38%),
    radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,.5) 100%)}
.x-grain{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.x-frame{position:relative;z-index:3;height:100%;display:flex;flex-direction:column;justify-content:space-between;
  padding:clamp(22px,3.5vw,46px) clamp(22px,4vw,64px)}

.x-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;
  animation:xUp 1.1s cubic-bezier(.16,1,.3,1) both}
.x-brand{text-decoration:none;color:#f3ead6;display:inline-flex;flex-direction:column;gap:3px;line-height:1;
  background:none;border:none;cursor:pointer;padding:0;text-align:left;font-family:inherit}
.x-brand b{font-weight:500;font-size:1.5rem;letter-spacing:.04em;font-style:italic;text-shadow:0 1px 20px rgba(0,0,0,.5)}
.x-brand b em{color:#d8b25a;font-style:italic}
.x-brand span{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.32em;text-transform:uppercase;color:rgba(243,234,214,.6)}
.x-brand:hover b em{color:#ecc879}
.x-brand:hover span{color:rgba(236,200,121,.85)}
.x-mono{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.26em;text-transform:uppercase;
  color:rgba(243,234,214,.7);text-align:right;line-height:1.9;text-shadow:0 1px 12px rgba(0,0,0,.6)}

.x-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.x-placard{display:flex;gap:18px;align-items:stretch;max-width:560px;
  animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .25s both}
.x-rule{width:1px;flex:none;align-self:stretch;background:linear-gradient(180deg,transparent,#d8b25a 35%,#d8b25a 65%,transparent)}
.x-plabel{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.3em;text-transform:uppercase;color:#d8b25a;margin-bottom:12px}
.x-ptitle{font-size:clamp(2.3rem,5.4vw,4.6rem);font-weight:400;line-height:.98;letter-spacing:-.01em;margin:0 0 14px}
.x-ptitle em{font-style:italic;color:#f6e9c9}
.x-pmeta{font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.06em;line-height:1.7;color:rgba(243,234,214,.72);margin:0}
.x-pmeta .sep{color:#d8b25a;padding:0 7px;opacity:.8}

/* scroll cue (clickable) */
.x-cue{appearance:none;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:12px;flex:none;
  color:rgba(243,234,214,.7);animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .45s both}
.x-cue:hover{color:#ecc879}
.x-status{display:flex;align-items:center;gap:8px}
.x-dot{width:6px;height:6px;border-radius:50%;background:#d8b25a;box-shadow:0 0 10px #d8b25a;animation:xPulse 2.6s ease-in-out infinite}
.x-stxt{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,234,214,.66)}
.x-mouse{width:22px;height:36px;border:1px solid currentColor;border-radius:12px;position:relative;overflow:hidden;opacity:.6}
.x-mouse i{position:absolute;left:50%;top:7px;width:3px;height:7px;border-radius:2px;background:#d8b25a;animation:xScroll 2.2s cubic-bezier(.16,1,.3,1) infinite}
.x-cuetxt{font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.3em;text-transform:uppercase}

/* room-only soft tag near placard */
.x-rtag{display:inline-flex;align-items:center;gap:8px;margin-top:18px;font-family:'DM Mono',monospace;
  font-size:.56rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,234,214,.6)}
.x-rtag .x-dot{position:relative}

/* ════ INTRO / MANIFESTO ════ */
.x-intro{position:relative;padding:clamp(80px,13vh,170px) clamp(22px,6vw,90px) clamp(60px,9vh,120px)}
.x-intro::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(80% 60% at 14% -5%,rgba(216,178,90,.10),transparent 60%),
    radial-gradient(70% 60% at 92% 28%,rgba(120,150,140,.07),transparent 60%),
    radial-gradient(95% 80% at 50% 112%,rgba(190,120,110,.06),transparent 60%)}
.x-wrap{position:relative;z-index:1;max-width:1180px;margin:0 auto}
.x-eyebrow{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.34em;text-transform:uppercase;color:#d8b25a;margin-bottom:26px}
.x-lead{font-size:clamp(1.8rem,4.4vw,3.4rem);font-weight:400;line-height:1.12;letter-spacing:-.01em;max-width:20ch;margin:0 0 32px}
.x-lead em{font-style:italic;color:#ecc879}
.x-body{font-size:clamp(1rem,1.5vw,1.18rem);font-weight:300;line-height:1.75;color:rgba(243,234,214,.72);max-width:60ch;margin:0}

/* collections grid */
.x-chead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  margin:clamp(60px,9vh,110px) 0 0;padding-top:24px;border-top:1px solid rgba(216,178,90,.2)}
.x-chead h2{font-family:'DM Mono',monospace;font-size:.72rem;font-weight:500;letter-spacing:.26em;text-transform:uppercase;color:#f3ead6;margin:0}
.x-chead span{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.2em;color:#d8b25a;opacity:.75}
.x-grid{margin-top:28px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:1px;background:transparent;border:none}
.x-cat{position:relative;background:#0c0a0b;cursor:pointer;overflow:hidden;border:none;text-align:left;
  color:inherit;font-family:inherit;display:block;width:100%;box-shadow:0 0 0 1px rgba(216,178,90,.16)}
.x-cthumb{position:relative;height:210px;overflow:hidden}
.x-cthumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;
  filter:saturate(.86) brightness(.7);transform:scale(1.04);
  transition:transform 1s cubic-bezier(.16,1,.3,1),filter .6s,opacity 1.2s;opacity:0}
.x-cthumb img.ld{opacity:1}
.x-cthumb::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,10,11,.1),rgba(12,10,11,.92))}
.x-cat:hover .x-cthumb img{transform:scale(1.12);filter:saturate(1) brightness(.82)}
.x-cbody{position:relative;padding:24px 30px 30px}
.x-cbody::before{content:'';position:absolute;left:0;top:0;height:2px;width:0;background:#d8b25a;
  transition:width .55s cubic-bezier(.16,1,.3,1)}
.x-cat:hover .x-cbody::before{width:100%}
.x-cnum{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.2em;color:#d8b25a;opacity:.85}
.x-ctitle{font-size:1.45rem;font-weight:400;margin:14px 0 2px;line-height:1.1}
.x-cit{font-style:italic;font-size:.92rem;color:rgba(236,200,121,.82);margin:0 0 14px}
.x-cdesc{font-size:.86rem;line-height:1.62;color:rgba(243,234,214,.6);margin:0;max-width:34ch}
.x-carw{margin-top:20px;font-family:'DM Mono',monospace;font-size:.72rem;letter-spacing:.2em;color:rgba(243,234,214,.45);
  display:flex;align-items:center;gap:8px;transition:color .4s,gap .4s}
.x-cat:hover .x-carw{color:#ecc879;gap:14px}

/* footer */
.x-foot{position:relative;z-index:1;max-width:1180px;margin:clamp(56px,8vh,96px) auto 0;
  padding:24px 0 4px;border-top:1px solid rgba(216,178,90,.2);
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.x-foot button.lnk,.x-foot a{color:rgba(243,234,214,.7);text-decoration:none;font-family:'DM Mono',monospace;
  font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;transition:color .3s;background:none;border:none;cursor:pointer;padding:0}
.x-foot a:hover,.x-foot button.lnk:hover{color:#ecc879}
.x-foot .fnote{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(243,234,214,.42)}

/* ════ SCROLL REVEAL ════ */
.reveal{opacity:0;transform:translateY(28px);
  transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}
.x-cat.reveal{transition-delay:calc(var(--i,0) * 80ms)}

/* ════ TRANSITIONS ════ */
.x-trans{position:fixed;inset:0;z-index:9000;pointer-events:none;overflow:hidden}

/* door — ornate coffered double doors */
.x-trans-door{perspective:1900px}
.x-trans-door .pn{position:absolute;top:0;height:100%;width:50.5%;backface-visibility:hidden;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='74' height='74'%3E%3Cg fill='none' stroke='%23d8b25a' stroke-opacity='0.16' stroke-width='1'%3E%3Cpath d='M37 2 L72 37 L37 72 L2 37 Z'/%3E%3Ccircle cx='37' cy='37' r='5'/%3E%3C/g%3E%3C/svg%3E"),
    linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,0) 15%,rgba(0,0,0,0) 85%,rgba(0,0,0,.5)),
    linear-gradient(180deg,#241a16,#120c0a);
  background-size:74px 74px,auto,auto;
  box-shadow:inset 0 0 140px rgba(0,0,0,.85)}
.x-trans-door .pl{left:0;transform-origin:left center;border-right:1px solid rgba(216,178,90,.55)}
.x-trans-door .pr{right:0;transform-origin:right center;border-left:1px solid rgba(216,178,90,.55)}
/* recessed panels — each frames a different collection artwork */
.x-trans-door .pn::before,.x-trans-door .pn::after{content:'';position:absolute;left:13%;right:13%;
  border:1px solid rgba(216,178,90,.5);border-radius:3px;background-size:cover;background-position:center;
  box-shadow:inset 0 0 0 5px rgba(0,0,0,.32),inset 0 0 55px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.5)}
.x-trans-door .pn::before{top:6%;height:40.5%}
.x-trans-door .pn::after{bottom:6%;height:40.5%}
.x-trans-door .pl::before{background-image:linear-gradient(rgba(8,6,7,.16),rgba(8,6,7,.3)),url(/x/rooms/sanat.jpg)}
.x-trans-door .pl::after{background-image:linear-gradient(rgba(8,6,7,.16),rgba(8,6,7,.3)),url(/x/rooms/sahil.jpg)}
.x-trans-door .pr::before{background-image:linear-gradient(rgba(8,6,7,.16),rgba(8,6,7,.3)),url(/x/rooms/sokak.jpg)}
.x-trans-door .pr::after{background-image:linear-gradient(rgba(8,6,7,.16),rgba(8,6,7,.3)),url(/x/rooms/koleksiyon.jpg)}
/* gold handles near the seam */
.x-trans-door .kb{position:absolute;top:50%;width:7px;height:56px;border-radius:6px;transform:translateY(-50%);z-index:2;
  background:linear-gradient(180deg,#f3da92,#9c7b32);
  box-shadow:0 0 16px rgba(216,178,90,.5),inset 0 1px 3px rgba(255,255,255,.45),inset 0 -2px 4px rgba(0,0,0,.4)}
.x-trans-door .pl .kb{right:9px}
.x-trans-door .pr .kb{left:9px}
.x-trans-door.cover .pl{animation:dClL .64s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-door.cover .pr{animation:dClR .64s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-door.reveal .pl{animation:dOpL .82s cubic-bezier(.16,1,.3,1) forwards}
.x-trans-door.reveal .pr{animation:dOpR .82s cubic-bezier(.16,1,.3,1) forwards}
@keyframes dClL{from{transform:rotateY(108deg)}to{transform:rotateY(0)}}
@keyframes dClR{from{transform:rotateY(-108deg)}to{transform:rotateY(0)}}
@keyframes dOpL{from{transform:rotateY(0)}to{transform:rotateY(112deg)}}
@keyframes dOpR{from{transform:rotateY(0)}to{transform:rotateY(-112deg)}}

/* corridor — sliding wall with a lit doorway revealing the destination as a silhouette */
.x-trans-corridor .cr{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(90deg,#0a0708,#1a1214 50%,#0a0708);
  box-shadow:inset 70px 0 130px rgba(0,0,0,.65),inset -70px 0 130px rgba(0,0,0,.65)}
/* the destination, dimmed to a silhouette at the end of the corridor */
.x-trans-corridor .crsil{position:relative;width:min(34vw,330px);height:min(64vh,560px);
  background-size:cover;background-position:center;border-radius:4px 4px 0 0;
  filter:brightness(.26) contrast(1.12) saturate(.72);
  border:1px solid rgba(216,178,90,.22);
  box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 130px 12px rgba(216,178,90,.16),inset 0 0 90px rgba(0,0,0,.9)}
/* warm glow spilling from the doorway */
.x-trans-corridor .crsil::after{content:'';position:absolute;inset:-2px;border-radius:inherit;pointer-events:none;
  background:radial-gradient(60% 75% at 50% 40%,rgba(236,200,121,.16),transparent 70%)}
.x-trans-corridor.cover .cr{animation:crIn .56s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-corridor.cover .crsil{animation:crSil .56s cubic-bezier(.16,1,.3,1) both}
.x-trans-corridor.reveal .cr{animation:crOut .72s cubic-bezier(.16,1,.3,1) forwards}
@keyframes crIn{from{transform:translateX(101%)}to{transform:translateX(0)}}
@keyframes crOut{from{transform:translateX(0)}to{transform:translateX(-101%)}}
@keyframes crSil{0%{opacity:0;transform:scale(.82)}55%{opacity:1}100%{opacity:1;transform:scale(1)}}

/* ════ SETTINGS PANEL ════ */
.x-settings{position:fixed;right:16px;bottom:16px;z-index:9500;width:214px;
  background:rgba(13,11,12,.84);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.28);border-radius:14px;padding:13px;
  box-shadow:0 22px 60px rgba(0,0,0,.55);font-family:'DM Mono',monospace}
.x-settings h4{margin:0 0 12px;font-size:.54rem;letter-spacing:.26em;text-transform:uppercase;color:#d8b25a;font-weight:500;
  display:flex;align-items:center;justify-content:space-between}
.x-sclose{appearance:none;background:none;border:none;cursor:pointer;color:rgba(243,234,214,.5);
  font-size:1.05rem;line-height:1;padding:0 0 0 10px;margin:-4px -2px -4px 0;transition:color .3s}
.x-sclose:hover{color:#ecc879}
.x-sopen{position:fixed;right:16px;bottom:16px;z-index:9500;width:42px;height:42px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  background:rgba(13,11,12,.84);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.28);color:#d8b25a;box-shadow:0 22px 60px rgba(0,0,0,.55);transition:all .3s}
.x-sopen:hover{border-color:#d8b25a;color:#ecc879;transform:rotate(45deg)}
.x-sopen svg{width:19px;height:19px;display:block}
.x-srow{margin-bottom:11px}
.x-srow:last-child{margin-bottom:0}
.x-slabel{display:block;font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(243,234,214,.5);margin-bottom:6px}
.x-seg{display:flex;gap:4px}
.x-seg button{flex:1;appearance:none;cursor:pointer;padding:7px 4px;border-radius:8px;
  border:1px solid rgba(216,178,90,.18);background:rgba(255,255,255,.02);color:rgba(243,234,214,.72);
  font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.06em;transition:all .3s;line-height:1}
.x-seg button:hover{border-color:rgba(216,178,90,.5);color:#f3ead6}
.x-seg button.on{background:rgba(216,178,90,.16);border-color:#d8b25a;color:#ecc879}

/* ════ LIGHT THEME ════ */
.x-light{background:#efe7d6;color:#2b211a}
.x-light .x-intro::before{background:
  radial-gradient(80% 60% at 14% -5%,rgba(176,138,60,.14),transparent 60%),
  radial-gradient(70% 60% at 92% 28%,rgba(90,120,110,.08),transparent 60%),
  radial-gradient(95% 80% at 50% 112%,rgba(160,90,80,.07),transparent 60%)}
.x-light .x-eyebrow{color:#9c7522}
.x-light .x-lead{color:#2b211a}
.x-light .x-lead em{color:#9c7522}
.x-light .x-body{color:rgba(43,33,26,.74)}
.x-light .x-chead{border-top-color:rgba(156,117,34,.28)}
.x-light .x-chead h2{color:#2b211a}
.x-light .x-chead span{color:#9c7522}
.x-light .x-grid{background:transparent;border:none}
.x-light .x-cat{background:#f6efe0;box-shadow:0 0 0 1px rgba(156,117,34,.22)}
.x-light .x-cthumb img{filter:saturate(.92) brightness(.82)}
.x-light .x-cthumb::after{background:linear-gradient(180deg,rgba(246,239,224,.05),rgba(246,239,224,.85))}
.x-light .x-cat:hover .x-cthumb img{filter:saturate(1.04) brightness(.94)}
.x-light .x-cnum{color:#9c7522}
.x-light .x-ctitle{color:#2b211a}
.x-light .x-cit{color:rgba(140,100,28,.92)}
.x-light .x-cdesc{color:rgba(43,33,26,.62)}
.x-light .x-carw{color:rgba(43,33,26,.5)}
.x-light .x-cat:hover .x-carw{color:#9c7522}
.x-light .x-foot{border-top-color:rgba(156,117,34,.28)}
.x-light .x-foot a,.x-light .x-foot button.lnk{color:rgba(43,33,26,.7)}
.x-light .x-foot a:hover,.x-light .x-foot button.lnk:hover{color:#9c7522}
.x-light .x-foot .fnote{color:rgba(43,33,26,.45)}
.x-light .x-settings{background:rgba(246,239,224,.88);border-color:rgba(156,117,34,.3)}
.x-light .x-settings h4{color:#9c7522}
.x-light .x-sclose{color:rgba(43,33,26,.5)}
.x-light .x-sclose:hover{color:#9c7522}
.x-light .x-sopen{background:rgba(246,239,224,.9);border-color:rgba(156,117,34,.3);color:#9c7522}
.x-light .x-sopen:hover{border-color:#9c7522;color:#7a5a14}
.x-light .x-slabel{color:rgba(43,33,26,.5)}
.x-light .x-seg button{border-color:rgba(156,117,34,.22);background:rgba(0,0,0,.02);color:rgba(43,33,26,.72)}
.x-light .x-seg button:hover{border-color:rgba(156,117,34,.55);color:#2b211a}
.x-light .x-seg button.on{background:rgba(156,117,34,.15);border-color:#9c7522;color:#7a5a14}

/* ════ COLLECTION INDEX (level 2 — named entries) ════ */
.x-cidx{position:relative;min-height:100vh;min-height:100svh;
  padding:clamp(70px,11vh,140px) clamp(22px,6vw,90px) clamp(60px,9vh,120px)}
.x-cidx::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(80% 60% at 14% -5%,rgba(216,178,90,.10),transparent 60%),
    radial-gradient(70% 60% at 92% 28%,rgba(120,150,140,.07),transparent 60%),
    radial-gradient(95% 80% at 50% 112%,rgba(190,120,110,.06),transparent 60%)}
.x-ihead{position:relative;z-index:1;max-width:1180px;margin:0 auto;
  animation:xUp 1s cubic-bezier(.16,1,.3,1) both}
.x-iback{display:inline-flex;align-items:center;gap:9px;background:none;border:none;cursor:pointer;padding:0;
  font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.28em;text-transform:uppercase;
  color:rgba(243,234,214,.6);transition:color .3s,gap .3s;margin-bottom:30px}
.x-iback:hover{color:#ecc879;gap:14px}
.x-ieyebrow{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.34em;text-transform:uppercase;color:#d8b25a;margin-bottom:14px}
.x-ititle{font-size:clamp(2.1rem,5vw,3.8rem);font-weight:400;line-height:1.02;letter-spacing:-.01em;margin:0 0 14px}
.x-ititle em{font-style:italic;color:#f6e9c9}
.x-idesc{font-size:clamp(.98rem,1.4vw,1.12rem);font-weight:300;line-height:1.7;color:rgba(243,234,214,.66);max-width:54ch;margin:0}
.x-icount{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  max-width:1180px;margin:clamp(44px,6vh,72px) auto 0;padding-top:22px;border-top:1px solid rgba(216,178,90,.2);position:relative;z-index:1}
.x-icount h2{font-family:'DM Mono',monospace;font-size:.7rem;font-weight:500;letter-spacing:.26em;text-transform:uppercase;color:#f3ead6;margin:0}
.x-icount span{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.2em;color:#d8b25a;opacity:.75}

.x-igrid{position:relative;z-index:1;max-width:1180px;margin:26px auto 0;display:grid;
  grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:1px;
  background:transparent;border:none}
.x-item{position:relative;background:#0c0a0b;cursor:pointer;overflow:hidden;border:none;text-align:left;
  color:inherit;font-family:inherit;display:block;width:100%;box-shadow:0 0 0 1px rgba(216,178,90,.16)}
.x-ithumb{position:relative;height:230px;overflow:hidden}
.x-ithumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;
  filter:saturate(.88) brightness(.74);transform:scale(1.04);
  transition:transform 1s cubic-bezier(.16,1,.3,1),filter .6s,opacity 1.2s;opacity:0}
.x-ithumb img.ld{opacity:1}
.x-ithumb::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,10,11,.08),rgba(12,10,11,.9))}
.x-item:hover .x-ithumb img{transform:scale(1.12);filter:saturate(1.02) brightness(.88)}
/* the symbol that marks a walkable 3D museum vs a flat painting */
.x-ibadge{position:absolute;top:13px;left:13px;z-index:2;display:inline-flex;align-items:center;gap:7px;
  padding:6px 11px 6px 9px;border-radius:999px;font-family:'DM Mono',monospace;font-size:.5rem;
  letter-spacing:.2em;text-transform:uppercase;background:rgba(13,11,12,.72);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(216,178,90,.34);color:#ecc879}
.x-ibadge svg{width:13px;height:13px;display:block}
.x-ibadge.art{color:rgba(243,234,214,.72);border-color:rgba(216,178,90,.18)}
.x-ibody{position:relative;padding:22px 26px 26px}
.x-ibody::before{content:'';position:absolute;left:0;top:0;height:2px;width:0;background:#d8b25a;transition:width .55s cubic-bezier(.16,1,.3,1)}
.x-item:hover .x-ibody::before{width:100%}
.x-iname{font-size:1.28rem;font-weight:400;margin:0 0 8px;line-height:1.12}
.x-iname em{font-style:italic;color:#f6e9c9}
.x-imeta{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.04em;line-height:1.65;color:rgba(243,234,214,.6);margin:0}
.x-iopen{margin-top:18px;font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;
  color:rgba(243,234,214,.45);display:flex;align-items:center;gap:8px;transition:color .4s,gap .4s}
.x-item:hover .x-iopen{color:#ecc879;gap:14px}

.x-light .x-cidx::before{background:
  radial-gradient(80% 60% at 14% -5%,rgba(176,138,60,.14),transparent 60%),
  radial-gradient(70% 60% at 92% 28%,rgba(90,120,110,.08),transparent 60%),
  radial-gradient(95% 80% at 50% 112%,rgba(160,90,80,.07),transparent 60%)}
.x-light .x-iback{color:rgba(43,33,26,.6)}
.x-light .x-iback:hover{color:#9c7522}
.x-light .x-ieyebrow{color:#9c7522}
.x-light .x-ititle{color:#2b211a}
.x-light .x-ititle em{color:#9c7522}
.x-light .x-idesc{color:rgba(43,33,26,.7)}
.x-light .x-icount{border-top-color:rgba(156,117,34,.28)}
.x-light .x-icount h2{color:#2b211a}
.x-light .x-icount span{color:#9c7522}
.x-light .x-igrid{background:transparent;border:none}
.x-light .x-item{background:#f6efe0;box-shadow:0 0 0 1px rgba(156,117,34,.22)}
.x-light .x-ithumb img{filter:saturate(.94) brightness(.84)}
.x-light .x-ithumb::after{background:linear-gradient(180deg,rgba(246,239,224,.04),rgba(246,239,224,.82))}
.x-light .x-ibadge{background:rgba(246,239,224,.82);border-color:rgba(156,117,34,.34);color:#7a5a14}
.x-light .x-ibadge.art{color:rgba(43,33,26,.66)}
.x-light .x-iname{color:#2b211a}
.x-light .x-iname em{color:#9c7522}
.x-light .x-imeta{color:rgba(43,33,26,.6)}
.x-light .x-iopen{color:rgba(43,33,26,.5)}
.x-light .x-item:hover .x-iopen{color:#9c7522}

/* ════ CATEGORY COUNT BADGE (atlas grid) ════ */
.x-ccount{position:absolute;top:13px;right:13px;z-index:2;display:inline-flex;align-items:baseline;gap:5px;
  padding:6px 11px;border-radius:999px;font-family:'DM Mono',monospace;font-size:.5rem;letter-spacing:.18em;
  text-transform:uppercase;background:rgba(13,11,12,.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(216,178,90,.3);color:#ecc879}
.x-ccount b{font-size:.66rem;font-weight:500;letter-spacing:.04em}
.x-light .x-ccount{background:rgba(246,239,224,.82);border-color:rgba(156,117,34,.34);color:#7a5a14}
/* "contains a walkable 3D museum" chip — top-left of the category thumbnail */
.x-c3d{position:absolute;top:13px;left:13px;z-index:2;display:inline-flex;align-items:center;gap:5px;
  padding:6px 10px;border-radius:999px;font-family:'DM Mono',monospace;font-size:.5rem;letter-spacing:.16em;
  text-transform:uppercase;background:rgba(216,178,90,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(216,178,90,.45);color:#f0d79a}
.x-c3d svg{width:12px;height:12px;display:block}
.x-cat:hover .x-c3d{background:rgba(216,178,90,.28);border-color:rgba(216,178,90,.7)}
.x-light .x-c3d{background:rgba(156,117,34,.14);border-color:rgba(156,117,34,.4);color:#7a5a14}

/* ════ 3D NAVIGATION GUIDE ════ */
.x-guide{position:absolute;left:18px;bottom:64px;z-index:6;width:min(296px,calc(100vw - 36px));
  background:rgba(13,11,12,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.3);border-radius:16px;padding:16px 17px;
  box-shadow:0 22px 60px rgba(0,0,0,.55);animation:xUp .7s cubic-bezier(.16,1,.3,1) both}
.x-guide h5{margin:0 0 13px;font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.24em;
  text-transform:uppercase;color:#d8b25a;font-weight:500;display:flex;align-items:center;justify-content:space-between}
.x-gclose{appearance:none;background:none;border:none;cursor:pointer;color:rgba(243,234,214,.5);
  font-size:1.05rem;line-height:1;padding:0 0 0 10px;margin:-4px -2px -4px 0;transition:color .3s}
.x-gclose:hover{color:#ecc879}
.x-grow{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.x-grow:last-child{margin-bottom:0}
.x-gico{flex:none;width:32px;height:32px;border-radius:9px;border:1px solid rgba(216,178,90,.26);
  background:rgba(216,178,90,.06);display:flex;align-items:center;justify-content:center;color:#ecc879}
.x-gico svg{width:17px;height:17px;display:block}
.x-gtxt{font-family:'DM Mono',monospace;font-size:.58rem;line-height:1.5;color:rgba(243,234,214,.74);letter-spacing:.02em}
.x-gtxt b{color:#f6e9c9;font-weight:500}
.x-gact{margin-top:14px;display:flex;gap:8px}
.x-gbtn{flex:1;appearance:none;cursor:pointer;padding:9px 8px;border-radius:9px;border:1px solid rgba(216,178,90,.28);
  background:rgba(216,178,90,.08);color:#ecc879;font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.16em;
  text-transform:uppercase;transition:all .3s;display:inline-flex;align-items:center;justify-content:center;gap:7px}
.x-gbtn:hover{border-color:#d8b25a;background:rgba(216,178,90,.18);color:#f6e9c9}
.x-gbtn svg{width:14px;height:14px}
.x-ghelp{position:absolute;left:18px;bottom:64px;z-index:6;appearance:none;cursor:pointer;
  display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;
  background:rgba(13,11,12,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.3);color:#ecc879;font-family:'DM Mono',monospace;font-size:.54rem;
  letter-spacing:.2em;text-transform:uppercase;box-shadow:0 18px 50px rgba(0,0,0,.5);transition:all .3s}
.x-ghelp:hover{border-color:#d8b25a;color:#f6e9c9}
.x-ghelp svg{width:15px;height:15px}

/* ════ ARTWORK STORY (opened painting, scroll down) ════ */
.x-artdoc,.x-place{position:relative;background:#0c0a0b;color:#f3ead6;
  padding:clamp(64px,10vh,130px) clamp(22px,6vw,90px) clamp(80px,12vh,170px)}
.x-artdoc::before,.x-place::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(80% 60% at 12% -5%,rgba(216,178,90,.10),transparent 60%),
    radial-gradient(70% 60% at 90% 24%,rgba(120,150,140,.06),transparent 60%),
    radial-gradient(95% 80% at 50% 112%,rgba(190,120,110,.06),transparent 60%)}
.x-adwrap{position:relative;z-index:1;max-width:740px;margin:0 auto}
.x-adlabel{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.32em;text-transform:uppercase;color:#d8b25a;margin-bottom:18px}
.x-adtitle{font-size:clamp(2rem,4.6vw,3.4rem);font-weight:400;font-style:italic;line-height:1.04;letter-spacing:-.01em;margin:0 0 16px;color:#f6e9c9}
.x-admeta{font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.05em;line-height:1.7;color:rgba(243,234,214,.66);margin:0 0 38px}
.x-admeta .sep{color:#d8b25a;padding:0 8px;opacity:.8}
.x-adstory{font-size:clamp(1.08rem,1.7vw,1.32rem);font-weight:300;line-height:1.85;color:rgba(243,234,214,.82);margin:0 0 44px;
  border-left:1px solid rgba(216,178,90,.4);padding-left:clamp(20px,3vw,34px)}
.x-adgrid{display:grid;grid-template-columns:1fr 1fr;gap:1px;
  background:rgba(216,178,90,.16);border:1px solid rgba(216,178,90,.16)}
@media(min-width:760px){.x-adgrid{grid-template-columns:repeat(4,1fr)}}
.x-adcell{background:#0c0a0b;padding:18px 20px}
.x-adk{font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.22em;text-transform:uppercase;color:#d8b25a;opacity:.85;margin-bottom:7px}
.x-adv{font-size:1.02rem;line-height:1.35;color:rgba(243,234,214,.86)}
.x-adback{margin-top:clamp(40px,6vh,72px);display:inline-flex;align-items:center;gap:9px;background:none;border:none;cursor:pointer;padding:0;
  font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,234,214,.6);transition:color .3s,gap .3s}
.x-adback:hover{color:#ecc879;gap:14px}
.x-light .x-artdoc,.x-light .x-place{background:#efe7d6;color:#2b211a}
.x-light .x-artdoc::before,.x-light .x-place::before{background:
  radial-gradient(80% 60% at 12% -5%,rgba(176,138,60,.14),transparent 60%),
  radial-gradient(70% 60% at 90% 24%,rgba(90,120,110,.08),transparent 60%),
  radial-gradient(95% 80% at 50% 112%,rgba(160,90,80,.07),transparent 60%)}
.x-light .x-adlabel{color:#9c7522}
.x-light .x-adtitle{color:#5a3d12}
.x-light .x-admeta{color:rgba(43,33,26,.66)}
.x-light .x-adstory{color:rgba(43,33,26,.82);border-left-color:rgba(156,117,34,.45)}
.x-light .x-adgrid{background:rgba(156,117,34,.22);border-color:rgba(156,117,34,.22)}
.x-light .x-adcell{background:#f6efe0}
.x-light .x-adk{color:#9c7522}
.x-light .x-adv{color:rgba(43,33,26,.86)}
.x-light .x-adback{color:rgba(43,33,26,.6)}
.x-light .x-adback:hover{color:#9c7522}

/* ── museum dossier: exact location map + real-scan example ── */
.x-plmap{margin:8px 0 40px}
.x-plmaphd,.x-plsamhd{display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-bottom:12px;flex-wrap:wrap}
.x-plmaphd .x-adk,.x-plsamhd .x-adk{margin-bottom:0}
.x-plmaplink{font-family:'DM Mono',monospace;font-size:.56rem;letter-spacing:.18em;text-transform:uppercase;
  color:rgba(243,234,214,.62);text-decoration:none;transition:color .25s}
.x-plmaplink:hover{color:#ecc879}
.x-plmapbox{position:relative;border-radius:14px;overflow:hidden;border:1px solid rgba(216,178,90,.28);
  box-shadow:0 22px 60px rgba(0,0,0,.5);background:#0c0a0b}
.x-plmapbox iframe{display:block;width:100%;height:clamp(240px,42vh,400px);border:0;filter:saturate(.9) contrast(1.02)}
.x-plcoord{margin-top:10px;font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.16em;color:rgba(243,234,214,.5)}
.x-plsample{margin:44px 0 8px;border-top:1px solid rgba(216,178,90,.18);padding-top:30px}
.x-plsambox{position:relative;border-radius:14px;overflow:hidden;border:1px solid rgba(216,178,90,.28);
  box-shadow:0 22px 60px rgba(0,0,0,.5);background:#0c0a0b}
.x-plsambox iframe{display:block;width:100%;height:clamp(260px,46vh,440px);border:0}
.x-plsamnote{margin:16px 0 0;font-size:.95rem;font-weight:300;line-height:1.7;color:rgba(243,234,214,.6);
  max-width:560px}
.x-light .x-plmaplink{color:rgba(43,33,26,.6)}
.x-light .x-plmaplink:hover{color:#9c7522}
.x-light .x-plmapbox,.x-light .x-plsambox{border-color:rgba(156,117,34,.3);box-shadow:0 18px 48px rgba(80,60,20,.18);background:#f6efe0}
.x-light .x-plcoord{color:rgba(43,33,26,.5)}
.x-light .x-plsample{border-top-color:rgba(156,117,34,.25)}
.x-light .x-plsamnote{color:rgba(43,33,26,.6)}

/* ════ OUR OWN 3D HALL (Gallery3D) ════ */
.g3d-stage{position:absolute;inset:0;z-index:0;overflow:hidden}
.g3d-load{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;gap:13px;
  background:#140f0e;color:rgba(243,234,214,.7);font-family:'DM Mono',monospace;font-size:.62rem;
  letter-spacing:.24em;text-transform:uppercase}
.g3d-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(216,178,90,.25);border-top-color:#d8b25a;
  animation:g3dSpin .8s linear infinite}
@keyframes g3dSpin{to{transform:rotate(360deg)}}

/* movement pad (touch / click) */
.g3d-pad{position:absolute;right:18px;bottom:64px;z-index:6;display:flex;flex-direction:column;align-items:center;gap:6px;user-select:none}
.g3d-pad-mid{display:flex;gap:6px}
.g3d-pb{width:46px;height:46px;border-radius:12px;appearance:none;cursor:pointer;
  background:rgba(13,11,12,.74);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(216,178,90,.3);color:#ecc879;font-size:1rem;line-height:1;
  display:flex;align-items:center;justify-content:center;transition:all .2s;touch-action:none}
.g3d-pb:hover,.g3d-pb:active{border-color:#d8b25a;background:rgba(216,178,90,.18);color:#f6e9c9}

/* guide + collapsed help pill */
.g3d-guide{position:absolute;left:18px;top:96px;z-index:6;width:min(300px,calc(100vw - 36px));
  background:rgba(13,11,12,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.3);border-radius:16px;padding:16px 17px;
  box-shadow:0 22px 60px rgba(0,0,0,.55);animation:xUp .6s cubic-bezier(.16,1,.3,1) both}
.g3d-guide h5{margin:0 0 13px;font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.24em;
  text-transform:uppercase;color:#d8b25a;font-weight:500;display:flex;align-items:center;justify-content:space-between}
.g3d-row{font-family:'Newsreader',Georgia,serif;font-size:.92rem;line-height:1.55;color:rgba(243,234,214,.78);margin-bottom:9px}
.g3d-row:last-of-type{margin-bottom:0}
.g3d-row b{color:#f6e9c9;font-weight:500;font-style:italic}
.g3d-x{appearance:none;background:none;border:none;cursor:pointer;color:rgba(243,234,214,.5);
  font-size:1.1rem;line-height:1;padding:0 0 0 10px;transition:color .3s}
.g3d-x:hover{color:#ecc879}
.g3d-act{margin-top:14px;display:flex;gap:8px}
.g3d-btn{flex:1;appearance:none;cursor:pointer;padding:9px 8px;border-radius:9px;border:1px solid rgba(216,178,90,.28);
  background:rgba(216,178,90,.08);color:#ecc879;font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.14em;
  text-transform:uppercase;transition:all .3s}
.g3d-btn:hover{border-color:#d8b25a;background:rgba(216,178,90,.18);color:#f6e9c9}
.g3d-help{position:absolute;left:18px;top:96px;z-index:6;appearance:none;cursor:pointer;
  display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;
  background:rgba(13,11,12,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.3);color:#ecc879;font-family:'DM Mono',monospace;font-size:.54rem;
  letter-spacing:.2em;text-transform:uppercase;box-shadow:0 14px 40px rgba(0,0,0,.5);transition:all .3s}
.g3d-help:hover{border-color:#d8b25a;color:#f6e9c9}

/* focused-painting info card */
.g3d-card{position:absolute;right:18px;top:50%;transform:translateY(-50%);z-index:7;width:min(340px,calc(100vw - 36px));
  max-height:78vh;overflow:auto;background:rgba(13,11,12,.88);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  border:1px solid rgba(216,178,90,.3);border-radius:18px;padding:24px 24px 20px;
  box-shadow:0 26px 70px rgba(0,0,0,.6);animation:xUp .5s cubic-bezier(.16,1,.3,1) both}
.g3d-card-x{position:absolute;top:14px;right:16px;padding:0}
.g3d-card-label{font-family:'DM Mono',monospace;font-size:.56rem;letter-spacing:.26em;text-transform:uppercase;color:#d8b25a;margin-bottom:12px;padding-right:20px}
.g3d-card-title{font-family:'Newsreader',Georgia,serif;font-size:1.7rem;font-style:italic;font-weight:400;line-height:1.06;color:#f6e9c9;margin:0 0 10px}
.g3d-card-meta{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.05em;line-height:1.6;color:rgba(243,234,214,.62);margin:0 0 16px}
.g3d-card-story{font-family:'Newsreader',Georgia,serif;font-size:1rem;font-weight:300;line-height:1.72;color:rgba(243,234,214,.82);margin:0 0 18px;
  border-left:1px solid rgba(216,178,90,.4);padding-left:15px}
.g3d-card-nav{display:flex;gap:8px}
.g3d-card-nav button{flex:1;appearance:none;cursor:pointer;padding:9px 8px;border-radius:9px;border:1px solid rgba(216,178,90,.26);
  background:rgba(216,178,90,.07);color:#ecc879;font-family:'DM Mono',monospace;font-size:.56rem;letter-spacing:.1em;transition:all .3s}
.g3d-card-nav button:hover{border-color:#d8b25a;background:rgba(216,178,90,.16);color:#f6e9c9}

@media (max-width:680px){
  .x-cue{display:none}
  .x-bottom{flex-direction:column;align-items:flex-start}
  .x-mono{display:none}
  .x-settings{top:12px;right:12px;bottom:auto;left:auto;width:168px;padding:10px}
  .x-sopen{top:12px;right:12px;bottom:auto;left:auto}
  .x-guide{left:12px;right:12px;bottom:58px;width:auto}
  .x-ghelp{left:12px;bottom:58px}
  .g3d-guide{left:12px;right:12px;top:auto;bottom:120px;width:auto}
  .g3d-help{left:12px;top:auto;bottom:120px}
  .g3d-card{right:12px;left:12px;width:auto;top:auto;bottom:120px;transform:none;max-height:54vh}
  .g3d-pad{right:12px;bottom:58px}
  .g3d-pb{width:42px;height:42px}
}
@media (prefers-reduced-motion:reduce){
  .x-bg{animation:none}
  .reveal{opacity:1;transform:none}
  .x-guide{animation:none}
}
`

// Fade an image in once it has decoded — handles the cached case where onLoad never fires
const fadeIn = (el: HTMLImageElement | null) => {
  if (!el) return
  const show = () => el.classList.add('ready')
  if (el.complete && el.naturalWidth > 0) show()
  else el.addEventListener('load', show, { once: true })
}

export function XPage() {
  const [route, setRoute] = useState<Route>(parseRoute())
  const [theme, setTheme] = useState<Theme>('dark')
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [anim, setAnim] = useState<{ type: TransType; phase: 'cover' | 'reveal'; img: string } | null>(null)
  const [entered3d, setEntered3d] = useState(false)
  const introRef = useRef<HTMLElement>(null)
  const artDocRef = useRef<HTMLElement>(null)

  const cat = route.cat ? CATEGORIES.find(c => c.slug === route.cat) ?? null : null
  const item = cat && route.item ? cat.items.find(it => it.id === route.item) ?? null : null
  const scan = item?.kind === '3d' ? item : undefined
  const art = item?.kind === 'art' ? item : undefined
  const is3d = Boolean(scan)

  // paintings hung inside our own 3D hall (the category's flat artworks, with their stories)
  const galleryArt: GalleryArt[] = cat
    ? cat.items
        .filter((it): it is ArtItem => it.kind === 'art' && !it.noWall)
        .map((a) => ({
          id: a.id, title: a.title, artist: a.artist, year: a.year,
          museum: a.museum, medium: a.medium, thumb: a.thumb, story: STORIES[a.id],
        }))
    : []

  // archaeology museums get a cool limestone + columned hall; everything else the warm salon
  const g3dVariant: GalleryVariant = cat && /arkeoloji/.test(cat.slug) ? 'archaeo' : 'gallery'

  // a 3D salon that has real coordinates first flies the visitor over the map to its location
  const showIntro = Boolean(scan?.geo) && !entered3d

  // title
  useEffect(() => {
    const prev = document.title
    document.title = item ? `X — ${item.title}` : cat ? `X — ${cat.tr}` : 'X — Dijital Atlas · Botticelli'
    return () => { document.title = prev }
  }, [cat, item])

  // hash sync (browser back/forward + our own pushes)
  useEffect(() => {
    const onHash = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // every freshly-opened page starts from the top — never inherit the previous
  // page's scroll position. (Stop the browser from restoring scroll on hash nav.)
  useEffect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.cat, route.item])

  // every freshly-opened 3D salon replays the map flyover before the hall loads
  useEffect(() => { setEntered3d(false) }, [route.cat, route.item])

  // scroll-reveal on the atlas view + the opened-artwork story
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.x-intro .reveal, .x-artdoc .reveal, .x-place .reveal'))
    if (els.length === 0) return
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [route, cat, item])

  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // light navigation (instant): used for back/up movements
  const go = (hash: string) => { window.location.hash = hash; window.scrollTo(0, 0) }

  // cinematic scene transition — the door/corridor curtain that covers, navigates, then reveals
  const runTransition = (target: string, img: string) => {
    if (reduce) { go(target); return }
    if (anim) return
    const type: TransType = Math.random() < 0.5 ? 'door' : 'corridor'
    const [coverMs, holdMs, revealMs] = DUR[type]
    setAnim({ type, phase: 'cover', img })
    window.setTimeout(() => {
      window.setTimeout(() => {
        go(target)
        setAnim({ type, phase: 'reveal', img })
        window.setTimeout(() => setAnim(null), revealMs)
      }, holdMs)
    }, coverMs)
  }

  // opening an entry (a painting / a 3D museum)
  const openItem = (catSlug: string, it: Item) =>
    runTransition(`#/x/${catSlug}/${it.id}`, it.kind === 'art' ? it.img : it.thumb)

  // opening a collection from the atlas — gets the same cinematic transition
  const openCat = (c: Cat) => runTransition(`#/x/${c.slug}`, c.img)

  const scrollToIntro = () => introRef.current?.scrollIntoView({ behavior: 'smooth' })
  const scrollToArtDoc = () => artDocRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    // lang="en" forces dotless-I casing for every uppercase label (no Turkish İ anywhere on this page)
    <div className={`x-page${theme === 'light' ? ' x-light' : ''}`} lang="en">
      <style>{CSS}</style>

      {item && cat ? (
        /* ════════ ITEM — an opened painting OR a walkable 3D museum ════════ */
        <>
        <section className={`x-hero${is3d ? ' x-hero-3d' : ''}`} key={item.id}>
          {scan ? (
            showIntro && scan.geo ? (
              <Suspense fallback={<div className="g3d-load"><span className="g3d-spin" />Harita yükleniyor…</div>}>
                <MuseumIntro
                  place={{
                    title: scan.title, kindLabel: scan.kindLabel, loc: scan.loc,
                    geo: scan.geo, placePhoto: scan.placePhoto, address: scan.address,
                  }}
                  onArrive={() => setEntered3d(true)}
                />
              </Suspense>
            ) : isSketchfab(scan.scanId) ? (
              <iframe
                className="x-bg x-mv"
                title={`${scan.title} — ${scan.author}`}
                src={sketchfabSrc(scan.scanId)}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <Suspense fallback={<div className="g3d-load"><span className="g3d-spin" />Salon hazırlanıyor…</div>}>
                <Gallery3D items={galleryArt} variant={g3dVariant} />
              </Suspense>
            )
          ) : art ? (
            <img
              className="x-bg"
              ref={fadeIn}
              src={art.img}
              alt={`${art.artist} — ${art.title}`}
              style={{ objectPosition: art.objPos }}
              decoding="async"
            />
          ) : null}
          {!showIntro && <div className="x-veil" />}
          {!showIntro && <div className="x-grain" />}
          {is3d && !showIntro && (
            <div className="x-3dtag"><span className="x-dot" />
              {scan && isSketchfab(scan.scanId)
                ? '3D tarama · gez · sürükleyerek keşfet'
                : '3D salon · kendi koleksiyonumuz'}
            </div>
          )}
          {scan && isSketchfab(scan.scanId) && !showIntro && (
            <a className="x-credit" href={`https://sketchfab.com/3d-models/${scan.scanId}`}
               target="_blank" rel="noopener noreferrer">
              3D scan · {scan.author} · Sketchfab
            </a>
          )}
          {!showIntro && (
          <div className="x-frame">
            <header className="x-top">
              <button className="x-brand" onClick={() => go(`#/x/${cat.slug}`)}>
                <b>X<em>.</em></b>
                <span>← {cat.tr}</span>
              </button>
              <div className="x-mono">{cat.tr}<br />Opera N° {cat.n}</div>
            </header>

            <div className="x-bottom">
              <div className="x-placard">
                <span className="x-rule" />
                <div>
                  {scan ? (
                    <>
                      <div className="x-plabel">{scan.kindLabel}</div>
                      <h1 className="x-ptitle"><em>{scan.title}</em></h1>
                      <p className="x-pmeta">
                        {scan.loc}<span className="sep">/</span>{scan.note}
                      </p>
                      <div className="x-rtag"><span className="x-dot" />3D tarama · gezilebilir mekân</div>
                    </>
                  ) : art ? (
                    <>
                      <div className="x-plabel">{art.museum}</div>
                      <h1 className="x-ptitle"><em>{art.title}</em></h1>
                      <p className="x-pmeta">
                        {art.artist}<span className="sep">/</span>{art.year}
                        <span className="sep">/</span>{art.medium}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>

              {art && (
                <button className="x-cue" onClick={scrollToArtDoc} aria-label="Eser hikâyesine kaydır">
                  <span className="x-status"><span className="x-dot" /><span className="x-stxt">Eserin Hikâyesi</span></span>
                  <span className="x-mouse"><i /></span>
                  <span className="x-cuetxt">Kaydır</span>
                </button>
              )}
              {scan && (
                <button className="x-cue" onClick={scrollToArtDoc} aria-label="Müze bilgisi ve konuma kaydır">
                  <span className="x-status"><span className="x-dot" /><span className="x-stxt">Müze & Konum</span></span>
                  <span className="x-mouse"><i /></span>
                  <span className="x-cuetxt">Kaydır</span>
                </button>
              )}
            </div>
          </div>
          )}
        </section>

        {art && (
          <section className="x-artdoc" ref={artDocRef}>
            <div className="x-adwrap">
              <div className="x-adlabel reveal">{art.tag ? art.tag : 'Eser Üzerine'}</div>
              <h2 className="x-adtitle reveal">{art.title}</h2>
              <p className="x-admeta reveal">
                {art.artist}<span className="sep">/</span>{art.year}<span className="sep">/</span>{art.medium}
              </p>
              <p className="x-adstory reveal">
                {STORIES[art.id] ?? `${art.title}, ${art.museum} koleksiyonunda yer alır.`}
              </p>
              <div className="x-adgrid reveal">
                <div className="x-adcell"><div className="x-adk">Sanatçı / Köken</div><div className="x-adv">{art.artist}</div></div>
                <div className="x-adcell"><div className="x-adk">Dönem</div><div className="x-adv">{art.year}</div></div>
                <div className="x-adcell"><div className="x-adk">Teknik</div><div className="x-adv">{art.medium}</div></div>
                <div className="x-adcell"><div className="x-adk">Bulunduğu Yer</div><div className="x-adv">{art.museum}</div></div>
              </div>
              <button className="x-adback" onClick={() => go(`#/x/${cat.slug}`)}>← {cat.tr} koleksiyonuna dön</button>
            </div>
          </section>
        )}

        {scan && (
          <section className="x-place" ref={artDocRef}>
            <div className="x-adwrap">
              <div className="x-adlabel reveal">{scan.kindLabel}</div>
              <h2 className="x-adtitle reveal"><em>{scan.title}</em></h2>
              <p className="x-admeta reveal">
                {scan.loc}{scan.address && <><span className="sep">/</span>{scan.address}</>}
              </p>
              <p className="x-adstory reveal">{scan.note}</p>

              {scan.geo && (
                <div className="x-plmap reveal">
                  <div className="x-plmaphd">
                    <span className="x-adk">Tam Konum</span>
                    <a className="x-plmaplink" href={osmLink(scan.geo.lat, scan.geo.lng)}
                       target="_blank" rel="noopener noreferrer">Haritada aç ↗</a>
                  </div>
                  <div className="x-plmapbox">
                    <iframe
                      title={`${scan.title} — konum`}
                      src={osmEmbedSrc(scan.geo.lat, scan.geo.lng)}
                      loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="x-plcoord">{scan.geo.lat.toFixed(4)}° N · {scan.geo.lng.toFixed(4)}° E</div>
                </div>
              )}

              <div className="x-adgrid reveal">
                <div className="x-adcell"><div className="x-adk">Koleksiyon</div><div className="x-adv">{scan.author}</div></div>
                <div className="x-adcell"><div className="x-adk">Tür</div><div className="x-adv">{scan.kindLabel}</div></div>
                <div className="x-adcell"><div className="x-adk">Şehir</div><div className="x-adv">{scan.loc}</div></div>
                {scan.address && <div className="x-adcell"><div className="x-adk">Adres</div><div className="x-adv">{scan.address}</div></div>}
              </div>

              {!isSketchfab(scan.scanId) && (
                <div className="x-plsample reveal">
                  <div className="x-plsamhd">
                    <span className="x-adk">Gerçek bir 3B tarama örneği</span>
                    <a className="x-plmaplink" href={`https://sketchfab.com/3d-models/${SAMPLE_SCAN_ID}`}
                       target="_blank" rel="noopener noreferrer">{SAMPLE_SCAN_AUTHOR} · Sketchfab ↗</a>
                  </div>
                  <div className="x-plsambox">
                    <iframe
                      title="Gerçek müze taraması örneği — The Hallwyl Museum"
                      src={sketchfabSrc(SAMPLE_SCAN_ID)}
                      allow="autoplay; fullscreen; xr-spatial-tracking"
                      allowFullScreen loading="lazy"
                    />
                  </div>
                  <p className="x-plsamnote">
                    Bizim salonlarımız henüz elde çizildi; ilerledikçe mekânlar bunun gibi gerçek
                    fotogrametri taramalarıyla değişecek.
                  </p>
                </div>
              )}

              <button className="x-adback" onClick={() => go(`#/x/${cat.slug}`)}>← {cat.tr} koleksiyonuna dön</button>
            </div>
          </section>
        )}
        </>
      ) : cat ? (
        /* ════════ COLLECTION INDEX — named entries (paintings + 3D museums) ════════ */
        <section className="x-cidx" key={cat.slug}>
          <div className="x-ihead">
            <button className="x-iback" onClick={() => go('#/x')}>← Koleksiyonlar</button>
            <div className="x-ieyebrow">Collezione N° {cat.n}</div>
            <h1 className="x-ititle">{cat.tr}</h1>
            <p className="x-idesc">{cat.d}</p>
          </div>

          <div className="x-icount">
            <h2>Eserler</h2>
            <span>{cat.items.length} {cat.items.length === 1 ? 'eser' : 'eser'}</span>
          </div>

          <div className="x-igrid">
            {cat.items.map((it) => (
              <button className="x-item" key={it.id} onClick={() => openItem(cat.slug, it)}>
                <div className="x-ithumb">
                  <img
                    src={it.kind === 'art' ? it.img : it.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: it.kind === 'art' ? it.objPos : (it.objPos ?? '50% 50%') }}
                    onLoad={(e) => e.currentTarget.classList.add('ld')}
                  />
                  {it.kind === '3d' ? (
                    <span className="x-ibadge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 2v20" /><path d="M3 7l9 5 9-5" />
                      </svg>
                      3D Müze
                    </span>
                  ) : (
                    <span className="x-ibadge art">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" />
                      </svg>
                      {it.kind === 'art' ? (it.tag ?? 'Tablo') : 'Tablo'}
                    </span>
                  )}
                </div>
                <div className="x-ibody">
                  <h3 className="x-iname"><em>{it.title}</em></h3>
                  <p className="x-imeta">
                    {it.kind === '3d'
                      ? <>{it.kindLabel}<br />{it.loc}</>
                      : <>{it.artist}<br />{it.museum} · {it.year}</>}
                  </p>
                  <div className="x-iopen">
                    {it.kind === '3d' ? 'Mekânı gez' : 'Eseri aç'} <span>→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <footer className="x-foot" style={{ maxWidth: 1180, margin: 'clamp(56px,8vh,96px) auto 0' }}>
            <a href="#/">← Hub'a dön</a>
            <span className="fnote">Mavi Atlas · codename X · Geliştiriliyor</span>
          </footer>
        </section>
      ) : (
        /* ════════ ATLAS (hero + intro) ════════ */
        <>
          <section className="x-hero">
            <img
              className="x-bg"
              ref={fadeIn}
              src="/x/venus-4k.jpg"
              srcSet="/x/venus-2k.jpg 1920w, /x/venus-4k.jpg 3840w"
              sizes="100vw"
              alt="Sandro Botticelli — La Nascita di Venere (c. 1485), Galleria degli Uffizi"
              decoding="async"
            />
            <div className="x-veil" />
            <div className="x-grain" />

            <div className="x-frame">
              <header className="x-top">
                <a href="#/" className="x-brand">
                  <b>X<em>.</em></b>
                  <span>← Dijital Atlas</span>
                </a>
                <div className="x-mono">Sandro Botticelli<br />Opera N° 00</div>
              </header>

              <div className="x-bottom">
                <div className="x-placard">
                  <span className="x-rule" />
                  <div>
                    <div className="x-plabel">Galleria degli Uffizi · Firenze</div>
                    <h1 className="x-ptitle">La Nascita di <em>Venere</em></h1>
                    <p className="x-pmeta">
                      Sandro Botticelli<span className="sep">/</span>c. 1485
                      <span className="sep">/</span>Tempera su tela
                    </p>
                  </div>
                </div>

                <button className="x-cue" onClick={scrollToIntro} aria-label="Aşağı kaydır">
                  <span className="x-status"><span className="x-dot" /><span className="x-stxt">Geliştiriliyor</span></span>
                  <span className="x-mouse"><i /></span>
                  <span className="x-cuetxt">Keşfet</span>
                </button>
              </div>
            </div>
          </section>

          <section className="x-intro" ref={introRef}>
            <div className="x-wrap">
              <div className="x-eyebrow reveal">Arşiv Üzerine</div>
              <h2 className="x-lead reveal">
                Gezilen her mekânın, içine girilebilen bir <em>hatıraya</em> dönüştüğü dijital bir atlas.
              </h2>
              <p className="x-body reveal">
                X; sanat eserlerini, otantik mekânları ve doğanın sahnelerini 3D ve 360° olarak yakalayıp
                sinematik bir koleksiyona dönüştürür. Amaç bir uygulama değil — bir his. Bir esere yaklaşır
                gibi gir, ve gör. Her mekân kendi ışığı, dokusu ve sessizliğiyle korunur; ziyaret ettiğin yer,
                zamanın dışında bir köşede kalır.
              </p>

              <div className="x-chead reveal">
                <h2>Koleksiyonlar</h2>
                <span>Sei Collezioni · {CATEGORIES.length}</span>
              </div>

              <div className="x-grid">
                {CATEGORIES.map((c, i) => (
                  <button
                    className="x-cat reveal"
                    key={c.slug}
                    style={{ ['--i' as string]: i }}
                    onClick={() => openCat(c)}
                  >
                    <div className="x-cthumb">
                      <img src={c.img} alt="" loading="lazy" decoding="async"
                        style={{ objectPosition: c.objPos }}
                        onLoad={(e) => e.currentTarget.classList.add('ld')} />
                      <span className="x-ccount"><b>{c.items.length}</b> eser</span>
                      {c.items.some((it) => it.kind === '3d') && (
                        <span className="x-c3d">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 2v20" /><path d="M3 7l9 5 9-5" />
                          </svg>
                          3D Müze
                        </span>
                      )}
                    </div>
                    <div className="x-cbody">
                      <div className="x-cnum">{c.n}</div>
                      <h3 className="x-ctitle">{c.tr}</h3>
                      <p className="x-cit">{c.it}</p>
                      <p className="x-cdesc">{c.d}</p>
                      <div className="x-carw">Keşfet <span>→</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <footer className="x-foot">
              <a href="#/">← Hub'a dön</a>
              <span className="fnote">Mavi Atlas · codename X · Geliştiriliyor</span>
            </footer>
          </section>
        </>
      )}

      {/* ════ TRANSITION OVERLAY ════ */}
      {anim && (
        <div className={`x-trans x-trans-${anim.type} ${anim.phase}`} aria-hidden="true">
          {anim.type === 'door' && <><span className="pn pl"><i className="kb" /></span><span className="pn pr"><i className="kb" /></span></>}
          {anim.type === 'corridor' && (
            <span className="cr">
              <span className="crsil" style={{ backgroundImage: `url(${anim.img})` }} />
            </span>
          )}
        </div>
      )}

      {/* ════ SETTINGS ════ */}
      {settingsOpen ? (
        <div className="x-settings">
          <h4>Settings
            <button className="x-sclose" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
          </h4>
          <div className="x-srow">
            <span className="x-slabel">Appearance</span>
            <div className="x-seg">
              <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Dark</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="x-sopen" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}
    </div>
  )
}
