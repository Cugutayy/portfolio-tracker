import { useEffect, useRef, useState } from "react";
import { categories, type Photo } from "./data";
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
const fileData = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export default function Studio({
  onClose,
  onPreview,
}: {
  onClose: () => void;
  onPreview: (photos: Photo[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Photo[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [removed, setRemoved] = useState<{ item: Photo; index: number } | null>(
    null,
  );
  const current = items.find((p) => p.id === selected);
  useEffect(() => {
    dialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let alive = true;
    readDrafts()
      .then((rows) => {
        if (alive) {
          setItems(rows);
          setSelected(rows[0]?.id || "");
        }
      })
      .catch(() => {
        if (alive)
          setMessage(
            "Tarayıcı depolaması açılamadı. Taslaklarını indirme düğmesiyle yedekleyebilirsin.",
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
      await writeDrafts(items);
      setDirty(false);
      setMessage("Taslaklar bu tarayıcıya kaydedildi.");
    } catch {
      setMessage(
        "Kaydedilemedi. Depolama alanı dolu veya kapalı olabilir; taslaklarını indirerek yedekleyebilirsin.",
      );
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
    if (busy || !ready) return;
    setBusy(true);
    const incoming: Photo[] = [];
    const skipped: string[] = [];
    try {
      for (const file of files) {
        if (items.length + incoming.length >= 20) {
          skipped.push("Bir taslakta en fazla 20 fotoğraf bulunabilir.");
          break;
        }
        if (
          [...items, ...incoming].reduce(
            (total, p) => total + p.src.length * 0.75,
            0,
          ) +
            file.size >
          100 * 1024 * 1024
        ) {
          skipped.push("Taslak toplamı en fazla 100 MB olabilir.");
          break;
        }
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 25 * 1024 * 1024
        ) {
          skipped.push(
            `${file.name}: JPG, PNG veya WebP ve en fazla 25 MB olmalı.`,
          );
          continue;
        }
        try {
          const bitmap = await createImageBitmap(file);
          const width = bitmap.width,
            height = bitmap.height;
          bitmap.close();
          if (width * height > 50000000) {
            skipped.push(`${file.name}: En fazla 50 megapiksel destekleniyor.`);
            continue;
          }
          const src = await fileData(file);
          incoming.push({
            id: `draft-${crypto.randomUUID()}`,
            src,
            thumbnail: src,
            width,
            height,
            title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
            summary: "",
            body: [],
            category: "Doğa",
            place: "",
          });
        } catch {
          skipped.push(`${file.name}: Görsel okunamadı.`);
        }
      }
      if (incoming.length) {
        setItems((prev) => [...prev, ...incoming]);
        setSelected(incoming[0].id);
        setDirty(true);
      }
      setMessage(
        [
          incoming.length
            ? `${incoming.length} görsel eklendi. Başlık ve notlarını düzenleyebilirsin.`
            : "",
          ...skipped,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
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
            <span className="eyebrow">JOURNEY NOTES / TASLAK STÜDYOSU</span>
            <h2 id="studio-title">
              Bir sonraki <em>not.</em>
            </h2>
          </div>
          <button
            disabled={busy}
            onClick={() => void close()}
            aria-label="Stüdyoyu kapat"
          >
            Kapat ×
          </button>
        </header>
        <p className="studio-notice">
          Bu tasarım önizlemesinde taslaklar cihazında saklanır. Buraya eklenen
          fotoğraflar siteye yayınlanmaz.
        </p>
        <div className="studio-actions">
          <button
            disabled={!ready || busy}
            className="studio-primary"
            onClick={() => picker.current?.click()}
          >
            Fotoğraf ekle +
          </button>
          <button
            disabled={!ready || busy || !items.length}
            onClick={() => void save()}
          >
            {busy ? "İşleniyor…" : dirty ? "Taslağı kaydet" : "Kaydedildi"}
          </button>
          <button disabled={busy || !items.length} onClick={exportDrafts}>
            Taslağı indir ↓
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
            Blogda önizle ↗
          </button>
          <input disabled={busy}
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
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
            <span className="eyebrow">{items.length} / 20 FOTOĞRAF</span>
            {!items.length ? (
              <button
                className="studio-drop"
                disabled={busy || !ready}
                onClick={() => picker.current?.click()}
              >
                <span>+</span>
                <strong>
                  {ready
                    ? "Fotoğraflarını buraya bırak"
                    : "Taslaklar yükleniyor…"}
                </strong>
                <small>
                  veya dosya seç
                  <br />
                  JPG, PNG, WebP · Görsel başına en fazla 25 MB
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
                    <img src={p.src} alt={p.title} />
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </button>
                ))}
                <button
                  className="add-thumb"
                  disabled={busy}
                  onClick={() => picker.current?.click()}
                  aria-label="Daha fazla fotoğraf ekle"
                >
                  +
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
                      ←
                    </button>
                    <button
                      disabled={
                        items[items.length - 1]?.id === selected || busy
                      }
                      onClick={() => move(1)}
                      aria-label="Fotoğrafı sonraya taşı"
                    >
                      →
                    </button>
                  </div>
                </div>
                <label>
                  Başlık
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
                      value={current.category}
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
                <span>✳</span>
                <h3>Bir fotoğrafla başlar.</h3>
                <p>
                  Görselini seç, birkaç kelime ekle.
                  <br />
                  Defterde nasıl görüneceğini hemen gör.
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
            "Orijinal görseller korunur. Tarayıcı verilerini temizlemeden önce taslaklarını indir."}
        </p>
      </div>
    </dialog>
  );
}
