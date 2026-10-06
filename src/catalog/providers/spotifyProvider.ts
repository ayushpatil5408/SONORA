/**
 * SONORA Spotify Music Supply Provider (Integration Boundary)
 * Authoritative Reference: PRD.md Section 11 & 23, MILESTONE 2B
 * 
 * Formal provider boundary for Spotify Web API.
 * Does NOT scrape, reverse-engineer, or fabricate Spotify playback URLs.
 * 
 * Required Environment Configuration:
 *   - VITE_SPOTIFY_CLIENT_ID: Spotify Developer Dashboard Client ID.
 *   - VITE_SPOTIFY_CLIENT_SECRET: Spotify Developer Dashboard Client Secret (server-side only).
 * 
 * Legal & Technical Capability Boundaries:
 *   - Metadata & Catalog Search: Permitted via Spotify Web API.
 *   - 30-Second Previews: Permitted where available from track metadata.
 *   - Full Track Streaming: Delegated exclusively to Spotify Web Playback SDK (Spotify Premium users).
 *   - DJ Performance, Pitch Shifting, Waveform Extraction, Audio Lab: STRICTLY PROHIBITED
 *     under Spotify Developer Policy (Section 2.4: no synchronization, mixing, DJing, or audio processing).
 */

import {
  MusicSupplyProvider,
  MusicSupplyCapabilities,
  MusicSupplyProviderStatus,
  CatalogSource,
  Track,
  CatalogFilterOptions,
} from '../types';
import { getEnvVariable } from '../envUtils';

export interface SpotifyProviderConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export class SpotifyMusicSupplyProvider implements MusicSupplyProvider {
  readonly id = 'spotify';
  readonly name = 'Spotify Web API';
  readonly description = 'Commercial catalog search and metadata via Spotify Web API.';
  readonly source: CatalogSource = 'spotify';

  private config: SpotifyProviderConfig;
  private _status: MusicSupplyProviderStatus;
  private _statusReason: string;

  constructor(config: SpotifyProviderConfig = {}) {
    const envClientId = getEnvVariable('VITE_SPOTIFY_CLIENT_ID');

    this.config = {
      clientId: config.clientId || envClientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    };

    if (!this.config.clientId) {
      this._status = 'not_configured';
      this._statusReason = 'Developer credentials and permitted integration mode required. Provide VITE_SPOTIFY_CLIENT_ID to enable Spotify metadata search.';
    } else {
      this._status = 'ready';
      this._statusReason = 'Configured for Spotify metadata and permitted playback SDK integration.';
    }
  }

  get status(): MusicSupplyProviderStatus {
    return this._status;
  }

  get statusReason(): string {
    return this._statusReason;
  }

  getCapabilities(): MusicSupplyCapabilities {
    return {
      metadata: true,
      search: true,
      streaming: false, // Full audio buffers cannot be routed through Web Audio graph per Spotify TOS
      previews: true, // 30-second preview clips only
      dj: false, // Strictly prohibited under Spotify Developer Policy Section 2.4
      editing: false, // Strictly prohibited under Spotify Developer Policy
      remixing: false,
    };
  }

  async getTracks(): Promise<Track[]> {
    if (this._status !== 'ready') return [];
    return [];
  }

  async getTrack(_id: string): Promise<Track | null> {
    if (this._status !== 'ready') return null;
    return null;
  }

  async search(_query: string, _filters?: CatalogFilterOptions): Promise<Track[]> {
    if (this._status !== 'ready') return [];
    return [];
  }
}
