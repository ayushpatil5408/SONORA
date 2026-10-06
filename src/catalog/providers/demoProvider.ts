/**
 * SONORA Demo Music Supply Provider
 * Authoritative Reference: PRD.md Section 11, MILESTONE 2B
 * 
 * Provides access to the authorized, authentic prototype demo catalog.
 * Zero external network dependencies, 100% playable via in-memory synthesis.
 * Explicitly grants full capabilities (listen, preview, dj, edit, remix).
 */

import {
  MusicSupplyProvider,
  MusicSupplyCapabilities,
  MusicSupplyProviderStatus,
  CatalogSource,
  Track,
  CatalogFilterOptions,
} from '../types';
import { DemoCatalogProvider } from '../sources/demoSource';

export class DemoMusicSupplyProvider implements MusicSupplyProvider {
  readonly id = 'demo';
  readonly name = 'SONORA Acoustic Lab Demo Catalog';
  readonly description = 'Authorized synthetic prototype audio synthesized via Web Audio API. Royalty-free for listening, performance, and experimentation.';
  readonly source: CatalogSource = 'demo';
  readonly status: MusicSupplyProviderStatus = 'ready';
  readonly statusReason = 'Operational. In-memory authentic prototype catalog.';

  private delegate: DemoCatalogProvider;

  constructor(delegate?: DemoCatalogProvider) {
    this.delegate = delegate || new DemoCatalogProvider();
  }

  getCapabilities(): MusicSupplyCapabilities {
    return {
      metadata: true,
      search: true,
      streaming: true,
      previews: true,
      dj: true,
      editing: true,
      remixing: true,
    };
  }

  async search(query: string, filters?: CatalogFilterOptions): Promise<Track[]> {
    return this.delegate.search(query, filters);
  }

  async getTrack(id: string): Promise<Track | null> {
    return this.delegate.getTrack(id);
  }

  async getTracks(): Promise<Track[]> {
    return this.delegate.getTracks();
  }
}
