#!/usr/bin/env node
/**
 * Instagram Photo Sync for Alsancak Runners
 *
 * Usage:
 *   node scripts/instagram-sync.mjs
 *
 * Environment variables:
 *   INSTAGRAM_ACCESS_TOKEN  - Instagram Graph API long-lived token
 *   INSTAGRAM_USER_ID       - Instagram Business Account ID
 *
 * Setup:
 *   1. Create a Facebook Developer App
 *   2. Add Instagram Graph API
 *   3. Get a long-lived token via OAuth flow
 *   4. Set the env vars above
 *
 * Without env vars, the script generates sample data from the
 * @alsancakrunners Instagram aesthetic.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '.cache');
const OUTPUT_FILE = path.join(CACHE_DIR, 'instagram-photos.json');
const GALLERY_DIR = path.join(__dirname, '..', 'public', 'gallery');

// ── Category detection via caption analysis ──
function categorize(caption = '') {
  const text = caption.toLowerCase();
  if (/stretch|warm.?up|lace|prep|hazırl|bağcık|ısın/i.test(text)) return 'preparation';
  if (/community|crew|together|group|topluluk|birlikte|ekip/i.test(text)) return 'community';
  if (/night|evening|gece|akşam/i.test(text)) return 'night-run';
  if (/city|street|urban|izmir|alsancak|kordon|şehir|kent/i.test(text)) return 'city';
  if (/collab|partner|sponsor|nike|running|marka/i.test(text)) return 'collabs';
  return 'runs';
}

// ── Fetch from Instagram Graph API ──
async function fetchInstagramPosts(token, userId) {
  const fields = 'id,caption,media_url,media_type,timestamp,permalink,thumbnail_url';
  const url = `https://graph.instagram.com/${userId}/media?fields=${fields}&limit=50&access_token=${token}`;

  console.log('📸 Fetching posts from Instagram Graph API...');
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Fetched ${data.data.length} posts`);

  // Handle pagination
  let allPosts = [...data.data];
  let nextUrl = data.paging?.next;

  while (nextUrl && allPosts.length < 100) {
    console.log(`📸 Fetching next page (${allPosts.length} so far)...`);
    const nextResponse = await fetch(nextUrl);
    if (!nextResponse.ok) break;
    const nextData = await nextResponse.json();
    allPosts = [...allPosts, ...nextData.data];
    nextUrl = nextData.paging?.next;
  }

  return allPosts;
}

// ── Process posts into normalized format ──
function processPosts(posts) {
  return posts
    .filter(post => post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM')
    .map((post, index) => ({
      id: post.id,
      src: post.media_url,
      // Instagram CDN serves max resolution by default
      srcHD: post.media_url,
      caption: post.caption || '',
      category: categorize(post.caption),
      timestamp: post.timestamp,
      permalink: post.permalink,
      index,
    }));
}

// ── Generate sample data when no API tokens ──
function generateSampleData() {
  console.log('⚠️  No Instagram tokens found. Generating sample gallery data.');
  console.log('   Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID for live sync.');
  console.log('');
  console.log('   To get tokens:');
  console.log('   1. Go to https://developers.facebook.com/');
  console.log('   2. Create app → Add Instagram Graph API');
  console.log('   3. Generate long-lived token');
  console.log('');

  // High-quality running/urban photos as placeholders
  const samplePhotos = [
    { id: 'ar_001', caption: 'Kordon sunrise run 🌅 #alsancakrunners #izmir #running', category: 'runs' },
    { id: 'ar_002', caption: 'Crew warming up before the Wednesday night run 🏃‍♂️ #community #together', category: 'community' },
    { id: 'ar_003', caption: 'Night run through Alsancak streets 🌙 #nightrun #urban', category: 'night-run' },
    { id: 'ar_004', caption: 'İzmir waterfront — our running playground 🌊 #city #kordon', category: 'city' },
    { id: 'ar_005', caption: 'Stretching before the weekly run #preparation #warmup', category: 'preparation' },
    { id: 'ar_006', caption: 'Every Wednesday at 19:00 — we run together #community #crew', category: 'community' },
    { id: 'ar_007', caption: 'Kordon to Karşıyaka — 12km long run 🔥 #running #izmir', category: 'runs' },
    { id: 'ar_008', caption: 'Kültürpark evening session #nightrun #alsancak', category: 'night-run' },
    { id: 'ar_009', caption: 'The city is our track 🏙️ #urban #street #izmir', category: 'city' },
    { id: 'ar_010', caption: 'New members joining the crew! Welcome 🙌 #community', category: 'community' },
    { id: 'ar_011', caption: 'Post-run coffee ritual ☕ #community #recovery', category: 'community' },
    { id: 'ar_012', caption: 'Sprint session at Kordon 💨 #running #speed', category: 'runs' },
  ];

  // Map to Unsplash HD images that match the aesthetic
  const unsplashIds = [
    'photo-1552674605-db6ffd4facb5', // runners on track
    'photo-1571019614242-c5c5dee9f50b', // group runners
    'photo-1506365069540-904bcc762636', // night city
    'photo-1486218119243-13883505764c', // runner silhouette
    'photo-1434682881908-b43d0467b798', // stretching
    'photo-1517649763962-0c623066013b', // group running
    'photo-1502904550040-7534597429ae', // urban running
    'photo-1532444458054-01a7dd3e9fca', // night run
    'photo-1476480862126-209bfaa8edc8', // city skyline run
    'photo-1571008887538-b36bb32f4571', // community
    'photo-1495474472287-4d71bcdd2085', // coffee
    'photo-1594882645126-14020914d58d', // sprint
  ];

  return samplePhotos.map((photo, i) => ({
    ...photo,
    src: `https://images.unsplash.com/${unsplashIds[i]}?w=800&q=85`,
    srcHD: `https://images.unsplash.com/${unsplashIds[i]}?w=2400&q=95`,
    timestamp: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    permalink: `https://www.instagram.com/alsancakrunners/`,
    index: i,
  }));
}

// ── Main ──
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ALSANCAK RUNNERS — Instagram Sync');
  console.log('═══════════════════════════════════════');
  console.log('');

  // Ensure directories exist
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  let photos;

  if (token && userId) {
    try {
      const posts = await fetchInstagramPosts(token, userId);
      photos = processPosts(posts);
      console.log(`✅ Processed ${photos.length} photos`);
    } catch (error) {
      console.error(`❌ API error: ${error.message}`);
      console.log('   Falling back to sample data...');
      photos = generateSampleData();
    }
  } else {
    photos = generateSampleData();
  }

  // Group by category
  const grouped = {};
  for (const photo of photos) {
    if (!grouped[photo.category]) grouped[photo.category] = [];
    grouped[photo.category].push(photo);
  }

  const output = {
    syncedAt: new Date().toISOString(),
    source: token ? 'instagram-api' : 'sample-data',
    total: photos.length,
    categories: Object.keys(grouped),
    categoryCounts: Object.fromEntries(
      Object.entries(grouped).map(([k, v]) => [k, v.length])
    ),
    photos,
    grouped,
  };

  // Write cache
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log('');
  console.log(`📁 Saved to ${OUTPUT_FILE}`);
  console.log(`   Total: ${output.total} photos`);
  console.log(`   Categories: ${output.categories.join(', ')}`);
  for (const [cat, count] of Object.entries(output.categoryCounts)) {
    console.log(`     ${cat}: ${count}`);
  }
  console.log('');
  console.log('✅ Sync complete!');
  console.log('');
}

main().catch(console.error);
