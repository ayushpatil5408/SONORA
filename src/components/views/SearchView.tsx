/**
 * SONORA SearchView Component
 * Authoritative Reference: PRD.md Section 12 & 52, DESIGN_SYSTEM.md, MILESTONE 2A
 * 
 * Living Harmonic Search & Discovery Field:
 * Real-time client-side search across tracks, artists, albums, and playlists.
 * Harmonic Camelot key wheel filtering with transition path intelligence.
 */

import React, { useState, useEffect } from 'react';
import { RouteId } from '../../types/routes';
import { SonoraStage } from '../stage/SonoraStage';
import { Track, Artist, Album, canUseTrack } from '../../catalog/types';
import { getCatalogService } from '../../catalog/catalogService';
import { getCatalogStore } from '../../catalog/catalogStore';
import { getAudioEngine } from '../../audio/AudioEngine';
import './Views.css';
import './SearchView.css';

export interface SearchViewProps {
  onNavigate: (route: RouteId) => void;
}

// 12 Camelot wheel sectors
const CAMELOT_KEYS = [
  { key: '1A', name: 'Abm / B' },
  { key: '2A', name: 'Ebm / F#' },
  { key: '3A', name: 'Bbm / Db' },
  { key: '4A', name: 'Fm / Ab' },
  { key: '5A', name: 'Cm / Eb' },
  { key: '6A', name: 'Gm / Bb' },
  { key: '7A', name: 'Dm / F' },
  { key: '8A', name: 'Am / C' },
  { key: '9A', name: 'Em / G' },
  { key: '10A', name: 'Bm / D' },
  { key: '11A', name: 'F#m / A' },
  { key: '12A', name: 'Dbm / E' },
];

const GENRE_PRESETS = [
  'All Genres',
  'Ambient & Drone',
  'Peak Techno',
  'Deep House',
  'Chill & Lo-Fi',
  'Synthwave',
  'Cinematic Score',
  'Drum & Bass',
  'Minimal & Micro',
  'Neo-Classical',
  'Experimental Glitch',
];

