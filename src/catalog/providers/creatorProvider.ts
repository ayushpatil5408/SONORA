/**
 * SONORA Creator Catalog Supply Provider
 * Authoritative Reference: PRD.md Section 10 & 28, MILESTONE 2B
 * 
 * Catalog-level foundation for creator-uploaded audio.
 * Distinguishes creator-owned original music (full DJ/remix rights)
 * from third-party copyrighted uploads (listen-only / clearance restrictions).
 */

import {
  MusicSupplyProvider,
  MusicSupplyCapabilities,
  MusicSupplyProviderStatus,
  CatalogSource,
  Track,
  CatalogFilterOptions,
  TrackRights,
  canUseTrack,
} from '../types';

export class CreatorMusicSupplyProvider implements MusicSupplyProvider {
  readonly id = 'creator';
  readonly name = 'SONORA Creator Space';
  readonly description = 'Catalog foundation for creator-uploaded music, stems, and original productions.';
  readonly source: CatalogSource = 'creator';
  readonly status: MusicSupplyProviderStatus = 'ready';
  readonly statusReason = 'Operational. Catalog-level foundation for creator uploads.';

  private tracks: Track[] = [
    {
      id: 'creator-track-01',
      title: 'Celestial Resonance',
      artistId: 'art-creator-aura',
      artistName: 'Aura Weaver',
      albumId: 'alb-creator-01',
      albumName: 'Origins of Sound (Creator Edition)',
      duration: 275,
      genre: 'Deep House',
      moods: ['Hypnotic', 'Kinetic'],
      bpm: 124,
      key: '8A', // Am
      source: 'creator',
      isPlayable: true,
      isLocal: false,
      releaseYear: 2026,
      creatorId: 'user-creator-aura',
      creatorName: 'Aura Weaver',
      isOriginal: true, // Creator-owned original
      rights: {
        canStream: true,
        canPreview: true,
        canDJ: true,
        canEdit: true,
        canRemix: true,
        attributionRequired: true,
        sourceTermsUrl: 'https://sonora.audio/terms/creator-license',
      },
      attribution: {
        artist: 'Aura Weaver',
        license: 'CC BY-SA 4.0',
        notes: 'Creator Original — Granted full DJ staging, live mixing, and remix rights with attribution.',
      },
      demoProfile: { style: 'house' },
    },
    {
      id: 'creator-track-02',
      title: 'Monsoon Raga (Acoustic Cut)',
      artistId: 'art-creator-kavita',
      artistName: 'Kavita Sharma',
      albumId: 'alb-creator-02',
      albumName: 'Vocal Tapestries',
      duration: 240,
      genre: 'Neo-Classical',
      moods: ['Meditative', 'Serene'],
      bpm: 90,
      key: '7A', // Dm
      source: 'creator',
      isPlayable: true,
      isLocal: false,
      releaseYear: 2026,
      creatorId: 'user-creator-kavita',
      creatorName: 'Kavita Sharma',
      isOriginal: false, // Third-party copyrighted upload / broadcast-only
      rights: {
        canStream: true,
        canPreview: true,
        canDJ: false, // Restricted: DJ staging prohibited
        canEdit: false, // Restricted: Edit prohibited
        canRemix: false, // Restricted: Remix prohibited
        attributionRequired: true,
        sourceTermsUrl: 'https://sonora.audio/terms/listen-only-clearance',
      },
      attribution: {
        artist: 'Kavita Sharma',
        license: 'Third-Party Copyright Clearance (Listen-Only)',
        notes: 'Third-party copyrighted recording uploaded under non-exclusive listen-only clearance. DJ staging and remixing prohibited.',
      },
      demoProfile: { style: 'cinematic' },
    },
  ];

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

  async getTracks(): Promise<Track[]> {
    return [...this.tracks];
  }

  async getTrack(id: string): Promise<Track | null> {
    return this.tracks.find((t) => t.id === id) || null;
  }

  async addCreatorTrack(input: {
    title: string;
    artistName: string;
    duration: number;
    genre?: string;
    bpm?: number;
    key?: string;
    creatorId: string;
    creatorName: string;
    isOriginal: boolean;
    rights: TrackRights;
    license?: string;
    notes?: string;
  }): Promise<Track> {
    const id = `creator-track-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTrack: Track = {
      id,
      title: input.title,
      artistId: `art-${input.creatorId}`,
      artistName: input.artistName,
      duration: input.duration,
      genre: input.genre || 'Creator Sound',
      bpm: input.bpm,
      key: input.key,
      source: 'creator',
      isPlayable: true,
      isLocal: false,
      releaseYear: new Date().getFullYear(),
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      isOriginal: input.isOriginal,
      rights: input.rights,
      attribution: {
        artist: input.artistName,
        license: input.license || (input.isOriginal ? 'CC BY-SA 4.0' : 'Listen-Only Clearance'),
        notes: input.notes,
      },
      demoProfile: { style: 'synthwave' },
    };

    this.tracks.unshift(newTrack);
    return newTrack;
  }

  async search(query: string, filters?: CatalogFilterOptions): Promise<Track[]> {
    const q = query.trim().toLowerCase();

    return this.tracks.filter((t) => {
      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesArtist = t.artistName.toLowerCase().includes(q);
        const matchesCreator = t.creatorName ? t.creatorName.toLowerCase().includes(q) : false;
        const matchesGenre = t.genre ? t.genre.toLowerCase().includes(q) : false;
        const matchesKey = t.key ? t.key.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesArtist && !matchesCreator && !matchesGenre && !matchesKey) {
          return false;
        }
      }

      if (filters?.source && filters.source !== 'creator') return false;
      if (filters?.genre && t.genre?.toLowerCase() !== filters.genre.toLowerCase()) return false;
      if (filters?.key && t.key?.toUpperCase() !== filters.key.toUpperCase()) return false;
      if (filters?.minBpm !== undefined && (t.bpm === undefined || t.bpm < filters.minBpm)) return false;
      if (filters?.maxBpm !== undefined && (t.bpm === undefined || t.bpm > filters.maxBpm)) return false;
      if (filters?.capability && !canUseTrack(t, filters.capability)) return false;

      return true;
    });
  }
}
