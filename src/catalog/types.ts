/**
 * SONORA Catalog Domain Types
 * Authoritative Reference: PRD.md Section 11/12/15, PRODUCT_ARCHITECTURE.md
 * 
 * Canonical models for tracks, artists, albums, playlists, genres, moods,
 * and provider abstractions. Designed to scale from 10 to 1,000,000+ tracks
 * without changing the domain interface.
 */

export type CatalogSource =
  | 'demo'
  | 'local'
  | 'jamendo'
  | 'soundcloud'
  | 'spotify'
  | 'licensed'
  | 'creator';

export type TrackSource = CatalogSource;

export interface TrackRights {
  canStream: boolean;
  canPreview: boolean;
  canDJ: boolean;
  canEdit: boolean;
  canRemix: boolean;

  attributionRequired?: boolean;
  territories?: string[];
  startsAt?: string;
  expiresAt?: string;
  sourceTermsUrl?: string;
}

export type PlaybackCapability =
  | 'listen'
  | 'preview'
  | 'dj'
  | 'edit'
  | 'remix';

export interface TrackAttribution {
  artist: string;
  license?: string;
  sourceUrl?: string;
  notes?: string;
}

export type DemoStyle =
  | 'ambient'
  | 'techno'
  | 'house'
  | 'lofi'
  | 'cinematic'
  | 'synthwave'
  | 'minimal'
  | 'drumandbass';

export interface DemoSoundProfile {
  style: DemoStyle;
  rootFreq?: number;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId?: string;
  albumName?: string;
  artworkUrl?: string;
  duration: number; // in seconds
  genre?: string;
  moods?: string[];
  bpm?: number;
  key?: string; // Camelot key e.g. "8A", "11B"
  source: CatalogSource;
  audioUrl?: string;
  externalUrl?: string;
  isPlayable: boolean;
  isLocal: boolean;
  explicit?: boolean;
  releaseYear?: number;
  attribution?: TrackAttribution;
  demoProfile?: DemoSoundProfile;
  rights?: TrackRights;
  creatorId?: string;
  creatorName?: string;
  isOriginal?: boolean;
  providerMetadata?: Record<string, unknown>;
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
  bio?: string;
  location?: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  artworkUrl?: string;
  releaseYear?: number;
  genre?: string;
  trackIds: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface Mood {
  id: string;
  name: string;
  energy: number; // 0.0 (meditative) to 1.0 (peak intensity)
}

export interface CatalogFilterOptions {
  query?: string;
  genre?: string;
  mood?: string;
  artistId?: string;
  albumId?: string;
  source?: CatalogSource;
  minBpm?: number;
  maxBpm?: number;
  key?: string;
  playableOnly?: boolean;
  capability?: PlaybackCapability;
  capabilities?: PlaybackCapability[];
  offset?: number;
  limit?: number;
  order?: string;
  tags?: string;
}

export interface CatalogSearchResult {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

/**
 * Agnostic catalog provider interface.
 * Decouples the UI and catalog store from individual source implementations.
 */
export interface CatalogProvider {
  readonly name: string;
  search(query: string, filters?: CatalogFilterOptions): Promise<Track[]>;
  getTrack(id: string): Promise<Track | null>;
  getTracks(): Promise<Track[]>;
}

/**
 * Music Supply Capabilities contract.
 * Explicitly declares technical & legal abilities granted by a catalog provider.
 */
export interface MusicSupplyCapabilities {
  metadata: boolean;
  search: boolean;
  streaming: boolean;
  previews: boolean;
  dj: boolean;
  editing: boolean;
  remixing: boolean;
}

export type MusicSupplyProviderStatus =
  | 'ready'
  | 'not_configured'
  | 'loading'
  | 'unavailable'
  | 'offline'
  | 'error';

/**
 * Agnostic Music Supply Provider contract.
 * Extends CatalogProvider with identity, source domain, operational status, and explicit capabilities.
 */
export interface MusicSupplyProvider extends CatalogProvider {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly source: CatalogSource;
  readonly status: MusicSupplyProviderStatus;
  readonly statusReason?: string;
  getCapabilities(): MusicSupplyCapabilities;
}

/**
 * Authoritative capability evaluation function.
 * Evaluates whether a given track can be used for a specific capability (listen, preview, dj, edit, remix).
 * Eliminates ad-hoc source checks in UI.
 */
export function canUseTrack(track: Track, capability: PlaybackCapability): boolean {
  if (track.rights) {
    switch (capability) {
      case 'listen':
        return Boolean(track.rights.canStream && track.isPlayable);
      case 'preview':
        return Boolean(track.rights.canPreview || (track.rights.canStream && track.isPlayable));
      case 'dj':
        return Boolean(track.rights.canDJ && track.isPlayable);
      case 'edit':
        return Boolean(track.rights.canEdit && track.isPlayable);
      case 'remix':
        return Boolean(track.rights.canRemix && track.isPlayable);
      default:
        return false;
    }
  }

  // Backward compatibility fallback for unadorned tracks:
  // - local / demo tracks: all capabilities assumed valid if playable
  if (track.source === 'local' || track.source === 'demo') {
    return Boolean(track.isPlayable);
  }

  // Default fallback for third-party without rights: listen / preview only
  if (capability === 'listen' || capability === 'preview') {
    return Boolean(track.isPlayable);
  }

  return false;
}

/**
 * Returns all granted capabilities for a track.
 */
export function getTrackCapabilities(track: Track): PlaybackCapability[] {
  const caps: PlaybackCapability[] = [];
  if (canUseTrack(track, 'listen')) caps.push('listen');
  if (canUseTrack(track, 'preview')) caps.push('preview');
  if (canUseTrack(track, 'dj')) caps.push('dj');
  if (canUseTrack(track, 'edit')) caps.push('edit');
  if (canUseTrack(track, 'remix')) caps.push('remix');
  return caps;
}

/**
 * Default TrackRights factories for canonical sources.
 */
export function createDemoRights(): TrackRights {
  return {
    canStream: true,
    canPreview: true,
    canDJ: true,
    canEdit: true,
    canRemix: true,
    attributionRequired: true,
    sourceTermsUrl: 'https://sonora.audio/terms/prototype-demo',
  };
}

export function createLocalRights(): TrackRights {
  return {
    canStream: true,
    canPreview: true,
    canDJ: true,
    canEdit: true,
    canRemix: true,
    attributionRequired: false,
  };
}

export function createCreatorRights(isOriginal = true): TrackRights {
  return {
    canStream: true,
    canPreview: true,
    canDJ: true,
    canEdit: isOriginal,
    canRemix: isOriginal,
    attributionRequired: true,
  };
}

export function createListenOnlyRights(territories?: string[]): TrackRights {
  return {
    canStream: true,
    canPreview: true,
    canDJ: false,
    canEdit: false,
    canRemix: false,
    attributionRequired: true,
    territories,
  };
}
