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
  clearJourneyRecoveryState,
  consumeJourneyAuthCallback,
  getJourneyRecoveryState,
  getJourneySession,
  isJourneyAdmin,
  loadPublishedJourneyPhotos,
  requestJourneyPasswordReset,
  signInJourney,
  signOutJourney,
  supabaseConfigured,
  updateJourneyPassword,
} from "./supabase";
import "./style.css";
import "./style-v13.css";
import "./style-v14.css";

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
        photo.thumbnail && photo.thumbnail !== photo.src
          ? `${photo.thumbnail} ${photo.smallWidth || 960}w, ${photo.src} ${photo.largeWidth || Math.min(photo.width, 3200)}w`
          : undefined
      }
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
  const recoveryAtOpen = getJourneyRecoveryState();
  const [state, setState] = useState<"checking" | "locked" | "ready" | "error">(
    recoveryAtOpen ? "locked" : "checking",
  );
  const [mode, setMode] = useState<"login" | "forgot" | "recovery">(
    recoveryAtOpen?.mode === "recovery"
      ? "recovery"
      : recoveryAtOpen?.mode === "error"
        ? "forgot"
        : "login",
  );
  const [email, setEmail] = useState(
    recoveryAtOpen?.mode === "recovery" ? recoveryAtOpen.email || "" : "",
  );
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [message, setMessage] = useState(
    recoveryAtOpen?.mode === "error" ? recoveryAtOpen.message : "",
  );
  const [messageTone, setMessageTone] = useState<"error" | "success">(
    recoveryAtOpen?.mode === "error" ? "error" : "success",
  );

  useEffect(() => {
    let alive = true;

    if (!supabaseConfigured) {
      setState("error");
      setMessageTone("error");
      setMessage("Supabase bağlantısı henüz yapılandırılmadı.");
      return;
    }

    if (recoveryAtOpen) {
      setState("locked");
      return;
    }

    getJourneySession()
      .then(async (session) => {
        if (!alive) return;
        if (!session) {
          setState("locked");
          return;
        }
        if (session.user.email) setEmail(session.user.email);
        const allowed = await isJourneyAdmin();
        if (!alive) return;
        if (!allowed) {
          await signOutJourney().catch(() => null);
          setMessageTone("error");
          setMessage("Bu hesap Journey Notes yönetimine yetkili değil.");
          setState("locked");
          return;
        }
        setState("ready");
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
          setMode("login");
        }}
      />
    );
  }

  const showLogin = () => {
    clearJourneyRecoveryState();
    setMode("login");
    setPassword("");
    setPasswordAgain("");
    setMessage("");
    setMessageTone("success");
  };

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
        <h2 id="studio-login-title">
          {mode === "recovery"
            ? "Yeni parola"
            : mode === "forgot"
              ? "Parolanı yenile"
              : "Yönetim"}
        </h2>
        <p>
          {mode === "recovery"
            ? "Yeni parolanı belirle. İşlem bittiğinde bütün eski oturumlar kapatılır."
            : mode === "forgot"
              ? "E-posta adresini yaz; geçerliyse sıfırlama bağlantısı gönderilir."
              : "Fotoğraf ekleme ve yayınlama alanı."}
        </p>

        {state === "checking" ? (
          <p className="studio-login-status">Oturum kontrol ediliyor…</p>
        ) : state === "error" ? (
          <p className="studio-login-status is-error">{message}</p>
        ) : mode === "recovery" ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              if (password !== passwordAgain) {
                setMessageTone("error");
                setMessage("Parolalar aynı değil.");
                return;
              }
              try {
                await updateJourneyPassword(password);
                setPassword("");
                setPasswordAgain("");
                setState("locked");
                setMode("login");
                setMessageTone("success");
                setMessage("Parola güncellendi. Yeni parolanla giriş yap.");
              } catch (error) {
                setMessageTone("error");
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Parola güncellenemedi.",
                );
              }
            }}
          >
            <label>
              <span>YENİ PAROLA</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={12}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              <span>YENİ PAROLA · TEKRAR</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordAgain}
                minLength={12}
                onChange={(event) => setPasswordAgain(event.target.value)}
                required
              />
            </label>
            {message && (
              <p
                className={`studio-login-status ${messageTone === "error" ? "is-error" : "is-success"}`}
              >
                {message}
              </p>
            )}
            <button type="submit" className="studio-login-submit">
              Parolayı güncelle
            </button>
          </form>
        ) : mode === "forgot" ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              try {
                await requestJourneyPasswordReset(email);
                setMessageTone("success");
                setMessage(
                  "Adres kayıtlıysa sıfırlama bağlantısı gönderildi. Bağlantıyı bu cihazda açabilirsin.",
                );
              } catch (error) {
                setMessageTone("error");
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Sıfırlama e-postası gönderilemedi.",
                );
              }
            }}
          >
            <label>
              <span>E-POSTA</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </label>
            {message && (
              <p
                className={`studio-login-status ${messageTone === "error" ? "is-error" : "is-success"}`}
              >
                {message}
              </p>
            )}
            <button type="submit" className="studio-login-submit">
              Sıfırlama bağlantısı gönder
            </button>
            <button type="button" className="studio-login-secondary" onClick={showLogin}>
              Girişe dön
            </button>
          </form>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              try {
                await signInJourney(email.trim(), password);
                const allowed = await isJourneyAdmin();
                if (!allowed) {
                  await signOutJourney().catch(() => null);
                  throw new Error("Bu hesap Journey Notes yönetimine yetkili değil.");
                }
                setPassword("");
                setState("ready");
              } catch (error) {
                setMessageTone("error");
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
              <p
                className={`studio-login-status ${messageTone === "error" ? "is-error" : "is-success"}`}
              >
                {message}
              </p>
            )}
            <button type="submit" className="studio-login-submit">
              Giriş yap
            </button>
            <button
              type="button"
              className="studio-login-secondary"
              onClick={() => {
                setMode("forgot");
                setMessage("");
                setPassword("");
              }}
            >
              Parolamı unuttum
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
  const exhibitionIds = ["009", "107", "055", "010", "012", "020", "073", "103"];
  const exhibition = exhibitionIds
    .map((id) => all.find((photo) => photo.id === id))
    .filter((photo): photo is Photo => Boolean(photo))
    .filter((photo) => Math.max(photo.width, photo.height) >= 1000);

  const mobileReelIds = [
    "009",
    "107",
    "055",
    "010",
    "020",
    "073",
    "012",
    "103",
    "038",
    "045",
    "097",
    "108",
  ];
  const mobileReel = mobileReelIds
    .map((id) => all.find((photo) => photo.id === id))
    .filter((photo): photo is Photo => Boolean(photo));

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
    let alive = true;
    consumeJourneyAuthCallback()
      .then((result) => {
        if (!alive || !result.handled) return;
        history.replaceState(null, "", `${location.pathname}#studio`);
        setRoute("#studio");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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
    if (typeof window === "undefined") return;

    document.documentElement.classList.add("jn-motion-ready");

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-jn-reveal]"),
    );
    if (!elements.length) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-jn-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("is-jn-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [route, remotePhotos.length, drafts.length]);

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
        : "Journey Notes";

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
          <span className="jn-header-spacer" aria-hidden="true" />

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
                {selected.place || selected.category}
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
                <span>{selected.place || selected.category}</span>
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
                <Arrow back /> Geri dön
              </button>
              <div>
                <span className="jn-kicker">ALBÜM · {all.length}</span>
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
              <span>{filtered.length} fotoğraf</span>
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
                <h3>Bu filtrede fotoğraf bulamadım.</h3>
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
                    <h1 id="journey-hero-title">Journey Notes</h1>
                  </div>
                  <div className="jn-cover-note">
                    <p>
                      Yolda çektiğim ve kaybolmasını istemediğim fotoğraflar.
                    </p>
                    <button className="jn-cover-album-cta" onClick={openAlbum}>
                      <strong>Albümü aç</strong>
                      <span className="jn-cover-album-count">
                        {all.length} fotoğraf
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="jn-intro" data-jn-reveal="copy">
              <p>Buraya dönüp bakmak istediğim kareleri bırakıyorum.</p>
            </section>

            <section className="jn-mobile-reel" aria-label="Kaydırılabilir fotoğraf albümü">
              <div className="jn-mobile-reel-head">
                <span>Albüm</span>
                <button onClick={openAlbum}>Tümünü gör</button>
              </div>
              <div className="jn-mobile-reel-track">
                {mobileReel.map((photo) => (
                  <button
                    key={photo.id}
                    className="jn-mobile-reel-card"
                    onClick={() => openNote(photo, mobileReel)}
                    aria-label={photo.title || photo.place || "Fotoğrafı aç"}
                  >
                    <Picture photo={photo} sizes="78vw" />
                    {(photo.place || photo.title) && (
                      <span className="jn-mobile-reel-caption">
                        {photo.title || photo.place}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="jn-exhibition" id="edit" aria-label="Journey Notes">
              <div className="jn-exhibition-flow">
                {exhibition.slice(0, 4).map((photo, index) => {
                  const hasHumanCopy = Boolean(photo.title || photo.place);
                  return (
                    <article
                      className={[
                        "jn-story",
                        index % 2 ? "is-reverse" : "",
                        photo.width > photo.height ? "is-landscape" : "",
                        !hasHumanCopy ? "is-image-only" : "",
                        `is-slot-${index + 1}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={photo.id}
                      data-jn-reveal="media"
                    >
                      <button
                        className="jn-story-media"
                        onClick={() => openNote(photo)}
                        aria-label="Fotoğrafı aç"
                      >
                        <Picture
                          photo={photo}
                          sizes="(max-width: 760px) 94vw, 1280px"
                        />
                      </button>
                      {hasHumanCopy && (
                        <div className="jn-story-copy">
                          <h3>{photo.title || photo.place}</h3>
                        </div>
                      )}
                    </article>
                  );
                })}

                {exhibition[4] && (
                  <article className="jn-panorama" data-jn-reveal="media">
                    <button onClick={() => openNote(exhibition[4])}>
                      <Picture
                        photo={exhibition[4]}
                        sizes="(max-width: 760px) 94vw, 1320px"
                      />
                    </button>
                    {(exhibition[4].title || exhibition[4].place) && (
                      <div className="jn-panorama-caption">
                        <strong>{exhibition[4].title || exhibition[4].place}</strong>
                      </div>
                    )}
                  </article>
                )}

                <div className="jn-diptych" data-jn-reveal="media">
                  {exhibition.slice(5, 7).map((photo) => (
                    <article key={photo.id}>
                      <button onClick={() => openNote(photo, exhibition)}>
                        <div className="jn-diptych-image">
                          <Picture
                            photo={photo}
                            sizes="(max-width: 760px) 94vw, 620px"
                          />
                        </div>
                        {(photo.title || photo.place) && (
                          <div className="jn-diptych-copy">
                            <h3>{photo.title || photo.place}</h3>
                            </div>
                        )}
                      </button>
                    </article>
                  ))}
                </div>

                {exhibition[7] && (
                  <article
                    data-jn-reveal="media"
                    className={[
                      "jn-story",
                      "is-reverse",
                      !(exhibition[7].title || exhibition[7].place)
                        ? "is-image-only"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      className="jn-story-media"
                      onClick={() => openNote(exhibition[7])}
                      aria-label="Fotoğrafı aç"
                    >
                      <Picture
                        photo={exhibition[7]}
                        sizes="(max-width: 760px) 94vw, 980px"
                      />
                    </button>
                    {(exhibition[7].title || exhibition[7].place) && (
                      <div className="jn-story-copy">
                        <h3>{exhibition[7].title || exhibition[7].place}</h3>
                      </div>
                    )}
                  </article>
                )}
              </div>
            </section>

            <section className="jn-album-index" id="album-preview" data-jn-reveal="section">
              <div className="jn-album-index-head">
                <div>
                  <h2>Albüm.</h2>
                </div>
                <div>
                  <p>{all.length} fotoğraf. Kategorilere göre bakabilir ya da hepsini birlikte açabilirsin.</p>
                  <button className="jn-album-primary" onClick={openAlbum}>
                    <span>Tümünü aç</span>
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
                      {all.filter((item) => item.category === category).length} fotoğraf
                    </small>
                  </button>
                ))}
              </div>
            </section>

            <section className="jn-places" id="places" data-jn-reveal="section">
              <div className="jn-places-inner">
                <div className="jn-section-head is-dark">
                  <div>
                    <span className="jn-kicker">YERLER</span>
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

            <section className="jn-about" id="about" data-jn-reveal="section">
              {aboutPhoto && (
                <figure className="jn-about-image">
                  <Picture
                    photo={aboutPhoto}
                    sizes="(max-width: 760px) 94vw, 720px"
                  />
                </figure>
              )}
              <div className="jn-about-copy">
                <span className="jn-kicker">HAKKINDA</span>
                <h2>Biriktirmek için çekiyorum.</h2>
                <p>
                  Gezdiğim yerlerden kalan görüntüler. Bir kısmı bir yere,
                  bir kısmı yalnızca o güne ait.
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
