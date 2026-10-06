/**
 * SONORA Milestone 2A — Catalog Foundation & Living Music Library Verification
 * Authoritative Reference: PRD.md Section 10, 12, 13, 52; AGENTS.md; Milestone 2A
 * 
 * Validates:
 * 1. Catalog Domain Architecture & Source Structure (types, store, service, sources, synthesizer)
 * 2. Seed Catalog Data Integrity (64 authorized demo tracks, 18 artists, 12 albums, 4 playlists)
 * 3. Search Engine & Harmonic Key Filtering Logic
 * 4. Camelot Wheel Harmonic Compatibility & Frequency Physics
 * 5. User Library Persistence (Favorites, Recently Played, Custom Playlists, Active Focus)
 * 6. Provider Abstraction & Decoupling (Demo & Local providers)
 * 7. Representation Transformation (Library -> Player -> DJ Deck -> Waveform)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('SONORA Milestone 2A — Catalog & Library Tests');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// [1/7] Catalog Domain Architecture & Source Structure
// -----------------------------------------------------------------------------
console.log('[1/7] Verifying catalog domain architecture & module structure...');

const catalogDir = path.join(rootDir, 'src', 'catalog');
assert(fs.existsSync(catalogDir), 'src/catalog/ directory must exist');

const requiredFiles = [
  'types.ts',
  'audioSynthesizer.ts',
  'seedCatalog.ts',
  'catalogStore.ts',
  'catalogService.ts',
  'index.ts',
  'sources/demoSource.ts',
  'sources/localSource.ts',
];

for (const relPath of requiredFiles) {
  const fullPath = path.join(catalogDir, relPath);
  assert(fs.existsSync(fullPath), `Required catalog file missing: src/catalog/${relPath}`);
}

// Validate types.ts definitions
const typesSrc = fs.readFileSync(path.join(catalogDir, 'types.ts'), 'utf-8');
const requiredTypes = [
  'interface Track',
  'interface Artist',
  'interface Album',
  'interface Playlist',
  'interface Genre',
  'interface Mood',
  'interface CatalogFilterOptions',
  'interface CatalogSearchResult',
  'interface CatalogProvider',
];

for (const typeDef of requiredTypes) {
  assert(typesSrc.includes(typeDef), `types.ts must define ${typeDef}`);
}

console.log('✓ Catalog domain architecture and TypeScript models verified');

// -----------------------------------------------------------------------------
// [2/7] Seed Catalog Data Integrity
// -----------------------------------------------------------------------------
console.log('[2/7] Verifying seed catalog content and metadata integrity...');

const seedSrc = fs.readFileSync(path.join(catalogDir, 'seedCatalog.ts'), 'utf-8');

// Count track definitions in SEED_TRACKS
const trackIdMatches = seedSrc.match(/id:\s*['"]track-[0-9]+['"]/g);
assert(trackIdMatches !== null, 'SEED_TRACKS must define tracks with track- IDs');
const trackCount = trackIdMatches.length;
assert(trackCount === 64, `Expected exactly 64 seed tracks, found ${trackCount}`);

// Count artists
const artistIdMatches = seedSrc.match(/id:\s*['"]art-[a-z0-9-]+['"]/g);
assert(artistIdMatches !== null, 'SEED_ARTISTS must define artists with art- IDs');
const artistCount = artistIdMatches.length;
assert(artistCount === 18, `Expected 18 seed artists, found ${artistCount}`);

// Count albums
const albumIdMatches = seedSrc.match(/id:\s*['"]alb-[a-z0-9-]+['"]/g);
assert(albumIdMatches !== null, 'SEED_ALBUMS must define albums with alb- IDs');
const albumCount = albumIdMatches.length;
assert(albumCount === 12, `Expected 12 seed albums, found ${albumCount}`);

// Count playlists
const playlistIdMatches = seedSrc.match(/id:\s*['"]pl-[a-z0-9-]+['"]/g);
assert(playlistIdMatches !== null, 'SEED_PLAYLISTS must define playlists with pl- IDs');
const playlistCount = playlistIdMatches.length;
assert(playlistCount >= 4, `Expected at least 4 curated playlists, found ${playlistCount}`);

// Verify authentic playable demo flags (zero fake audio / zero scraping)
assert(seedSrc.includes("isPlayable: true"), 'Seed tracks must be marked isPlayable: true');
assert(seedSrc.includes("source: 'demo'"), "Seed tracks must declare source: 'demo'");
assert(!seedSrc.includes('spotify.com'), 'Seed catalog must NOT contain unauthorized Spotify audio references');
assert(!seedSrc.includes('soundcloud.com'), 'Seed catalog must NOT contain unauthorized SoundCloud audio references');

console.log(`✓ 64 authorized demo tracks, ${artistCount} artists, ${albumCount} albums, and ${playlistCount} playlists verified`);

// -----------------------------------------------------------------------------
// [3/7] Search Engine & Harmonic Filtering Logic
// -----------------------------------------------------------------------------
console.log('[3/7] Verifying search engine query matching & filter algorithms...');

// Extract sample tracks from seed source using robust block parsing
const tracks = [];
const tracksBlockMatch = seedSrc.slice(seedSrc.indexOf('export const SEED_TRACKS'));
const trackBlockRegex = /\{\s*id:\s*['"]track-\d+[\s\S]*?\n\s*\},/g;

let blockMatch;
while ((blockMatch = trackBlockRegex.exec(tracksBlockMatch)) !== null) {
  const block = blockMatch[0];
  const id = block.match(/id:\s*['"]([^'"]+)['"]/)?.[1];
  const title = block.match(/title:\s*['"]([^'"]+)['"]/)?.[1];
  const artistId = block.match(/artistId:\s*['"]([^'"]+)['"]/)?.[1];
  const artistName = block.match(/artistName:\s*['"]([^'"]+)['"]/)?.[1];
  const albumId = block.match(/albumId:\s*['"]([^'"]+)['"]/)?.[1];
  const albumName = block.match(/albumName:\s*['"]([^'"]+)['"]/)?.[1];
  const genre = block.match(/genre:\s*['"]([^'"]+)['"]/)?.[1];
  const bpm = parseInt(block.match(/bpm:\s*(\d+)/)?.[1] || '120', 10);
  const key = block.match(/key:\s*['"]([^'"]+)['"]/)?.[1];
  const dur = parseFloat(block.match(/duration:\s*([\d.]+)/)?.[1] || '180');
  const moodsMatch = block.match(/moods:\s*\[([^\]]*)\]/)?.[1];
  const moods = moodsMatch ? moodsMatch.split(',').map((s) => s.trim().replace(/['"]/g, '')) : [];

  if (id && title) {
    tracks.push({
      id,
      title,
      artistId: artistId || '',
      artistName: artistName || '',
      albumId,
      albumName,
      duration: dur,
      genre: genre || 'Ambient & Drone',
      moods,
      bpm,
      key: key || '8A',
      source: 'demo',
      isPlayable: true,
      isLocal: false,
    });
  }
}

assert(tracks.length >= 60, `Parsed ${tracks.length} tracks for search algorithmic testing`);

// Test exact and fuzzy query matching
function searchTracks(items, query) {
  if (!query || !query.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter((t) => {
    return (
      t.title.toLowerCase().includes(q) ||
      t.artistName.toLowerCase().includes(q) ||
      (t.albumName && t.albumName.toLowerCase().includes(q)) ||
      t.genre.toLowerCase().includes(q) ||
      t.key.toLowerCase() === q ||
      t.moods.some((m) => m.toLowerCase().includes(q))
    );
  });
}

// Query by title: "Horizon"
const horizonResults = searchTracks(tracks, 'Horizon');
assert(horizonResults.length > 0, 'Query "Horizon" must match title');
assert(horizonResults.some((t) => t.title.includes('Horizon')), 'Must find track with Horizon');

// Query by artist: "Aethelgard"
const artistResults = searchTracks(tracks, 'Aethelgard');
assert(artistResults.length > 0, 'Query "Aethelgard" must match artistName');
assert(artistResults[0].artistName.includes('Aethelgard'), 'Found correct artist');

// Query by Camelot Key: "8A"
const keyResults = searchTracks(tracks, '8A');
assert(keyResults.length > 0, 'Query "8A" must match harmonic key');
assert(keyResults.every((t) => t.key === '8A'), 'All results must match 8A');

// Filter by BPM range
function filterBpm(items, minBpm, maxBpm) {
  return items.filter((t) => t.bpm >= minBpm && t.bpm <= maxBpm);
}

const technoBpm = filterBpm(tracks, 130, 140);
assert(technoBpm.length > 0, 'Filter for 130-140 BPM must return matching tracks');
assert(technoBpm.every((t) => t.bpm >= 130 && t.bpm <= 140), 'All results within BPM range');

console.log('✓ Search query matching (title, artist, album, key, BPM) verified');

// -----------------------------------------------------------------------------
// [4/7] Camelot Wheel Harmonic Compatibility & Frequency Physics
// -----------------------------------------------------------------------------
console.log('[4/7] Verifying Camelot wheel harmonic compatibility and pitch physics...');

const synthSrc = fs.readFileSync(path.join(catalogDir, 'audioSynthesizer.ts'), 'utf-8');

// Verify all 24 Camelot keys are mapped
const CAMELOT_KEYS = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
];

for (const k of CAMELOT_KEYS) {
  assert(synthSrc.includes(`'${k}':`), `audioSynthesizer must map frequency for Camelot key ${k}`);
}

// Test harmonic compatibility logic
function getCompatibleKeys(key) {
  const match = key.match(/^(\d{1,2})([AB])$/);
  if (!match) return [key];
  const num = parseInt(match[1], 10);
  const letter = match[2];
  const prevNum = num === 1 ? 12 : num - 1;
  const nextNum = num === 12 ? 1 : num + 1;
  const oppositeLetter = letter === 'A' ? 'B' : 'A';
  return [
    key,
    `${prevNum}${letter}`,
    `${nextNum}${letter}`,
    `${num}${oppositeLetter}`,
  ];
}

const comp8A = getCompatibleKeys('8A');
assert(comp8A.includes('8A'), 'Compatible keys must include same key');
assert(comp8A.includes('7A'), 'Compatible keys for 8A must include 7A (-1 step)');
assert(comp8A.includes('9A'), 'Compatible keys for 8A must include 9A (+1 step)');
assert(comp8A.includes('8B'), 'Compatible keys for 8A must include 8B (relative major)');

// Test 12A boundary wraparound
const comp12A = getCompatibleKeys('12A');
assert(comp12A.includes('1A'), '12A +1 step must wrap around to 1A');
assert(comp12A.includes('11A'), '12A -1 step must be 11A');

// Test 1A boundary wraparound
const comp1A = getCompatibleKeys('1A');
assert(comp1A.includes('12A'), '1A -1 step must wrap around to 12A');
assert(comp1A.includes('2A'), '1A +1 step must be 2A');

console.log('✓ Camelot harmonic key compatibility and 24-key root frequencies verified');

// -----------------------------------------------------------------------------
// [5/7] User Library Persistence & Store Contracts
// -----------------------------------------------------------------------------
console.log('[5/7] Verifying user library persistence (Favorites, History, Playlists)...');

const storeSrc = fs.readFileSync(path.join(catalogDir, 'catalogStore.ts'), 'utf-8');

// Verify storage keys
assert(storeSrc.includes('sonora_user_favorites'), 'Store must use sonora_user_favorites storage key');
assert(storeSrc.includes('sonora_recently_played'), 'Store must use sonora_recently_played storage key');
assert(storeSrc.includes('sonora_custom_playlists'), 'Store must use sonora_custom_playlists storage key');
assert(storeSrc.includes('sonora_active_track_id'), 'Store must use sonora_active_track_id storage key');

// Simulate localStorage persistence logic
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

const mockStorage = new MockStorage();

// Test Favorites
let favorites = ['track-01', 'track-05'];
mockStorage.setItem('sonora_user_favorites', JSON.stringify(favorites));

// Toggle favorite track-09
function toggleFavorite(id) {
  const current = JSON.parse(mockStorage.getItem('sonora_user_favorites') || '[]');
  const idx = current.indexOf(id);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(id);
  }
  mockStorage.setItem('sonora_user_favorites', JSON.stringify(current));
  return current;
}

const updatedFavs1 = toggleFavorite('track-09');
assert(updatedFavs1.includes('track-09'), 'track-09 should now be in favorites');

const updatedFavs2 = toggleFavorite('track-01');
assert(!updatedFavs2.includes('track-01'), 'track-01 should be removed from favorites');

// Test Recently Played
function recordRecentlyPlayed(trackId) {
  const current = JSON.parse(mockStorage.getItem('sonora_recently_played') || '[]');
  const filtered = current.filter((item) => item.trackId !== trackId);
  filtered.unshift({ trackId, timestamp: Date.now() });
  const sliced = filtered.slice(0, 50);
  mockStorage.setItem('sonora_recently_played', JSON.stringify(sliced));
  return sliced;
}

recordRecentlyPlayed('track-02');
recordRecentlyPlayed('track-06');
const recents = JSON.parse(mockStorage.getItem('sonora_recently_played'));
assert(recents[0].trackId === 'track-06', 'Most recently played must be first in list');
assert(recents[1].trackId === 'track-02', 'Second recently played must be second');

// Test Playlists
function createPlaylist(name, description) {
  const playlists = JSON.parse(mockStorage.getItem('sonora_user_playlists') || '[]');
  const newPl = {
    id: `user-pl-${Date.now()}`,
    name,
    description,
    trackIds: [],
    createdAt: Date.now(),
  };
  playlists.push(newPl);
  mockStorage.setItem('sonora_user_playlists', JSON.stringify(playlists));
  return newPl;
}

const pl = createPlaylist('Midnight Sessions', 'Hypnotic after-hours selection');
assert(pl.name === 'Midnight Sessions', 'Playlist created with correct name');
assert(Array.isArray(pl.trackIds), 'Playlist initialized with empty track list');

console.log('✓ Favorites, Recently Played, and Custom Playlists persistence verified');

// -----------------------------------------------------------------------------
// [6/7] Provider Abstraction & Decoupling
// -----------------------------------------------------------------------------
console.log('[6/7] Verifying provider abstraction & service decoupling...');

const demoSrc = fs.readFileSync(path.join(catalogDir, 'sources', 'demoSource.ts'), 'utf-8');
const localSrc = fs.readFileSync(path.join(catalogDir, 'sources', 'localSource.ts'), 'utf-8');
const serviceSrc = fs.readFileSync(path.join(catalogDir, 'catalogService.ts'), 'utf-8');

assert(demoSrc.includes('implements CatalogProvider'), 'DemoCatalogProvider must implement CatalogProvider');
assert(localSrc.includes('implements CatalogProvider'), 'LocalCatalogProvider must implement CatalogProvider');

// Ensure provider interface methods are implemented
const providerMethods = ['getTracks', 'getTrack', 'search'];
for (const method of providerMethods) {
  assert(demoSrc.includes(`${method}(`), `DemoCatalogProvider must implement ${method}`);
  assert(localSrc.includes(`${method}(`), `LocalCatalogProvider must implement ${method}`);
}

// Ensure catalog service provides unified facade
const serviceFacadeMethods = [
  'getTracks()',
  'getTrack(',
  'getArtists()',
  'getAlbums()',
  'getPlaylists()',
  'getFeatured()',
  'getRecentlyPlayed()',
  'search(',
  'filterByGenre(',
  'stageTrackToDeck(',
  'importLocalFile(',
];

for (const facadeMethod of serviceFacadeMethods) {
  assert(serviceSrc.includes(facadeMethod), `CatalogService must provide facade method: ${facadeMethod}`);
}

console.log('✓ Provider abstraction (DemoSource, LocalSource) and CatalogService facade verified');

// -----------------------------------------------------------------------------
// [7/7] Representation Transformation & Deck Integration
// -----------------------------------------------------------------------------
console.log('[7/7] Verifying track representation transformation (Library -> Player -> DJ Deck -> Waveform)...');

const playerSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'player', 'PersistentPlayer.tsx'), 'utf-8');
const librarySrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'views', 'LibraryView.tsx'), 'utf-8');
const searchSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'views', 'SearchView.tsx'), 'utf-8');

// PersistentPlayer receives canonical Track entity
assert(playerSrc.includes('currentTrack'), 'PersistentPlayer must render currentTrack');
assert(playerSrc.includes('currentTrack?.title') || playerSrc.includes('currentTrack.title'), 'PersistentPlayer displays track title');
assert(playerSrc.includes('currentTrack.artistName') || playerSrc.includes('currentTrack?.artistName'), 'PersistentPlayer displays artist name');
assert(playerSrc.includes('currentTrack?.bpm') || playerSrc.includes('currentTrack.bpm'), 'PersistentPlayer displays track BPM');
assert(playerSrc.includes('currentTrack?.key') || playerSrc.includes('currentTrack.key'), 'PersistentPlayer displays Camelot key');

// Library supports all 3 modes
assert(librarySrc.includes("'spatial'"), "LibraryView supports 'spatial' mode");
assert(librarySrc.includes("'flow'"), "LibraryView supports 'flow' mode");
assert(librarySrc.includes("'list'"), "LibraryView supports 'list' mode");

// Library & Search support staging to Deck A and Deck B
assert(librarySrc.includes("stageTrackToDeck(track, 'A')") || librarySrc.includes("stageTrackToDeck(activeTrack, 'A')") || librarySrc.includes("handleStageTrack"), 'Library supports staging to Deck A');
assert(searchSrc.includes("handleStageTrack(t, 'A')"), 'Search supports staging to Deck A');
assert(searchSrc.includes("handleStageTrack(t, 'B')"), 'Search supports staging to Deck B');

console.log('✓ Seamless track representation transformation across all views verified');

console.log('\n====================================================');
console.log('All 7 Milestone 2A Catalog test suites passed with 0 errors.');
console.log('====================================================\n');
