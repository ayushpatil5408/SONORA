/**
 * SONORA Local Audio Catalog Provider
 * Authoritative Reference: PRD.md Section 15, PRODUCT_ARCHITECTURE.md
 * 
 * Manages user-imported local audio files (MP3, WAV, FLAC, AAC, OGG).
 * Holds in-memory references to File objects and decodes via existing audioLoader.
 */

import { CatalogProvider, Track, CatalogFilterOptions, createLocalRights, canUseTrack } from '../types';

export class LocalCatalogProvider implements CatalogProvider {
  readonly name = 'local';
  private tracks: Track[] = [];
  private fileMap: Map<string, File> = new Map();

  async getTracks(): Promise<Track[]> {
    return [...this.tracks];
  }

  async getTrack(id: string): Promise<Track | null> {
    return this.tracks.find((t) => t.id === id) || null;
  }

  getFile(id: string): File | null {
    return this.fileMap.get(id) || null;
  }

  async addLocalFile(file: File, durationSeconds = 180): Promise<Track> {
    const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    
    // Parse potential "Artist - Title" format
    let artistName = 'Local Artist';
    let title = fileName;
    if (fileName.includes(' - ')) {
      const parts = fileName.split(' - ');
      artistName = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    const track: Track = {
      id,
      title,
      artistId: 'art-local',
      artistName,
      duration: durationSeconds,
      genre: 'Local Audio',
      source: 'local',
      isPlayable: true,
      isLocal: true,
      releaseYear: new Date().getFullYear(),
      rights: createLocalRights(),
      attribution: {
        artist: artistName,
        notes: `Local file: ${file.name} (${Math.round(file.size / 1024)} KB) • User-owned/imported file (SONORA asserts no copyright)`,
      },
    };

    this.tracks.unshift(track);
    this.fileMap.set(id, file);

    return track;
  }

  async search(query: string, filters?: CatalogFilterOptions): Promise<Track[]> {
    const q = query.trim().toLowerCase();

    return this.tracks.filter((t) => {
      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesArtist = t.artistName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesArtist) return false;
      }

      if (filters?.source && filters.source !== 'local') return false;
      if (filters?.capability && !canUseTrack(t, filters.capability)) return false;

      return true;
    });
  }
}
