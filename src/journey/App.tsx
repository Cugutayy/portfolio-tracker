import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Instagram,
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
      sizes={sizes}
      alt={photo.title || photo.place || "Seyahat fotoğrafı"}
      width={photo.width}
      height={photo.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
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
  const [albumSize, setAlbumSize] = useState<"compact" | "standard" | "large">(
    () => {
      try {
        const saved = localStorage.getItem("journey-album-size");
        return saved === "compact" || saved === "large" ? saved : "standard";
      } catch {
        return "standard";
      }
    },
  );
  const [readerIds, setReaderIds] = useState<string[]>([]);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev" | "">("");

  const searchInput = useRef<HTMLInputElement>(null);
  const archiveRef = useRef<HTMLElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const returnScroll = useRef(0);
  const returnRoute = useRef("");
  const touchStartX = useRef<number | null>(null);

  const all = Array.from(
    new Map([...photos, ...remotePhotos, ...drafts].map((photo) => [photo.id, photo])).values(),
  );

  const selected = all.find((photo) => route === `#note=${photo.id}`);
  const albumOpen = route === "#album";
  const readerSequence = (readerIds.length ? readerIds : all.map((photo) => photo.id))
    .map((id) => all.find((photo) => photo.id === id))
    .filter((photo): photo is Photo => Boolean(photo));
  const readerIndex = selected
    ? readerSequence.findIndex((photo) => photo.id === selected.id)
    : -1;
  const filtered = all.filter(
    (photo) =>
      (filter === "Tümü" || photo.category === filter) &&
      normalize(
        `${photo.title} ${photo.summary} ${photo.place} ${photo.category}`,
      ).includes(normalize(query)),
  );

  const hero = all.find((photo) => photo.id === "108") || all[0];
  const heroAsset = "/journey/hero-snow.webp";
  const knownPlaces = Array.from(
    new Set(all.map((photo) => photo.place.trim()).filter(Boolean)),
  );
  const exhibitionIds = ["010", "012", "009", "055", "103", "045", "108", "097"];
  const exhibition = exhibitionIds
    .map((id) => all.find((photo) => photo.id === id))
    .filter((photo): photo is Photo => Boolean(photo))
    .filter((photo) => Math.max(photo.width, photo.height) >= 1200);

  const categoryPreviews = categories
    .filter((category) => category !== "Tümü")
    .map((category) => ({
      category,
      photo:
        all.find(
          (photo) =>
            photo.category === category &&
            Math.max(photo.width, photo.height) >= 1200,
        ) || all.find((photo) => photo.category === category),
    }))
    .filter(
      (item): item is { category: string; photo: Photo } => Boolean(item.photo),
    );

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
    try {
      localStorage.setItem("journey-album-size", albumSize);
    } catch {}
  }, [albumSize]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 4200);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!selected || !readerSequence.length) return;
    const currentIndex = readerIndex >= 0 ? readerIndex : 0;
    const nearby = [
      readerSequence[(currentIndex - 1 + readerSequence.length) % readerSequence.length],
      readerSequence[(currentIndex + 1) % readerSequence.length],
    ];
    nearby.forEach((photo) => {
      if (!photo?.src) return;
      const image = new Image();
      image.src = photo.src;
    });
  }, [selected?.id, readerIds.join("|"), remotePhotos.length, drafts.length]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveReader(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveReader(-1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeNote();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [selected?.id, readerIds.join("|")]);

  useEffect(() => {
    document.title = selected
      ? `${selected.title || selected.place || "Fotoğraf"} · Journey Notes`
      : albumOpen
        ? "Albüm · Journey Notes"
        : "Journey Notes · stalklıyorum";

    if (selected) {
      window.scrollTo({ top: 0, behavior: "auto" });
      readerRef.current?.focus({ preventScroll: true });
    } else if (albumOpen) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [selected?.id, albumOpen]);

  const openNote = (photo: Photo, sequence: Photo[] = all) => {
    returnScroll.current = window.scrollY;
    returnRoute.current = route;
    setReaderIds(sequence.map((item) => item.id));
    setSlideDirection("");
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

  const closeNote = () => {
    if (returnRoute.current === "#album") {
      history.replaceState(null, "", "#album");
      setRoute("#album");
      requestAnimationFrame(() => {
        window.scrollTo({ top: returnScroll.current, behavior: "auto" });
      });
      return;
    }
    goHome();
  };

  const moveReader = (step: number) => {
    if (!selected || !readerSequence.length) return;
    const currentIndex = readerIndex >= 0 ? readerIndex : 0;
    const nextIndex =
      (currentIndex + step + readerSequence.length) % readerSequence.length;
    const next = readerSequence[nextIndex];
    setSlideDirection(step > 0 ? "next" : "prev");
    history.replaceState(null, "", `#note=${next.id}`);
    setRoute(location.hash);
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

  const openAlbum = () => {
    history.pushState(null, "", "#album");
    setRoute("#album");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };

  const chooseCategory = (category: string) => {
    setFilter(category);
    setQuery("");
    openAlbum();
  };

  const choosePlace = (place: string) => {
    setFilter("Tümü");
    setQuery(place);
    openAlbum();
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
      <a className="jn-skip" href={albumOpen ? "#album-grid" : "#edit"}>
        İçeriğe geç
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
            <a
              className="jn-instagram-link"
              href={instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Journey Notes Instagram"
            >
              <Instagram size={13} strokeWidth={1.55} aria-hidden="true" />
              <span>@journey_notess</span>
            </a>
            <button
              onClick={() => {
                setSearchOpen(true);
                history.pushState(null, "", "#album");
                setRoute("#album");
                requestAnimationFrame(() => searchInput.current?.focus());
              }}
              aria-label="Arşivde ara"
            >
              <Search size={16} strokeWidth={1.6} />
            </button>
          </div>
        </header>

        <nav className="jn-nav" aria-label="Journey Notes">
          <a href="#edit">Seçki</a>
          <button className="jn-nav-album" type="button" onClick={openAlbum}>
            <span>Albüm</span>
            <small>{all.length}</small>
          </button>
          <a href="#places">Yerler</a>
          <a href="#about">Hakkında</a>
        </nav>

        {selected ? (
          <main className="jn-reader" ref={readerRef} tabIndex={-1}>
            <button className="jn-back" onClick={closeNote}>
              <Arrow back /> Geri dön
            </button>

            <header className="jn-reader-heading">
              <span className="jn-kicker">
                {selected.category} · NOT {selected.id}
              </span>
              {selected.title && <h1>{selected.title}</h1>}
              <p>{selected.summary}</p>
            </header>

            <figure
              key={selected.id}
              className={`jn-reader-image ${slideDirection ? `is-slide-${slideDirection}` : ""}`}
              style={{ maxWidth: `${Math.min(selected.width, 1400)}px` }}
              onTouchStart={(event) => {
                touchStartX.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                if (touchStartX.current === null) return;
                const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
                const delta = endX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(delta) < 42) return;
                moveReader(delta < 0 ? 1 : -1);
              }}
            >
              <div className="jn-reader-stage">
                <button
                  className="jn-reader-nav is-prev"
                  onClick={() => moveReader(-1)}
                  aria-label="Önceki fotoğraf"
                >
                  <ChevronLeft size={22} strokeWidth={1.35} />
                </button>
                <Picture
                  photo={selected}
                  priority
                  sizes="(max-width: 760px) 94vw, 1100px"
                />
                <button
                  className="jn-reader-nav is-next"
                  onClick={() => moveReader(1)}
                  aria-label="Sonraki fotoğraf"
                >
                  <ChevronRight size={22} strokeWidth={1.35} />
                </button>
              </div>
              <figcaption>
                <span>{selected.place || "Journey Notes seçkisi"}</span>
                <span className="jn-reader-progress">
                  {readerIndex >= 0 ? readerIndex + 1 : 1} / {readerSequence.length}
                </span>
                <span>№ {selected.id}</span>
              </figcaption>
              <p className="jn-swipe-hint">Kaydır · ← →</p>
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
                    <button
                      key={photo.id}
                      onClick={() =>
                        openNote(
                          photo,
                          all.filter((item) => item.category === selected.category),
                        )
                      }
                    >
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
        ) : albumOpen ? (
          <main className={`jn-album-page is-${albumSize}`}>
            <header className="jn-album-head">
              <button className="jn-back" onClick={goHome}>
                <Arrow back /> Seçkiye dön
              </button>
              <div>
                <span className="jn-kicker">ALBÜM · {all.length} KARE</span>
                <h1>Albüm</h1>
                <p>
                  Bütün fotoğraflar tek yerde. Kategoriye göre filtrele;
                  bir kareye dokunduğunda büyük/orijinal görüntüsünü aç.
                </p>
              </div>
            </header>

            <section className="jn-album-controls" ref={archiveRef}>
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
              <div className="jn-album-tools">
                <div className="jn-size-control" role="group" aria-label="Fotoğraf boyutu">
                  {(["compact", "standard", "large"] as const).map((size) => (
                    <button
                      key={size}
                      className={albumSize === size ? "is-active" : ""}
                      aria-pressed={albumSize === size}
                      onClick={() => setAlbumSize(size)}
                    >
                      {size === "compact" ? "Küçük" : size === "large" ? "Büyük" : "Orta"}
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
            </section>

            {searchOpen && (
              <div className="jn-search-row">
                <Search size={17} strokeWidth={1.5} />
                <input
                  ref={searchInput}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Yer, başlık veya kategori ara"
                  aria-label="Journey Notes albümünde ara"
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

            <div className="jn-album-count">
              <span>{filtered.length} kare</span>
              {query && <span>“{query}”</span>}
            </div>

            <section
              className="jn-album-grid"
              id="album-grid"
              aria-label="Fotoğraf albümü"
            >
              {filtered.map((photo) => (
                <article className="jn-album-card" key={photo.id}>
                  <button onClick={() => openNote(photo, filtered)}>
                    <div className="jn-album-image">
                      <Picture
                        photo={photo}
                        sizes="(max-width: 560px) 46vw, (max-width: 900px) 31vw, 23vw"
                      />
                    </div>
                    <div className="jn-album-meta">
                      <span>{photo.place || photo.category}</span>
                      <span>№ {photo.id}</span>
                    </div>
                    {photo.title && <h2>{photo.title}</h2>}
                  </button>
                </article>
              ))}
            </section>

            {filtered.length === 0 && (
              <div className="jn-empty">
                <h3>Bu filtrede bir kare bulamadım.</h3>
                <button
                  onClick={() => {
                    setFilter("Tümü");
                    setQuery("");
                  }}
                >
                  Bütün albümü göster <Arrow />
                </button>
              </div>
            )}
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
                    draggable={false}
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
                    <button className="jn-cover-album-cta" onClick={openAlbum}>
                      <span>
                        <small>TÜM FOTOĞRAFLAR</small>
                        <strong>Albümü görüntüle</strong>
                      </span>
                      <span className="jn-cover-album-count">
                        {all.length} kare <Arrow />
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="jn-intro">
              <span className="jn-kicker">JOURNEY NOTES</span>
              <p>
                Bir albümden çok, kaydırdıkça değişen küçük bir sergi.
                Bazı kareler tek başına; bazıları yanındaki notla birlikte.
              </p>
            </section>

            <section className="jn-album-index" id="album-preview">
              <div className="jn-album-index-head">
                <div>
                  <span className="jn-kicker">ALBÜM · {all.length} KARE</span>
                  <h2>Tüm fotoğraflar.</h2>
                </div>
                <div>
                  <p>
                    Bütün arşive tek yerden ulaş. Kategori seçebilir ya da
                    doğrudan tüm kareleri aynı düzende görebilirsin.
                  </p>
                  <button className="jn-album-primary" onClick={openAlbum}>
                    <span>Albümün tamamını gör</span>
                    <span>{all.length} <Arrow /></span>
                  </button>
                </div>
              </div>

              <div className="jn-category-strip">
                {categoryPreviews.map(({ category, photo }) => (
                  <button
                    key={category}
                    onClick={() => chooseCategory(category)}
                    aria-label={`${category} kategorisini aç`}
                  >
                    <div className="jn-category-image">
                      <Picture
                        photo={photo}
                        sizes="(max-width: 760px) 46vw, 24vw"
                      />
                    </div>
                    <span>{category}</span>
                    <small>
                      {all.filter((item) => item.category === category).length} kare
                    </small>
                  </button>
                ))}
              </div>
            </section>

            <section className="jn-exhibition" id="edit">
              <div className="jn-section-head">
                <div>
                  <span className="jn-kicker">SERGİ · 02</span>
                  <h2>Seçki.</h2>
                </div>
                <p>
                  Seçtiğim birkaç kare; bazen tek başına, bazen kısa bir notla
                  birlikte.
                </p>
              </div>

              <div className="jn-exhibition-flow">
                {exhibition.slice(0, 4).map((photo, index) => (
                  <article
                    className={[
                      "jn-story",
                      index % 2 ? "is-reverse" : "",
                      photo.width > photo.height ? "is-landscape" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={photo.id}
                  >
                    <button
                      className="jn-story-media"
                      onClick={() => openNote(photo)}
                      aria-label="Fotoğrafı büyük aç"
                    >
                      <Picture
                        photo={photo}
                        priority={index === 0}
                        sizes="(max-width: 760px) 94vw, 760px"
                      />
                    </button>
                    <div className="jn-story-copy">
                      <span className="jn-kicker">
                        {photo.place || photo.category} · FRAME {photo.id}
                      </span>
                      {photo.title && <h3>{photo.title}</h3>}
                      <p className={photo.title ? "" : "is-titleless"}>
                        {photo.summary}
                      </p>
                      <button
                        className="jn-text-link"
                        onClick={() => openNote(photo)}
                      >
                        Büyük gör <Arrow />
                      </button>
                    </div>
                  </article>
                ))}

                {exhibition[4] && (
                  <article className="jn-panorama">
                    <button onClick={() => openNote(exhibition[4])}>
                      <Picture
                        photo={exhibition[4]}
                        sizes="(max-width: 760px) 94vw, 1320px"
                      />
                    </button>
                    <div className="jn-panorama-caption">
                      <span className="jn-kicker">
                        {exhibition[4].place || exhibition[4].category} · FRAME{" "}
                        {exhibition[4].id}
                      </span>
                      <p>{exhibition[4].summary}</p>
                    </div>
                  </article>
                )}

                <div className="jn-diptych">
                  {exhibition.slice(5, 7).map((photo) => (
                    <article key={photo.id}>
                      <button onClick={() => openNote(photo, exhibition)}>
                        <div className="jn-diptych-image">
                          <Picture
                            photo={photo}
                            sizes="(max-width: 760px) 94vw, 620px"
                          />
                        </div>
                        <div className="jn-diptych-copy">
                          <span className="jn-kicker">
                            {photo.place || photo.category} · FRAME {photo.id}
                          </span>
                          {photo.title && <h3>{photo.title}</h3>}
                          <p>{photo.summary}</p>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>

                {exhibition[7] && (
                  <article className="jn-story is-reverse">
                    <button
                      className="jn-story-media"
                      onClick={() => openNote(exhibition[7])}
                      aria-label="Fotoğrafı büyük aç"
                    >
                      <Picture
                        photo={exhibition[7]}
                        sizes="(max-width: 760px) 94vw, 760px"
                      />
                    </button>
                    <div className="jn-story-copy">
                      <span className="jn-kicker">
                        {exhibition[7].place || exhibition[7].category} · FRAME{" "}
                        {exhibition[7].id}
                      </span>
                      {exhibition[7].title && <h3>{exhibition[7].title}</h3>}
                      <p className={exhibition[7].title ? "" : "is-titleless"}>
                        {exhibition[7].summary}
                      </p>
                      <button
                        className="jn-text-link"
                        onClick={() => openNote(exhibition[7])}
                      >
                        Büyük gör <Arrow />
                      </button>
                    </div>
                  </article>
                )}
              </div>
            </section>

            <section className="jn-places" id="places">
              <div className="jn-places-inner">
                <div className="jn-section-head is-dark">
                  <div>
                    <span className="jn-kicker">YERLER · 03</span>
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

            <section className="jn-about" id="about">
              {aboutPhoto && (
                <figure className="jn-about-image">
                  <Picture
                    photo={aboutPhoto}
                    sizes="(max-width: 760px) 94vw, 720px"
                  />
                </figure>
              )}
              <div className="jn-about-copy">
                <span className="jn-kicker">HAKKINDA · 04</span>
                <h2>Biriktirmek için çekiyorum.</h2>
                <p>
                  Journey Notes, gezdiğim yerlerden saklamak istediğim
                  fotoğrafları ve kısa notları bir araya getirdiğim kişisel
                  görsel arşiv. Sergi kısmı seçilmiş kareleri büyütüyor;
                  Albüm ise hiçbirini kaybetmeden hepsini bir arada tutuyor.
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
