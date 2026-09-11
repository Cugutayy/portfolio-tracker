import type { Photo } from "./data";

const defaultUrl = "https://xwznjvreglbkpchuimem.supabase.co";
const defaultPublishableKey = "sb_publishable_RHQ8CqEgzr7UslYb9EYV8Q_Ueqe6Z7C";

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || defaultUrl).trim();
const anonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY || defaultPublishableKey,
).trim();
const baseUrl = rawUrl.replace(/\/$/, "");
const storageUploadBaseUrl = (() => {
  try {
    const url = new URL(baseUrl);
    if (url.hostname.endsWith(".supabase.co")) {
      url.hostname = url.hostname.replace(".supabase.co", ".storage.supabase.co");
    }
    return url.origin;
  } catch {
    return baseUrl;
  }
})();
const sessionKey = "jn-supabase-session";

export const supabaseConfigured = Boolean(baseUrl && anonKey);

export type JourneySession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
};

type JourneyRow = {
  id: string;
  owner_id?: string | null;
  title: string;
  summary: string;
  body: string[] | null;
  place: string;
  category: string;
  image_url: string;
  thumbnail_url: string | null;
  original_url?: string | null;
  width: number;
  height: number;
  display_width?: number | null;
  thumbnail_width?: number | null;
  position: number;
  published: boolean;
  file_hash?: string | null;
  storage_path?: string | null;
  display_path?: string | null;
  thumbnail_path?: string | null;
  original_filename?: string | null;
  taken_at?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  published_at?: string | null;
  deleted_at?: string | null;
};

function saveSession(session: JourneySession | null) {
  try {
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
    else localStorage.removeItem(sessionKey);
  } catch {}
}

