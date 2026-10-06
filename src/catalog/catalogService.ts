/**
 * SONORA Catalog Service
 * Authoritative Reference: PRD.md Section 11/12/15, PRODUCT_ARCHITECTURE.md
 * 
 * Provider-agnostic service orchestrating search, retrieval, filtering,
 * local library persistence, and AudioEngine playback integration.
 * The UI consumes this facade without awareness of underlying source providers.
 */

import {
  Track,
  Artist,
  Album,
  Playlist,
  Genre,
  Mood,
  CatalogFilterOptions,
  CatalogSearchResult,
  MusicSupplyProvider,
  PlaybackCapability,
  canUseTrack,
  getTrackCapabilities,
} from './types';
import { DemoCatalogProvider } from './sources/demoSource';
import { LocalCatalogProvider } from './sources/localSource';
import { JamendoMusicSupplyProvider } from './providers/jamendoProvider';
import { MusicSupplyRegistry, getMusicSupplyRegistry } from './musicSupplyRegistry';
import { SEED_ARTISTS, SEED_ALBUMS, SEED_PLAYLISTS, SEED_GENRES, SEED_MOODS } from './seedCatalog';
import { synthesizeTrackAudio } from './audioSynthesizer';
import { getCatalogStore } from './catalogStore';
import { getAudioEngine } from '../audio/AudioEngine';
import { loadAudioFile, decodeAudioBuffer } from '../audio/audioLoader';

export class CatalogService {
  private registry: MusicSupplyRegistry;
  public demoProvider: DemoCatalogProvider;
  public localProvider: LocalCatalogProvider;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  constructor(registry?: MusicSupplyRegistry) {
    this.registry = registry || getMusicSupplyRegistry();
    // Maintain direct handles for backward compatibility with Milestone 2A tests
    this.localProvider = this.registry.getLocalProvider().getDelegate();
    this.demoProvider = new DemoCatalogProvider();
  }

  // =========================================================================
  // 1. TRACK RETRIEVAL & FILTERING
  // =========================================================================

