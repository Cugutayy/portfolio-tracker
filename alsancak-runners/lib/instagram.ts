import fs from 'fs';
import path from 'path';

export interface InstagramPhoto {
  id: string;
  src: string;
  srcHD: string;
  caption: string;
  category: string;
  timestamp: string;
  permalink: string;
  index: number;
}

export interface InstagramData {
  syncedAt: string;
  source: string;
  total: number;
  categories: string[];
  categoryCounts: Record<string, number>;
  photos: InstagramPhoto[];
  grouped: Record<string, InstagramPhoto[]>;
}

export function getInstagramPhotos(): InstagramData | null {
  try {
    const cachePath = path.join(process.cwd(), '.cache', 'instagram-photos.json');
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(raw) as InstagramData;
  } catch {
    return null;
  }
}
