/**
 * SONORA SoundCloud Music Supply Provider (Integration Boundary)
 * Authoritative Reference: PRD.md Section 11 & 23, MILESTONE 2B
 * 
 * Formal provider boundary for SoundCloud API catalog access.
 * Does NOT scrape or bypass SoundCloud stream protection.
 * 
 * Required Environment Configuration:
 *   - VITE_SOUNDCLOUD_CLIENT_ID: Registered SoundCloud Developer App Client ID.
 * 
 * Legal & Technical Capability Boundaries:
 *   - Discovery & streaming: Permitted via official SoundCloud player widgets / HTTP stream endpoints.
 *   - DJ performance, EQ manipulation, & stem editing: Prohibited under SoundCloud API Terms of Service
 *     (Sections 4.2 & 6: no caching, unauthorized manipulation, or DJ multi-deck downmixing).
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

export interface SoundCloudProviderConfig {
  clientId?: string;
  clientSecret?: string;
}

export class SoundCloudMusicSupplyProvider implements MusicSupplyProvider {
  readonly id = 'soundcloud';
  readonly name = 'SoundCloud API';
  readonly description = 'SoundCloud streaming and creator catalog integration.';
  readonly source: CatalogSource = 'soundcloud';

  private config: SoundCloudProviderConfig;
  private _status: MusicSupplyProviderStatus;
  private _statusReason: string;

  constructor(config: SoundCloudProviderConfig = {}) {
    const envClientId = getEnvVariable('VITE_SOUNDCLOUD_CLIENT_ID');

    this.config = {
      clientId: config.clientId || envClientId,
      clientSecret: config.clientSecret,
    };

    if (!this.config.clientId) {
      this._status = 'not_configured';
      this._statusReason = 'Developer credentials required. Provide VITE_SOUNDCLOUD_CLIENT_ID to connect SoundCloud API.';
    } else {
      this._status = 'ready';
      this._statusReason = 'Configured with SoundCloud Client ID.';
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
      streaming: true,
      previews: true,
      dj: false, // Prohibited by SoundCloud API Developer Terms
      editing: false, // Prohibited by SoundCloud Terms
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
