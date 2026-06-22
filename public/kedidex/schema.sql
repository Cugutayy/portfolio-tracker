-- KediDex — Cloudflare D1 şeması
-- Not: /api/catches fonksiyonu tabloyu otomatik de oluşturur (CREATE TABLE IF NOT EXISTS).
-- Bu dosya temiz/manuel provizyon içindir.

CREATE TABLE IF NOT EXISTS catches (
  id          TEXT PRIMARY KEY,
  player_id   TEXT,
  player_name TEXT,
  cat_name    TEXT,
  title       TEXT,
  rarity      TEXT,
  seed        INTEGER,
  level       INTEGER,
  quality     INTEGER,
  verified    INTEGER DEFAULT 0,
  lat         REAL,
  lng         REAL,
  created_at  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_catches_geo_time ON catches (lat, lng, created_at);