export const SearchView: React.FC<SearchViewProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All Genres');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [results, setResults] = useState<{
    tracks: Track[];
    artists: Artist[];
    albums: Album[];
  }>({ tracks: [], artists: [], albums: [] });

  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const catalogService = getCatalogService();
  const catalogStore = getCatalogStore();
  const engine = getAudioEngine();

  // Perform reactive search
  useEffect(() => {
    let isCancelled = false;

    const runSearch = async () => {
      const genreFilter = selectedGenre !== 'All Genres' ? selectedGenre : undefined;
      const keyFilter = selectedKey || undefined;

      const res = await catalogService.search(query, {
        genre: genreFilter,
        key: keyFilter,
      });

      if (!isCancelled) {
        setResults({
          tracks: res.tracks,
          artists: res.artists,
          albums: res.albums,
        });
      }
    };

    runSearch();
    return () => {
      isCancelled = true;
    };
  }, [query, selectedGenre, selectedKey]);

  useEffect(() => {
    setFavorites(catalogStore.getFavorites());
    setActiveTrackId(catalogStore.getActiveTrackId());

    const unsubStore = catalogStore.subscribe(() => {
      setFavorites(catalogStore.getFavorites());
      setActiveTrackId(catalogStore.getActiveTrackId());
    });

    const syncAudio = () => {
      const state = engine.getState();
      setIsPlaying(state.deckA.transportState === 'playing' || state.deckB.transportState === 'playing');
    };

    syncAudio();
    const unsubEngine = engine.subscribe(syncAudio);

    return () => {
      unsubStore();
      unsubEngine();
    };
  }, []);

  const handlePlayTrack = async (track: Track, targetDeck: 'A' | 'B' = 'A') => {
    if (!canUseTrack(track, 'listen')) return;
    try {
      await catalogService.playTrack(track, targetDeck);
    } catch (err) {
      console.error('Failed to play track from search:', err);
    }
  };

  const handleStageTrack = async (track: Track, targetDeck: 'A' | 'B') => {
    if (!canUseTrack(track, 'dj')) return;
    try {
      await catalogService.stageTrackToDeck(track, targetDeck);
    } catch (err) {
      console.error('Failed to stage track from search:', err);
    }
  };

  const handleToggleFavorite = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    catalogStore.toggleFavorite(trackId);
  };

  const topMatch = results.tracks.length > 0 ? results.tracks[0] : null;

  return (
    <SonoraStage variant="spatial" ariaLabel="Intelligent Catalog Search & Harmonic Discovery">
      <section className="sonora-view-container sonora-search-view" aria-label="Catalog Search">
        {/* Header */}
        <header className="sonora-view-header">
          <div className="sonora-view-badge-row">
            <span className="sonora-view-badge">Intelligent Search</span>
            <span className="sonora-view-status-pill is-active">Milestone 2A Search Operational</span>
            <span className="sonora-view-status-pill">Harmonic Discovery Engine</span>
            <div style={{ display: 'inline-flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
              <button
                type="button"
                className="sonora-tool-btn"
                onClick={() => onNavigate('library')}
                title="Explore Living Music Library"
              >
                Living Library ↗
              </button>
              <button
                type="button"
                className="sonora-tool-btn"
                onClick={() => onNavigate('dj-studio')}
                title="Stage in Two-Deck DJ Studio"
              >
                DJ Studio ↗
              </button>
            </div>
          </div>
          <h1 className="sonora-view-title">Search & Harmonic Discovery</h1>
          <p className="sonora-view-subtitle">
            Query releases by title, artist, acoustic key, or tempo.
            Harmonic compatibility indicators highlight tracks ready for immediate two-deck performance.
          </p>
        </header>

        {/* 1. Typographic Search Plinth */}
        <div className="sonora-search-plinth" role="search" aria-label="Catalog search query">
          <div className="sonora-search-input-shell">
            <span className="sonora-search-icon" aria-hidden="true">⚲</span>
            <input
              type="text"
              className="sonora-search-input"
              placeholder="Search by title, artist, album, key (e.g. 8A), or BPM..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search query"
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="sonora-search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear query"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Genre Chips */}
          <div className="sonora-search-genre-chips" aria-label="Genre Filters">
            {GENRE_PRESETS.map((g) => (
              <button
                key={g}
                type="button"
                className={`sonora-genre-chip ${selectedGenre === g ? 'is-active' : ''}`}
                onClick={() => setSelectedGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Interactive Camelot Harmonic Key Sector Selector */}
        <div className="sonora-spatial-horizon" style={{ padding: 'var(--space-6) var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 860 }}>
            <div>
              <span className="sonora-view-badge" style={{ fontSize: '0.65rem' }}>Harmonic Alignment</span>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', color: '#ffffff' }}>
                Camelot Harmonic Key Filter {selectedKey ? `• ${selectedKey}` : '(All Sectors)'}
              </h3>
            </div>
            {selectedKey && (
              <button
                type="button"
                className="sonora-tool-btn"
                onClick={() => setSelectedKey(null)}
                style={{ fontSize: '0.65rem', padding: '3px 10px' }}
              >
                Reset Key Filter ✕
              </button>
            )}
          </div>

          <div className="sonora-camelot-selector" role="radiogroup" aria-label="Camelot key selector">
            {CAMELOT_KEYS.map((item) => {
              const isSelected = selectedKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`sonora-camelot-sector ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedKey(isSelected ? null : item.key)}
                  aria-checked={isSelected}
                  role="radio"
                  title={`${item.key} • ${item.name}`}
                >
                  <span className="sonora-camelot-key">{item.key}</span>
                  <span className="sonora-camelot-name">{item.name.split(' / ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Top Hero Track Match (If found) */}
        {topMatch && (
          <div className="sonora-search-hero-match" aria-label="Primary Search Match">
            <div className="sonora-hero-meta">
              <span className="sonora-hero-badge">✦ Top Acoustic Match</span>
              <h2 className="sonora-hero-title">
                {topMatch.title}
                {topMatch.source !== 'demo' && (
                  <span className={`sonora-badge-source is-${topMatch.source}`} style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                    {topMatch.source}
                  </span>
                )}
                {!canUseTrack(topMatch, 'dj') && (
                  <span className="sonora-badge-rights is-listen-only" style={{ marginLeft: 6, fontSize: '0.65rem' }}>
                    Listen Only
                  </span>
                )}
              </h2>
              <div className="sonora-hero-sub">
                <span>{topMatch.artistName}</span>
                <span>•</span>
                <span>{topMatch.genre}</span>
                <span>•</span>
                <span className="sonora-badge-bpm">{topMatch.bpm} BPM</span>
                <span className="sonora-badge-key">{topMatch.key}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className={`sonora-fav-toggle-btn ${favorites.includes(topMatch.id) ? 'is-fav' : ''}`}
                onClick={(e) => handleToggleFavorite(topMatch.id, e)}
                aria-label="Favorite"
              >
                {favorites.includes(topMatch.id) ? '★' : '☆'}
              </button>

              <button
                type="button"
                className="sonora-play-trigger-btn"
                onClick={() => handlePlayTrack(topMatch, 'A')}
              >
                {isPlaying && activeTrackId === topMatch.id ? 'Resonating ⦿' : 'Play Match ▶'}
              </button>

              {canUseTrack(topMatch, 'dj') ? (
                <>
                  <button
                    type="button"
                    className="sonora-deck-stage-btn stage-deck-a"
                    onClick={() => handleStageTrack(topMatch, 'A')}
                    title="Stage onto Deck A (Cyan)"
                  >
                    Stage A
                  </button>

                  <button
                    type="button"
                    className="sonora-deck-stage-btn stage-deck-b"
                    onClick={() => handleStageTrack(topMatch, 'B')}
                    title="Stage onto Deck B (Amber)"
                  >
                    Stage B
                  </button>
                </>
              ) : (
                <span className="sonora-dj-unavailable-pill" title="DJ staging unavailable for this track (Listen Only)">
                  DJ Unavailable
                </span>
              )}
            </div>
          </div>
        )}

        {/* 4. Search Results Grid */}
        <div className="sonora-search-results-section">
          <div className="sonora-search-section-header">
            <h2 className="sonora-flow-title" style={{ fontSize: 'var(--text-base)' }}>
              <span>Matching Sound Matter</span>
              <span className="sonora-spatial-node-meta">({results.tracks.length} results)</span>
            </h2>
            <span className="sonora-spatial-node-meta">100% Authorized Prototype Content</span>
          </div>

          {results.tracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
              No acoustic matter matching &ldquo;{query}&rdquo; in this sector. Try another key or clear filters.
            </div>
          ) : (
            <div className="sonora-search-results-grid">
              {results.tracks.map((t) => {
                const isCurrent = activeTrackId === t.id;
                const isCurrentPlaying = isCurrent && isPlaying;

                return (
                  <div
                    key={t.id}
                    className={`sonora-search-track-item ${isCurrent ? 'is-active' : ''} ${
                      isCurrentPlaying ? 'is-playing' : ''
                    }`}
                    onClick={() => handlePlayTrack(t, 'A')}
                    role="button"
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
                    <div className="sonora-search-item-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="sonora-search-item-title">{t.title}</span>
                        {t.source !== 'demo' && (
                          <span className={`sonora-badge-source is-${t.source}`}>{t.source}</span>
                        )}
                        {!canUseTrack(t, 'dj') && (
                          <span className="sonora-badge-rights is-listen-only">Listen Only</span>
                        )}
                      </div>
                      <span className="sonora-search-item-artist">{t.artistName}</span>
                    </div>

                    <div className="sonora-search-item-actions">
                      <span className="sonora-badge-key">{t.key}</span>
                      <span className="sonora-badge-bpm">{t.bpm}</span>
                      <button
                        type="button"
                        className={`sonora-fav-toggle-btn ${favorites.includes(t.id) ? 'is-fav' : ''}`}
                        onClick={(e) => handleToggleFavorite(t.id, e)}
                        aria-label="Toggle favorite"
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
                        <span className="sonora-dj-unavailable-label" title="DJ staging unavailable for this source">
                          DJ —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Matching Artists & Albums (Harmonic Context) */}
        {results.artists.length > 0 && (
          <div className="sonora-search-results-section" style={{ marginTop: 'var(--space-4)' }}>
            <div className="sonora-search-section-header">
              <h2 className="sonora-flow-title" style={{ fontSize: 'var(--text-base)' }}>
                <span>Harmonic Producers & Sound Architects</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              {results.artists.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="sonora-spatial-node"
                  style={{ padding: 'var(--space-3)', cursor: 'pointer' }}
                  onClick={() => onNavigate('library')}
                  title={`Explore ${a.name} in Living Library`}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onNavigate('library');
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{a.name} ↗</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)' }}>
                      {a.genres?.join(' • ')}
                    </div>
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

export default SearchView;
