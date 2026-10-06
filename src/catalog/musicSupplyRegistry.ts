/**
 * SONORA Music Supply Registry
 * Authoritative Reference: PRD.md Section 11 & 12, MILESTONE 2B
 * 
 * Central registry orchestrating multiple music supply providers.
 * Decouples the UI and CatalogService from specific provider implementations.
 * Enables modular addition of future commercial partners and local/creator sources.
 */

import { MusicSupplyProvider, CatalogSource } from './types';
import { DemoMusicSupplyProvider } from './providers/demoProvider';
import { LocalMusicSupplyProvider } from './providers/localProvider';
import { CreatorMusicSupplyProvider } from './providers/creatorProvider';
import { JamendoMusicSupplyProvider } from './providers/jamendoProvider';
import { SoundCloudMusicSupplyProvider } from './providers/soundcloudProvider';
import { SpotifyMusicSupplyProvider } from './providers/spotifyProvider';
import { LicensedCatalogProvider } from './providers/licensedCatalogProvider';

export class MusicSupplyRegistry {
  private providers: Map<string, MusicSupplyProvider> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Core operational providers
    const demo = new DemoMusicSupplyProvider();
    const local = new LocalMusicSupplyProvider();
    const creator = new CreatorMusicSupplyProvider();

    // 2. Integration boundaries for future commercial/external catalogs
    const jamendo = new JamendoMusicSupplyProvider();
    const soundcloud = new SoundCloudMusicSupplyProvider();
    const spotify = new SpotifyMusicSupplyProvider();
    const licensed = new LicensedCatalogProvider();

    this.register(demo);
    this.register(local);
    this.register(creator);
    this.register(jamendo);
    this.register(soundcloud);
    this.register(spotify);
    this.register(licensed);
  }

  public register(provider: MusicSupplyProvider): void {
    this.providers.set(provider.id, provider);
  }

  public unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  public get(id: string): MusicSupplyProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): MusicSupplyProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns only providers that are operational and ready to serve audio/metadata.
   */
  public getActiveProviders(): MusicSupplyProvider[] {
    return this.getAll().filter((p) => p.status === 'ready');
  }

  /**
   * Returns providers matching a particular source type.
   */
  public getProvidersBySource(source: CatalogSource): MusicSupplyProvider[] {
    return this.getAll().filter((p) => p.source === source);
  }

  public getLocalProvider(): LocalMusicSupplyProvider {
    const p = this.providers.get('local');
    if (!p) throw new Error('LocalMusicSupplyProvider not registered');
    return p as LocalMusicSupplyProvider;
  }

  public getDemoProvider(): DemoMusicSupplyProvider {
    const p = this.providers.get('demo');
    if (!p) throw new Error('DemoMusicSupplyProvider not registered');
    return p as DemoMusicSupplyProvider;
  }

  public getCreatorProvider(): CreatorMusicSupplyProvider {
    const p = this.providers.get('creator');
    if (!p) throw new Error('CreatorMusicSupplyProvider not registered');
    return p as CreatorMusicSupplyProvider;
  }

  public getJamendoProvider(): JamendoMusicSupplyProvider {
    const p = this.providers.get('jamendo');
    if (!p) throw new Error('JamendoMusicSupplyProvider not registered');
    return p as JamendoMusicSupplyProvider;
  }
}

// Singleton registry instance
let registryInstance: MusicSupplyRegistry | null = null;

export function getMusicSupplyRegistry(): MusicSupplyRegistry {
  if (!registryInstance) {
    registryInstance = new MusicSupplyRegistry();
  }
  return registryInstance;
}
