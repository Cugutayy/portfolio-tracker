import catalog from "./catalog.json";
export type Photo = {
  id: string;
  src: string;
  thumbnail: string;
  title: string;
  summary: string;
  body: string[];
  place: string;
  category: string;
  width: number;
  height: number;
  smallWidth?: number;
  largeWidth?: number;
  fileHash?: string;
  storagePath?: string;
  originalFilename?: string;
  takenAt?: string;
  originalSrc?: string;
  displayPath?: string;
  thumbnailPath?: string;
  mimeType?: string;
  byteSize?: number;
  published?: boolean;
  publishedAt?: string;
  deletedAt?: string;
};
export const photos: Photo[] = catalog;
export const categories = ["Tümü", "Doğa", "Mimari", "Sokak", "Ayrıntı", "Diğer"];
export const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
