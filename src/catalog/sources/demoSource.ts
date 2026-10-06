/**
 * SONORA Demo Catalog Provider
 * Authoritative Reference: PRD.md Section 11, MILESTONE 2A
 * 
 * Provides access to the authorized, authentic prototype demo catalog.
 * Zero external network dependencies, 100% playable via in-memory synthesis.
 */

import { CatalogProvider, Track, CatalogFilterOptions, canUseTrack } from '../types';
import { SEED_TRACKS } from '../seedCatalog';

export class DemoCatalogProvider implements CatalogProvider {
  readonly name = 'demo';
  private tracks: Track[] = [...SEED_TRACKS];

  async getTracks(): Promise<Track[]> {
    return [...this.tracks];
  }

  async getTrack(id: string): Promise<Track | null> {
    return this.tracks.find((t) => t.id === id) || null;
  }

  async search(query: string, filters?: CatalogFilterOptions): Promise<Track[]> {
    const q = query.trim().toLowerCase();

    return this.tracks.filter((t) => {
      // Free text matching across title, artist, album, genre, key
      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesArtist = t.artistName.toLowerCase().includes(q);
        const matchesAlbum = t.albumName ? t.albumName.toLowerCase().includes(q) : false;
        const matchesGenre = t.genre ? t.genre.toLowerCase().includes(q) : false;
        const matchesKey = t.key ? t.key.toLowerCase().includes(q) : false;
        const matchesBpm = t.bpm ? String(t.bpm).includes(q) : false;

        if (!matchesTitle && !matchesArtist && !matchesAlbum && !matchesGenre && !matchesKey && !matchesBpm) {
          return false;
        }
      }

      // Filter: Genre
      if (filters?.genre && t.genre?.toLowerCase() !== filters.genre.toLowerCase()) {
        return false;
      }

      // Filter: Mood
      if (filters?.mood && (!t.moods || !t.moods.some((m) => m.toLowerCase() === filters.mood!.toLowerCase()))) {
        return false;
      }

      // Filter: Artist ID
      if (filters?.artistId && t.artistId !== filters.artistId) {
        return false;
      }

      // Filter: Album ID
      if (filters?.albumId && t.albumId !== filters.albumId) {
        return false;
      }

      // Filter: Camelot Key
      if (filters?.key && t.key?.toUpperCase() !== filters.key.toUpperCase()) {
        return false;
      }

      // Filter: BPM range
      if (filters?.minBpm !== undefined && (t.bpm === undefined || t.bpm < filters.minBpm)) {
        return false;
      }
      if (filters?.maxBpm !== undefined && (t.bpm === undefined || t.bpm > filters.maxBpm)) {
        return false;
      }

      // Filter: Source
      if (filters?.source && filters.source !== 'demo') {
        return false;
      }

      // Filter: Capability
      if (filters?.capability && !canUseTrack(t, filters.capability)) {
        return false;
      }

      return true;
    });
  }
}
