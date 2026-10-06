/**
 * SONORA DJDeck Component
 * Authoritative Reference: PRD.md, DESIGN_SYSTEM.md & PRODUCT_ARCHITECTURE.md
 * 
 * Reusable Turntable & Acoustic Ribbon Station for Deck A (Cyan) and Deck B (Amber).
 * Bridges local audio file ingestion, off-thread waveform extraction, tactile
 * transport, 3-band EQ, sound-color filter, and pitch controls.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeckId, FilterType, DeckEQ, DeckFilter } from '../audio/types';
import { getAudioEngine } from '../audio/AudioEngine';
import { loadAudioFile, createSyntheticDemoBuffer } from '../audio/audioLoader';
import { waveformService } from '../audio/waveformService';
import { WaveformData } from '../audio/waveformTypes';
import { formatFrequency, formatDecibels, formatPlaybackRate } from '../audio/djMath';
import { WaveformRibbon } from './WaveformRibbon';
import './DJDeck.css';

export interface DJDeckProps {
  deckId: DeckId;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const DJDeck: React.FC<DJDeckProps> = ({ deckId, className = '' }) => {
  const [trackName, setTrackName] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Deck Control Parameters
  const [volume, setVolume] = useState<number>(1.0);
  const [eq, setEq] = useState<DeckEQ>({ low: 0, mid: 0, high: 0 });
  const [filter, setFilter] = useState<DeckFilter>({ type: 'bypass', frequency: 20000, q: 1.0 });
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to AudioEngine domain state mutations
  useEffect(() => {
    const engine = getAudioEngine();
    const unsub = engine.subscribe((snapshot) => {
      const state = deckId === 'A' ? snapshot.deckA : snapshot.deckB;
      setIsPlaying(state.transportState === 'playing');
      setIsPaused(state.transportState === 'paused');
      if (state.transportState === 'stopped') {
        setCurrentTime(0);
      } else {
        setCurrentTime(state.currentTime);
      }
      setVolume(state.volume);
      setEq({ ...state.eq });
      setFilter({ ...state.filter });
      setPlaybackRate(state.playbackRate);
    });
    return unsub;
  }, [deckId]);

  // Handle local file ingestion
  const handleIngestFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      const engine = getAudioEngine();
      const ctx = await engine.initialize();
      const audioBuffer = await loadAudioFile(file, ctx);

      await engine.loadDeck(deckId, audioBuffer, file.name);

      // Off-thread waveform analysis via Web Worker
      const wf = await waveformService.analyzeAudioBuffer(audioBuffer, 1000);

      setWaveform(wf);
      setTrackName(file.name);
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsPaused(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle synthetic demo track generation for instant audio testing
  const handleLoadDemoTrack = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const engine = getAudioEngine();
      const ctx = await engine.initialize();
      const demoBuffer = createSyntheticDemoBuffer(ctx, deckId === 'A' ? 'deckA' : 'deckB', 16);
      const name = deckId === 'A' ? 'SONORA Pulse (120 BPM)' : 'SONORA Aurora (120 BPM)';

      await engine.loadDeck(deckId, demoBuffer, name);

      const wf = await waveformService.analyzeAudioBuffer(demoBuffer, 1000);

      setWaveform(wf);
      setTrackName(name);
      setDuration(demoBuffer.duration);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsPaused(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Eject track and reset deck
  const handleEject = () => {
    const engine = getAudioEngine();
    engine.unloadDeck(deckId);
    setTrackName(null);
    setWaveform(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsPaused(false);
    setError(null);
  };

  // Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIngestFile(e.dataTransfer.files[0]);
    }
  };

  // Transport Controls
  const handleTogglePlay = async () => {
    const engine = getAudioEngine();
    if (isPlaying) {
      engine.pause(deckId);
      setCurrentTime(engine.getCurrentTime(deckId));
    } else {
      await engine.play(deckId);
    }
  };

  const handleStop = () => {
    const engine = getAudioEngine();
    engine.stop(deckId);
    setCurrentTime(0);
  };

  const handleSeek = (seconds: number) => {
    const engine = getAudioEngine();
    engine.seek(deckId, seconds);
    setCurrentTime(seconds);
  };

  // Channel Volume Control
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    getAudioEngine().setDeckVolume(deckId, newVolume);
  };

  // EQ Adjustments
  const handleEqChange = (band: keyof DeckEQ, val: number) => {
    const updated = { ...eq, [band]: val };
    setEq(updated);
    getAudioEngine().setDeckEQ(deckId, updated);
  };

  // Filter Adjustments
  const handleFilterModeChange = (type: FilterType) => {
    const defaultFreq = type === 'lowpass' ? 8000 : type === 'highpass' ? 500 : 20000;
    const updated: DeckFilter = { ...filter, type, frequency: defaultFreq };
    setFilter(updated);
    getAudioEngine().setDeckFilter(deckId, updated);
  };

  const handleFilterFreqChange = (freq: number) => {
    const updated: DeckFilter = { ...filter, frequency: freq };
    setFilter(updated);
    getAudioEngine().setDeckFilter(deckId, updated);
  };

  const handleFilterQChange = (q: number) => {
    const updated: DeckFilter = { ...filter, q };
    setFilter(updated);
    getAudioEngine().setDeckFilter(deckId, updated);
  };

  // Playback Rate Adjustment
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    getAudioEngine().setPlaybackRate(deckId, rate);
  };

  const getAudioTime = useCallback(() => {
    return getAudioEngine().getCurrentTime(deckId);
  }, [deckId]);

  const deckColorClass = deckId === 'A' ? 'sonora-dj-deck-deck-a' : 'sonora-dj-deck-deck-b';
  const isLoaded = trackName !== null;

  return (
    <article
      className={`sonora-dj-deck ${deckColorClass} ${isPlaying ? 'is-playing' : ''} ${className}`}
      aria-label={`DJ Deck ${deckId} Workstation`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
    >
      {/* 1. Top Strip: Tactile Turntable Disc & Metadata */}
      <header className="sonora-deck-top-strip">
        <div className="sonora-deck-identity">
          {/* Circular Vinyl Turntable Disc Metaphor */}
          <div
            className={`sonora-turntable-disc ${isPlaying ? 'is-rotating' : ''} ${isPaused ? 'is-paused' : ''}`}
            onClick={isLoaded ? handleTogglePlay : () => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={`Deck ${deckId} Turntable Plinth: ${isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Stopped'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (isLoaded) handleTogglePlay();
                else fileInputRef.current?.click();
              }
            }}
          >
            <div className="sonora-disc-groove sonora-disc-groove-1" aria-hidden="true" />
            <div className="sonora-disc-groove sonora-disc-groove-2" aria-hidden="true" />
            <div className="sonora-disc-spindle" aria-hidden="true" />
          </div>

          <div className="sonora-deck-text-meta">
            <div className="sonora-deck-badge-row">
              <span className="sonora-deck-badge">DECK {deckId}</span>
              <span className={`sonora-deck-state-pill ${isPlaying ? 'is-playing' : isPaused ? 'is-paused' : isLoaded ? 'is-ready' : 'is-empty'}`}>
                {isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : isLoaded ? 'READY' : 'EMPTY'}
              </span>
            </div>
            {isLoaded ? (
              <div className="sonora-deck-track-info">
                <span className="sonora-deck-track-title" title={trackName}>{trackName}</span>
                <span className="sonora-deck-timecode" aria-label={`Deck ${deckId} playback position`}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            ) : (
              <span className="sonora-deck-empty-prompt">No Track Loaded • Standby</span>
            )}
          </div>
        </div>

        <div className="sonora-deck-top-actions">
          <button
            type="button"
            className="sonora-deck-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label={`Load audio file into Deck ${deckId}`}
          >
            Load File
          </button>
          <button
            type="button"
            className="sonora-deck-btn sonora-deck-btn-demo"
            onClick={handleLoadDemoTrack}
            disabled={isLoading}
            aria-label={`Synthesize demo signal into Deck ${deckId}`}
          >
            Demo Track
          </button>
          {isLoaded && (
            <button
              type="button"
              className="sonora-deck-btn sonora-deck-btn-eject"
              onClick={handleEject}
              aria-label={`Eject track from Deck ${deckId}`}
            >
              Eject
            </button>
          )}
        </div>
      </header>

      {/* 2. Middle Section: Flowing Acoustic Waveform Ribbon or Ingestion Dropzone */}
      <section className="sonora-deck-waveform-slot" aria-label={`Deck ${deckId} Waveform Viewport`}>
        {isLoaded ? (
          <WaveformRibbon
            waveform={waveform}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            isLoading={isLoading}
            getTime={getAudioTime}
            onSeek={handleSeek}
            ariaLabel={`Deck ${deckId} Acoustic Waveform Ribbon`}
          />
        ) : (
          <div
            className={`sonora-deck-dropzone ${isDragOver ? 'is-dragover' : ''}`}
            tabIndex={0}
            role="region"
            aria-label={`Drop audio or click to ingest into Deck ${deckId}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
          >
            <span className="sonora-deck-badge">DECK {deckId} TERRAIN STANDBY</span>
            <span className="sonora-deck-empty-prompt">
              {isLoading ? 'Synthesizing / Analyzing Audio Buffer…' : 'Drop Audio File or Choose Ingestion Method'}
            </span>
            <div className="sonora-dropzone-actions">
              <button
                type="button"
                className="sonora-deck-btn sonora-deck-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Browse Audio File
              </button>
              <button
                type="button"
                className="sonora-deck-btn sonora-deck-btn-accent"
                onClick={handleLoadDemoTrack}
                disabled={isLoading}
              >
                Synthesize Demo Signal
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="sonora-deck-error" role="alert">
            {error}
          </div>
        )}
      </section>

      {/* 3. Tactile Control Bank: Transport, Volume, EQ, Filter, Pitch */}
      <footer className="sonora-deck-control-bank" aria-label={`Deck ${deckId} Tactile Controls`}>
        {/* Row 1: Primary Transport & Channel Volume Fader */}
        <div className="sonora-deck-transport-row">
          <div className="sonora-deck-transport-buttons">
            <button
              type="button"
              className={`sonora-transport-play-btn ${isPlaying ? 'is-playing' : ''}`}
              disabled={!isLoaded}
              onClick={handleTogglePlay}
              aria-label={isPlaying ? `Pause Deck ${deckId}` : `Play Deck ${deckId}`}
            >
              {isPlaying ? 'Pause ⏸' : 'Play ▶'}
            </button>
            <button
              type="button"
              className="sonora-transport-stop-btn"
              disabled={!isLoaded}
              onClick={handleStop}
              aria-label={`Stop Deck ${deckId}`}
            >
              Stop ⏹
            </button>
          </div>

          <div className="sonora-deck-volume-strip">
            <span className="sonora-control-label">Level</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="sonora-fader-slider"
              aria-label={`Deck ${deckId} Channel Volume`}
              aria-valuenow={Math.round(volume * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${Math.round(volume * 100)}%`}
            />
            <span className="sonora-fader-value">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        {/* Row 2: 3-Band Equalizer Strip (High, Mid, Low) */}
        <div className="sonora-deck-eq-strip" aria-label={`Deck ${deckId} 3-Band Equalizer`}>
          {/* High EQ */}
          <div className="sonora-eq-column">
            <div className="sonora-eq-header">
              <button
                type="button"
                className="sonora-eq-label-btn"
                onClick={() => handleEqChange('high', 0)}
                title="Click to reset High EQ to 0.0 dB"
              >
                HIGH
              </button>
              <span className="sonora-eq-val">{formatDecibels(eq.high)}</span>
            </div>
            <input
              type="range"
              min="-24"
              max="6"
              step="0.5"
              value={eq.high}
              onDoubleClick={() => handleEqChange('high', 0)}
              onChange={(e) => handleEqChange('high', parseFloat(e.target.value))}
              className="sonora-fader-slider sonora-eq-slider"
              aria-label={`Deck ${deckId} High EQ`}
              aria-valuenow={eq.high}
              aria-valuemin={-24}
              aria-valuemax={6}
              aria-valuetext={formatDecibels(eq.high)}
            />
          </div>

          {/* Mid EQ */}
          <div className="sonora-eq-column">
            <div className="sonora-eq-header">
              <button
                type="button"
                className="sonora-eq-label-btn"
                onClick={() => handleEqChange('mid', 0)}
                title="Click to reset Mid EQ to 0.0 dB"
              >
                MID
              </button>
              <span className="sonora-eq-val">{formatDecibels(eq.mid)}</span>
            </div>
            <input
              type="range"
              min="-24"
              max="6"
              step="0.5"
              value={eq.mid}
              onDoubleClick={() => handleEqChange('mid', 0)}
              onChange={(e) => handleEqChange('mid', parseFloat(e.target.value))}
              className="sonora-fader-slider sonora-eq-slider"
              aria-label={`Deck ${deckId} Mid EQ`}
              aria-valuenow={eq.mid}
              aria-valuemin={-24}
              aria-valuemax={6}
              aria-valuetext={formatDecibels(eq.mid)}
            />
          </div>

          {/* Low EQ */}
          <div className="sonora-eq-column">
            <div className="sonora-eq-header">
              <button
                type="button"
                className="sonora-eq-label-btn"
                onClick={() => handleEqChange('low', 0)}
                title="Click to reset Low EQ to 0.0 dB"
              >
                LOW
              </button>
              <span className="sonora-eq-val">{formatDecibels(eq.low)}</span>
            </div>
            <input
              type="range"
              min="-24"
              max="6"
              step="0.5"
              value={eq.low}
              onDoubleClick={() => handleEqChange('low', 0)}
              onChange={(e) => handleEqChange('low', parseFloat(e.target.value))}
              className="sonora-fader-slider sonora-eq-slider"
              aria-label={`Deck ${deckId} Low EQ`}
              aria-valuenow={eq.low}
              aria-valuemin={-24}
              aria-valuemax={6}
              aria-valuetext={formatDecibels(eq.low)}
            />
          </div>
        </div>

        {/* Row 3: Sound-Color Filter & Playback Rate Strip */}
        <div className="sonora-deck-fx-row">
          {/* Sound-Color Filter */}
          <div className="sonora-filter-bank" aria-label={`Deck ${deckId} Sound-Color Filter`}>
            <div className="sonora-filter-modes">
              <button
                type="button"
                className={`sonora-filter-mode-btn ${filter.type === 'bypass' ? 'active' : ''}`}
                onClick={() => handleFilterModeChange('bypass')}
                aria-pressed={filter.type === 'bypass'}
              >
                Bypass
              </button>
              <button
                type="button"
                className={`sonora-filter-mode-btn ${filter.type === 'lowpass' ? 'active' : ''}`}
                onClick={() => handleFilterModeChange('lowpass')}
                aria-pressed={filter.type === 'lowpass'}
              >
                Lowpass
              </button>
              <button
                type="button"
                className={`sonora-filter-mode-btn ${filter.type === 'highpass' ? 'active' : ''}`}
                onClick={() => handleFilterModeChange('highpass')}
                aria-pressed={filter.type === 'highpass'}
              >
                Highpass
              </button>
            </div>
            {filter.type !== 'bypass' && (
              <div className="sonora-filter-controls">
                <div className="sonora-filter-param">
                  <div className="sonora-pitch-header">
                    <span className="sonora-control-label">Cutoff</span>
                    <button
                      type="button"
                      className="sonora-eq-label-btn"
                      onClick={() => handleFilterFreqChange(filter.type === 'lowpass' ? 20000 : 20)}
                      title={`Reset Cutoff for ${filter.type}`}
                      aria-label={`Reset Deck ${deckId} Cutoff frequency`}
                    >
                      {formatFrequency(filter.frequency)}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="20000"
                    step="20"
                    value={filter.frequency}
                    onDoubleClick={() => handleFilterFreqChange(filter.type === 'lowpass' ? 20000 : 20)}
                    onChange={(e) => handleFilterFreqChange(parseFloat(e.target.value))}
                    className="sonora-fader-slider"
                    aria-label={`Deck ${deckId} Filter Cutoff Frequency`}
                    aria-valuenow={filter.frequency}
                    aria-valuemin={20}
                    aria-valuemax={20000}
                    aria-valuetext={formatFrequency(filter.frequency)}
                  />
                </div>
                <div className="sonora-filter-param">
                  <div className="sonora-pitch-header">
                    <span className="sonora-control-label">Resonance</span>
                    <button
                      type="button"
                      className="sonora-eq-label-btn"
                      onClick={() => handleFilterQChange(1.0)}
                      title="Reset Resonance Q to 1.0"
                      aria-label={`Reset Deck ${deckId} Resonance Q to 1.0`}
                    >
                      Q {filter.q.toFixed(1)}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="18.0"
                    step="0.1"
                    value={filter.q}
                    onDoubleClick={() => handleFilterQChange(1.0)}
                    onChange={(e) => handleFilterQChange(parseFloat(e.target.value))}
                    className="sonora-fader-slider"
                    aria-label={`Deck ${deckId} Filter Resonance Q`}
                    aria-valuenow={filter.q}
                    aria-valuemin={0.1}
                    aria-valuemax={18.0}
                    aria-valuetext={`Q ${filter.q.toFixed(1)}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Playback Rate / Pitch Slider */}
          <div className="sonora-pitch-bank" aria-label={`Deck ${deckId} Playback Rate`}>
            <div className="sonora-pitch-header">
              <span className="sonora-control-label">Pitch</span>
              <button
                type="button"
                className="sonora-crossfader-reset-btn"
                onClick={() => handlePlaybackRateChange(1.0)}
                title="Reset to 1.00x default"
                aria-label={`Reset Deck ${deckId} pitch to 1.00x`}
              >
                {formatPlaybackRate(playbackRate).text} ({formatPlaybackRate(playbackRate).delta})
              </button>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.01"
              value={playbackRate}
              onDoubleClick={() => handlePlaybackRateChange(1.0)}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              className="sonora-fader-slider"
              aria-label={`Deck ${deckId} Playback Rate`}
              aria-valuenow={Math.round(playbackRate * 100)}
              aria-valuemin={50}
              aria-valuemax={150}
              aria-valuetext={formatPlaybackRate(playbackRate).text}
            />
          </div>
        </div>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="sonora-deck-hidden-input"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleIngestFile(e.target.files[0]);
          }
        }}
      />
    </article>
  );
};
