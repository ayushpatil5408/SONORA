/**
 * SONORA LibraryView Component
 * Authoritative Reference: PRD.md Section 15 & 48, DESIGN_SYSTEM.md, MILESTONE 2A
 * 
 * Living Music Universe: Navigable spatial system with three interchangeable representations:
 * 1. Spatial Mode — Signature orbital universe with harmonic tethers and active focal bloom.
 * 2. Flow Mode — Kinetic discovery streams (Featured, Recent, Mood Constellations).
 * 3. List Mode — Professional DJ console with Camelot keys, BPM telemetry, and staging.
 * 
 * Local persistence for Favorites, Recently Played, and Custom Playlists.
 */

import React, { useState, useEffect, useRef } from 'react';
import { RouteId } from '../../types/routes';
import { SonoraStage } from '../stage/SonoraStage';
import { Track, Playlist, canUseTrack } from '../../catalog/types';
import { getCatalogService } from '../../catalog/catalogService';
import { getCatalogStore } from '../../catalog/catalogStore';
import { getAudioEngine } from '../../audio/AudioEngine';
import './Views.css';
import './LibraryView.css';

export interface LibraryViewProps {
  onNavigate: (route: RouteId) => void;
}

type LibraryMode = 'spatial' | 'flow' | 'list';
type LibraryFilter =
  | 'all'
  | 'dj-ready'
  | 'listen'
  | 'creator'
  | 'local'
  | 'jamendo'
  | 'favorites'
  | 'recent'
  | 'playlists';

