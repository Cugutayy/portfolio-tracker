const MB = 1024 * 1024;

export const JOURNEY_MAX_UPLOAD_BYTES = 50 * MB;
export const JOURNEY_MAX_PIXELS = 100_000_000;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

export const journeyAcceptedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

export type PreparedJourneyMedia = {
  original: File;
  display: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  displayWidth: number;
  thumbnailWidth: number;
  fileHash: string;
  mimeType: string;
  byteSize: number;
  takenAt?: string;
};

export function journeyMimeType(file: File) {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXTENSION[ext] || "";
}

export async function journeySha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function decodeBitmap(file: Blob) {
  try {
    return await createImageBitmap(
      file,
      { imageOrientation: "from-image" } as ImageBitmapOptions,
    );
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error(
        "Bu görsel tarayıcıda çözülemedi. HEIC/HEIF ise Safari veya iPhone üzerinden yüklemeyi dene; diğer durumlarda JPG/WebP kopyasını kullan.",
      );
    }
  }
}

async function canvasBlob(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
) {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxEdge / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true,
  });
  if (!context) throw new Error("Görsel işleme alanı oluşturulamadı.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );

  canvas.width = 1;
  canvas.height = 1;

  if (!blob) throw new Error("WebP önizleme üretilemedi.");
  return { blob, width };
}

export async function prepareJourneyMedia(
  file: File,
): Promise<PreparedJourneyMedia> {
  const mimeType = journeyMimeType(file);

  if (!journeyAcceptedTypes.includes(mimeType)) {
    throw new Error(
      "Desteklenen formatlar: JPG, PNG, WebP, AVIF, HEIC ve HEIF.",
    );
  }

  if (!file.size || file.size > JOURNEY_MAX_UPLOAD_BYTES) {
    throw new Error("Dosya en fazla 50 MB olabilir.");
  }

  const [fileHash, bitmap] = await Promise.all([
    journeySha256(file),
    decodeBitmap(file),
  ]);

  try {
    const width = bitmap.width;
    const height = bitmap.height;
    if (!width || !height) throw new Error("Görsel boyutu okunamadı.");

    if (width * height > JOURNEY_MAX_PIXELS) {
      throw new Error(
        "Görsel 100 megapikselden büyük. Tarayıcı belleğini korumak için önce daha küçük bir kopya oluştur.",
      );
    }

    const [display, thumbnail] = await Promise.all([
      canvasBlob(bitmap, 3200, 0.92),
      canvasBlob(bitmap, 960, 0.84),
    ]);

    return {
      original: file,
      display: display.blob,
      thumbnail: thumbnail.blob,
      width,
      height,
      displayWidth: display.width,
      thumbnailWidth: thumbnail.width,
      fileHash,
      mimeType,
      byteSize: file.size,
      takenAt:
        file.lastModified && file.lastModified > 946684800000
          ? new Date(file.lastModified).toISOString()
          : undefined,
    };
  } finally {
    bitmap.close();
  }
}
