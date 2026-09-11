import { useEffect, useRef, useState } from "react";
import { categories, type Photo } from "./data";
import {
  loadStudioJourneyPhotos,
  saveJourneyPhotos,
  signOutJourney,
  uploadJourneyAssets,
} from "./supabase";
import {
  JOURNEY_MAX_UPLOAD_BYTES,
  journeyAcceptedTypes,
  journeyMimeType,
  prepareJourneyMedia,
} from "./media";
import "./studio.css";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("journey-notes-studio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readDrafts(): Promise<Photo[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction("drafts").objectStore("drafts").get("current");
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
async function writeDrafts(items: Photo[]) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(items, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
const fileData = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });


export default function Studio({
  onClose,
  onPreview,
  onSignedOut,
}: {
  onClose: () => void;
  onPreview: (photos: Photo[]) => void;
  onSignedOut: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Photo[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [removed, setRemoved] = useState<{ item: Photo; index: number } | null>(
    null,
  );
  const current = items.find((p) => p.id === selected);
  useEffect(() => {
    dialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let alive = true;
    loadStudioJourneyPhotos()
      .then(async (rows) => {
        if (!alive) return;
        const next = rows.length ? rows : await readDrafts().catch(() => []);
        if (!alive) return;
        setItems(next);
        setSelected(next[0]?.id || "");
        if (rows.length) {
          await writeDrafts(rows).catch(() => {});
          setMessage("Supabase taslakları yüklendi.");
        }
      })
      .catch(async () => {
        const local = await readDrafts().catch(() => []);
        if (!alive) return;
        setItems(local);
        setSelected(local[0]?.id || "");
        setMessage(
          local.length
            ? "Bulut taslakları açılamadı; bu cihazdaki yerel kopya yüklendi."
            : "Bulut taslakları açılamadı.",
        );
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
      document.body.style.overflow = old;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const stop = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    addEventListener("beforeunload", stop);
    return () => removeEventListener("beforeunload", stop);
  }, [dirty]);
  const update = (patch: Partial<Photo>) => {
    setItems((prev) =>
      prev.map((p) => (p.id === selected ? { ...p, ...patch } : p)),
    );
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      const saved = await saveJourneyPhotos(items, {
        publishAll: false,
        removedIds,
      });
      await writeDrafts(saved).catch(() => {});
      setItems(saved);
      setSelected((current) => current || saved[0]?.id || "");
      setRemovedIds([]);
      setDirty(false);
      setMessage("Taslaklar Supabase veritabanına güvenli biçimde kaydedildi.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Buluta kaydedilemedi. Yerel taslağı yedek olarak saklıyorum.",
      );
      await writeDrafts(items).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const saved = await saveJourneyPhotos(items, {
        publishAll: true,
        removedIds,
      });
      await writeDrafts(saved).catch(() => {});
      setItems(saved);
      setRemovedIds([]);
      setDirty(false);
      setMessage("Yayınlandı. Taslaklar korunarak yalnız bu koleksiyon güncellendi.");
      onPreview(saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Yayınlama başarısız.");
    } finally {
      setBusy(false);
    }
  };
  const close = async () => {
    if (dirty) {
      setBusy(true);
      try {
        await writeDrafts(items);
        setDirty(false);
        onClose();
      } catch {
        setMessage("Taslak kaydedilemedi. Kapatmadan önce taslaklarını indir.");
      } finally {
        setBusy(false);
      }
    } else onClose();
  };
  const add = async (files: File[]) => {
    if (busy || !ready || !files.length) return;
    setBusy(true);

    const incoming: Photo[] = [];
    const skipped: string[] = [];
    const batch = files.slice(0, 50);
    if (files.length > batch.length) {
      skipped.push("Tek seferde en fazla 50 fotoğraf işlenir; kalanları ikinci grupta ekle.");
    }

    const orderedFiles = [...batch].sort(
      (a, b) => (a.lastModified || 0) - (b.lastModified || 0),
    );

    try {
      for (const file of orderedFiles) {
        const mimeType = journeyMimeType(file);
        if (
          !journeyAcceptedTypes.includes(mimeType) ||
          !file.size ||
          file.size > JOURNEY_MAX_UPLOAD_BYTES
        ) {
          skipped.push(
            `${file.name}: JPG, PNG, WebP, AVIF, HEIC/HEIF ve en fazla 50 MB olmalı.`,
          );
          continue;
        }

        try {
          const prepared = await prepareJourneyMedia(file);

          if (
            [...items, ...incoming].some(
              (photo) =>
                photo.fileHash && photo.fileHash === prepared.fileHash,
            )
          ) {
            skipped.push(`${file.name}: Bu fotoğraf zaten taslakta.`);
            continue;
          }

          const id = `upload-${crypto.randomUUID()}`;
          let src = "";
          let thumbnail = "";
          let originalSrc = "";
          let originalBucket = "";
          let storagePath = "";
          let displayPath = "";
          let thumbnailPath = "";

          try {
            const uploaded = await uploadJourneyAssets(
              prepared.original,
              prepared.display,
              prepared.thumbnail,
              id,
              prepared.mimeType,
            );
            src = uploaded.imageUrl;
            thumbnail = uploaded.thumbnailUrl;
            originalSrc = uploaded.originalUrl;
            originalBucket = uploaded.originalBucket;
            storagePath = uploaded.storagePath;
            displayPath = uploaded.displayPath;
            thumbnailPath = uploaded.thumbnailPath;
          } catch {
            // Ağ kesilirse hiçbir byte kaybolmasın: orijinal + iki optimize
            // edilmiş sürüm IndexedDB taslağına alınır ve sonraki kayıtta
            // Storage'a tekrar gönderilir.
            src = await fileData(prepared.display);
            thumbnail = await fileData(prepared.thumbnail);
            originalSrc = await fileData(prepared.original);
          }

          incoming.push({
            id,
            src,
            thumbnail,
            originalSrc,
            originalBucket: originalBucket || undefined,
            width: prepared.width,
            height: prepared.height,
            smallWidth: prepared.thumbnailWidth,
            largeWidth: prepared.displayWidth,
            title: "",
            summary: "",
            body: [],
            category: "Diğer",
            place: "",
            fileHash: prepared.fileHash,
            storagePath: storagePath || undefined,
            displayPath: displayPath || undefined,
            thumbnailPath: thumbnailPath || undefined,
            originalFilename: file.name,
            takenAt: prepared.takenAt,
            mimeType: prepared.mimeType,
            byteSize: prepared.byteSize,
            published: false,
          });
        } catch (error) {
          skipped.push(
            `${file.name}: ${error instanceof Error ? error.message : "Görsel işlenemedi."}`,
          );
        }
      }

      if (!incoming.length) {
        setMessage(skipped.filter(Boolean).join(" ") || "Fotoğraf eklenmedi.");
        return;
      }

      const nextItems = [...items, ...incoming];
      setItems(nextItems);
      setSelected(incoming[0].id);
      setDirty(true);

      try {
        const saved = await saveJourneyPhotos(nextItems, {
          publishAll: false,
          removedIds,
        });
        await writeDrafts(saved).catch(() => {});
        setItems(saved);
        setRemovedIds([]);
        setDirty(false);
        setMessage(
          [
            `${incoming.length} fotoğraf işlendi, optimize edildi ve taslak olarak kaydedildi.`,
            ...skipped,
          ]
            .filter(Boolean)
            .join(" "),
        );
      } catch (error) {
        await writeDrafts(nextItems).catch(() => {});
        setMessage(
          [
            `${incoming.length} fotoğraf yerel güvenli taslağa eklendi.`,
            error instanceof Error ? error.message : "Bulut kaydı tekrar denenecek.",
            ...skipped,
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
      if (camera.current) camera.current.value = "";
    }
  };
  const exportDrafts = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { format: "journey-notes-draft", version: 1, photos: items },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journey-notes-taslak.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setDirty(false);
    setMessage(
      "Görseller ve yazılar birlikte indirildi. Bu dosya bir taslak yedeğidir.",
    );
  };
  const move = (step: number) => {
    const index = items.findIndex((p) => p.id === selected);
    const next = index + step;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setItems(copy);
    setDirty(true);
  };
  return (
    <dialog
      ref={dialog}
      className="studio"
      aria-labelledby="studio-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) void close();
      }}
    >
      <div className="studio-shell">
        <header className="studio-header">
          <div>
            <span className="eyebrow">YÖNETİM</span>
            <h2 id="studio-title">
              Fotoğraf <em>ekle.</em>
            </h2>
          </div>
          <div className="studio-header-actions">
            <button
              disabled={busy}
              onClick={async () => {
                await signOutJourney();
                onSignedOut();
              }}
            >
              ÇIKIŞ
            </button>
            <button
              disabled={busy}
              onClick={() => void close()}
              aria-label="Stüdyoyu kapat"
            >
              KAPAT
            </button>
          </div>
        </header>
        <p className="studio-notice">
          Orijinal dosya saklanır; ayrıca 3200 px ekran sürümü ve 960 px albüm önizlemesi otomatik üretilir. Ağ kesilirse taslak cihazda korunur. Başlık, yer ve açıklama isteğe bağlıdır.
        </p>
        <div className="studio-actions">
          <button
            disabled={!ready || busy}
            className="studio-primary"
            onClick={() => picker.current?.click()}
          >
            Fotoğraf ekle
          </button>
          <button
            disabled={!ready || busy}
            onClick={() => camera.current?.click()}
          >
            Kamerayla çek
          </button>
          <button
            disabled={!ready || busy || !items.length}
            onClick={() => void save()}
          >
            {busy ? "İşleniyor…" : dirty ? "Taslağı kaydet" : "Kaydedildi"}
          </button>
          <button
            disabled={busy || !items.length}
            onClick={async () => {
              setBusy(true);
              try {
                await writeDrafts(items);
                setDirty(false);
                onPreview(items);
              } catch {
                setMessage(
                  "Önizleme öncesinde kayıt başarısız oldu. Taslağını indirerek yedekle.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Önizle
          </button>
          <button
            className="studio-publish"
            disabled={!ready || busy || !items.some((p) => !p.published)}
            onClick={() => void publish()}
          >
            {items.some((p) => !p.published) ? "Taslakları yayınla" : "Yayında"}
          </button>
          <input
            disabled={busy}
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
            multiple
            onChange={(e) => void add(Array.from(e.target.files || []))}
            hidden
          />
          <input
            disabled={busy}
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => void add(Array.from(e.target.files || []))}
            hidden
          />
        </div>
        <div
          className={`studio-workspace ${dragging ? "is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void add(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="studio-gallery">
            <span className="eyebrow">
              {items.length} FOTOĞRAF · {items.filter((p) => !p.published).length} TASLAK
            </span>
            {!items.length ? (
              <button
                className="studio-drop"
                disabled={busy || !ready}
                onClick={() => picker.current?.click()}
              >
                 <strong>
                  {ready
                    ? "Fotoğraf seç"
                    : "Hazırlanıyor…"}
                </strong>
                <small>
                  JPG, PNG, WebP, AVIF, HEIC/HEIF · en fazla 50 MB
                </small>
              </button>
            ) : (
              <div className="studio-thumbs">
                {items.map((p, i) => (
                  <button
                    key={p.id}
                    aria-pressed={selected === p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    <img
                      src={p.thumbnail || p.src}
                      alt={p.title || p.place || "Taslak fotoğraf"}
                    />
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <small className={p.published ? "is-live" : "is-draft"}>
                      {p.published ? "YAYINDA" : "TASLAK"}
                    </small>
                  </button>
                ))}
                <button
                  className="add-thumb"
                  disabled={busy}
                  onClick={() => picker.current?.click()}
                  aria-label="Daha fazla fotoğraf ekle"
                >
                  EKLE
                </button>
              </div>
            )}
          </div>
          <div className="studio-editor">
            {current ? (
              <>
                <div className="editor-meta">
                  <span className="eyebrow">
                    {current.width} × {current.height} PX
                  </span>
                  <div>
                    <button
                      disabled={items[0].id === selected || busy}
                      onClick={() => move(-1)}
                      aria-label="Fotoğrafı önceye taşı"
                    >
                      ÖNCE
                    </button>
                    <button
                      disabled={
                        items[items.length - 1]?.id === selected || busy
                      }
                      onClick={() => move(1)}
                      aria-label="Fotoğrafı sonraya taşı"
                    >
                      SONRA
                    </button>
                  </div>
                </div>
                <label>
                  Başlık <span>(isteğe bağlı)</span>
                  <input disabled={busy}
                    value={current.title}
                    maxLength={110}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </label>
                <div className="editor-row">
                  <label>
                    Koleksiyon
                    <select disabled={busy}
                      value={current.category || "Diğer"}
                      onChange={(e) => update({ category: e.target.value })}
                    >
                      {categories.slice(1).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Yer <span>(isteğe bağlı)</span>
                    <input disabled={busy}
                      value={current.place}
                      maxLength={100}
                      placeholder="Şehir, ülke"
                      onChange={(e) => update({ place: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Kısa açıklama
                  <textarea disabled={busy}
                    rows={3}
                    value={current.summary}
                    maxLength={400}
                    placeholder="Bu kareden aklında kalan…"
                    onChange={(e) => update({ summary: e.target.value })}
                  />
                </label>
                <label>
                  Notun
                  <textarea disabled={busy}
                    rows={6}
                    value={current.body.join("\n\n")}
                    maxLength={12000}
                    placeholder="Biraz daha anlatmak istersen…"
                    onChange={(e) =>
                      update({ body: e.target.value.split("\n\n") })
                    }
                  />
                </label>
                <button
                  className="remove-draft" disabled={busy}
                  onClick={() => {
                    const i = items.findIndex((p) => p.id === selected);
                    setRemoved({ item: current, index: i });
                    setRemovedIds((prev) =>
                      prev.includes(current.id) ? prev : [...prev, current.id],
                    );
                    setItems(items.filter((p) => p.id !== selected));
                    setSelected(items.find((p) => p.id !== selected)?.id || "");
                    setDirty(true);
                  }}
                >
                  Bu fotoğrafı taslaktan çıkar
                </button>
              </>
            ) : (
              <div className="editor-empty">
                <span>00</span>
                <h3>Bir fotoğrafla başlar.</h3>
                <p>
                  Soldan bir fotoğraf seç. Başlık, yer ve kısa not ekle.
                </p>
              </div>
            )}
          </div>
        </div>
        {removed && (
          <div className="studio-undo">
            Fotoğraf taslaktan çıkarıldı.
            <button
              onClick={() => {
                const copy = [...items];
                copy.splice(
                  Math.min(removed.index, copy.length),
                  0,
                  removed.item,
                );
                setItems(copy);
                setSelected(removed.item.id);
                setRemovedIds((prev) =>
                  prev.filter((id) => id !== removed.item.id),
                );
                setRemoved(null);
                setDirty(true);
              }}
            >
              Geri al
            </button>
          </div>
        )}
        <p className="studio-status" role="status">
          {message ||
            "Orijinal + optimize edilmiş sürümler Supabase üzerinde saklanır."}
        </p>
      </div>
    </dialog>
  );
}
