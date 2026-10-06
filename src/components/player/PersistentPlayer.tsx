/**
 * SONORA Persistent Global Player
 * Authoritative Reference: PRD.md Section 10 & 13, Milestone 1 Step 7
 * 
 * Persistent player docked at the bottom of the environment across all routes.
 * Decoupled from 60fps renders: synchronizes with AudioEngine discrete snapshots.
 * Reflects active deck state, master volume, and links directly to DJ Studio.
 */

import React, { useState, useEffect } from 'react';
import { getAudioEngine } from '../../audio/AudioEngine';
import { createSyntheticDemoBuffer } from '../../audio/audioLoader';
import { RouteId } from '../../types/routes';
import { Track, canUseTrack } from '../../catalog/types';
import { getCatalogService } from '../../catalog/catalogService';
import { getCatalogStore } from '../../catalog/catalogStore';
import './PersistentPlayer.css';

export interface PersistentPlayerProps {
  onOpenDJStudio: () => void;
  activeRoute: RouteId;
}

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PersistentPlayer: React.FC<PersistentPlayerProps> = ({
  onOpenDJStudio,
  activeRoute,
}) => {
  const [activeDeck, setActiveDeck] = useState<'A' | 'B' | null>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);
  const [isFav, setIsFav] = useState<boolean>(false);

  const catalogService = getCatalogService();
  const catalogStore = getCatalogStore();

  useEffect(() => {
    const engine = getAudioEngine();

    const syncTrackEntity = async () => {
      const activeId = catalogStore.getActiveTrackId();
      if (activeId) {
        const t = await catalogService.getTrack(activeId);
        if (t) {
          setCurrentTrack(t);
          setIsFav(catalogStore.isFavorite(t.id));
        }
      }
    };

    syncTrackEntity();
    const unsubStore = catalogStore.subscribe(() => {
      syncTrackEntity();
    });

    const syncState = () => {
      const state = engine.getState();
      setMasterVolume(state.master.volume);

      // Determine active deck focus (playing deck takes priority, else loaded deck, else null)
      if (state.deckA.transportState === 'playing') {
        setActiveDeck('A');
        setTrackName(state.deckA.trackName || 'Deck A Stream');
        setIsPlaying(true);
        setCurrentTime(state.deckA.currentTime);
        setDuration(state.deckA.duration);
      } else if (state.deckB.transportState === 'playing') {
        setActiveDeck('B');
        setTrackName(state.deckB.trackName || 'Deck B Stream');
        setIsPlaying(true);
        setCurrentTime(state.deckB.currentTime);
        setDuration(state.deckB.duration);
      } else if (state.deckA.isLoaded) {
        setActiveDeck('A');
        setTrackName(state.deckA.trackName || 'Deck A Ready');
        setIsPlaying(false);
        setCurrentTime(state.deckA.currentTime);
        setDuration(state.deckA.duration);
      } else if (state.deckB.isLoaded) {
        setActiveDeck('B');
        setTrackName(state.deckB.trackName || 'Deck B Ready');
        setIsPlaying(false);
        setCurrentTime(state.deckB.currentTime);
        setDuration(state.deckB.duration);
      } else {
        setActiveDeck(null);
        setTrackName(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    };

    syncState();
    const unsub = engine.subscribe(syncState);
    return () => {
      unsub();
      unsubStore();
    };
  }, []);

  const handleTogglePlay = async () => {
    const engine = getAudioEngine();
    if (!activeDeck) {
      try {
        const feat = await catalogService.getFeatured();
        if (feat.length > 0) {
          await catalogService.playTrack(feat[0], 'A');
        } else {
          const ctx = await engine.initialize();
          const demoBuffer = createSyntheticDemoBuffer(ctx, 'deckA', 16);
          await engine.loadDeck('A', demoBuffer, 'SONORA Cyan Resonance (Synthetic Demo)');
          await engine.play('A');
        }
      } catch {
        onOpenDJStudio();
      }
      return;
    }

    if (isPlaying) {
      engine.pause(activeDeck);
    } else {
      await engine.play(activeDeck);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeDeck || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = ratio * duration;
    getAudioEngine().seek(activeDeck, targetSeconds);
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    getAudioEngine().setMasterVolume(vol);
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTrack) {
      catalogStore.toggleFavorite(currentTrack.id);
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const isDJStudioActive = activeRoute === 'dj-studio';
  const deckClass = activeDeck === 'A' ? 'is-deck-a' : activeDeck === 'B' ? 'is-deck-b' : '';

  const displayTitle = currentTrack?.title || trackName || 'Pure Void • Standby';
  const displayArtist = currentTrack
    ? `${currentTrack.artistName} • ${currentTrack.genre || 'Sound Matter'}`
    : activeDeck
    ? `Acoustic Stream Active • 44.1kHz`
    : 'Standby • Click Play to Ignite Demo';

  return (
    <footer
      className={`sonora-persistent-player ${deckClass} ${isPlaying ? 'is-playing' : ''}`}
      role="region"
      aria-label="Global Music Player"
    >
      {/* 1. Track Metadata */}
      <div className="sonora-player-track-info">
        <div
          className={`sonora-player-mini-disc ${isPlaying ? 'is-rotating' : ''}`}
          aria-hidden="true"
        >
          <div
            className={`sonora-player-mini-spindle ${
              activeDeck === 'A' ? 'is-deck-a' : activeDeck === 'B' ? 'is-deck-b' : ''
            }`}
          />
        </div>

        <div className="sonora-player-meta">
          <div className="sonora-player-title-row">
            <span className="sonora-player-title" title={displayTitle}>
              {displayTitle}
            </span>
            {currentTrack && (
              <button
                type="button"
                className={`sonora-fav-toggle-btn ${isFav ? 'is-fav' : ''}`}
                onClick={handleToggleFav}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                style={{ fontSize: '0.85rem', padding: '0 2px' }}
              >
                {isFav ? '★' : '☆'}
              </button>
            )}
            {activeDeck && (
              <span className={`sonora-player-deck-badge is-deck-${activeDeck.toLowerCase()}`}>
                Deck {activeDeck}
              </span>
            )}
            {currentTrack?.source && currentTrack.source !== 'demo' && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {currentTrack.source}
              </span>
            )}
            {currentTrack && !canUseTrack(currentTrack, 'dj') && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(255, 179, 0, 0.12)',
                  color: 'var(--color-accent-amber)',
                  fontWeight: 700,
                }}
                title="Listen-only clearance; DJ staging prohibited"
              >
                Listen Only
              </span>
            )}
            {currentTrack?.key && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(0, 229, 255, 0.12)',
                  color: 'var(--color-accent-cyan)',
                  fontWeight: 700,
                }}
              >
                {currentTrack.key}
              </span>
            )}
            {currentTrack?.bpm && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(129, 140, 248, 0.12)',
                  color: 'var(--color-accent-iris)',
                  fontWeight: 700,
                }}
              >
                {currentTrack.bpm} BPM
              </span>
            )}
          </div>
          <span className="sonora-player-artist">
            {displayArtist}
          </span>
        </div>
      </div>

      {/* 2. Core Transport & Progress */}
      <div className="sonora-player-transport">
        <div className="sonora-player-controls-row">
          <button
            type="button"
            className={`sonora-player-play-btn ${isPlaying ? 'is-active' : ''}`}
            onClick={handleTogglePlay}
            aria-label={
              isPlaying
                ? `Pause Deck ${activeDeck}`
                : activeDeck
                ? `Play Deck ${activeDeck}`
                : 'Ignite Synthetic Demo Audio'
            }
          >
            {isPlaying ? 'Pause ⏸' : 'Play ▶'}
          </button>

          {/* Mini Real-Time Acoustic Activity Indicator */}
          <div className={`sonora-player-meter ${isPlaying ? 'is-active' : ''}`} aria-hidden="true">
            <span className="sonora-meter-bar bar-1" />
            <span className="sonora-meter-bar bar-2" />
            <span className="sonora-meter-bar bar-3" />
            <span className="sonora-meter-bar bar-4" />
          </div>
        </div>

        <div className="sonora-player-progress-row">
          <span className="sonora-player-timecode">{formatTime(currentTime)}</span>
          <div
            className="sonora-player-progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            onClick={handleSeek}
            title={activeDeck && duration > 0 ? 'Click to scrub playback position' : undefined}
          >
            <div className="sonora-player-progress-fill" style={{ width: `${progressPercent}%` }}>
              <span className="sonora-player-playhead-dot" aria-hidden="true" />
            </div>
          </div>
          <span className="sonora-player-timecode">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Output Stage & DJ Studio Shortcut */}
      <div className="sonora-player-output">
        <span className="sonora-player-queue-badge" title="Streaming queue unlocks in Milestone 2">
          Queue: Standby
        </span>

        <div className="sonora-player-volume-strip" aria-label="Master Volume">
          <span className="sonora-player-volume-readout" aria-hidden="true">
            {Math.round(masterVolume * 100)}%
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
            className="sonora-fader-slider"
            aria-label="Global Master Volume"
            aria-valuenow={Math.round(masterVolume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${Math.round(masterVolume * 100)}%`}
          />
        </div>

        {!isDJStudioActive && (
          <button
            type="button"
            className="sonora-player-dj-shortcut-btn"
            onClick={onOpenDJStudio}
            aria-label="Switch view to DJ Studio"
          >
            Open in DJ Studio ↗
          </button>
        )}
      </div>
    </footer>
  );
};
