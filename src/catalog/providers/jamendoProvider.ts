/**
 * SONORA Jamendo Music Supply Provider
 * Authoritative Reference: PRD.md Section 11 & 23, MILESTONE 2C
 * 
 * Official Jamendo API v3.0 integration for Creative Commons authorized music.
 * Preserves strict rights boundaries without bypassing licensing restrictions.
 * 
 * Environment Configuration:
 *   - VITE_JAMENDO_CLIENT_ID: Registered Jamendo Developer API Client ID.
 *     Register at: https://developer.jamendo.com/v3.0/authentication
 * 
 * States:
 *   - State A: VITE_JAMENDO_CLIENT_ID set -> provider active ('ready')
 *   - State B: VITE_JAMENDO_CLIENT_ID missing -> provider disabled ('not_configured')
 * 
 * Rights Mapping Rules:
 *   - Listen / Preview: Granted for all authorized streamable tracks.
 *   - DJ Staging: Permitted ONLY if NOT NoDerivatives (-nd), audio download/manipulation
 *     is allowed, and license is CC BY, CC BY-SA, CC0, or CC BY-NC.
 *   - Edit (Audio Lab): Permitted only if NOT NoDerivatives (-nd) and download is permitted.
 *   - Remix: Permitted only for unencumbered permissive licenses (CC BY, CC BY-SA, CC0).
 *     Strictly prohibited if NoDerivatives (-nd) or NonCommercial (-nc).
 */

import {
  MusicSupplyProvider,
  MusicSupplyCapabilities,
  MusicSupplyProviderStatus,
  CatalogSource,
  Track,
  CatalogFilterOptions,
  TrackRights,
  TrackAttribution,
} from '../types';
import { getEnvVariable } from '../envUtils';

export interface JamendoProviderConfig {
  clientId?: string;
  apiVersion?: string;
  baseUrl?: string;
  enableDiscovery?: boolean;
  defaultLimit?: number;
  cacheTtlMs?: number;
}

export interface JamendoRawTrack {
  id: string | number;
  name: string;
  duration?: number;
  artist_id?: string | number;
  artist_name?: string;
  artist_idstr?: string;
  album_id?: string | number;
  album_name?: string;
  album_image?: string;
  image?: string;
  license_ccurl?: string;
  position?: number;
  releasedate?: string;
  audio?: string;
  audiodl?: string;
  prourl?: string;
  shorturl?: string;
  shareurl?: string;
  audiodlallowed?: boolean;
  musicinfo?: {
    vocalinstrumental?: string;
    lang?: string;
    gender?: string;
    acousticelectric?: string;
    speed?: string;
    tags?: {
      genres?: string[];
      instruments?: string[];
      vartags?: string[];
    };
    bpm?: number;
    key?: string;
  };
}

export interface JamendoApiResponse {
  headers: {
    status: string;
    code: number;
    error_message: string;
    warnings?: string;
    results_count: number;
    next?: string;
  };
  results: JamendoRawTrack[];
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ProviderMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 5 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs = this.defaultTtlMs): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Normalizes Creative Commons license URLs into human-readable labels.
 */
export function parseCreativeCommonsName(ccUrl?: string): string {
  if (!ccUrl) return 'Standard Jamendo Terms';
  const u = ccUrl.toLowerCase();
  if (u.includes('zero') || u.includes('publicdomain')) return 'Creative Commons CC0 (Public Domain)';
  if (u.includes('by-nc-nd')) return 'Creative Commons BY-NC-ND (Attribution-NonCommercial-NoDerivatives)';
  if (u.includes('by-nc-sa')) return 'Creative Commons BY-NC-SA (Attribution-NonCommercial-ShareAlike)';
  if (u.includes('by-nc')) return 'Creative Commons BY-NC (Attribution-NonCommercial)';
  if (u.includes('by-sa')) return 'Creative Commons BY-SA (Attribution-ShareAlike)';
  if (u.includes('by-nd')) return 'Creative Commons BY-ND (Attribution-NoDerivatives)';
  if (u.includes('/by/')) return 'Creative Commons BY (Attribution)';
  return 'Creative Commons Licensed';
}

