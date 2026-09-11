import type { Photo } from "./data";

const defaultUrl = "https://xwznjvreglbkpchuimem.supabase.co";
const defaultPublishableKey = "sb_publishable_RHQ8CqEgzr7UslYb9EYV8Q_Ueqe6Z7C";

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || defaultUrl).trim();
const anonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY || defaultPublishableKey,
).trim();
const baseUrl = rawUrl.replace(/\/$/, "");
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
  width: number;
  height: number;
  position: number;
  published: boolean;
  file_hash?: string | null;
  storage_path?: string | null;
  original_filename?: string | null;
  taken_at?: string | null;
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
    title: row.title,
    summary: row.summary || "",
    body: Array.isArray(row.body) ? row.body : [],
    place: row.place || "",
    category: row.category || "Doğa",
    width: Number(row.width || 1),
    height: Number(row.height || 1),
    fileHash: row.file_hash || undefined,
    storagePath: row.storage_path || undefined,
    originalFilename: row.original_filename || undefined,
    takenAt: row.taken_at || undefined,
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

export async function loadPublishedJourneyPhotos(): Promise<Photo[]> {
  if (!supabaseConfigured) return [];
  const response = await rest(
    "journey_photos?select=id,title,summary,body,place,category,image_url,thumbnail_url,width,height,position,published,file_hash,storage_path,original_filename,taken_at&published=eq.true&order=position.asc,created_at.desc",
  );
  if (!response.ok) return [];
  return (await response.json()).map(rowToPhoto);
}

export async function loadStudioJourneyPhotos(): Promise<Photo[]> {
  const session = await getJourneySession();
  if (!session) throw new Error("Oturum bulunamadı.");
  const response = await rest(
    "journey_photos?select=id,title,summary,body,place,category,image_url,thumbnail_url,width,height,position,published,file_hash,storage_path,original_filename,taken_at&order=position.asc,created_at.asc",
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
  return "jpg";
}

export async function uploadJourneyFile(
  file: File,
  photoId: string,
  fileHash?: string,
) {
  const session = await getJourneySession();
  if (!session) throw new Error("Oturum süresi doldu. Yeniden giriş yap.");

  const ext = extensionFor(file.type || "image/jpeg");
  const storagePath = `${session.user.id}/${photoId}/original.${ext}`;
  const response = await fetch(
    `${baseUrl}/storage/v1/object/journey-photos/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "content-type": file.type || "image/jpeg",
        "x-upsert": "true",
        "cache-control": "31536000",
      },
      body: file,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Fotoğraf Storage alanına yüklenemedi.");
  }

  return {
    url: `${baseUrl}/storage/v1/object/public/journey-photos/${storagePath}`,
    storagePath,
  };
}

async function uploadDataImage(dataUrl: string, photoId: string, session: JourneySession) {
  const { blob, mime } = dataUrlToBlob(dataUrl);
  const path = `${session.user.id}/${photoId}.${extensionFor(mime)}`;
  const response = await fetch(`${baseUrl}/storage/v1/object/journey-photos/${path}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "content-type": mime,
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body: blob,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Fotoğraf yüklenemedi.");
  }
  return `${baseUrl}/storage/v1/object/public/journey-photos/${path}`;
}

export async function saveJourneyPhotos(items: Photo[], published: boolean) {
  const session = await getJourneySession();
  if (!session) throw new Error("Oturum süresi doldu. Yeniden giriş yap.");

  const existingResponse = await rest(
    "journey_photos?select=id,storage_path&order=position.asc",
    {},
    session.access_token,
  );
  const existing = existingResponse.ok
    ? ((await existingResponse.json()) as Array<{
        id: string;
        storage_path?: string | null;
      }>)
    : [];

  const rows = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    let imageUrl = item.src;
    let thumbnailUrl = item.thumbnail;
    let storagePath = item.storagePath;

    if (item.src.startsWith("data:")) {
      imageUrl = await uploadDataImage(item.src, item.id, session);
      thumbnailUrl = imageUrl;
      storagePath = `${session.user.id}/${item.id}.${extensionFor(
        item.src.match(/^data:([^;,]+)/)?.[1] || "image/jpeg",
      )}`;
    }

    rows.push({
      id: item.id,
      owner_id: session.user.id,
      title: item.title.trim(),
      summary: item.summary || "",
      body: item.body || [],
      place: item.place || "",
      category: item.category || "Diğer",
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl || imageUrl,
      width: item.width,
      height: item.height,
      position: index,
      published,
      file_hash: item.fileHash || null,
      storage_path: storagePath || null,
      original_filename: item.originalFilename || null,
      taken_at: item.takenAt || null,
      updated_at: new Date().toISOString(),
    });
  }

  let savedRows: JourneyRow[] = [];
  if (rows.length) {
    const response = await rest(
      "journey_photos?on_conflict=id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
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

  const keep = new Set(items.map((item) => item.id));
  const removed = existing.filter((row) => !keep.has(row.id));

  for (const row of removed) {
    const response = await rest(
      `journey_photos?id=eq.${encodeURIComponent(row.id)}`,
      { method: "DELETE" },
      session.access_token,
    );
    if (!response.ok) {
      throw new Error("Silinen fotoğraf veritabanından kaldırılamadı.");
    }

    if (row.storage_path) {
      await fetch(
        `${baseUrl}/storage/v1/object/journey-photos/${row.storage_path}`,
        {
          method: "DELETE",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      ).catch(() => null);
    }
  }

  return savedRows.map(rowToPhoto);
}
