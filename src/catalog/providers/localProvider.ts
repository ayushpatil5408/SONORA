/**
 * SONORA Local Audio Supply Provider
 * Authoritative Reference: PRD.md Section 15, PRODUCT_ARCHITECTURE.md, MILESTONE 2B
 * 
 * Manages user-imported local audio files (MP3, WAV, FLAC, AAC, OGG).
 * Clear rights assumption: full local access for listen, DJ, edit, remix.
 * Explicitly states that SONORA does not assert ownership of the underlying recording.
 */

import {
  MusicSupplyProvider,
  MusicSupplyCapabilities,
  MusicSupplyProviderStatus,
  CatalogSource,
  Track,
  CatalogFilterOptions,
} from '../types';
import { LocalCatalogProvider } from '../sources/localSource';

export class LocalMusicSupplyProvider implements MusicSupplyProvider {
  readonly id = 'local';
  readonly name = 'User Local Audio';
  readonly description = 'User-imported personal audio files (MP3, WAV, FLAC, AAC). User-owned rights assumption.';
  readonly source: CatalogSource = 'local';
  readonly status: MusicSupplyProviderStatus = 'ready';
  readonly statusReason = 'Operational. Decoded directly in browser Web Audio context.';

  private delegate: LocalCatalogProvider;

  constructor(delegate?: LocalCatalogProvider) {
    this.delegate = delegate || new LocalCatalogProvider();
  }

  getDelegate(): LocalCatalogProvider {
    return this.delegate;
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

  getFile(id: string): File | null {
    return this.delegate.getFile(id);
  }

  async addLocalFile(file: File, durationSeconds = 180): Promise<Track> {
    return this.delegate.addLocalFile(file, durationSeconds);
  }
}