/**
 * Conservative Rights Mapping for Jamendo audio tracks.
 * Adheres strictly to Creative Commons legal code boundaries.
 */
export function mapJamendoRights(raw: JamendoRawTrack): TrackRights {
  const ccurl = (raw.license_ccurl || '').toLowerCase();
  const isND = ccurl.includes('-nd') || ccurl.includes('/nd/');
  const isNC = ccurl.includes('-nc') || ccurl.includes('/nc/');
  const isZero = ccurl.includes('publicdomain') || ccurl.includes('zero') || ccurl.includes('/zero/');
  const isCCBy = ccurl.includes('/by/') || ccurl.includes('/by-');
  const dlAllowed = raw.audiodlallowed !== false;
  const hasAudio = Boolean(raw.audio || raw.id);

  // Streaming / Listening clearance: Authorized for all valid API tracks
  const canStream = hasAudio;
  const canPreview = true;

  // DJ Capability (Deck Staging, EQ, filtering, pitch, looping in SONORA)
  // Strictly prohibited if NoDerivatives (-nd) or if download/audio manipulation is explicitly prohibited
  const canDJ = Boolean(!isND && dlAllowed && (isCCBy || isZero || isNC));

  // Editing (Audio Lab / stem extraction / slicing)
  // Strictly prohibited if NoDerivatives (-nd) or if download is prohibited
  const canEdit = Boolean(!isND && dlAllowed && (isCCBy || isZero || isNC));

  // Remixing (derivative production / redistribution)
  // Permitted only for unencumbered permissive licenses (CC BY, CC BY-SA, CC0) without NC restriction
  const canRemix = Boolean(!isND && !isNC && dlAllowed && (isCCBy || isZero));

  return {
    canStream,
    canPreview,
    canDJ,
    canEdit,
    canRemix,
    attributionRequired: !isZero,
    sourceTermsUrl: raw.license_ccurl || raw.shareurl || 'https://www.jamendo.com/legal/licenses',
  };
}

/**
 * Normalizes a Jamendo API track entity into the canonical SONORA Track model.
 */
export function normalizeJamendoTrack(raw: JamendoRawTrack, clientId?: string): Track {
  const rawId = String(raw.id || '').trim();
  const cleanId = rawId.startsWith('jamendo-') ? rawId : `jamendo-${rawId}`;
  const rights = mapJamendoRights(raw);

  // Singles without albums handled safely
  const albumName = raw.album_name && raw.album_name.trim().length > 0 ? raw.album_name.trim() : 'Single';
  const albumId = raw.album_id ? `jamendo-album-${raw.album_id}` : undefined;

  const artistName = raw.artist_name && raw.artist_name.trim().length > 0 ? raw.artist_name.trim() : 'Jamendo Artist';
  const artistId = raw.artist_id ? `jamendo-artist-${raw.artist_id}` : 'jamendo-artist-unknown';

  const artworkUrl = raw.image || raw.album_image || undefined;
  const audioUrl = raw.audio || (clientId && rawId ? `https://api.jamendo.com/v3.0/tracks/file?client_id=${clientId}&id=${raw.id}&action=stream` : undefined);

  const releaseYear = raw.releasedate ? new Date(raw.releasedate).getFullYear() || undefined : undefined;

  // Extract genre & moods from Jamendo tags if available
  const genre = raw.musicinfo?.tags?.genres?.[0] || undefined;
  const moods = raw.musicinfo?.tags?.vartags || undefined;

  const attribution: TrackAttribution = {
    artist: artistName,
    license: parseCreativeCommonsName(raw.license_ccurl),
    sourceUrl: raw.shareurl || raw.shorturl || 'https://www.jamendo.com',
    notes: 'Creative Commons catalog ingested via official Jamendo API.',
  };

  return {
    id: cleanId,
    title: raw.name && raw.name.trim().length > 0 ? raw.name.trim() : 'Untitled Track',
    artistId,
    artistName,
    albumId,
    albumName,
    artworkUrl,
    duration: typeof raw.duration === 'number' && !isNaN(raw.duration) ? Math.round(raw.duration) : 0,
    genre,
    moods,
    bpm: raw.musicinfo?.bpm,
    key: raw.musicinfo?.key,
    source: 'jamendo',
    audioUrl,
    externalUrl: raw.shareurl || raw.shorturl || 'https://www.jamendo.com',
    isPlayable: Boolean(audioUrl),
    isLocal: false,
    releaseYear,
    attribution,
    rights,
    providerMetadata: {
      jamendoId: raw.id,
      licenseCcUrl: raw.license_ccurl,
      audioDlAllowed: raw.audiodlallowed,
      downloadUrl: raw.audiodl,
      proUrl: raw.prourl,
      shortUrl: raw.shorturl,
    },
  };
}

