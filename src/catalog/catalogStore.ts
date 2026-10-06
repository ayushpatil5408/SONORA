/**
 * SONORA Catalog & User Library Store
 * Authoritative Reference: PRD.md Section 15 & 48, MILESTONE 2A
 * 
 * Local persistence layer for user favorites, recently played history,
 * custom playlists, and active track focus.
 * Fully decoupled from backend cloud services; survives page refreshes.
 */

import { Playlist } from './types';

const STORAGE_KEYS = {
  FAVORITES: 'sonora_user_favorites',
  RECENTLY_PLAYED: 'sonora_recently_played',
  PLAYLISTS: 'sonora_custom_playlists',
  ACTIVE_TRACK_ID: 'sonora_active_track_id',
} as const;

export interface RecentlyPlayedItem {
  trackId: string;
  timestamp: number;
}

type StoreListener = () => void;

class CatalogStore {
  private favorites: Set<string> = new Set();
  private recentlyPlayed: RecentlyPlayedItem[] = [];
  private customPlaylists: Playlist[] = [];
  private activeTrackId: string | null = null;
  private listeners: Set<StoreListener> = new Set();

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      // 1. Favorites
      const rawFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (rawFavs) {
        const parsed = JSON.parse(rawFavs);
        if (Array.isArray(parsed)) {
          this.favorites = new Set(parsed);
        }
      }

      // 2. Recently Played
      const rawRecent = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
      if (rawRecent) {
        const parsed = JSON.parse(rawRecent);
        if (Array.isArray(parsed)) {
          this.recentlyPlayed = parsed;
        }
      }

      // 3. Custom Playlists
      const rawPlaylists = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (rawPlaylists) {
        const parsed = JSON.parse(rawPlaylists);
        if (Array.isArray(parsed)) {
          this.customPlaylists = parsed;
        }
      }

      // 4. Active Track ID
      const rawActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRACK_ID);
      if (rawActive) {
        this.activeTrackId = rawActive;
      }
    } catch (e) {
      console.warn('Failed to hydrate SONORA CatalogStore from localStorage:', e);
    }
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(this.favorites)));
      localStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(this.recentlyPlayed));
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(this.customPlaylists));
      if (this.activeTrackId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TRACK_ID, this.activeTrackId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRACK_ID);
      }
    } catch (e) {
      console.warn('Failed to persist SONORA CatalogStore to localStorage:', e);
    }

    this.notify();
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in CatalogStore listener:', err);
      }
    });
  }

  // --- Favorites ---
  public getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  public isFavorite(trackId: string): boolean {
    return this.favorites.has(trackId);
  }

  public toggleFavorite(trackId: string): boolean {
    if (this.favorites.has(trackId)) {
      this.favorites.delete(trackId);
      this.persist();
      return false;
    } else {
      this.favorites.add(trackId);
      this.persist();
      return true;
    }
  }

  // --- Recently Played ---
  public getRecentlyPlayed(): RecentlyPlayedItem[] {
    return [...this.recentlyPlayed];
  }

  public recordRecentlyPlayed(trackId: string): void {
    // Remove if already present so it bubbles to top
    this.recentlyPlayed = this.recentlyPlayed.filter((item) => item.trackId !== trackId);
    this.recentlyPlayed.unshift({
      trackId,
      timestamp: Date.now(),
    });

    // Cap at 60 items
    if (this.recentlyPlayed.length > 60) {
      this.recentlyPlayed = this.recentlyPlayed.slice(0, 60);
    }

    this.persist();
  }

  // --- Custom Playlists ---
  public getCustomPlaylists(): Playlist[] {
    return [...this.customPlaylists];
  }

  public createPlaylist(name: string, description?: string): Playlist {
    const newPlaylist: Playlist = {
      id: `pl-custom-${Date.now()}`,
      name: name.trim() || 'Untitled Constellation',
      description: description?.trim() || 'Curated user sonic collection',
      trackIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true,
    };

    this.customPlaylists.push(newPlaylist);
    this.persist();
    return newPlaylist;
  }

  public addTrackToPlaylist(playlistId: string, trackId: string): boolean {
    const pl = this.customPlaylists.find((p) => p.id === playlistId);
    if (!pl) return false;
    if (!pl.trackIds.includes(trackId)) {
      pl.trackIds.push(trackId);
      pl.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string): boolean {
    const pl = this.customPlaylists.find((p) => p.id === playlistId);
    if (!pl) return false;
    const initialLen = pl.trackIds.length;
    pl.trackIds = pl.trackIds.filter((id) => id !== trackId);
    if (pl.trackIds.length !== initialLen) {
      pl.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  public renamePlaylist(playlistId: string, newName: string): boolean {
    const pl = this.customPlaylists.find((p) => p.id === playlistId);
    if (!pl || !newName.trim()) return false;
    pl.name = newName.trim();
    pl.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  public deletePlaylist(playlistId: string): boolean {
    const initialLen = this.customPlaylists.length;
    this.customPlaylists = this.customPlaylists.filter((p) => p.id !== playlistId);
    if (this.customPlaylists.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Active Track Focus ---
  public getActiveTrackId(): string | null {
    return this.activeTrackId;
  }

  public setActiveTrackId(trackId: string | null): void {
    this.activeTrackId = trackId;
    this.persist();
  }
}

// Singleton export
let storeInstance: CatalogStore | null = null;

export function getCatalogStore(): CatalogStore {
  if (!storeInstance) {
    storeInstance = new CatalogStore();
  }
  return storeInstance;
}