function readSession(): JourneySession | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function authRequest(path: string, init: RequestInit = {}) {
  if (!supabaseConfigured) throw new Error("Supabase yapılandırılmadı.");
  return fetch(`${baseUrl}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function normalizeSession(data: any): JourneySession {
  const expiresIn = Number(data.expires_in || 3600);
  return {
    access_token: String(data.access_token),
    refresh_token: String(data.refresh_token || ""),
    expires_at: Math.floor(Date.now() / 1000) + expiresIn - 30,
    user: {
      id: String(data.user?.id || ""),
      email: data.user?.email ? String(data.user.email) : undefined,
    },
  };
}

async function refreshSession(session: JourneySession) {
  if (!session.refresh_token) return null;
  const response = await authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    saveSession(null);
    return null;
  }
  const next = normalizeSession(await response.json());
  saveSession(next);
  return next;
}

export async function getJourneySession(): Promise<JourneySession | null> {
  if (!supabaseConfigured) return null;
  let session = readSession();
  if (!session) return null;
  if (session.expires_at <= Math.floor(Date.now() / 1000)) {
    session = await refreshSession(session);
    if (!session) return null;
  }
  const response = await authRequest("/user", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    session = await refreshSession(session);
    if (!session) return null;
  }
  return session;
}

export async function signInJourney(email: string, password: string) {
  const response = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || "Giriş başarısız.");
  }
  const session = normalizeSession(data);
  saveSession(session);
  return session;
}

export async function signOutJourney() {
  const session = readSession();
  if (session && supabaseConfigured) {
    await authRequest("/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => null);
  }
  saveSession(null);
}

function rowToPhoto(row: JourneyRow): Photo {
  return {
    id: row.id,
    src: row.image_url,
    thumbnail: row.thumbnail_url || row.image_url,
    originalSrc: row.original_url || row.image_url,
    title: row.title || "",
    summary: row.summary || "",
    body: Array.isArray(row.body) ? row.body : [],
    place: row.place || "",
    category: row.category || "Diğer",
    width: Number(row.width || 1),
    height: Number(row.height || 1),
    smallWidth: row.thumbnail_width ? Number(row.thumbnail_width) : undefined,
    largeWidth: row.display_width ? Number(row.display_width) : undefined,
    fileHash: row.file_hash || undefined,
    storagePath: row.storage_path || undefined,
    displayPath: row.display_path || undefined,
    thumbnailPath: row.thumbnail_path || undefined,
    originalFilename: row.original_filename || undefined,
    takenAt: row.taken_at || undefined,
    mimeType: row.mime_type || undefined,
    byteSize: row.byte_size == null ? undefined : Number(row.byte_size),
    published: Boolean(row.published),
    publishedAt: row.published_at || undefined,
    deletedAt: row.deleted_at || undefined,
  };
}

async function rest(path: string, init: RequestInit = {}, accessToken?: string) {
  if (!supabaseConfigured) throw new Error("Supabase yapılandırılmadı.");
  return fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken || anonKey}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

const journeySelect =
  "id,title,summary,body,place,category,image_url,thumbnail_url,original_url,width,height,display_width,thumbnail_width,position,published,file_hash,storage_path,display_path,thumbnail_path,original_filename,taken_at,mime_type,byte_size,published_at,deleted_at";

export async function loadPublishedJourneyPhotos(): Promise<Photo[]> {
  if (!supabaseConfigured) return [];
  const response = await rest(
    `journey_photos?select=${journeySelect}&published=eq.true&deleted_at=is.null&order=position.asc,created_at.asc`,
  );
  if (!response.ok) return [];
  return (await response.json()).map(rowToPhoto);
}

export async function loadStudioJourneyPhotos(): Promise<Photo[]> {
  const session = await getJourneySession();
  if (!session) throw new Error("Oturum bulunamadı.");
  const response = await rest(
    `journey_photos?select=${journeySelect}&deleted_at=is.null&order=position.asc,created_at.asc`,
    {},
    session.access_token,
  );
  if (!response.ok) throw new Error("Bulut taslakları okunamadı.");
  return (await response.json()).map(rowToPhoto);
}

function dataUrlToBlob(value: string) {
  const match = value.match(/^data:([^;,]+)(?:;base64)?,(.*)$/);
  if (!match) throw new Error("Görsel verisi okunamadı.");
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  return "jpg";
}

function publicStorageUrl(path: string) {
  return `${baseUrl}/storage/v1/object/public/journey-photos/${path}`;
}

const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

function tusMetadata(value: string) {
  return btoa(value);
}

function tusResumeKey(path: string) {
  return `jn-tus:${path}`;
}

async function tusHead(url: string, session: JourneySession) {
  const response = await fetch(url, {
    method: "HEAD",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Tus-Resumable": "1.0.0",
    },
  });
  if (!response.ok) return null;
  return Number(response.headers.get("Upload-Offset") || "0");
}

async function createTusUpload(
  blob: Blob,
  path: string,
  session: JourneySession,
  contentType: string,
) {
  const response = await fetch(
    `${storageUploadBaseUrl}/storage/v1/upload/resumable`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(blob.size),
        "Upload-Metadata": [
          `bucketName ${tusMetadata("journey-photos")}`,
          `objectName ${tusMetadata(path)}`,
          `contentType ${tusMetadata(contentType)}`,
          `cacheControl ${tusMetadata("31536000")}`,
        ].join(","),
        "x-upsert": "true",
      },
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Büyük dosya yüklemesi başlatılamadı.");
  }

  const location = response.headers.get("Location");
  if (!location) throw new Error("Resumable upload adresi alınamadı.");
  return new URL(location, storageUploadBaseUrl).toString();
}

async function uploadBlobResumable(
  blob: Blob,
  path: string,
  session: JourneySession,
  contentType: string,
) {
  const resumeKey = tusResumeKey(path);
  let uploadUrl = "";
  let offset = 0;

  try {
    const saved = localStorage.getItem(resumeKey);
    if (saved) {
      const parsed = JSON.parse(saved) as { url?: string; createdAt?: number };
      if (
        parsed.url &&
        parsed.createdAt &&
        Date.now() - parsed.createdAt < 23 * 60 * 60 * 1000
      ) {
        const previousOffset = await tusHead(parsed.url, session).catch(() => null);
        if (previousOffset !== null && previousOffset <= blob.size) {
          uploadUrl = parsed.url;
          offset = previousOffset;
        }
      }
    }
  } catch {}

  if (!uploadUrl) {
    uploadUrl = await createTusUpload(blob, path, session, contentType);
    try {
      localStorage.setItem(
        resumeKey,
        JSON.stringify({ url: uploadUrl, createdAt: Date.now() }),
      );
    } catch {}
  }

  while (offset < blob.size) {
    const end = Math.min(offset + TUS_CHUNK_SIZE, blob.size);
    const chunk = blob.slice(offset, end);
    let uploaded = false;
    let lastError = "";

    for (const delay of [0, 1200, 3000, 6000, 10000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        const response = await fetch(uploadUrl, {
          method: "PATCH",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${session.access_token}`,
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": String(offset),
            "Content-Type": "application/offset+octet-stream",
          },
          body: chunk,
        });

        if (response.ok) {
          offset = Number(response.headers.get("Upload-Offset") || end);
          uploaded = true;
          break;
        }

        lastError = await response.text().catch(() => "");
        if (response.status === 409 || response.status >= 500) {
          const remoteOffset = await tusHead(uploadUrl, session).catch(() => null);
          if (remoteOffset !== null && remoteOffset >= offset) {
            offset = remoteOffset;
            if (offset >= end) {
              uploaded = true;
              break;
            }
          }
          continue;
        }

        throw new Error(lastError || `Upload HTTP ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Ağ hatası";
        const remoteOffset = await tusHead(uploadUrl, session).catch(() => null);
        if (remoteOffset !== null && remoteOffset > offset) {
          offset = remoteOffset;
          if (offset >= end) {
            uploaded = true;
            break;
          }
        }
      }
    }

    if (!uploaded) {
      throw new Error(lastError || "Büyük dosya yüklemesi kesildi.");
    }
  }

  try {
    localStorage.removeItem(resumeKey);
  } catch {}

  return publicStorageUrl(path);
}

async function uploadBlobStandard(
  blob: Blob,
  path: string,
  session: JourneySession,
  contentType: string,
) {
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(
        `${baseUrl}/storage/v1/object/journey-photos/${path}`,
        {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${session.access_token}`,
            "content-type": contentType,
            "x-upsert": "true",
            "cache-control": "31536000",
          },
          body: blob,
        },
      );
      if (response.ok) return publicStorageUrl(path);

      const detail = await response.text().catch(() => "");
      lastError = detail || `Storage HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Ağ hatası";
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 900 * 2 ** attempt));
    }
  }

  throw new Error(lastError || "Fotoğraf Storage alanına yüklenemedi.");
}

async function uploadBlob(
  blob: Blob,
  path: string,
  session: JourneySession,
  contentType: string,
) {
  if (blob.size > TUS_CHUNK_SIZE) {
    return uploadBlobResumable(blob, path, session, contentType);
  }
  return uploadBlobStandard(blob, path, session, contentType);
}

export async function uploadJourneyAssets(
  original: File | Blob,
  display: Blob,
  thumbnail: Blob,
  photoId: string,
  originalMime: string,
) {
  const session = await getJourneySession();
  if (!session) throw new Error("Oturum süresi doldu. Yeniden giriş yap.");

  const root = `${session.user.id}/${photoId}`;
  const originalPath = `${root}/original.${extensionFor(originalMime)}`;
  const displayPath = `${root}/display.webp`;
  const thumbnailPath = `${root}/thumb.webp`;

  const originalUrl = await uploadBlob(
    original,
    originalPath,
    session,
    originalMime || "image/jpeg",
  );
  const imageUrl = await uploadBlob(
    display,
    displayPath,
    session,
    "image/webp",
  );
  const thumbnailUrl = await uploadBlob(
    thumbnail,
    thumbnailPath,
    session,
    "image/webp",
  );

  return {
    originalUrl,
    imageUrl,
    thumbnailUrl,
    storagePath: originalPath,
    displayPath,
    thumbnailPath,
  };
}

async function uploadDataImage(
  dataUrl: string,
  path: string,
  session: JourneySession,
) {
  const { blob, mime } = dataUrlToBlob(dataUrl);
  return uploadBlob(blob, path, session, mime);
}

type SaveJourneyOptions = {
  publishAll?: boolean;
  removedIds?: string[];
};

export async function saveJourneyPhotos(
  items: Photo[],
  options: SaveJourneyOptions = {},
) {
  const session = await getJourneySession();
  if (!session) throw new Error("Oturum süresi doldu. Yeniden giriş yap.");

  const rows = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    let imageUrl = item.src;
    let thumbnailUrl = item.thumbnail;
    let originalUrl = item.originalSrc || item.src;
    let storagePath = item.storagePath;
    let displayPath = item.displayPath;
    let thumbnailPath = item.thumbnailPath;

    const root = `${session.user.id}/${item.id}`;

    if (originalUrl.startsWith("data:")) {
      const mime =
        item.mimeType ||
        originalUrl.match(/^data:([^;,]+)/)?.[1] ||
        "image/jpeg";
      storagePath = `${root}/original.${extensionFor(mime)}`;
      originalUrl = await uploadDataImage(originalUrl, storagePath, session);
    }

    if (imageUrl.startsWith("data:")) {
      displayPath = `${root}/display.webp`;
      imageUrl = await uploadDataImage(imageUrl, displayPath, session);
    }

    if (thumbnailUrl.startsWith("data:")) {
      thumbnailPath = `${root}/thumb.webp`;
      thumbnailUrl = await uploadDataImage(
        thumbnailUrl,
        thumbnailPath,
        session,
      );
    }

    rows.push({
      id: item.id,
      owner_id: session.user.id,
      title: (item.title || "").trim(),
      summary: item.summary || "",
      body: item.body || [],
      place: item.place || "",
      category: item.category || "Diğer",
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl || imageUrl,
      original_url: originalUrl || imageUrl,
      width: item.width,
      height: item.height,
      display_width: item.largeWidth || null,
      thumbnail_width: item.smallWidth || null,
      position: index,
      published: options.publishAll ? true : Boolean(item.published),
      file_hash: item.fileHash || null,
      storage_path: storagePath || null,
      display_path: displayPath || null,
      thumbnail_path: thumbnailPath || null,
      original_filename: item.originalFilename || null,
      taken_at: item.takenAt || null,
      mime_type: item.mimeType || null,
      byte_size: item.byteSize ?? null,
      processing_version: 2,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    });
  }

  let savedRows: JourneyRow[] = [];
  if (rows.length) {
    const response = await rest(
      "journey_photos?on_conflict=id",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(rows),
      },
      session.access_token,
    );
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(
        data?.message || data?.hint || "Veritabanına kaydedilemedi.",
      );
    }
    savedRows = data as JourneyRow[];
  }

  for (const id of Array.from(new Set(options.removedIds || []))) {
    const response = await rest(
      `journey_photos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          deleted_at: new Date().toISOString(),
          published: false,
        }),
      },
      session.access_token,
    );
    if (!response.ok) {
      throw new Error("Silinen fotoğraf güvenli çöp alanına taşınamadı.");
    }
  }

  return savedRows.map(rowToPhoto);
}
