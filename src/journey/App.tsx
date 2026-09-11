import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { photos, categories, normalize, type Photo } from "./data";
import {
  getJourneySession,
  loadPublishedJourneyPhotos,
  signInJourney,
  supabaseConfigured,
} from "./supabase";
import "./style.css";

const Studio = lazy(() => import("./studio"));
const instagram = "https://www.instagram.com/journey_notess/";

function Arrow({ back = false }: { back?: boolean }) {
  const Icon = back ? ChevronLeft : ChevronRight;
  return <Icon size={17} strokeWidth={1.55} aria-hidden="true" />;
}

function Picture({
  photo,
  priority = false,
  className = "",
  sizes = "(max-width: 760px) 92vw, 44vw",
}: {
  photo: Photo;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <img
      className={className}
      src={photo.src}
      srcSet={
        priority || photo.thumbnail === photo.src
          ? undefined
          : `${photo.thumbnail} ${photo.smallWidth || 640}w, ${photo.src} ${photo.largeWidth || Math.min(photo.width, 1440)}w`
      }
      sizes={sizes}
      alt={photo.title || photo.place || "Seyahat fotoğrafı"}
      width={photo.width}
      height={photo.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

function StudioGate({
  onClose,
  onPreview,
}: {
  onClose: () => void;
  onPreview: (items: Photo[]) => void;
}) {
  const [state, setState] = useState<"checking" | "locked" | "ready" | "error">(
    "checking",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    if (!supabaseConfigured) {
      setState("error");
      setMessage("Supabase bağlantısı henüz yapılandırılmadı.");
      return;
    }

    getJourneySession()
      .then((session) => {
        if (!alive) return;
        setState(session ? "ready" : "locked");
        if (session?.user.email) setEmail(session.user.email);
      })
      .catch(() => {
        if (alive) setState("locked");
      });

    return () => {
      alive = false;
    };
  }, []);

  if (state === "ready") {
    return (
      <Studio
        onClose={onClose}
        onPreview={onPreview}
        onSignedOut={() => {
          setPassword("");
          setState("locked");
        }}
      />
    );
  }

  return (
    <div
      className="studio-login"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-login-title"
    >
      <div className="studio-login-card">
        <button
          className="studio-login-close"
          onClick={onClose}
          aria-label="Yönetimi kapat"
        >
          <X size={17} strokeWidth={1.7} />
        </button>
        <span className="jn-kicker">YÖNETİM</span>
        <h2 id="studio-login-title">Fotoğraf ekle.</h2>
        <p>Bu alan Supabase Auth ile yalnızca site yöneticisine açık.</p>

        {state === "checking" ? (
          <p className="studio-login-status">Oturum kontrol ediliyor…</p>
        ) : state === "error" ? (
          <p className="studio-login-status is-error">{message}</p>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              try {
                await signInJourney(email.trim(), password);
                setPassword("");
                setState("ready");
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Giriş başarısız.",
                );
              }
            }}
          >
            <label>
              <span>E-POSTA</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              <span>PAROLA</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {message && (
              <p className="studio-login-status is-error">{message}</p>
            )}
            <button type="submit" className="studio-login-submit">
              Giriş yap
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [filter, setFilter] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [route, setRoute] = useState(location.hash);
  const [drafts, setDrafts] = useState<Photo[]>([]);
  const [remotePhotos, setRemotePhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState("");

  const searchInput = useRef<HTMLInputElement>(null);
  const archiveRef = useRef<HTMLElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const returnScroll = useRef(0);

  const all = Array.from(
    new Map([...photos, ...remotePhotos, ...drafts].map((photo) => [photo.id, photo])).values(),
  );

  const selected = all.find((photo) => route === `#note=${photo.id}`);
  const filtered = all.filter(
    (photo) =>
      (filter === "Tümü" || photo.category === filter) &&
      normalize(
        `${photo.title} ${photo.summary} ${photo.place} ${photo.category}`,
      ).includes(normalize(query)),
  );

  const hero = all.find((photo) => photo.id === "108") || all[0];
  const heroAsset = "/journey/hero-snow.avif";
  const knownPlaces = Array.from(
    new Set(all.map((photo) => photo.place.trim()).filter(Boolean)),
  );
  const editorialIds = ["010", "012", "055"];
  const editorial = editorialIds
    .map((id) => all.find((photo) => photo.id === id))
    .filter((photo): photo is Photo => Boolean(photo));

  const aboutPhoto =
    all.find((photo) => photo.id === "107") ||
    all.find((photo) => photo.category === "Doğa") ||
    all[0];

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
    let alive = true;
    loadPublishedJourneyPhotos()
      .then((rows) => {
        if (alive) setRemotePhotos(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 4200);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    document.title = selected
      ? `${selected.title || selected.place || "Fotoğraf"} · Journey Notes`
      : "Journey Notes · stalklıyorum";

    if (selected) {
      window.scrollTo({ top: 0, behavior: "auto" });
      readerRef.current?.focus({ preventScroll: true });
    }
  }, [selected?.id]);

  const openNote = (photo: Photo) => {
    returnScroll.current = window.scrollY;
    history.pushState(null, "", `#note=${photo.id}`);
    setRoute(location.hash);
  };

  const goHome = () => {
    history.replaceState(null, "", location.pathname);
    setRoute("");
    requestAnimationFrame(() => {
      window.scrollTo({ top: returnScroll.current, behavior: "auto" });
    });
  };

  const scrollToArchive = () => {
    requestAnimationFrame(() =>
      archiveRef.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      }),
    );
  };

  const chooseCategory = (category: string) => {
    setFilter(category);
    setQuery("");
    if (selected) goHome();
    requestAnimationFrame(scrollToArchive);
  };

  const choosePlace = (place: string) => {
    setFilter("Tümü");
    setQuery(place);
    if (selected) goHome();
    requestAnimationFrame(scrollToArchive);
  };

  const openStudio = () => {
    returnScroll.current = window.scrollY;
    history.pushState(null, "", "#studio");
    setRoute("#studio");
  };

  const shareSelected = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setStatus("Notun bağlantısı kopyalandı.");
    } catch {
      setStatus("Bağlantıyı adres çubuğundan kopyalayabilirsin.");
    }
  };

  return (
    <>
      <a className="jn-skip" href="#archive">
        Arşive geç
      </a>

      <div className="jn-site">
        <header className="jn-header">
          <a className="jn-small-brand" href={location.pathname}>
            stalklıyorum
          </a>

          <a className="jn-wordmark" href={location.pathname}>
            journey <em>notes</em>
          </a>

          <div className="jn-header-actions">
            <a href={instagram} target="_blank" rel="noreferrer">
              @journey_notess
            </a>
            <button
              onClick={() => {
                setSearchOpen(true);
                if (selected) goHome();
                requestAnimationFrame(scrollToArchive);
              }}
              aria-label="Arşivde ara"
            >
              <Search size={16} strokeWidth={1.6} />
            </button>
          </div>
        </header>

        <nav className="jn-nav" aria-label="Journey Notes">
          <a href="#edit">Seçki</a>
          <a href="#places">Yerler</a>
          <a href="#archive">Arşiv</a>
          <a href="#about">Hakkında</a>
        </nav>

        {selected ? (
          <main className="jn-reader" ref={readerRef} tabIndex={-1}>
            <button className="jn-back" onClick={goHome}>
              <Arrow back /> Geri dön
            </button>

            <header className="jn-reader-heading">
              <span className="jn-kicker">
                {selected.category} · NOT {selected.id}
              </span>
              {selected.title && <h1>{selected.title}</h1>}
              <p>{selected.summary}</p>
            </header>

            <figure className="jn-reader-image">
              <Picture
                photo={selected}
                priority
                sizes="(max-width: 760px) 94vw, 1100px"
              />
              <figcaption>
                <span>{selected.place || "Journey Notes seçkisi"}</span>
                <span>№ {selected.id}</span>
              </figcaption>
            </figure>

            <div className="jn-reader-copy">
              <span className="jn-kicker">NOT</span>
              {(selected.body.length ? selected.body : [selected.summary]).map(
                (paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ),
              )}
              <button className="jn-text-link" onClick={shareSelected}>
                Paylaş <ArrowUpRight size={16} strokeWidth={1.55} />
              </button>
            </div>

            <section className="jn-related" aria-labelledby="related-title">
              <div className="jn-section-head">
                <span className="jn-kicker" id="related-title">
                  BENZER KARELER
                </span>
              </div>
              <div className="jn-related-grid">
                {all
                  .filter(
                    (photo) =>
                      photo.category === selected.category &&
                      photo.id !== selected.id,
                  )
                  .slice(0, 3)
                  .map((photo) => (
                    <button key={photo.id} onClick={() => openNote(photo)}>
                      <Picture photo={photo} />
                      {(photo.title || photo.place) && (
                        <span>{photo.title || photo.place}</span>
                      )}
                      <Arrow />
                    </button>
                  ))}
              </div>
            </section>
          </main>
        ) : (
          <main>
            {hero && (
              <section className="jn-cover" aria-labelledby="journey-hero-title">
                <div className="jn-cover-media" aria-label="Journey Notes giriş fotoğrafı">
                  <img
                    src={heroAsset}
                    alt="Karlı kayalıklar önünde kış manzarası"
                    width="1672"
                    height="941"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = hero.src;
                    }}
                  />
                </div>

                <div className="jn-cover-caption">
                  <div>
                    <span className="jn-kicker">PERSONAL TRAVEL JOURNAL · 2026</span>
                    <h1 id="journey-hero-title">Journey Notes</h1>
                  </div>
                  <div className="jn-cover-note">
                    <p>
                      Gezdiğim yerlerden seçtiğim fotoğraflar, kısa notlar ve
                      dönüp tekrar bakmak istediğim anlardan oluşan kişisel bir
                      görsel arşiv.
                    </p>
                    <button onClick={scrollToArchive}>
                      Fotoğraflara geç <Arrow />
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="jn-intro">
              <span className="jn-kicker">JOURNEY NOTES</span>
              <p>
                Fotoğraf burada ana karakter. Yerini kesin bildiğim karelerde
                yalnızca lokasyon adını kullanıyorum; bilmediğim yerde görüntü
                kendi başına kalıyor.
              </p>
            </section>

            <section className="jn-edit" id="edit">
              <div className="jn-section-head">
                <div>
                  <span className="jn-kicker">THE EDIT · 01</span>
                  <h2>Seçilen kareler.</h2>
                </div>
                <p>Fotoğraf ön planda, metin yalnızca gerektiği kadar.</p>
              </div>

              <div className="jn-edit-grid">
                {editorial.map((photo, index) => (
                  <article
                    className={index === 0 ? "jn-feature is-lead" : "jn-feature"}
                    key={photo.id}
                  >
                    <button onClick={() => openNote(photo)}>
                      <div className="jn-feature-image">
                        <Picture
                          photo={photo}
                          sizes={
                            index === 0
                              ? "(max-width: 760px) 92vw, 820px"
                              : "(max-width: 760px) 92vw, 480px"
                          }
                        />
                      </div>
                      <span className="jn-kicker">
                        {photo.place || photo.category}
                      </span>
                      {photo.title && <h3>{photo.title}</h3>}
                      <p>{photo.summary}</p>
                      <span className="jn-read-more">
                        Notu aç <Arrow />
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="jn-places" id="places">
              <div className="jn-places-inner">
                <div className="jn-section-head is-dark">
                  <div>
                    <span className="jn-kicker">PLACES · 02</span>
                    <h2>Yerler.</h2>
                  </div>
                  <p>Yalnızca konumundan emin olduğum kareler.</p>
                </div>

                <div className="jn-place-list">
                  {knownPlaces.map((place, index) => {
                    const matches = all.filter((photo) => photo.place === place);
                    const preview =
                      matches.find(
                        (photo) => Math.max(photo.width, photo.height) >= 1080,
                      ) || matches[0];

                    return (
                      <button key={place} onClick={() => choosePlace(place)}>
                        <span className="jn-place-no">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="jn-place-name">{place}</span>
                        <span className="jn-place-count">
                          {matches.length} kare
                        </span>
                        {preview && (
                          <span className="jn-place-preview" aria-hidden="true">
                            <Picture photo={preview} />
                          </span>
                        )}
                        <ChevronRight size={20} strokeWidth={1.4} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="jn-archive" id="archive" ref={archiveRef}>
              <div className="jn-section-head">
                <div>
                  <span className="jn-kicker">ARCHIVE · 03</span>
                  <h2>Fotoğraflar.</h2>
                </div>
                <p>{filtered.length} kare</p>
              </div>

              <div className="jn-toolbar">
                <div className="jn-filters" role="group" aria-label="Kategori">
                  {categories.map((category) => (
                    <button
                      key={category}
                      aria-pressed={filter === category}
                      onClick={() => {
                        setFilter(category);
                        setQuery("");
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <button
                  className="jn-search-toggle"
                  onClick={() => setSearchOpen((value) => !value)}
                  aria-expanded={searchOpen}
                >
                  <Search size={15} strokeWidth={1.6} />
                  Ara
                </button>
              </div>

              {searchOpen && (
                <div className="jn-search-row">
                  <Search size={17} strokeWidth={1.5} />
                  <input
                    ref={searchInput}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Yer, başlık veya kategori ara"
                    aria-label="Journey Notes aramasında ara"
                  />
                  <span>{filtered.length} sonuç</span>
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    aria-label="Aramayı kapat"
                  >
                    <X size={17} strokeWidth={1.6} />
                  </button>
                </div>
              )}

              {drafts.length > 0 && (
                <div className="jn-preview-note">
                  <span>Yerel taslak önizlemesi açık.</span>
                  <button onClick={() => setDrafts([])}>Kapat</button>
                </div>
              )}

              <div className="jn-archive-grid">
                {filtered.map((photo, index) => {
                  const largeEnough =
                    photo.width >= 1200 && photo.height >= 900;
                  const lowResolution =
                    Math.max(photo.width, photo.height) < 1080;
                  const wide =
                    largeEnough && (index % 9 === 0 || index % 9 === 5);

                  return (
                    <article
                      className={[
                        "jn-entry",
                        wide ? "is-wide" : "",
                        lowResolution ? "is-lowres" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={photo.id}
                    >
                      <button onClick={() => openNote(photo)}>
                        <div className="jn-entry-image">
                          <Picture
                            photo={photo}
                            sizes={
                              wide
                                ? "(max-width: 760px) 92vw, 820px"
                                : "(max-width: 760px) 92vw, 420px"
                            }
                          />
                        </div>
                        <div className="jn-entry-meta">
                          <span>{photo.place || photo.category}</span>
                          <span>№ {photo.id}</span>
                        </div>
                        {photo.title && <h3>{photo.title}</h3>}
                      </button>
                    </article>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="jn-empty">
                  <h3>Burada bir kare bulamadım.</h3>
                  <button
                    onClick={() => {
                      setFilter("Tümü");
                      setQuery("");
                    }}
                  >
                    Bütün arşive dön <Arrow />
                  </button>
                </div>
              )}
            </section>

            <section className="jn-about" id="about">
              {aboutPhoto && (
                <figure className="jn-about-image">
                  <Picture
                    photo={aboutPhoto}
                    sizes="(max-width: 760px) 92vw, 620px"
                  />
                </figure>
              )}
              <div className="jn-about-copy">
                <span className="jn-kicker">ABOUT · 04</span>
                <h2>Biriktirmek için çekiyorum.</h2>
                <p>
                  Journey Notes, gezdiğim yerlerden saklamak istediğim
                  fotoğrafları ve kısa notları bir araya getirdiğim kişisel
                  arşiv. Her kare kendi yolculuğumdan.
                </p>
                <a href={instagram} target="_blank" rel="noreferrer">
                  Instagram’da gör <ArrowUpRight size={16} strokeWidth={1.55} />
                </a>
              </div>
            </section>
          </main>
        )}

        <footer className="jn-footer">
          <div>
            <a className="jn-footer-brand" href={location.pathname}>
              journey <em>notes</em>
            </a>
            <p>Fotoğraf · seyahat · kişisel arşiv</p>
          </div>
          <div className="jn-footer-links">
            <a href={instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <button onClick={openStudio}>Yönetim</button>
          </div>
          <span>© {new Date().getFullYear()}</span>
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
              requestAnimationFrame(scrollToArchive);
            }}
          />
        </Suspense>
      )}

      <div className={`jn-toast ${status ? "is-visible" : ""}`} role="status">
        {status}
      </div>
    </>
  );
}
