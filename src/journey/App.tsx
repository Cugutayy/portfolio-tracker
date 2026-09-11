import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { photos, categories, normalize, type Photo } from "./data";
import "./style.css";
const Studio = lazy(() => import("./studio"));
const instagram = "https://www.instagram.com/journey_notess/";
function Arrow({ back = false }: { back?: boolean }) {
  const Icon = back ? ChevronLeft : ChevronRight;
  return <Icon className="jn-icon" size={16} strokeWidth={1.7} aria-hidden="true" />;
}

function NorthEastMark({ compact = false }: { compact?: boolean }) {
  return (
    <ArrowUpRight
      className={compact ? "jn-icon is-compact" : "jn-icon"}
      size={compact ? 15 : 17}
      strokeWidth={1.7}
      aria-hidden="true"
    />
  );
}

function ThemeDial({ dark }: { dark: boolean }) {
  const Icon = dark ? Sun : Moon;
  return <Icon className="jn-icon" size={17} strokeWidth={1.7} aria-hidden="true" />;
}

function SearchIcon() {
  return <Search className="jn-icon" size={16} strokeWidth={1.7} aria-hidden="true" />;
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

function StudioGate({
  onClose,
  onPreview,
}: {
  onClose: () => void;
  onPreview: (photos: Photo[]) => void;
}) {
  const [state, setState] = useState<"checking" | "locked" | "ready" | "error">("checking");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/journey-studio-auth", { credentials: "same-origin" })
      .then(async (r) => {
        if (r.ok) setState("ready");
        else if (r.status === 401) setState("locked");
        else {
          setState("error");
          setMessage((await r.json().catch(() => null))?.error || "Yönetim erişimi yapılandırılmamış.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Yönetim servisine ulaşılamadı.");
      });
  }, []);

  if (state === "ready") {
    return <Studio onClose={onClose} onPreview={onPreview} />;
  }

  return (
    <div className="studio-login" role="dialog" aria-modal="true" aria-labelledby="studio-login-title">
      <div className="studio-login-card">
        <button className="studio-login-close" onClick={onClose} aria-label="Yönetimi kapat">
          <X size={17} strokeWidth={1.7} />
        </button>
        <span className="eyebrow">YÖNETİM</span>
        <h2 id="studio-login-title">Fotoğraf ekle.</h2>
        <p>Bu alan yalnızca site yöneticisine açık.</p>
        {state === "checking" ? (
          <p className="studio-login-status">Kontrol ediliyor…</p>
        ) : state === "error" ? (
          <p className="studio-login-status is-error">{message}</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage("");
              const r = await fetch("/api/journey-studio-auth", {
                method: "POST",
                headers: { "content-type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ password }),
              }).catch(() => null);
              if (r?.ok) {
                setPassword("");
                setState("ready");
              } else {
                const data = await r?.json().catch(() => null);
                setMessage(data?.error || "Giriş başarısız.");
              }
            }}
          >
            <label>
              <span>PAROLA</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </label>
            {message && <p className="studio-login-status is-error">{message}</p>}
            <button type="submit" className="studio-login-submit">Giriş yap</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [filter, setFilter] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(false);
  const [layout, setLayout] = useState("journal");
  const [limit, setLimit] = useState(9999);
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
      : "stalklıyorum";
    if (selected) {
      window.scrollTo({ top: 0, behavior: "instant" });
      reader.current?.focus({ preventScroll: true });
    }
  }, [selected?.id]);
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
    setQuery("");
    setLimit(9999);
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
          <a className="home-link" href={location.pathname} aria-label="stalklıyorum">
            <span className="mini-mark">s.</span>
            <span>stalklıyorum</span>
          </a>
          <div className="header-tools">
            <a
              href={instagram}
              target="_blank"
              rel="noreferrer"
              className="jn-instagram-link"
              aria-label="Journey Notes Instagram hesabını yeni sekmede aç"
            >
              <span className="jn-instagram-handle">@journey_notss</span>
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
            <em>notes</em>
            <span className="brand-dot">.</span>
          </a>
          <div className="journal-seal" aria-hidden="true">
            <span className="journal-seal-top">VOL. 01</span>
            <strong className="journal-seal-mid">JN</strong>
            <span className="journal-seal-bottom">2026</span>
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
            <section className="journey-profile-hero" aria-labelledby="journey-profile-intro-title">
              <figure className="journey-profile-portrait">
                <picture>
                  <source srcSet="/journey/portrait-hq.avif" type="image/avif" />
                  <img
                    src="/journey/portrait-hq.avif"
                    alt="Bulanık portre"
                    width="800"
                    height="800"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              </figure>
              <div className="journey-profile-intro-copy">
                <span className="journey-profile-kicker">JOURNEY NOTES</span>
                <h1 id="journey-profile-intro-title">
                  Merhaba,
                  <br />
                  benim adım <em>arifv216.</em>
                </h1>
                <p>Bu da benim kişisel blogum.</p>
                <button className="journey-profile-enter" onClick={scrollArchive}>
                  <span>Arşivi keşfet</span>
                  <Arrow />
                </button>
              </div>
              <p className="journey-profile-tease">
                Stalk yaparken 2. kez yakalandın.
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
                        setLimit(9999);
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
                      setLimit(9999);
                    }}
                    aria-label={
                      layout === "journal"
                        ? "Kompakt arşiv görünümü"
                        : "Blog görünümü"
                    }
                    aria-pressed={layout === "index"}
                  >
                    <span className="layout-mode-label">{layout === "index" ? "INDEX" : "JOURNAL"}</span>
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
                      setLimit(9999);
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
                  ><X className="jn-icon" size={16} strokeWidth={1.7} aria-hidden="true" /></button>
                </div>
              )}
              {drafts.length > 0 && (
                <div className="selection-bar">
                  <span>
                    Yerel taslak önizlemesi · Ziyaretçilere yayınlanmadı.
                  </span>
                  <button onClick={() => setDrafts([])}>
                    Önizlemeyi kapat
                  </button>
                </div>
              )}
              <div className={`stories ${layout}`}>
                {filtered.map((p, i) => (
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
                  <span className="empty-index">00</span>
                  <h3>Burada bir not bulamadık.</h3>
                  <p>Başka bir kelimeyle aramayı deneyebilirsin.</p>
                  <button
                    className="read-link"
                    onClick={() => {
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
                <span className="end-message">Arşivin sonu.</span>
                <span className="tiny-flower" aria-hidden="true">
                  
                </span>
              </div>
            </section>
            <section className="collections" id="collections">
              <div className="collection-index-head">
                <span className="eyebrow">02 / KOLEKSİYONLAR</span>
                <div>
                  <h2>Koleksiyonlar</h2>
                  <p>03 KATEGORİ · {photos.length} FOTOĞRAF</p>
                </div>
              </div>
              <div className="collection-index">
                {[
                  {
                    name: "Doğa",
                    category: "Doğa",
                    ids: ["020", "012", "050"],
                  },
                  {
                    name: "Sokak",
                    category: "Sokak",
                    ids: ["022", "073", "009"],
                  },
                  {
                    name: "Mimari",
                    category: "Mimari",
                    ids: ["010", "103", "032"],
                  },
                ].map((c, index) => {
                  const count = photos.filter((p) => p.category === c.category).length;
                  return (
                    <button
                      className="collection-row"
                      key={c.category}
                      onClick={() => choose(c.category)}
                    >
                      <span className="collection-no">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="collection-name">{c.name}</span>
                      <span className="collection-count">{count} KARE</span>
                      <span className="collection-preview" aria-hidden="true">
                        {c.ids.map((id) => (
                          <img
                            key={id}
                            src={photos.find((p) => p.id === id)!.thumbnail}
                            alt=""
                            loading="lazy"
                          />
                        ))}
                      </span>
                      <ChevronRight
                        className="collection-chevron"
                        size={18}
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
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
                  Ben <em>arifv216.</em>
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
                  @journey_notss
                </a>
              </div>
              <span className="about-flower" aria-hidden="true">
                
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
              BAŞA DÖN
            </a>
          </div>
          <div className="footer-bottom">
            <span>stalklıyorum</span>
            <span>© {new Date().getFullYear()} JOURNEY NOTES</span>
            <button onClick={openStudio}>YÖNETİM</button>
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
          <StudioGate
            onClose={goHome}
            onPreview={(items) => {
              setDrafts(items);
              goHome();
              setFilter("Tümü");
                        setLimit(9999);
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