export const LibraryView: React.FC<LibraryViewProps> = ({ onNavigate }) => {
  const [mode, setMode] = useState<LibraryMode>('spatial');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeDeck, setActiveDeck] = useState<'A' | 'B' | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const catalogService = getCatalogService();
  const catalogStore = getCatalogStore();
  const engine = getAudioEngine();

  // Load and synchronize catalog and library state
  const loadData = async () => {
    const all = await catalogService.getTracks();
    setTracks(all);

    const feat = await catalogService.getFeatured();
    setFeaturedTracks(feat);

    const rec = await catalogService.getRecentlyPlayed();
    setRecentTracks(rec);

    const pls = await catalogService.getPlaylists();
    setPlaylists(pls);

    setFavorites(catalogStore.getFavorites());

    // Sync active track from store or default to first featured
    const activeId = catalogStore.getActiveTrackId();
    if (activeId) {
      const found = all.find((t) => t.id === activeId);
      if (found) setActiveTrack(found);
    } else if (all.length > 0 && !activeTrack) {
      setActiveTrack(all[0]);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to store updates (favorites, recently played, custom playlists)
    const unsubStore = catalogStore.subscribe(() => {
      setFavorites(catalogStore.getFavorites());
      catalogService.getRecentlyPlayed().then(setRecentTracks);
      catalogService.getPlaylists().then(setPlaylists);
    });

    // Listen to AudioEngine state
    const syncAudio = () => {
      const state = engine.getState();
      const aPlaying = state.deckA.transportState === 'playing';
      const bPlaying = state.deckB.transportState === 'playing';
      setIsPlaying(aPlaying || bPlaying);
      if (aPlaying) setActiveDeck('A');
      else if (bPlaying) setActiveDeck('B');
      else setActiveDeck(null);
    };

    syncAudio();
    const unsubEngine = engine.subscribe(syncAudio);

    return () => {
      unsubStore();
      unsubEngine();
    };
  }, []);

  function getSourceLabel(track: Track): string {
    switch (track.source) {
      case 'demo':
        return 'Acoustic Lab Demo';
      case 'creator':
        return track.isOriginal ? 'Creator Original' : 'Creator Upload';
      case 'local':
        return 'User Local Audio';
      case 'licensed':
        return 'Licensed Commercial';
      case 'spotify':
        return 'Spotify Web API';
      case 'soundcloud':
        return 'SoundCloud API';
      case 'jamendo':
        return 'Jamendo CC';
      default:
        return 'Authorized Audio';
    }
  }

  const handlePlayTrack = async (track: Track, targetDeck: 'A' | 'B' = 'A') => {
    setActiveTrack(track);
    if (!canUseTrack(track, 'listen')) return;
    try {
      await catalogService.playTrack(track, targetDeck);
    } catch (err) {
      console.error('Failed to play track:', err);
    }
  };

  const handleStageTrack = async (track: Track, targetDeck: 'A' | 'B') => {
    setActiveTrack(track);
    if (!canUseTrack(track, 'dj')) return;
    try {
      await catalogService.stageTrackToDeck(track, targetDeck);
    } catch (err) {
      console.error('Failed to stage track:', err);
    }
  };

  const handleToggleFavorite = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    catalogStore.toggleFavorite(trackId);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const newTrack = await catalogService.importLocalFile(file);
      await loadData();
      setActiveTrack(newTrack);
      setFilter('local');
    } catch (err) {
      console.error('Failed to import local audio file:', err);
    }
  };

  const handleCreatePlaylist = () => {
    const name = window.prompt('Enter constellation name:', 'Harmonic Voyage');
    if (!name) return;
    const desc = window.prompt('Enter description (optional):', 'Curated sound matter');
    catalogStore.createPlaylist(name, desc || undefined);
    setFilter('playlists');
  };

  const [jamendoOffset, setJamendoOffset] = useState<number>(0);
  const [isLoadingJamendo, setIsLoadingJamendo] = useState<boolean>(false);

  const handleLoadMoreJamendo = async () => {
    if (isLoadingJamendo) return;
    setIsLoadingJamendo(true);
    try {
      const nextOffset = jamendoOffset + 20;
      const more = await catalogService.getJamendoProvider().discover({ offset: nextOffset, limit: 20 });
      if (more.length > 0) {
        setTracks((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const fresh = more.filter((t) => !ids.has(t.id));
          return [...prev, ...fresh];
        });
        setJamendoOffset(nextOffset);
      }
    } catch (err) {
      console.warn('Failed to load more Jamendo tracks:', err);
    } finally {
      setIsLoadingJamendo(false);
    }
  };

  // Filtered tracks based on selected tab
  const displayedTracks = tracks.filter((t) => {
    if (filter === 'dj-ready') return canUseTrack(t, 'dj');
    if (filter === 'listen') return canUseTrack(t, 'listen');
    if (filter === 'creator') return t.source === 'creator';
    if (filter === 'local') return t.source === 'local';
    if (filter === 'jamendo') return t.source === 'jamendo';
    if (filter === 'favorites') return favorites.includes(t.id);
    if (filter === 'recent') return recentTracks.some((r) => r.id === t.id);
    return true;
  });

  return (
    <SonoraStage variant="spatial" ariaLabel="Personal Music Universe & Living Library">
      <section className="sonora-view-container sonora-library-view" aria-label="Personal Library">
        {/* Hidden File Input for Local File Ingestion */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {/* Header */}
        <header className="sonora-view-header">
          <div className="sonora-view-badge-row">
            <span className="sonora-view-badge">Personal Music Matter</span>
            <span className="sonora-view-status-pill is-active">Milestone 2A Living Catalog Active</span>
            <span className="sonora-view-status-pill">{tracks.length} Authorized Sounds</span>
          </div>
          <h1 className="sonora-view-title">Living Music Library</h1>
          <p className="sonora-view-subtitle">
            A navigable spatial universe connecting what you discover, what you collect,
            and what you perform across SONORA's two-deck architecture.
          </p>
        </header>

        {/* View Controls: Representation Modes & Filtering */}
        <div className="sonora-library-controls-bar">
          {/* Representation Switcher: Spatial / Flow / List */}
          <div className="sonora-mode-switcher" role="radiogroup" aria-label="Library Representation Mode">
            <button
              type="button"
              className={`sonora-mode-btn ${mode === 'spatial' ? 'is-active' : ''}`}
              onClick={() => setMode('spatial')}
              role="radio"
              aria-checked={mode === 'spatial'}
              title="Spatial Universe — Navigable celestial sonic map"
            >
              <span aria-hidden="true">◉</span>
              <span>Spatial Universe</span>
            </button>
            <button
              type="button"
              className={`sonora-mode-btn ${mode === 'flow' ? 'is-active' : ''}`}
              onClick={() => setMode('flow')}
              role="radio"
              aria-checked={mode === 'flow'}
              title="Flow Stream — Continuous horizontal discovery rivers"
            >
              <span aria-hidden="true">≋</span>
              <span>Flow River</span>
            </button>
            <button
              type="button"
              className={`sonora-mode-btn ${mode === 'list' ? 'is-active' : ''}`}
              onClick={() => setMode('list')}
              role="radio"
              aria-checked={mode === 'list'}
              title="List Console — Professional DJ performance table"
            >
              <span aria-hidden="true">≡</span>
              <span>List Console</span>
            </button>
          </div>

          {/* Filter Tabs (Rights & Taxonomy Aware) */}
          <div className="sonora-filter-tabs" role="tablist" aria-label="Library Category Filters">
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
              role="tab"
              aria-selected={filter === 'all'}
            >
              <span>All Tracks</span>
              <span className="sonora-filter-count">({tracks.length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'dj-ready' ? 'is-active' : ''}`}
              onClick={() => setFilter('dj-ready')}
              role="tab"
              aria-selected={filter === 'dj-ready'}
              title="Filter tracks cleared for two-deck DJ performance & staging"
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent-cyan)' }}>⚡</span>
              <span>DJ Ready</span>
              <span className="sonora-filter-count">({tracks.filter((t) => canUseTrack(t, 'dj')).length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'listen' ? 'is-active' : ''}`}
              onClick={() => setFilter('listen')}
              role="tab"
              aria-selected={filter === 'listen'}
              title="Filter interactive streaming catalog"
            >
              <span aria-hidden="true">▶</span>
              <span>Listen</span>
              <span className="sonora-filter-count">({tracks.filter((t) => canUseTrack(t, 'listen')).length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'creator' ? 'is-active' : ''}`}
              onClick={() => setFilter('creator')}
              role="tab"
              aria-selected={filter === 'creator'}
              title="Filter authorized creator original & upload catalog"
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent-amber)' }}>✦</span>
              <span>Creator</span>
              <span className="sonora-filter-count">({tracks.filter((t) => t.source === 'creator').length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'local' ? 'is-active' : ''}`}
              onClick={() => setFilter('local')}
              role="tab"
              aria-selected={filter === 'local'}
              title="Filter user-owned local imported audio"
            >
              <span aria-hidden="true">⇪</span>
              <span>Local Audio</span>
              <span className="sonora-filter-count">({tracks.filter((t) => t.source === 'local').length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'jamendo' ? 'is-active' : ''}`}
              onClick={() => setFilter('jamendo')}
              role="tab"
              aria-selected={filter === 'jamendo'}
              title="Filter Creative Commons music ingested via official Jamendo API"
            >
              <span aria-hidden="true" style={{ color: '#fb7185' }}>♫</span>
              <span>Jamendo</span>
              <span className="sonora-filter-count">({tracks.filter((t) => t.source === 'jamendo').length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'favorites' ? 'is-active' : ''}`}
              onClick={() => setFilter('favorites')}
              role="tab"
              aria-selected={filter === 'favorites'}
            >
              <span aria-hidden="true">★</span>
              <span>Favorites</span>
              <span className="sonora-filter-count">({favorites.length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'recent' ? 'is-active' : ''}`}
              onClick={() => setFilter('recent')}
              role="tab"
              aria-selected={filter === 'recent'}
            >
              <span aria-hidden="true">◷</span>
              <span>Recent</span>
              <span className="sonora-filter-count">({recentTracks.length})</span>
            </button>
            <button
              type="button"
              className={`sonora-filter-tab ${filter === 'playlists' ? 'is-active' : ''}`}
              onClick={() => setFilter('playlists')}
              role="tab"
              aria-selected={filter === 'playlists'}
            >
              <span aria-hidden="true">✦</span>
              <span>Constellations</span>
              <span className="sonora-filter-count">({playlists.length})</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="sonora-library-action-buttons">
            <button
              type="button"
              className="sonora-tool-btn"
              onClick={handleImportClick}
              aria-label="Ingest Local Audio File"
              title="Import user audio (MP3, WAV, FLAC, AAC)"
            >
              <span>+ Ingest Local File</span>
            </button>
            <button
              type="button"
              className="sonora-tool-btn"
              onClick={handleCreatePlaylist}
              aria-label="Create New Constellation Playlist"
            >
              <span>+ New Constellation</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODE 1: SPATIAL UNIVERSE REPRESENTATION */}
        {/* ================================================================= */}
        {mode === 'spatial' && filter !== 'playlists' && (
          <div className="sonora-universe-stage" aria-label="Spatial Sonic Universe">
            <svg className="sonora-universe-svg" viewBox="0 0 1000 500" aria-hidden="true">
              <defs>
                <radialGradient id="univ-core" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-accent-iris)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Concentric Harmonic Orbits */}
              <circle cx="500" cy="240" r="100" fill="none" stroke="rgba(124, 77, 255, 0.15)" strokeDasharray="3 6" />
              <circle cx="500" cy="240" r="180" fill="none" stroke="rgba(0, 229, 255, 0.12)" strokeDasharray="4 8" />
              <circle cx="500" cy="240" r="260" fill="none" stroke="rgba(255, 179, 0, 0.1)" strokeDasharray="2 6" />

              {/* Radiant Anchor Core */}
              <circle cx="500" cy="240" r="28" fill="url(#univ-core)" />
              <circle cx="500" cy="240" r="6" fill="#ffffff" />
            </svg>

            {/* Orbiting Celestial Sound Nodes */}
            <div className="sonora-universe-node-cloud">
              {displayedTracks.slice(0, 28).map((track, idx) => {
                const angle = (idx / Math.min(displayedTracks.length, 28)) * Math.PI * 2;
                const ringIndex = idx % 3;
                const distance = 100 + ringIndex * 75;
                const x = 500 + Math.cos(angle) * distance * 0.95;
                const y = 240 + Math.sin(angle) * (distance * 0.55);

                const isCurrent = activeTrack?.id === track.id;
                const isCurrentlyPlaying = isCurrent && isPlaying;

                return (
                  <button
                    key={track.id}
                    type="button"
                    className={`sonora-spatial-node-dot ${isCurrent ? 'is-active' : ''} ${
                      isCurrentlyPlaying ? 'is-playing' : ''
                    }`}
                    style={{ left: `${(x / 1000) * 100}%`, top: `${(y / 500) * 100}%` }}
                    onClick={() => handlePlayTrack(track, 'A')}
                    title={`${track.title} • ${track.artistName} (${track.bpm} BPM, ${track.key})`}
                    aria-label={`Play ${track.title} by ${track.artistName}`}
                  >
                    <span className="sonora-node-key-badge">{track.key || '8A'}</span>
                    <span>{track.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Track Focal Horizon Plinth (Milestone 2B Rights-Aware) */}
            {activeTrack && (
              <div className="sonora-spatial-focus-plinth" aria-live="polite">
                <div className="sonora-focus-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="sonora-focus-title">{activeTrack.title}</span>
                    <span className={`sonora-badge-source is-${activeTrack.source}`}>
                      {getSourceLabel(activeTrack)}
                    </span>
                    {!canUseTrack(activeTrack, 'dj') && (
                      <span className="sonora-badge-rights is-listen-only">Listen Only</span>
                    )}
                  </div>

                  <div className="sonora-focus-sub">
                    <span>{activeTrack.artistName}</span>
                    <span>•</span>
                    <span>{activeTrack.albumName || 'Single Matter'}</span>
                    <span>•</span>
                    <span className="sonora-badge-bpm">{activeTrack.bpm} BPM</span>
                    <span className="sonora-badge-key">{activeTrack.key}</span>
                    <span className="sonora-badge-bpm" style={{ borderColor: 'var(--color-accent-cyan)', color: 'var(--color-accent-cyan)' }}>
                      Deck {activeDeck || 'A'} Armed
                    </span>
                  </div>

                  {/* License / Attribution Notes */}
                  {activeTrack.attribution && (
                    <div className="sonora-focus-attribution">
                      <span style={{ color: 'var(--color-text-tertiary)' }}>License / Rights:</span>{' '}
                      <span>{activeTrack.attribution.license || 'All Rights Reserved'}</span>
                      {activeTrack.attribution.notes && (
                        <span> — {activeTrack.attribution.notes}</span>
                      )}
                    </div>
                  )}

                  {/* Capability Matrix Datum Strip (Section 15) */}
                  <div className="sonora-capability-matrix" role="group" aria-label="Track Capabilities">
                    <span className={`sonora-cap-item ${canUseTrack(activeTrack, 'listen') ? 'is-allowed' : 'is-denied'}`}>
                      LISTEN {canUseTrack(activeTrack, 'listen') ? '✓' : '—'}
                    </span>
                    <span className={`sonora-cap-item ${canUseTrack(activeTrack, 'dj') ? 'is-allowed' : 'is-denied'}`}>
                      DJ {canUseTrack(activeTrack, 'dj') ? '✓' : '—'}
                    </span>
                    <span className={`sonora-cap-item ${canUseTrack(activeTrack, 'edit') ? 'is-allowed' : 'is-denied'}`}>
                      EDIT {canUseTrack(activeTrack, 'edit') ? '✓' : '—'}
                    </span>
                    <span className={`sonora-cap-item ${canUseTrack(activeTrack, 'remix') ? 'is-allowed' : 'is-denied'}`}>
                      REMIX {canUseTrack(activeTrack, 'remix') ? '✓' : '—'}
                    </span>
                  </div>
                </div>

                <div className="sonora-focus-actions">
                  <div style={{ display: 'flex', gap: '4px', marginRight: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className={`sonora-tool-btn ${activeDeck === 'A' ? 'is-active' : ''}`}
                      onClick={() => setActiveDeck('A')}
                      style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                      title="Target Deck A"
                    >
                      Deck A
                    </button>
                    <button
                      type="button"
                      className={`sonora-tool-btn ${activeDeck === 'B' ? 'is-active' : ''}`}
                      onClick={() => setActiveDeck('B')}
                      style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                      title="Target Deck B"
                    >
                      Deck B
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`sonora-fav-toggle-btn ${favorites.includes(activeTrack.id) ? 'is-fav' : ''}`}
                    onClick={(e) => handleToggleFavorite(activeTrack.id, e)}
                    aria-label={favorites.includes(activeTrack.id) ? 'Remove favorite' : 'Add favorite'}
                    title={favorites.includes(activeTrack.id) ? 'In Favorites' : 'Add to Favorites'}
                  >
                    {favorites.includes(activeTrack.id) ? '★' : '☆'}
                  </button>

                  <button
                    type="button"
                    className="sonora-play-trigger-btn"
                    onClick={() => handlePlayTrack(activeTrack, activeDeck || 'A')}
                    aria-label={`Play on Deck ${activeDeck || 'A'}`}
                  >
                    {isPlaying && activeTrack.id === catalogStore.getActiveTrackId() ? 'Resonating ⦿' : `Play on Deck ${activeDeck || 'A'} ▶`}
                  </button>

                  {canUseTrack(activeTrack, 'dj') ? (
                    <>
                      <button
                        type="button"
                        className="sonora-deck-stage-btn stage-deck-a"
                        onClick={() => handleStageTrack(activeTrack, 'A')}
                        title="Stage on Deck A (Cyan Plinth)"
                      >
                        Stage A
                      </button>
                      <button
                        type="button"
                        className="sonora-deck-stage-btn stage-deck-b"
                        onClick={() => handleStageTrack(activeTrack, 'B')}
                        title="Stage on Deck B (Amber Plinth)"
                      >
                        Stage B
                      </button>
                    </>
                  ) : (
                    <span className="sonora-dj-unavailable-pill" title="DJ staging unavailable for this source (Listen Only)">
                      DJ Unavailable
                    </span>
                  )}

                  <button
                    type="button"
                    className="sonora-tool-btn"
                    onClick={() => onNavigate('dj-studio')}
                    title="Open in DJ Studio"
                  >
                    DJ Studio ↗
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MODE 2: FLOW RIVER REPRESENTATION */}
        {/* ================================================================= */}
        {mode === 'flow' && filter !== 'playlists' && (
          <div className="sonora-flow-container">
            {/* Stream 1: Featured Acoustic Matter */}
            <div className="sonora-flow-section">
              <div className="sonora-flow-header">
                <h2 className="sonora-flow-title">
                  <span className="sonora-flow-title-dot" aria-hidden="true" />
                  <span>Featured Sound Matter</span>
                </h2>
                <span className="sonora-spatial-node-meta">{featuredTracks.length} Curated</span>
              </div>
              <div className="sonora-flow-stream" role="region" aria-label="Featured Sound Stream">
                {featuredTracks.map((t) => (
                  <div
                    key={t.id}
                    className={`sonora-flow-node ${activeTrack?.id === t.id ? 'is-active' : ''} ${
                      activeTrack?.id === t.id && isPlaying ? 'is-playing' : ''
                    }`}
                    onClick={() => handlePlayTrack(t, 'A')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handlePlayTrack(t, 'A')}
                  >
                    <button
                      type="button"
                      className="sonora-flow-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(t, 'A');
                      }}
                      aria-label={`Play ${t.title}`}
                    >
                      ▶
                    </button>
                    <span className="sonora-flow-node-title">{t.title}</span>
                    <span className="sonora-flow-node-artist">{t.artistName}</span>
                    <div className="sonora-flow-node-badges">
                      <span className="sonora-badge-key">{t.key}</span>
                      <span className="sonora-badge-bpm">{t.bpm} BPM</span>
                      {!canUseTrack(t, 'dj') && (
                        <span className="sonora-badge-rights is-listen-only">Listen Only</span>
                      )}
                      <button
                        type="button"
                        className={`sonora-fav-toggle-btn ${favorites.includes(t.id) ? 'is-fav' : ''}`}
                        onClick={(e) => handleToggleFavorite(t.id, e)}
                        aria-label="Toggle favorite"
                      >
                        {favorites.includes(t.id) ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stream 2: Recently Resonated */}
            {recentTracks.length > 0 && (
              <div className="sonora-flow-section">
                <div className="sonora-flow-header">
                  <h2 className="sonora-flow-title">
                    <span className="sonora-flow-title-dot" style={{ background: 'var(--color-accent-cyan)' }} />
                    <span>Recently Resonated In Atmosphere</span>
                  </h2>
                  <span className="sonora-spatial-node-meta">{recentTracks.length} History</span>
                </div>
                <div className="sonora-flow-stream" role="region" aria-label="Recently Resonated Stream">
                  {recentTracks.map((t) => (
                    <div
                      key={t.id}
                      className={`sonora-flow-node ${activeTrack?.id === t.id ? 'is-active' : ''}`}
                      onClick={() => handlePlayTrack(t, 'A')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlayTrack(t, 'A')}
                    >
                      <button
                        type="button"
                        className="sonora-flow-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(t, 'A');
                        }}
                        aria-label={`Play ${t.title}`}
                      >
                        ▶
                      </button>
                      <span className="sonora-flow-node-title">{t.title}</span>
                      <span className="sonora-flow-node-artist">{t.artistName}</span>
                      <div className="sonora-flow-node-badges">
                        <span className="sonora-badge-key">{t.key}</span>
                        <span className="sonora-badge-bpm">{t.bpm} BPM</span>
                        {!canUseTrack(t, 'dj') && (
                          <span className="sonora-badge-rights is-listen-only">Listen Only</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stream 3: Deep Electronic & Peak Energy */}
            <div className="sonora-flow-section">
              <div className="sonora-flow-header">
                <h2 className="sonora-flow-title">
                  <span className="sonora-flow-title-dot" style={{ background: 'var(--color-accent-amber)' }} />
                  <span>Subterranean Pulse & Peak Energy</span>
                </h2>
                <span className="sonora-spatial-node-meta">Techno & House</span>
              </div>
              <div className="sonora-flow-stream" role="region" aria-label="Electronic Pulse Stream">
                {tracks
                  .filter((t) => t.genre === 'Peak Techno' || t.genre === 'Deep House')
                  .slice(0, 12)
                  .map((t) => (
                    <div
                      key={t.id}
                      className={`sonora-flow-node ${activeTrack?.id === t.id ? 'is-active' : ''}`}
                      onClick={() => handlePlayTrack(t, 'A')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlayTrack(t, 'A')}
                    >
                      <button
                        type="button"
                        className="sonora-flow-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(t, 'A');
                        }}
                        aria-label={`Play ${t.title}`}
                      >
                        ▶
                      </button>
                      <span className="sonora-flow-node-title">{t.title}</span>
                      <span className="sonora-flow-node-artist">{t.artistName}</span>
                      <div className="sonora-flow-node-badges">
                        <span className="sonora-badge-key">{t.key}</span>
                        <span className="sonora-badge-bpm">{t.bpm} BPM</span>
                        {!canUseTrack(t, 'dj') && (
                          <span className="sonora-badge-rights is-listen-only">Listen Only</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODE 3: LIST CONSOLE REPRESENTATION (PRO PERFORMANCE) */}
        {/* ================================================================= */}
        {mode === 'list' && filter !== 'playlists' && (
          <div className="sonora-list-container">
            <table className="sonora-list-table" aria-label="Track Console Table">
              <thead>
                <tr>
                  <th className="sonora-list-th" style={{ width: 44 }}>#</th>
                  <th className="sonora-list-th">Title & Artist</th>
                  <th className="sonora-list-th">Album</th>
                  <th className="sonora-list-th">Genre</th>
                  <th className="sonora-list-th">Key</th>
                  <th className="sonora-list-th">BPM</th>
                  <th className="sonora-list-th">Duration</th>
                  <th className="sonora-list-th" style={{ textAlign: 'right' }}>Staging</th>
                </tr>
              </thead>
              <tbody>
                {displayedTracks.map((t, index) => {
                  const isCurrent = activeTrack?.id === t.id;
                  const isCurrentPlaying = isCurrent && isPlaying;

                  return (
                    <tr
                      key={t.id}
                      className={`sonora-list-row ${isCurrent ? 'is-active' : ''} ${
                        isCurrentPlaying ? 'is-playing' : ''
                      }`}
                      onClick={() => handlePlayTrack(t, 'A')}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePlayTrack(t, 'A');
                        if (e.key === 'a' || e.key === 'A') {
                          if (canUseTrack(t, 'dj')) handleStageTrack(t, 'A');
                        }
                        if (e.key === 'b' || e.key === 'B') {
                          if (canUseTrack(t, 'dj')) handleStageTrack(t, 'B');
                        }
                        if (e.key === 'f' || e.key === 'F') handleToggleFavorite(t.id);
                      }}
                    >
                      <td className="sonora-list-td td-num">
                        {isCurrentPlaying ? '⦿' : index + 1}
                      </td>
                      <td className="sonora-list-td td-title">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{t.title}</span>
                          {t.source !== 'demo' && (
                            <span className={`sonora-badge-source is-${t.source}`}>
                              {getSourceLabel(t)}
                            </span>
                          )}
                          {!canUseTrack(t, 'dj') && (
                            <span className="sonora-badge-rights is-listen-only">Listen Only</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                          {t.artistName}
                        </div>
                      </td>
                      <td className="sonora-list-td">{t.albumName || '—'}</td>
                      <td className="sonora-list-td">{t.genre || 'Sound Matter'}</td>
                      <td className="sonora-list-td td-mono" style={{ color: 'var(--color-accent-cyan)' }}>
                        {t.key || '8A'}
                      </td>
                      <td className="sonora-list-td td-mono">{t.bpm || 120}</td>
                      <td className="sonora-list-td td-mono">
                        {Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}
                      </td>
                      <td className="sonora-list-td" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className={`sonora-fav-toggle-btn ${favorites.includes(t.id) ? 'is-fav' : ''}`}
                            onClick={(e) => handleToggleFavorite(t.id, e)}
                            aria-label="Favorite"
                          >
                            {favorites.includes(t.id) ? '★' : '☆'}
                          </button>
                          {canUseTrack(t, 'dj') ? (
                            <>
                              <button
                                type="button"
                                className="sonora-deck-stage-btn stage-deck-a"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStageTrack(t, 'A');
                                }}
                                title="Stage onto Deck A"
                              >
                                A
                              </button>
                              <button
                                type="button"
                                className="sonora-deck-stage-btn stage-deck-b"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStageTrack(t, 'B');
                                }}
                                title="Stage onto Deck B"
                              >
                                B
                              </button>
                            </>
                          ) : (
                            <span className="sonora-dj-unavailable-label" title="DJ staging unavailable for this source (Listen Only)">
                              DJ —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Jamendo Horizon Pagination Action */}
            {filter === 'jamendo' && displayedTracks.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-4) 0' }}>
                <button
                  type="button"
                  className="sonora-tool-btn"
                  onClick={handleLoadMoreJamendo}
                  disabled={isLoadingJamendo}
                  style={{ padding: '7px 18px', fontSize: '0.72rem' }}
                >
                  {isLoadingJamendo ? 'Receiving Sonic Signals...' : 'Load More Jamendo Horizon ⤓'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty Horizon State */}
        {displayedTracks.length === 0 && filter !== 'playlists' && (
          <div className="sonora-empty-horizon" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
            {filter === 'jamendo' ? (
              <div>
                <div style={{ fontSize: '1.8rem', color: '#fb7185', marginBottom: 'var(--space-2)' }}>♫</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>
                  {catalogService.getProviderStatus('jamendo').status === 'ready'
                    ? 'No Jamendo Tracks Found'
                    : 'Jamendo API Not Configured'}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', maxWidth: '460px', margin: 'var(--space-2) auto' }}>
                  {catalogService.getProviderStatus('jamendo').status === 'ready'
                    ? 'The Jamendo catalog returned zero signals for this query.'
                    : 'Provide VITE_JAMENDO_CLIENT_ID in your environment configuration to activate live Creative Commons catalog streaming.'}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.6rem', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>⊘</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>
                  No Tracks Match Filter
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 'var(--space-2) auto' }}>
                  Select another category or expand filter horizons.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PLAYLISTS / CONSTELLATIONS SUB-VIEW */}
        {/* ================================================================= */}
        {filter === 'playlists' && (
          <div className="sonora-flow-container">
            <div className="sonora-flow-header">
              <h2 className="sonora-flow-title">
                <span className="sonora-flow-title-dot" />
                <span>Curated & Custom Constellations</span>
              </h2>
              <button
                type="button"
                className="sonora-action-btn"
                onClick={handleCreatePlaylist}
              >
                + New Constellation
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="sonora-flow-node"
                  style={{ minHeight: 140 }}
                >
                  <span className="sonora-flow-node-title">{pl.name}</span>
                  <span className="sonora-flow-node-artist">{pl.description}</span>
                  <div className="sonora-flow-node-badges" style={{ marginTop: 'auto' }}>
                    <span className="sonora-badge-bpm">{pl.trackIds.length} Tracks</span>
                    {pl.isCustom && (
                      <span className="sonora-badge-key" style={{ background: 'rgba(255, 179, 0, 0.15)', color: 'var(--color-accent-amber)' }}>
                        User Created
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </SonoraStage>
  );
};

export default LibraryView;