  public async getTracks(filters?: CatalogFilterOptions): Promise<Track[]> {
    const activeProviders = this.registry.getActiveProviders();
    const lists = await Promise.all(
      activeProviders.map(async (p) => {
        try {
          return await p.search(filters?.query || '', filters);
        } catch (err) {
          console.warn(`Provider "${p.id}" search failed:`, err);
          return [];
        }
      })
    );
    const merged = lists.flat();

    // Deduplicate tracks by stable ID across providers
    const seenIds = new Set<string>();
    const deduplicated: Track[] = [];
    for (const t of merged) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        deduplicated.push(t);
      }
    }

    // Secondary client-side filtering if provider did not apply all filters
    return deduplicated.filter((t) => {
      if (filters?.genre && t.genre?.toLowerCase() !== filters.genre.toLowerCase()) return false;
      if (filters?.mood && (!t.moods || !t.moods.some((m) => m.toLowerCase() === filters.mood!.toLowerCase()))) return false;
      if (filters?.artistId && t.artistId !== filters.artistId) return false;
      if (filters?.albumId && t.albumId !== filters.albumId) return false;
      if (filters?.source && t.source !== filters.source) return false;
      if (filters?.key && t.key?.toUpperCase() !== filters.key.toUpperCase()) return false;
      if (filters?.minBpm !== undefined && (t.bpm === undefined || t.bpm < filters.minBpm)) return false;
      if (filters?.maxBpm !== undefined && (t.bpm === undefined || t.bpm > filters.maxBpm)) return false;
      if (filters?.playableOnly && !t.isPlayable) return false;
      if (filters?.capability && !canUseTrack(t, filters.capability)) return false;
      if (filters?.capabilities && filters.capabilities.some((cap) => !canUseTrack(t, cap))) return false;
      return true;
    });
  }

  public async getTrack(id: string): Promise<Track | null> {
    const activeProviders = this.registry.getActiveProviders();
    for (const provider of activeProviders) {
      try {
        const track = await provider.getTrack(id);
        if (track) return track;
      } catch (err) {
        console.warn(`Provider "${provider.id}" getTrack failed:`, err);
      }
    }
    return null;
  }

  public async getTracksByIds(ids: string[]): Promise<Track[]> {
    const idSet = new Set(ids);
    const all = await this.getTracks();
    return all.filter((t) => idSet.has(t.id));
  }

  // =========================================================================
  // 2. ARTIST & ALBUM RETRIEVAL
  // =========================================================================

  public async getArtists(): Promise<Artist[]> {
    return [...SEED_ARTISTS];
  }

  public async getArtist(id: string): Promise<Artist | null> {
    return SEED_ARTISTS.find((a) => a.id === id) || null;
  }

  public async getAlbums(): Promise<Album[]> {
    return [...SEED_ALBUMS];
  }

  public async getAlbum(id: string): Promise<Album | null> {
    return SEED_ALBUMS.find((a) => a.id === id) || null;
  }

  // =========================================================================
  // 3. PLAYLISTS (CURATED & USER CUSTOM)
  // =========================================================================

  public async getPlaylists(): Promise<Playlist[]> {
    const custom = getCatalogStore().getCustomPlaylists();
    return [...SEED_PLAYLISTS, ...custom];
  }

  public async getPlaylist(id: string): Promise<Playlist | null> {
    const all = await this.getPlaylists();
    return all.find((p) => p.id === id) || null;
  }

  // =========================================================================
  // 4. TAXONOMY (GENRES & MOODS)
  // =========================================================================

  public getGenres(): Genre[] {
    return [...SEED_GENRES];
  }

  public getMoods(): Mood[] {
    return [...SEED_MOODS];
  }

  // =========================================================================
  // 5. UNIFIED CLIENT-SIDE SEARCH
  // =========================================================================

  public async search(query: string, filters?: CatalogFilterOptions): Promise<CatalogSearchResult> {
    const q = query.trim().toLowerCase();

    // 1. Search tracks
    const tracks = await this.getTracks({ ...filters, query: q });

    // 2. Search artists
    const artists = SEED_ARTISTS.filter((a) => {
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.genres && a.genres.some((g) => g.toLowerCase().includes(q))) ||
        (a.location && a.location.toLowerCase().includes(q))
      );
    });

    // 3. Search albums
    const albums = SEED_ALBUMS.filter((alb) => {
      if (!q) return true;
      return (
        alb.title.toLowerCase().includes(q) ||
        alb.artistName.toLowerCase().includes(q) ||
        (alb.genre && alb.genre.toLowerCase().includes(q))
      );
    });

    // 4. Search playlists
    const allPlaylists = await this.getPlaylists();
    const playlists = allPlaylists.filter((pl) => {
      if (!q) return true;
      return (
        pl.name.toLowerCase().includes(q) ||
        (pl.description && pl.description.toLowerCase().includes(q))
      );
    });

    return { tracks, artists, albums, playlists };
  }

  // =========================================================================
  // 6. DISCOVERY & FLOW PRESETS
  // =========================================================================

  public async filterByGenre(genre: string): Promise<Track[]> {
    return this.getTracks({ genre });
  }

  public async filterByMood(mood: string): Promise<Track[]> {
    return this.getTracks({ mood });
  }

  public async getFeatured(): Promise<Track[]> {
    const all = await this.getTracks();
    // Return a curated selection of showcase tracks
    const featuredIds = ['track-01', 'track-09', 'track-17', 'track-25', 'track-33', 'track-41', 'track-49', 'track-57'];
    return all.filter((t) => featuredIds.includes(t.id));
  }

  public async getRecentlyPlayed(): Promise<Track[]> {
    const recentItems = getCatalogStore().getRecentlyPlayed();
    const ids = recentItems.map((item) => item.trackId);
    const trackMap = new Map((await this.getTracks()).map((t) => [t.id, t]));
    
    // Maintain chronological order
    const ordered: Track[] = [];
    for (const id of ids) {
      const t = trackMap.get(id);
      if (t) ordered.push(t);
    }
    return ordered;
  }

  public async getFavorites(): Promise<Track[]> {
    const favIds = getCatalogStore().getFavorites();
    return this.getTracksByIds(favIds);
  }

  public async getTrendingDemo(): Promise<Track[]> {
    const all = await this.getTracks();
    return all.slice(0, 12);
  }

  // =========================================================================
  // 7. AUDIO INTEGRATION & ENGINE PLAYBACK
  // =========================================================================

  /**
   * Resolves or synthesizes the native Web Audio AudioBuffer for any given Track.
   */
  public async getAudioBufferForTrack(track: Track, audioContext: AudioContext): Promise<AudioBuffer> {
    // Check in-memory cache
    const cached = this.audioBufferCache.get(track.id);
    if (cached) return cached;

    let buffer: AudioBuffer;

    if (track.source === 'local') {
      const file = this.localProvider.getFile(track.id);
      if (!file) {
        throw new Error(`Local file not found for track ${track.id}`);
      }
      buffer = await loadAudioFile(file, audioContext);
    } else if (track.audioUrl) {
      try {
        const response = await fetch(track.audioUrl);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = await decodeAudioBuffer(arrayBuffer, audioContext);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Stream unavailable for track "${track.title}" from source "${track.source}": ${msg}`);
      }
    } else {
      // Authorized synthetic demo audio with authentic profile
      buffer = synthesizeTrackAudio(audioContext, track, Math.min(track.duration || 18, 24));
    }

    this.audioBufferCache.set(track.id, buffer);
    return buffer;
  }

  /**
   * Plays a track seamlessly across the SONORA environment.
   * Loads the track's AudioBuffer into AudioEngine, registers recent playback,
   * updates persistent player, and triggers transport.
   */
  /**
   * Plays a track seamlessly across the SONORA environment.
   * Requires 'listen' capability (track.rights.canStream).
   * Loads the track's AudioBuffer into AudioEngine, registers recent playback,
   * updates persistent player, and triggers transport.
   */
  public async playTrack(track: Track, targetDeck: 'A' | 'B' = 'A'): Promise<void> {
    if (!canUseTrack(track, 'listen')) {
      throw new Error(`Track "${track.title}" cannot be played: listen capability required.`);
    }

    const engine = getAudioEngine();
    const ctx = await engine.initialize();

    // 1. Resolve AudioBuffer
    const buffer = await this.getAudioBufferForTrack(track, ctx);

    // 2. Record in user library store
    const store = getCatalogStore();
    store.setActiveTrackId(track.id);
    store.recordRecentlyPlayed(track.id);

    // 3. Load into AudioEngine deck and play
    const label = `${track.title} • ${track.artistName}`;
    await engine.loadDeck(targetDeck, buffer, label);
    await engine.play(targetDeck);
  }

  /**
   * Stages a track onto a specific DJ Deck without initiating playback.
   * Requires 'dj' capability (track.rights.canDJ).
   */
  public async stageTrackToDeck(track: Track, targetDeck: 'A' | 'B'): Promise<void> {
    if (!canUseTrack(track, 'dj')) {
      throw new Error(`Track "${track.title}" cannot be staged to DJ deck: DJ capability required.`);
    }

    const engine = getAudioEngine();
    const ctx = await engine.initialize();
    const buffer = await this.getAudioBufferForTrack(track, ctx);

    const store = getCatalogStore();
    store.recordRecentlyPlayed(track.id);

    const label = `${track.title} • ${track.artistName}`;
    await engine.loadDeck(targetDeck, buffer, label);
  }

  /**
   * Validates and prepares a track for non-destructive Audio Lab editing.
   * Requires 'edit' capability (track.rights.canEdit).
   */
  public async openInAudioLab(track: Track): Promise<void> {
    if (!canUseTrack(track, 'edit')) {
      throw new Error(`Track "${track.title}" cannot be edited: edit capability required for this source.`);
    }
  }

  // =========================================================================
  // 8. RIGHTS & CAPABILITY FACADE
  // =========================================================================

  public canUse(track: Track, capability: PlaybackCapability): boolean {
    return canUseTrack(track, capability);
  }

  public getCapabilities(track: Track): PlaybackCapability[] {
    return getTrackCapabilities(track);
  }

  public getRegistry(): MusicSupplyRegistry {
    return this.registry;
  }

  public getRegisteredProviders(): MusicSupplyProvider[] {
    return this.registry.getAll();
  }

  public getJamendoProvider(): JamendoMusicSupplyProvider {
    return this.registry.getJamendoProvider();
  }

  public getProviderStatus(providerId: string): { status: string; reason?: string } {
    const p = this.registry.get(providerId);
    if (!p) {
      return { status: 'unavailable', reason: `Provider "${providerId}" not found in registry.` };
    }
    return { status: p.status, reason: p.statusReason };
  }

  // =========================================================================
  // 9. LOCAL FILE INGESTION
  // =========================================================================

  public async importLocalFile(file: File): Promise<Track> {
    const engine = getAudioEngine();
    const ctx = await engine.initialize();
    const buffer = await loadAudioFile(file, ctx);
    const duration = Math.round(buffer.duration);

    const track = await this.localProvider.addLocalFile(file, duration);
    this.audioBufferCache.set(track.id, buffer);

    return track;
  }
}

// Singleton export
let serviceInstance: CatalogService | null = null;

export function getCatalogService(): CatalogService {
  if (!serviceInstance) {
    serviceInstance = new CatalogService();
  }
  return serviceInstance;
}
