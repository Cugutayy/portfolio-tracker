import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { photos, categories, normalize, type Photo } from "./data";
import "./style.css";
const Studio = lazy(() => import("./studio"));
const instagram = "https://www.instagram.com/journey_notess/";
function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: back ? "rotate(180deg)" : undefined }}
    >
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function NorthEastMark({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? "jn-ne-mark is-compact" : "jn-ne-mark"}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path className="jn-ne-rail" d="M5 19 19 5" />
      <path className="jn-ne-corner" d="M10 5h9v9" />
      <circle className="jn-ne-dot" cx="5" cy="19" r="1.15" />
    </svg>
  );
}

function ThemeDial({ dark }: { dark: boolean }) {
  return (
    <svg
      className={dark ? "jn-theme-dial is-night" : "jn-theme-dial"}
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden="true"
    >
      <circle className="jn-theme-orbit" cx="15" cy="15" r="10.2" />
      <path
        className="jn-theme-phase"
        d="M15 4.8a10.2 10.2 0 1 0 0 20.4c-3.15-1.82-4.9-5.43-4.9-10.2S11.85 6.62 15 4.8Z"
      />
      <circle className="jn-theme-star" cx="22.4" cy="7.5" r="1.35" />
    </svg>
  );
}
function Bookmark({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="17"
      height="19"
      viewBox="0 0 20 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M4 3h12v18l-6-4-6 4V3Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function Picture({
  photo,
  priority = false,
  className = "",
}: {
  photo: Photo;
  priority?: boolean;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={photo.thumbnail}
      srcSet={
        photo.thumbnail === photo.src
          ? undefined
          : `${photo.thumbnail} ${photo.smallWidth || 640}w, ${photo.src} ${photo.largeWidth || Math.min(photo.width, 1440)}w`
      }
      sizes="(max-width: 640px) 78vw, (max-width: 1000px) 40vw, 490px"
      alt={photo.title}
      width={photo.width}
      height={photo.height}
      loading={priority ? "eager" : "lazy"}
      {...{ fetchpriority: priority ? "high" : "auto" }}
    />
  );
}
function getSaved(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem("jn-saved") || "[]");
    return Array.isArray(data)
      ? data.filter((v: unknown) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [filter, setFilter] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(false);
  const [saved, setSaved] = useState<string[]>(getSaved);
  const [onlySaved, setOnlySaved] = useState(false);
  const [layout, setLayout] = useState("journal");
  const [limit, setLimit] = useState(9);
  const [route, setRoute] = useState(location.hash);
  const [drafts, setDrafts] = useState<Photo[]>([]);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("jn-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const archive = useRef<HTMLElement>(null);
  const reader = useRef<HTMLElement>(null);
  const returnScroll = useRef(0);
  const origin = useRef<HTMLElement | null>(null);
  const originNote = useRef("");
  const all = [...drafts, ...photos.slice(1), photos[0]];
  const selected = all.find((p) => route === `#note=${p.id}`);
  const filtered = all.filter(
    (p) =>
      (filter === "Tümü" || p.category === filter) &&
      (!onlySaved || saved.includes(p.id)) &&
      normalize(`${p.title} ${p.summary} ${p.place} ${p.category}`).includes(
        normalize(query),
      ),
  );
  useEffect(() => {
    const sync = () => setRoute(location.hash);
    addEventListener("hashchange", sync);
    addEventListener("popstate", sync);
    return () => {
      removeEventListener("hashchange", sync);
      removeEventListener("popstate", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "night" : "day";
    try {
      localStorage.setItem("jn-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  useEffect(() => {
    try {
      localStorage.setItem("jn-saved", JSON.stringify(saved));
    } catch {
      setStatus(
        "Tarayıcı kaydetmeye izin vermedi; bu seçim yalnızca açık oturumda kalacak.",
      );
    }
  }, [saved]);
  useEffect(() => {
    if (search) searchInput.current?.focus();
  }, [search]);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 4200);
    return () => clearTimeout(t);
  }, [status]);
  useEffect(() => {
    document.title = selected
      ? `${selected.title} · Journey Notes`
      : "Journey Notes | Arif";
    if (selected) {
      window.scrollTo({ top: 0, behavior: "instant" });
      reader.current?.focus({ preventScroll: true });
    }
  }, [selected?.id]);
  const toggleSave = (id: string) =>
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  const openNote = (p: Photo) => {
    originNote.current = p.id;
    returnScroll.current = window.scrollY;
    origin.current = document.activeElement as HTMLElement;
    history.pushState(null, "", `#note=${p.id}`);
    setRoute(location.hash);
  };
  const goHome = () => {
    history.replaceState(null, "", location.pathname);
    setRoute("");
    requestAnimationFrame(() => {
      window.scrollTo({ top: returnScroll.current, behavior: "instant" });
      (origin.current?.isConnected
        ? origin.current
        : document.querySelector<HTMLElement>(
            `[data-note="${originNote.current}"]`,
          )
      )?.focus({ preventScroll: true });
    });
  };
  const scrollArchive = () =>
    requestAnimationFrame(() =>
      archive.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
  const choose = (category: string) => {
    setFilter(category);
    setOnlySaved(false);
    setQuery("");
    setLimit(9);
    if (selected) goHome();
    scrollArchive();
  };
  const openSearch = () => {
    if (selected) goHome();
    setSearch(true);
    scrollArchive();
  };
  const openStudio = () => {
    returnScroll.current = window.scrollY;
    origin.current = document.activeElement as HTMLElement;
    history.pushState(null, "", "#studio");
    setRoute("#studio");
  };
  const goSection = (id: string) => {
    history.pushState(null, "", `#${id}`);
    setRoute(location.hash);
    requestAnimationFrame(() =>
      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        }),
    );
  };
  return (
    <>
      <a href="#archive" className="skip">
        Yol defterine geç
      </a>
      <div className="site-shell">
        <header className="header">
          <a className="home-link" href="/" aria-label="snmez.xyz ana sayfası">
            <span className="mini-mark">s.</span> SNMEZ.XYZ{" "}
            <span className="muted">/ JOURNEY NOTES</span>
          </a>
          <div className="header-tools">
            <a
              href={instagram}
              target="_blank"
              rel="noreferrer"
              className="jn-instagram-link"
              aria-label="Journey Notes Instagram hesabını yeni sekmede aç"
            >
              <span>Instagram</span>
              <NorthEastMark />
            </a>
            <span className="tool-divider" />
            <button
              onClick={() => setDark(!dark)}
              className="icon-button theme-button"
              aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
              aria-pressed={dark}
            >
              <ThemeDial dark={dark} />
            </button>
            <button
              onClick={openSearch}
              className="icon-button"
              aria-label="Defterde ara"
            >
              <SearchIcon />
            </button>
          </div>
        </header>
        <div className="masthead">
          <span className="masthead-aside">
            FOTOĞRAFLAR
            <br />
            VE NOTLAR.
          </span>
          <a
            href={location.pathname}
            className="wordmark"
            aria-label="Journey Notes ana sayfası"
          >
            journey{" "}
            <span className="brand-flower" aria-hidden="true">
              ✳
            </span>{" "}
            <em>notes</em>
            <span className="brand-dot">.</span>
          </a>
          <div className="journal-seal" aria-hidden="true">
            <span>KİŞİSEL ARŞİV</span>
            <svg width="37" height="37" viewBox="0 0 50 50" fill="none">
              <circle
                cx="25"
                cy="25"
                r="19"
                stroke="currentColor"
                strokeWidth=".7"
              />
              <path
                d="m25 6 5 14 14 5-14 5-5 14-5-14-14-5 14-5 5-14Z"
                stroke="currentColor"
              />
              <path d="m25 14 3 11-3 11-3-11 3-11Z" fill="currentColor" />
            </svg>
            <span>JOURNEY NOTES</span>
          </div>
        </div>
        <nav className="nav" aria-label="Ana gezinme">
          <div>
            <a
              href="#archive"
              onClick={(e) => {
                e.preventDefault();
                goSection("archive");
              }}
            >
              Notlar <sup>01</sup>
            </a>
            <a
              href="#collections"
              onClick={(e) => {
                e.preventDefault();
                goSection("collections");
              }}
            >
              Koleksiyonlar <sup>02</sup>
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                goSection("about");
              }}
            >
              Hakkında <sup>03</sup>
            </a>
          </div>
          <button
            aria-label="Kaydettiklerim"
            className={onlySaved ? "saved-link active" : "saved-link"}
            aria-pressed={onlySaved}
            onClick={() => {
              if (selected) goHome();
              setOnlySaved(!onlySaved);
              setFilter("Tümü");
              setQuery("");
              setLimit(9);
              scrollArchive();
            }}
          >
            <Bookmark filled={onlySaved} />
            <span>Kaydettiklerim</span>
            <sup>{saved.length.toString().padStart(2, "0")}</sup>
          </button>
        </nav>
        {selected ? (
          <main className="reader" ref={reader} tabIndex={-1}>
            <button className="back-link" onClick={goHome}>
              <Arrow back /> Deftere dön
            </button>
            <div className="reader-heading">
              <span className="eyebrow">
                <i />
                {selected.category} <span>/</span> NOT {selected.id}
              </span>
              <h1>{selected.title}</h1>
              <p>{selected.summary}</p>
            </div>
            <div className="reader-layout">
              <figure>
                <Picture photo={selected} priority />
                <figcaption>
                  <span>{selected.place || "Journey Notes seçkisi"}</span>
                  <span>№ {selected.id}</span>
                </figcaption>
              </figure>
              <div className="reader-copy">
                <span className="eyebrow">NOT</span>
                {(selected.body.length
                  ? selected.body
                  : [selected.summary]
                ).map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
                <div className="reader-actions">
                  <button
                    className="text-button"
                    onClick={() => toggleSave(selected.id)}
                  >
                    <Bookmark filled={saved.includes(selected.id)} />
                    {saved.includes(selected.id)
                      ? "Kaydedildi"
                      : "Bu notu sakla"}
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(location.href);
                        setStatus("Notun bağlantısı kopyalandı.");
                      } catch {
                        setStatus(
                          "Bağlantıyı adres çubuğundan kopyalayabilirsin.",
                        );
                      }
                    }}
                  >
                    Paylaş <NorthEastMark compact />
                  </button>
                </div>
              </div>
            </div>
            <div className="related">
              <span className="eyebrow">BENZER KARELER</span>
              {all
                .filter(
                  (p) =>
                    p.category === selected.category && p.id !== selected.id,
                )
                .slice(0, 3)
                .map((p) => (
                  <button key={p.id} onClick={() => openNote(p)}>
                    <img src={p.thumbnail} alt="" />
                    <span>{p.title}</span>
                    <Arrow />
                  </button>
                ))}
            </div>
          </main>
        ) : (
          <main>
            <section className="berra-hero" aria-labelledby="berra-intro-title">
              <figure className="berra-portrait">
                <picture>
                  <source srcSet="/journey/berra-4k.avif" type="image/avif" />
                  <img
                    src="/journey/berra.jpg"
                    alt="Berra portresi"
                    width="4096"
                    height="4096"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              </figure>
              <div className="berra-intro-copy">
                <span className="berra-kicker">JOURNEY NOTES</span>
                <h1 id="berra-intro-title">
                  Merhaba,
                  <br />
                  benim adım <em>Arif.</em>
                </h1>
                <p>Bu da benim kişisel blogum.</p>
                <div className="berra-keepsake" aria-hidden="true">
                  <span className="berra-tape" />
                  <img src="/journey/archive/010-small.webp" alt="" />
                </div>
                <button className="berra-enter" onClick={scrollArchive}>
                  Fotoğraflara bak <Arrow />
                </button>
              </div>
              <p className="berra-tease">
                Stalk yaparken 2. kez yakalandın. <span aria-hidden="true">♡</span>
              </p>
            </section>
            <section className="archive" id="archive" ref={archive}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">01 / NOTLAR</span>
                  <h2>
                    Yolda <em>gördüklerim.</em>
                  </h2>
                </div>
                <p>{photos.length} fotoğraf</p>
              </div>
              <div className="toolbar">
                <div className="filters" role="group" aria-label="Kategori">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setFilter(c);
                        setLimit(9);
                      }}
                      aria-pressed={filter === c}
                    >
                      {c}
                      <sup>
                        {
                          all.filter((p) => c === "Tümü" || p.category === c)
                            .length
                        }
                      </sup>
                    </button>
                  ))}
                </div>
                <div className="view-tools">
                  <button
                    className="icon-button"
                    onClick={() => setSearch(!search)}
                    aria-label={search ? "Aramayı kapat" : "Fotoğraflarda ara"}
                    aria-expanded={search}
                  >
                    <SearchIcon />
                  </button>
                  <button
                    className="icon-button layout-button"
                    onClick={() => {
                      setLayout(layout === "journal" ? "index" : "journal");
                      setLimit(18);
                    }}
                    aria-label={
                      layout === "journal"
                        ? "Kompakt arşiv görünümü"
                        : "Blog görünümü"
                    }
                    aria-pressed={layout === "index"}
                  >
                    {layout === "journal" ? "▦" : "▤"}
                  </button>
                </div>
              </div>
              {search && (
                <div className="search-row">
                  <SearchIcon />
                  <input
                    ref={searchInput}
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(9);
                    }}
                    placeholder="Yer veya başlık ara"
                    aria-label="Notlarda ara"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearch(false);
                        setQuery("");
                      }
                    }}
                  />
                  <span>{filtered.length} not</span>
                  <button
                    onClick={() => {
                      setSearch(false);
                      setQuery("");
                    }}
                    aria-label="Aramayı temizle ve kapat"
                  >
                    ×
                  </button>
                </div>
              )}
              {onlySaved && (
                <div className="selection-bar">
                  <span>Kaydedilenler · Bu tarayıcıda saklanır.</span>
                  <button onClick={() => setOnlySaved(false)}>
                    Bütün notlar <Arrow />
                  </button>
                </div>
              )}
              {drafts.length > 0 && (
                <div className="selection-bar">
                  <span>
                    Yerel taslak önizlemesi · Ziyaretçilere yayınlanmadı.
                  </span>
                  <button onClick={() => setDrafts([])}>
                    Önizlemeyi kapat ×
                  </button>
                </div>
              )}
              <div className={`stories ${layout}`}>
                {filtered.slice(0, limit).map((p, i) => (
                  <Fragment key={p.id}>
                    <article className="story">
                      <div className="story-image">
                        <button
                          className="image-link"
                          data-note={p.id}
                          onClick={() => openNote(p)}
                          aria-label={`${p.title} notunu oku`}
                        >
                          <Picture photo={p} />
                          <span className="image-overlay">
                            <Arrow />
                          </span>
                        </button>
                        <button
                          className="save-photo"
                          onClick={() => toggleSave(p.id)}
                          aria-label={`${p.title}: ${saved.includes(p.id) ? "Kaydedilenlerden çıkar" : "Kaydet"}`}
                          aria-pressed={saved.includes(p.id)}
                        >
                          <Bookmark filled={saved.includes(p.id)} />
                        </button>
                      </div>
                      <div className="story-meta">
                        <span>{p.place || p.category}</span>
                        <span>№ {p.id}</span>
                      </div>
                      <h3>
                        <button onClick={() => openNote(p)}>{p.title}</button>
                      </h3>
                    </article>

                  </Fragment>
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="empty">
                  <span>✳</span>
                  <h3>
                    {onlySaved
                      ? "Bu sayfa henüz boş."
                      : "Burada bir not bulamadık."}
                  </h3>
                  <p>
                    {onlySaved
                      ? "Fotoğraflardaki ayraç simgesine dokunarak kendi seçkini oluşturabilirsin."
                      : "Başka bir kelimeyle aramayı deneyebilirsin."}
                  </p>
                  <button
                    className="read-link"
                    onClick={() => {
                      setOnlySaved(false);
                      setFilter("Tümü");
                      setQuery("");
                    }}
                  >
                    Bütün notlara dön <Arrow />
                  </button>
                </div>
              )}
              <div className="archive-end">
                <span className="eyebrow">
                  {Math.min(limit, filtered.length)} / {filtered.length} NOT
                </span>
                {limit < filtered.length ? (
                  <button
                    className="more-button"
                    onClick={() => setLimit(limit + 9)}
                  >
                    Daha fazla <span>+</span>
                  </button>
                ) : (
                  <span className="end-message">
                    Arşivin sonu.
                  </span>
                )}
                <span className="tiny-flower" aria-hidden="true">
                  ✳
                </span>
              </div>
            </section>
            <section className="collections" id="collections">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">02 / KOLEKSİYONLAR</span>
                  <h2>
                    Üç <em>seçki.</em>
                  </h2>
                </div>
                <p>Doğa · Sokak · Mimari</p>
              </div>
              <div className="collection-grid">
                {[
                  {
                    name: "Doğa",
                    category: "Doğa",
                    ids: ["020", "012", "050"],
                    no: "I",
                  },
                  {
                    name: "Sokak",
                    category: "Sokak",
                    ids: ["022", "073", "009"],
                    no: "II",
                  },
                  {
                    name: "Mimari",
                    category: "Mimari",
                    ids: ["010", "103", "032"],
                    no: "III",
                  },
                ].map((c) => (
                  <button
                    className="collection"
                    key={c.no}
                    onClick={() => choose(c.category)}
                  >
                    <div className="collection-stack">
                      {c.ids.map((id) => (
                        <img
                          key={id}
                          src={photos.find((p) => p.id === id)!.thumbnail}
                          alt=""
                          loading="lazy"
                        />
                      ))}
                      <span>{c.no}</span>
                    </div>
                    <div className="collection-label">
                      <h3>{c.name}</h3>
                      <Arrow />
                    </div>
                    <span className="eyebrow">
                      {photos.filter((p) => p.category === c.category).length}{" "}
                      KARE / {c.category}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="about" id="about">
              <div className="about-photo">
                <img
                  src={photos.find((p) => p.id === "107")!.thumbnail}
                  alt="Ağaçların arasından geçen bir yol"
                  loading="lazy"
                />
                <span>ARŞİVDEN · 107</span>
              </div>
              <div className="about-copy">
                <span className="eyebrow">03 / HAKKINDA</span>
                <h2>
                  Merhaba, ben <em>Berra.</em>
                </h2>
                <p>
                  Journey Notes, gezdiğim yerlerden saklamak istediğim
                  fotoğrafları ve kısa notları bir araya getirdiğim kişisel arşivim.
                </p>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-button"
                >
                  @journey_notess <Arrow />
                </a>
              </div>
              <span className="about-flower" aria-hidden="true">
                ✳
              </span>
            </section>
          </main>
        )}
        <footer className="footer">
          <div className="footer-top">
            <a href={location.pathname} className="footer-logo">
              journey <em>notes.</em>
            </a>
            <p>FOTOĞRAF · SEYAHAT · KİŞİSEL ARŞİV</p>
            <a href="#" aria-label="Sayfanın başına dön" className="back-top">
              ↑
            </a>
          </div>
          <div className="footer-bottom">
            <a href="/">SNMEZ.XYZ'NİN BİR PARÇASI ↗</a>
            <span>© {new Date().getFullYear()} JOURNEY NOTES</span>
            <button onClick={openStudio}>TASLAK STÜDYOSU ↗</button>
          </div>
        </footer>
      </div>
      {route === "#studio" && (
        <Suspense
          fallback={
            <div className="loading-studio" role="status">
              Stüdyo açılıyor…
            </div>
          }
        >
          <Studio
            onClose={goHome}
            onPreview={(items) => {
              setDrafts(items);
              goHome();
              setFilter("Tümü");
              setOnlySaved(false);
              setLimit(9);
              scrollArchive();
            }}
          />
        </Suspense>
      )}
      <div className={`toast ${status ? "visible" : ""}`} role="status">
        {status}
      </div>
    </>
  );
}