export class JamendoMusicSupplyProvider implements MusicSupplyProvider {
  readonly id = 'jamendo';
  readonly name = 'Jamendo Music';
  readonly description = 'Creative Commons commercial & indie music catalog via Jamendo API.';
  readonly source: CatalogSource = 'jamendo';

  private config: JamendoProviderConfig;
  private _status: MusicSupplyProviderStatus;
  private _statusReason: string;
  private baseUrl: string;
  private cache: ProviderMemoryCache;

  constructor(config: JamendoProviderConfig = {}) {
    const envClientId = getEnvVariable('VITE_JAMENDO_CLIENT_ID');

    this.config = {
      clientId: config.clientId || envClientId,
      apiVersion: config.apiVersion || 'v3.0',
      baseUrl: config.baseUrl || 'https://api.jamendo.com/v3.0',
      enableDiscovery: config.enableDiscovery ?? true,
      defaultLimit: config.defaultLimit || 20,
      cacheTtlMs: config.cacheTtlMs || 5 * 60 * 1000,
    };

    this.baseUrl = this.config.baseUrl!;
    this.cache = new ProviderMemoryCache(this.config.cacheTtlMs);

    if (!this.config.clientId) {
      this._status = 'not_configured';
      this._statusReason = 'Developer credentials required. Provide VITE_JAMENDO_CLIENT_ID to activate Jamendo catalog.';
    } else {
      this._status = 'ready';
      this._statusReason = 'Configured with Jamendo Client ID.';
    }
  }

  get status(): MusicSupplyProviderStatus {
    return this._status;
  }

  get statusReason(): string {
    return this._statusReason;
  }

  getCapabilities(): MusicSupplyCapabilities {
    const isConfigured = Boolean(this.config.clientId);
    return {
      metadata: isConfigured,
      search: isConfigured,
      streaming: isConfigured,
      previews: isConfigured,
      dj: false, // Baseline provider capability; individual tracks evaluated via TrackRights
      editing: false,
      remixing: false,
    };
  }

  /**
   * Directly sets the client ID at runtime (useful for testing and user authorization).
   */
  public setClientId(clientId: string): void {
    this.config.clientId = clientId;
    if (clientId) {
      this._status = 'ready';
      this._statusReason = 'Configured with Jamendo Client ID.';
    } else {
      this._status = 'not_configured';
      this._statusReason = 'Developer credentials required. Provide VITE_JAMENDO_CLIENT_ID to activate Jamendo catalog.';
    }
  }

  /**
   * Internal API fetch helper with robust network/status error boundaries.
   */
  private async fetchFromApi(endpoint: string, params: Record<string, string | number | undefined>): Promise<JamendoApiResponse | null> {
    if (this._status !== 'ready' || !this.config.clientId) {
      return null;
    }

    const queryParts: string[] = [
      `client_id=${encodeURIComponent(this.config.clientId)}`,
      `format=json`,
      `include=musicinfo+licenses`,
      `audioformat=mp32`,
    ];

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }

    const url = `${this.baseUrl}${endpoint}?${queryParts.join('&')}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Jamendo API HTTP error ${res.status}: ${res.statusText}`);
        this._status = 'error';
        this._statusReason = `Jamendo HTTP error ${res.status}`;
        return null;
      }

      const data = (await res.json()) as JamendoApiResponse;
      if (!data || !data.headers) {
        this._status = 'error';
        this._statusReason = 'Malformed Jamendo API response headers';
        return null;
      }

      if (data.headers.status !== 'success') {
        this._status = 'error';
        this._statusReason = data.headers.error_message || `Jamendo API error (code ${data.headers.code})`;
        return null;
      }

      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Jamendo network fetch failed:', msg);
      this._status = 'offline';
      this._statusReason = `Jamendo network failure: ${msg}`;
      return null;
    }
  }

  /**
   * Searches the Jamendo catalog using official query & tag parameters.
   */
  async search(query: string, filters?: CatalogFilterOptions): Promise<Track[]> {
    if (this._status !== 'ready') {
      return [];
    }

    const cacheKey = `search:${query}:${JSON.stringify(filters || {})}`;
    const cached = this.cache.get<Track[]>(cacheKey);
    if (cached) return cached;

    const limit = filters?.limit || this.config.defaultLimit || 20;
    const offset = filters?.offset || 0;
    const tags = filters?.tags || filters?.genre;
    const order = filters?.order || (query ? undefined : 'popularity_total');

    const apiParams: Record<string, string | number | undefined> = {
      limit,
      offset,
      order,
    };

    if (query && query.trim().length > 0) {
      apiParams.search = query.trim();
    }
    if (tags) {
      apiParams.tags = tags;
    }
    if (filters?.artistId) {
      const cleanArtistId = filters.artistId.replace(/^jamendo-artist-/, '');
      apiParams.artist_id = cleanArtistId;
    }
    if (filters?.albumId) {
      const cleanAlbumId = filters.albumId.replace(/^jamendo-album-/, '');
      apiParams.album_id = cleanAlbumId;
    }

    const res = await this.fetchFromApi('/tracks/', apiParams);
    if (!res || !Array.isArray(res.results)) {
      return [];
    }

    const normalized = res.results.map((r) => normalizeJamendoTrack(r, this.config.clientId));
    this.cache.set(cacheKey, normalized);

    // Cache individual tracks for rapid subsequent lookups
    for (const track of normalized) {
      this.cache.set(`track:${track.id}`, track);
    }

    return normalized;
  }

  /**
   * Retrieves tracks from Jamendo catalog with optional pagination & discovery.
   */
  async getTracks(filters?: CatalogFilterOptions): Promise<Track[]> {
    if (this._status !== 'ready') {
      return [];
    }
    return this.search(filters?.query || '', filters);
  }

  /**
   * Retrieves a single track by its SONORA or Jamendo ID.
   */
  async getTrack(id: string): Promise<Track | null> {
    if (this._status !== 'ready') {
      return null;
    }

    const cleanId = id.startsWith('jamendo-') ? id : `jamendo-${id}`;
    const cacheKey = `track:${cleanId}`;
    const cached = this.cache.get<Track>(cacheKey);
    if (cached) return cached;

    const numericId = id.replace(/^jamendo-/, '');
    const res = await this.fetchFromApi('/tracks/', { id: numericId, limit: 1 });
    if (!res || !Array.isArray(res.results) || res.results.length === 0) {
      return null;
    }

    const track = normalizeJamendoTrack(res.results[0], this.config.clientId);
    this.cache.set(cacheKey, track);
    return track;
  }

  /**
   * Browse and discover curated Jamendo tracks by tag and popularity order.
   */
  async discover(options?: {
    tags?: string;
    genre?: string;
    order?: 'popularity_total' | 'popularity_month' | 'releasedate_desc' | 'buzzrate';
    limit?: number;
    offset?: number;
  }): Promise<Track[]> {
    if (this._status !== 'ready') {
      return [];
    }
    return this.search('', {
      tags: options?.tags || options?.genre,
      order: options?.order || 'popularity_total',
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    });
  }

  /**
   * Clears the in-memory cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
