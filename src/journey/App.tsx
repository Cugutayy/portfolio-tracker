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
import "./style-v15.css";
import MobileSwipeReader from "./MobileSwipeReader";

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
  const [mobileSwipeReader, setMobileSwipeReader] = useState(false);
  const [activeChapter, setActiveChapter] = useState("journey-top");

  const searchInput = useRef<HTMLInputElement>(null);
  const archiveRef = useRef<HTMLElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const returnScroll = useRef(0);
  const returnRoute = useRef("");
  const prefetchedImages = useRef<Set<string>>(new Set());

  const all = Array.from(
    new Map([...photos, ...remotePhotos, ...drafts].map((photo) => [photo.id, photo])).values(),
  );

  const selected = all.find((photo) => route === `#note=${photo.id}`);
  const albumOpen = route === "#album";
  const readerOpen = Boolean(selected);
  const readerSequence = (readerIds.length ? readerIds : all.map((photo) => photo.id))
    .map((id) => all.find((photo) => photo.id === id))
    .filter((photo): photo is Photo => Boolean(photo));
  const readerIndex = selected
    ? readerSequence.findIndex((photo) => photo.id === selected.id)
    : -1;
  const swipePrevPhoto =
    selected && readerSequence.length
      ? readerSequence[
          (Math.max(0, readerIndex) - 1 + readerSequence.length) %
            readerSequence.length
        ]
      : null;
  const swipeNextPhoto =
    selected && readerSequence.length
      ? readerSequence[
          (Math.max(0, readerIndex) + 1) % readerSequence.length
        ]
      : null;
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

  const photoById = (id: string) => all.find((photo) => photo.id === id);
  const archiveSpotlight = ["073", "020", "103", "010", "055", "009"]
    .map((id) => photoById(id))
    .filter((photo): photo is Photo => Boolean(photo));
  const jaipurFeature = photoById("010");
  const waterFeature = photoById("020");
  const sunsetFeature = photoById("055");
  const filmMoments = ["073", "107", "012", "103", "009", "010", "055", "020"]
    .map((id) => photoById(id))
    .filter((photo): photo is Photo => Boolean(photo));
  const placeCards = [
    { place: "Jaipur, Hindistan", photo: photoById("010") },
    { place: "Varanasi, Hindistan", photo: photoById("108") },
    { place: "Belgrad, Sırbistan", photo: photoById("009") },
  ].filter(
    (item): item is { place: string; photo: Photo } => Boolean(item.photo),
  );
  const deckBackdrop = photoById("045") || photoById("012") || all[0];
  const deckSlice = photoById("010") || photoById("073") || all[0];
  const aboutPhoto =
    photoById("107") ||
    all.find((photo) => photo.category === "Doğa") ||
    all[0];
  const knownCountries = Array.from(
    new Set(
      knownPlaces
        .map((place) => place.split(",").at(-1)?.trim())
        .filter((country): country is string => Boolean(country)),
    ),
  );
  const categoryColors = ["#277fb8", "#53b9a9", "#e1b84a", "#ec735a"];
  const categoryStats = categories
    .filter((category) => category !== "Tümü")
    .map((category, index) => ({
      category,
      count: all.filter((photo) => photo.category === category).length,
      color: categoryColors[index % categoryColors.length],
    }))
    .filter((item) => item.count > 0);
  const categoryTotal = Math.max(
    1,
    categoryStats.reduce((sum, item) => sum + item.count, 0),
  );
  let categoryCursor = 0;
  const categoryConic = `conic-gradient(from -18deg, ${categoryStats
    .map((item) => {
      const start = (categoryCursor / categoryTotal) * 100;
      categoryCursor += item.count;
      const end = (categoryCursor / categoryTotal) * 100;
      return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    })
    .join(", ")})`;

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
    const media = matchMedia("(max-width: 760px)");
    const sync = () => setMobileSwipeReader(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
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
    if (selected || albumOpen || typeof IntersectionObserver === "undefined") return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-jn-chapter]"),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveChapter(visible.target.id);
      },
      {
        rootMargin: "-32% 0px -52% 0px",
        threshold: [0, 0.08, 0.2, 0.4, 0.65],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [selected?.id, albumOpen, remotePhotos.length, drafts.length]);

  useEffect(() => {
    if (!selected || !readerSequence.length) return;
    const currentIndex = readerIndex >= 0 ? readerIndex : 0;
    const nearby = [
      readerSequence[(currentIndex - 1 + readerSequence.length) % readerSequence.length],
      readerSequence[(currentIndex + 1) % readerSequence.length],
    ];
    const lightweight =
      typeof matchMedia === "function" &&
      matchMedia("(max-width: 760px) and (pointer: coarse)").matches;
    nearby.forEach((photo) => {
      if (!photo?.src) return;
      const image = new Image();
      image.decoding = "async";
      image.src =
        lightweight && photo.thumbnail ? photo.thumbnail : photo.src;
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
  }, [selected?.id, albumOpen]);

  // Only reset scroll when entering the reader. Changing photos inside an
  // already-open reader must preserve the visitor's current viewport.
  useEffect(() => {
    if (!readerOpen) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    readerRef.current?.focus({ preventScroll: true });
  }, [readerOpen]);

  const runViewTransition = (update: () => void) => {
    const reduceMotion =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (reduceMotion || typeof doc.startViewTransition !== "function") {
      update();
      return;
    }

    doc.startViewTransition(update);
  };

  const prefetchPhoto = (photo?: Photo, lightweight = false) => {
    if (!photo?.src) return;
    const source =
      lightweight && photo.thumbnail ? photo.thumbnail : photo.src;
    if (prefetchedImages.current.has(source)) return;
    prefetchedImages.current.add(source);
    const image = new Image();
    image.decoding = "async";
    image.src = source;
  };

  const openNote = (photo: Photo, sequence: Photo[] = all) => {
    returnScroll.current = window.scrollY;
    returnRoute.current = route;
    setReaderIds(sequence.map((item) => item.id));
    setSlideDirection("");
    prefetchPhoto(photo);
    runViewTransition(() => {
      history.pushState(null, "", `#note=${photo.id}`);
      setRoute(location.hash);
    });
  };

  const goHome = () => {
    runViewTransition(() => {
      history.replaceState(null, "", location.pathname);
      setRoute("");
    });
    requestAnimationFrame(() => {
      window.scrollTo({ top: returnScroll.current, behavior: "auto" });
    });
  };

  const closeNote = () => {
    if (returnRoute.current === "#album") {
      runViewTransition(() => {
        history.replaceState(null, "", "#album");
        setRoute("#album");
      });
      requestAnimationFrame(() => {
        window.scrollTo({ top: returnScroll.current, behavior: "auto" });
      });
      return;
    }
    goHome();
  };

  const moveReader = (step: number, interactive = false) => {
    if (!selected || !readerSequence.length) return;
    const currentIndex = readerIndex >= 0 ? readerIndex : 0;
    const nextIndex =
      (currentIndex + step + readerSequence.length) % readerSequence.length;
    const next = readerSequence[nextIndex];
    setSlideDirection(step > 0 ? "next" : "prev");
    prefetchPhoto(next);

    const update = () => {
      history.replaceState(null, "", `#note=${next.id}`);
      setRoute(location.hash);
    };

    if (interactive) update();
    else runViewTransition(update);
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
    runViewTransition(() => {
      history.pushState(null, "", "#album");
      setRoute("#album");
    });
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

  const scrollToChapter = (id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({
      behavior:
        matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
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

      <div className={`jn-site ${albumOpen ? "is-album-route" : selected ? "is-reader-route" : ""}`}>
        <header className="jn-header">
          <a
            className="jn-site-mark"
            href={location.pathname}
            aria-label="Journey Notes ana sayfa"
          >
            <span />
            <span />
            <span />
            <span />
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
          <button className="jn-nav-album" type="button" onClick={openAlbum}>
            <span>Albüm</span>
            <small>{all.length}</small>
          </button>
          <a href="#places">Yerler</a>
          <a href="#about">Hakkında</a>
        </nav>

        {!selected && !albumOpen && (
          <aside className="jn-chapter-rail" aria-label="Sayfa bölümleri">
            {[
              ["journey-top", "01", "Giriş"],
              ["journey-archive", "02", "Albüm"],
              ["journey-moments", "03", "Anlar"],
              ["places", "04", "Yerler"],
              ["about", "05", "Hakkında"],
            ].map(([id, number, label]) => (
              <button
                key={id}
                className={activeChapter === id ? "is-active" : ""}
                onClick={() => scrollToChapter(id)}
                aria-label={label}
              >
                <span>{number}</span>
                <em>{label}</em>
              </button>
            ))}
          </aside>
        )}

        {selected ? (
          <main className="jn-reader-v15" ref={readerRef} tabIndex={-1}>
            <div className="jn-reader-top-v15">
              <button className="jn-back" onClick={closeNote}>
                <Arrow back /> Geri
              </button>
              <span>
                {readerIndex >= 0 ? readerIndex + 1 : 1} / {readerSequence.length}
              </span>
            </div>

            <div className="jn-reader-layout-v15">
              {mobileSwipeReader && swipePrevPhoto && swipeNextPhoto ? (
                <MobileSwipeReader
                  photo={selected}
                  previous={swipePrevPhoto}
                  next={swipeNextPhoto}
                  onStep={(step) => moveReader(step, true)}
                />
              ) : (
                <section
                  className={`jn-reader-stage-v15 ${slideDirection ? `is-slide-${slideDirection}` : ""}`}
                >
                  <button
                    className="jn-reader-nav is-prev"
                    onClick={() => moveReader(-1)}
                    aria-label="Önceki fotoğraf"
                  >
                    <ChevronLeft size={21} strokeWidth={1.25} />
                  </button>
                  <Picture
                    photo={selected}
                    priority
                    sizes="(max-width: 760px) 94vw, 72vw"
                  />
                  <button
                    className="jn-reader-nav is-next"
                    onClick={() => moveReader(1)}
                    aria-label="Sonraki fotoğraf"
                  >
                    <ChevronRight size={21} strokeWidth={1.25} />
                  </button>
                </section>
              )}

              <aside className="jn-reader-panel-v15">
                <span className="jn-kicker">
                  {selected.place || selected.category}
                </span>
                <h1>{selected.title || selected.place || selected.category}</h1>
                <p className="jn-reader-summary-v15">{selected.summary}</p>

                <div className="jn-reader-meta-v15">
                  <span>№ {selected.id}</span>
                  <span>{selected.category}</span>
                  {selected.place && <span>{selected.place}</span>}
                  <span>{selected.width} × {selected.height}</span>
                </div>

                <div className="jn-reader-body-v15">
                  {(selected.body.length ? selected.body : [selected.summary]).map(
                    (paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ),
                  )}
                </div>

                <button className="jn-reader-share-v15" onClick={shareSelected}>
                  Bağlantıyı kopyala
                </button>

                <div className="jn-reader-related-v15" aria-label="Benzer kareler">
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
                        aria-label={photo.title || photo.place || photo.category}
                      >
                        <Picture photo={photo} sizes="110px" />
                      </button>
                    ))}
                </div>
              </aside>
            </div>
          </main>
        ) : albumOpen ? (
          <main className={`jn-album-page is-${albumSize}`}>
            <div className="jn-album-shell-v15">
              <aside className="jn-album-sidebar-v15">
                <button className="jn-back" onClick={goHome}>
                  <Arrow back /> Geri
                </button>
                <h1>Albüm. <small>({all.length})</small></h1>
                <div className="jn-album-filter-v15" role="group" aria-label="Kategori">
                  {categories.map((category) => {
                    const count =
                      category === "Tümü"
                        ? all.length
                        : all.filter((photo) => photo.category === category).length;
                    return (
                      <button
                        key={category}
                        aria-pressed={filter === category}
                        onClick={() => {
                          setFilter(category);
                          setQuery("");
                        }}
                      >
                        <span>{category}</span>
                        <small>{count}</small>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="jn-album-content-v15" ref={archiveRef}>
                <header className="jn-album-content-head-v15">
                  <div>
                    <h2>Biriktirdiğim kareler.</h2>
                    <span>{filtered.length} / {all.length} fotoğraf</span>
                  </div>
                  <button
                    onClick={() => {
                      setSearchOpen((value) => !value);
                      requestAnimationFrame(() => searchInput.current?.focus());
                    }}
                    aria-expanded={searchOpen}
                  >
                    <Search size={14} strokeWidth={1.5} />
                    Ara
                  </button>
                </header>

                {searchOpen && (
                  <div className="jn-search-row">
                    <Search size={16} strokeWidth={1.45} />
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
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                <section
                  className="jn-album-grid"
                  id="album-grid"
                  aria-label="Fotoğraf albümü"
                >
                  {filtered.map((photo) => (
                    <article className="jn-album-card" key={photo.id}>
                      <button
                        onClick={() => openNote(photo, filtered)}
                        onPointerEnter={() => prefetchPhoto(photo)}
                        onFocus={() => prefetchPhoto(photo)}
                      >
                        <div className="jn-album-image">
                          <Picture
                            photo={photo}
                            sizes="(max-width: 560px) 46vw, (max-width: 980px) 31vw, 20vw"
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
                    <h3>Bu filtrede fotoğraf yok.</h3>
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
              </section>
            </div>
          </main>
        ) : (
          <main className="jn-home-v15">
            {hero && (
              <section
                className="jn-v15-hero"
                id="journey-top"
                data-jn-chapter
                aria-labelledby="journey-hero-title"
              >
                <div className="jn-v15-hero-media">
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
                  <div className="jn-v15-hero-shade" aria-hidden="true" />
                  <div className="jn-v15-hero-copy">
                    <span className="jn-v15-eyebrow">TRAVEL · PHOTOGRAPHY · NOTES</span>
                    <h1 id="journey-hero-title">Yerler, insanlar, hikâyeler.</h1>
                  </div>
                  <div className="jn-v15-hero-bottom">
                    <p>Yolda çektiğim ve kaybolmasını istemediğim fotoğraflar.</p>
                    <button className="jn-v15-hero-cta" onClick={openAlbum}>
                      <span>Albümü aç</span>
                      <span>{all.length}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

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

            <section
              className="jn-v15-archive"
              id="journey-archive"
              data-jn-chapter
              data-jn-reveal="section"
            >
              <aside className="jn-v15-archive-rail">
                <h2>Albüm.</h2>
                <ul>
                  {categoryStats.map((item) => (
                    <li key={item.category}>
                      <button onClick={() => chooseCategory(item.category)}>
                        <span>{item.category}</span>
                        <small>{item.count}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="jn-v15-archive-grid">
                {archiveSpotlight.map((photo) => (
                  <article className="jn-v15-archive-card" key={photo.id}>
                    <button
                      onClick={() => openNote(photo, archiveSpotlight)}
                      onPointerEnter={() => prefetchPhoto(photo)}
                      onFocus={() => prefetchPhoto(photo)}
                    >
                      <div className="jn-v15-archive-image">
                        <Picture
                          photo={photo}
                          sizes="(max-width: 760px) 46vw, 32vw"
                        />
                      </div>
                      <div className="jn-v15-archive-meta">
                        <span>{photo.title || photo.place || photo.category}</span>
                        <span>№ {photo.id}</span>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {jaipurFeature && (
              <section className="jn-v15-feature" data-jn-reveal="section">
                <div className="jn-v15-feature-copy">
                  <span className="jn-v15-index">JOURNEY NOTES · 001</span>
                  <h2>Jaipur,<em>Hindistan</em></h2>
                  <p>{jaipurFeature.summary}</p>
                  <div className="jn-v15-feature-meta">
                    <span>Mimari</span>
                    <span>26.9124° N · 75.7873° E</span>
                  </div>
                </div>
                <figure className="jn-v15-feature-media">
                  <button onClick={() => openNote(jaipurFeature)}>
                    <Picture
                      photo={jaipurFeature}
                      sizes="(max-width: 760px) 94vw, 62vw"
                    />
                  </button>
                </figure>
              </section>
            )}

            {waterFeature && (
              <section className="jn-v15-dark-feature" data-jn-reveal="section">
                <div className="jn-v15-dark-feature-inner">
                  <div className="jn-v15-dark-head">
                    <span>Journey Notes · Doğa</span>
                    <span>№ {waterFeature.id}</span>
                  </div>
                  <div className="jn-v15-dark-stage">
                    <button onClick={() => openNote(waterFeature)}>
                      <Picture
                        photo={waterFeature}
                        sizes="(max-width: 760px) 94vw, 960px"
                      />
                    </button>
                  </div>
                  <div className="jn-v15-dark-caption">
                    <span>{waterFeature.summary}</span>
                    <button
                      className="jn-v15-dark-open"
                      onClick={() => openNote(waterFeature)}
                    >
                      Fotoğrafı aç <ChevronRight size={14} strokeWidth={1.4} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {sunsetFeature && (
              <section className="jn-v15-quote" data-jn-reveal="section">
                <Picture photo={sunsetFeature} sizes="100vw" />
                <div className="jn-v15-quote-copy">
                  <blockquote>“Bazı yerler insanda kalır.”</blockquote>
                  <small>Journey Notes · № {sunsetFeature.id}</small>
                </div>
              </section>
            )}

            <section
              className="jn-v15-moments"
              id="journey-moments"
              data-jn-chapter
              data-jn-reveal="section"
            >
              <div className="jn-v15-section-title">
                <h2>Anlar.</h2>
                <p>Birbirinden farklı kareler, aynı arşivin içinde aynı ritimde.</p>
              </div>
              <div className="jn-v15-film">
                {filmMoments.map((photo) => (
                  <article className="jn-v15-film-card" key={photo.id}>
                    <button
                      onClick={() => openNote(photo, filmMoments)}
                      onPointerEnter={() => prefetchPhoto(photo)}
                      onFocus={() => prefetchPhoto(photo)}
                    >
                      <div className="jn-v15-film-image">
                        <Picture photo={photo} sizes="(max-width: 760px) 62vw, 20vw" />
                      </div>
                      <small>№ {photo.id} · {photo.category}</small>
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="jn-v16-deck" data-jn-reveal="section" aria-label="Journey özeti">
              <div className="jn-v16-deck-head">
                <span>JOURNEY</span>
                <span>PLACES&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;PEOPLE&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;STORIES</span>
              </div>

              <div className="jn-v16-deck-grid">
                {sunsetFeature && (
                  <article className="jn-v16-deck-card is-quote">
                    <Picture photo={sunsetFeature} sizes="(max-width: 760px) 84vw, 28vw" />
                    <div className="jn-v16-deck-shade" />
                    <div className="jn-v16-deck-copy">
                      <blockquote>“Daha iyi şeyler, merak ettiğinde başlar.”</blockquote>
                      <span>— JOURNEY NOTES</span>
                    </div>
                    <small>01 / 03</small>
                  </article>
                )}

                <article className="jn-v16-deck-card is-stats">
                  {deckBackdrop && (
                    <Picture photo={deckBackdrop} sizes="(max-width: 760px) 84vw, 28vw" />
                  )}
                  <div className="jn-v16-deck-shade is-heavy" />
                  <div className="jn-v16-deck-eyebrow">
                    <span>THE NUMBERS<br />SO FAR</span>
                    <span>JOURNEY<br />EST. 2024</span>
                  </div>
                  <div className="jn-v16-stats-row">
                    <div><strong>{all.length}</strong><em>Fotoğraf</em></div>
                    <div><strong>{categoryStats.length}</strong><em>Tema</em></div>
                    <div><strong>{knownCountries.length}</strong><em>Ülke</em></div>
                    <div><strong>∞</strong><em>Devam</em></div>
                  </div>
                  <small>A MORE CURIOUS WORLD</small>
                </article>

                <article className="jn-v16-deck-card is-menu">
                  <span className="jn-v16-menu-index">03 / 03</span>
                  <div className="jn-v16-menu-copy">
                    <a className="jn-site-mark" href={location.pathname} aria-label="Journey Notes">
                      <span /><span /><span /><span />
                    </a>
                    <nav aria-label="Journey hızlı menü">
                      <button onClick={openAlbum}>Albüm</button>
                      <a href="#places">Yerler</a>
                      <a href="#about">Hakkında</a>
                    </nav>
                    <p>Aynı yerler.<br />Daha derin bir bakış.</p>
                  </div>
                  {deckSlice && (
                    <button
                      className="jn-v16-menu-image"
                      onClick={() => openNote(deckSlice)}
                      aria-label="Fotoğrafı aç"
                    >
                      <Picture photo={deckSlice} sizes="16vw" />
                    </button>
                  )}
                </article>
              </div>
            </section>

            <section
              className="jn-v16-places"
              id="places"
              data-jn-chapter
              data-jn-reveal="section"
            >
              <header className="jn-v16-places-head">
                <div className="jn-v16-places-title">
                  <h2>Yerler.</h2>
                  <span>({String(placeCards.length).padStart(2, "0")})</span>
                </div>
                <div className="jn-v16-places-note">
                  <em>Farklı ufuklar,<br />aynı merak.</em>
                  <button onClick={openAlbum}>Albümü aç</button>
                </div>
              </header>

              <div className="jn-v16-places-grid">
                {placeCards.map(({ place, photo }) => {
                  const [city, country = ""] = place.split(",").map((part) => part.trim());
                  const count = all.filter((item) => item.place === place).length;
                  return (
                    <button
                      className="jn-v16-place-card"
                      key={place}
                      onClick={() => choosePlace(place)}
                    >
                      <div className="jn-v16-place-image">
                        <Picture photo={photo} sizes="(max-width: 760px) 88vw, 31vw" />
                      </div>
                      <h3>{city}</h3>
                      <em>{country}</em>
                      <small>{count} FOTOĞRAF</small>
                    </button>
                  );
                })}
              </div>

              <div className="jn-v16-places-foot">
                <em>“Merak ettiğin yerde hikâye başlar.”</em>
                <div>
                  <span><strong>{knownCountries.length}</strong> ülke</span>
                  <span><strong>{all.length}</strong> fotoğraf</span>
                  <span><strong>∞</strong> keşifler</span>
                </div>
                <span>JOURNEY · EST. 2024</span>
              </div>
            </section>

            <section
              className="jn-v15-about"
              id="about"
              data-jn-chapter
              data-jn-reveal="section"
            >
              <div className="jn-v15-about-inner">
                {aboutPhoto && (
                  <figure className="jn-v15-about-image">
                    <Picture
                      photo={aboutPhoto}
                      sizes="(max-width: 760px) 82vw, 48vw"
                    />
                  </figure>
                )}
                <div className="jn-v15-about-copy">
                  <h2>Aynı yerler. Başka bir bakış.</h2>
                  <p>
                    Journey Notes, gezdiğim yerlerden kalan kişisel bir görsel
                    arşiv. Fotoğraflar önce geliyor; metin yalnızca gerektiği kadar.
                  </p>
                  <a href={instagram} target="_blank" rel="noreferrer">
                    @journey_notess
                  </a>
                </div>
              </div>
            </section>
          </main>
        )}

        <footer className="jn-footer">
          <div>
            <a className="jn-footer-brand" href={location.pathname}>
              journey <em>notes</em>
            </a>
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
              setFilter("Tümü");
              setQuery("");
              history.replaceState(null, "", "#album");
              setRoute("#album");
              requestAnimationFrame(() =>
                window.scrollTo({ top: 0, behavior: "auto" }),
              );
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
