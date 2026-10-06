/**
 * SONORA Shared Deck Controls
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3
 * 
 * Reusable, fully discoverable and accessible control surface for Deck A and Deck B.
 * Guarantees that all 3 environments expose 100% of underlying DJ controls:
 * - File Ingestion & Demo Signal Synthesis
 * - Primary Transport (Play, Pause, Stop, Cue, Seek)
 * - Channel Level / Volume Fader
 * - 3-Band Equalizer (High, Mid, Low with zero-reset)
 * - Sound-Color Filter (Bypass, Lowpass, Highpass, Cutoff, Resonance Q)
 * - Playback Rate / Pitch Fader (0.5x - 1.5x with 1.00x reset)
 */

import React, { useRef, useState, useCallback } from 'react';
import { FilterType, PitchRange } from '../../../audio/types';
import { formatFrequency, formatDecibels, formatPlaybackRate } from '../../../audio/djMath';
import { WaveformRibbon } from '../../WaveformRibbon';
import { SharedDeckState, DJEnvironment } from '../types';
import { getAudioEngine } from '../../../audio/AudioEngine';
import { PerformancePads } from '../PerformancePads';

export interface SharedDeckControlsProps {
  deck: SharedDeckState;
  variant: DJEnvironment;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const SharedDeckControls: React.FC<SharedDeckControlsProps> = ({
  deck,
  variant,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const getAudioTime = useCallback(() => {
    return getAudioEngine().getCurrentTime(deck.deckId);
  }, [deck.deckId]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      deck.onIngestFile(e.dataTransfer.files[0]);
    }
  };

  const deckColorClass = deck.deckId === 'A' ? 'is-deck-a' : 'is-deck-b';
  const isLoaded = deck.isLoaded && deck.trackName !== null;

  return (
    <div className={`sonora-shared-deck-controls ${deckColorClass} env-${variant} ${className}`}>
      {/* 1. Header Metadata & File Ingestion Strip */}
      <header className="sonora-env-deck-header">
        <div className="sonora-env-deck-meta-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="sonora-env-deck-badge">DECK {deck.deckId}</span>
            <span
              className={`sonora-deck-state-pill ${
                deck.isPlaying ? 'is-playing' : deck.isPaused ? 'is-paused' : isLoaded ? 'is-ready' : 'is-empty'
              }`}
            >
              {deck.isPlaying ? 'PLAYING' : deck.isPaused ? 'PAUSED' : isLoaded ? 'READY' : 'EMPTY'}
            </span>
            {deck.isMasterDeck && (
              <span className="sonora-pro-btn is-active" style={{ fontSize: '0.52rem', padding: '1px 5px' }}>
                MASTER
              </span>
            )}
          </div>

          <h3 className="sonora-env-deck-title" title={deck.trackName || 'Empty Standby'}>
            {deck.trackName || 'No Track Loaded'}
          </h3>
          {deck.artistName && (
            <p className="sonora-env-deck-artist">{deck.artistName}</p>
          )}

          <div className="sonora-env-deck-meta-telemetry">
            <span className="sonora-env-bpm-badge">
              {deck.analysis?.bpm
                ? `${deck.analysis.bpm.bpm} BPM`
                : (deck.bpm ? `${deck.bpm} BPM` : '120 BPM')}
            </span>
            <span className="sonora-env-key-badge">
              {deck.analysis?.key
                ? `${deck.analysis.key.camelot} / ${deck.analysis.key.key}`
                : (deck.key || '8A / Am')}
            </span>
            {deck.analysis?.energy && (
              <span className="sonora-env-bpm-badge" style={{ borderColor: 'rgba(124, 77, 255, 0.4)' }}>
                {Math.round(deck.analysis.energy.average * 100)}% Energy
              </span>
            )}
            <span className="sonora-env-timecode" aria-label={`Deck ${deck.deckId} playback position`}>
              {formatTime(deck.currentTime)} / {formatTime(deck.duration)}
            </span>
          </div>
        </div>

        <div className="sonora-env-deck-meta-right">
          <button
            type="button"
            className="sonora-env-ingest-trigger"
            onClick={() => fileInputRef.current?.click()}
            aria-label={`Load audio file into Deck ${deck.deckId}`}
            title="Browse local audio file"
          >
            Load File
          </button>
          <button
            type="button"
            className="sonora-env-ingest-trigger"
            onClick={deck.onGenerateDemo}
            disabled={deck.isLoading}
            aria-label={`Synthesize demo signal into Deck ${deck.deckId}`}
            title="Synthesize 120 BPM demo audio buffer"
          >
            Demo Track
          </button>
        </div>
      </header>

      {/* 2. Professional DJ Waveform Ribbon (Beat Grid, Hot Cues, Loop Region) */}
      <section className="sonora-deck-waveform-slot" aria-label={`Deck ${deck.deckId} Waveform Viewport`}>
        {isLoaded ? (
          <WaveformRibbon
            waveform={deck.waveform}
            currentTime={deck.currentTime}
            duration={deck.duration}
            isPlaying={deck.isPlaying}
            isLoading={deck.isLoading}
            bpm={deck.bpm}
            cueTime={deck.cueTime}
            hotCues={deck.hotCues}
            loop={deck.loop}
            analysis={deck.analysis}
            getTime={getAudioTime}
            onSeek={deck.onSeek}
            ariaLabel={`Deck ${deck.deckId} Acoustic Waveform Ribbon`}
          />
        ) : (
          <div
            className={`sonora-deck-dropzone ${isDragOver ? 'is-dragover' : ''}`}
            tabIndex={0}
            role="region"
            aria-label={`Drop audio or click to ingest into Deck ${deck.deckId}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
          >
            <span className="sonora-deck-badge">DECK {deck.deckId} TERRAIN STANDBY</span>
            <span className="sonora-deck-empty-prompt">
              {deck.isLoading ? 'Synthesizing Audio Buffer…' : 'Drop Audio File or Load Signal'}
            </span>
            <div className="sonora-dropzone-actions">
              <button
                type="button"
                className="sonora-deck-btn sonora-deck-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={deck.isLoading}
              >
                Browse Audio File
              </button>
              <button
                type="button"
                className="sonora-deck-btn sonora-deck-btn-accent"
                onClick={deck.onGenerateDemo}
                disabled={deck.isLoading}
              >
                Synthesize Demo
              </button>
            </div>
          </div>
        )}

        {deck.error && (
          <div className="sonora-deck-error" role="alert">
            {deck.error}
          </div>
        )}
      </section>

      {/* 3. Primary Performance Transport & Sync / Quantize Strip */}
      <div className="sonora-env-transport-row" aria-label={`Deck ${deck.deckId} Primary Transport`}>
        <button
          type="button"
          className="sonora-env-cue-btn"
          disabled={!isLoaded}
          onClick={deck.onCue}
          aria-label={`Cue Deck ${deck.deckId} (return or set cue)`}
          title="CUE: Return to cue point (or set if paused)"
        >
          CUE
        </button>
        <button
          type="button"
          className={`sonora-env-play-btn ${deck.isPlaying ? 'is-active' : ''}`}
          disabled={!isLoaded}
          onClick={deck.isPlaying ? deck.onPause : deck.onPlay}
          aria-label={deck.isPlaying ? `Pause Deck ${deck.deckId}` : `Play Deck ${deck.deckId}`}
          title={deck.isPlaying ? 'Pause playback' : 'Start playback'}
        >
          {deck.isPlaying ? 'Pause ⏸' : 'Play ▶'}
        </button>
        <button
          type="button"
          className="sonora-env-stop-btn"
          disabled={!isLoaded}
          onClick={deck.onStop}
          aria-label={`Stop Deck ${deck.deckId}`}
          title="Stop playback and rewind to start"
        >
          Stop ⏹
        </button>

        {/* Sync & Quantize & Slip Actions */}
        <button
          type="button"
          className={`sonora-pro-btn ${deck.sync ? 'is-active' : ''}`}
          onClick={deck.onSyncToggle}
          title="Sync tempo and phase to Master deck"
          aria-label={`Deck ${deck.deckId} Beat Sync ${deck.sync ? 'Active' : 'Inactive'}`}
        >
          SYNC
        </button>
        <button
          type="button"
          className={`sonora-pro-btn ${deck.quantize ? 'is-active' : ''}`}
          onClick={deck.onQuantizeToggle}
          title="Quantize beat alignment"
          aria-label={`Deck ${deck.deckId} Quantize ${deck.quantize ? 'Enabled' : 'Disabled'}`}
        >
          QUANT
        </button>
        <button
          type="button"
          className={`sonora-pro-btn ${deck.slip ? 'is-active' : ''}`}
          onClick={deck.onSlipToggle}
          title="Slip Mode (preserves musical timeline underneath scratches/loops)"
          aria-label={`Deck ${deck.deckId} Slip Mode ${deck.slip ? 'Active' : 'Inactive'}`}
        >
          SLIP
        </button>
      </div>

      {/* 4. Hardware Looping & Beat Jump Strip */}
      <div className="sonora-deck-secondary-strip" aria-label={`Deck ${deck.deckId} Loop & Beat Jump Controls`}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--color-text-tertiary)' }}>
            LOOP:
          </span>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={deck.onLoopIn}
            title="Set Loop IN point at current playhead"
          >
            IN
          </button>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={deck.onLoopOut}
            title="Set Loop OUT point and engage loop"
          >
            OUT
          </button>
          <button
            type="button"
            className={`sonora-pro-btn ${deck.loop.enabled ? 'is-active-amber' : ''}`}
            onClick={deck.onLoopToggle}
            title="Reloop or Exit loop"
          >
            {deck.loop.enabled ? 'EXIT ⟲' : 'RELOOP'}
          </button>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={() => deck.onAutoLoop(Math.max(0.125, deck.loop.lengthBeats * 0.5))}
            title="Halve loop length (1/2x)"
          >
            1/2x
          </button>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={() => deck.onAutoLoop(Math.min(32, deck.loop.lengthBeats * 2))}
            title="Double loop length (2x)"
          >
            2x
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--color-text-tertiary)' }}>
            JUMP:
          </span>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={() => deck.onBeatJump(-4)}
            title="Beat jump backward 4 beats"
          >
            -4
          </button>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={() => deck.onBeatJump(-1)}
            title="Beat jump backward 1 beat"
          >
            -1
          </button>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={() => deck.onBeatJump(1)}
            title="Beat jump forward 1 beat"
          >
            +1
          </button>
          <button
            type="button"
            className="sonora-pro-btn"
            onClick={() => deck.onBeatJump(4)}
            title="Beat jump forward 4 beats"
          >
            +4
          </button>
        </div>
      </div>

      {/* 5. Performance Pads (Hot Cue, Auto Loop, Beat Jump, Pad FX) */}
      <PerformancePads
        deckId={deck.deckId}
        padMode={deck.activePadMode}
        hotCues={deck.hotCues}
        loop={deck.loop}
        fx={deck.fx}
        variant={variant}
        onPadModeChange={deck.onPadModeChange}
        onHotCueTrigger={deck.onHotCueTrigger}
        onHotCueSet={deck.onHotCueSet}
        onHotCueDelete={deck.onHotCueDelete}
        onAutoLoop={deck.onAutoLoop}
        onBeatJump={deck.onBeatJump}
        onFXToggle={deck.onFXToggle}
      />

      {/* 6. Tactile Parameter Sliders Bank (Trim, Level, High EQ, Mid EQ, Low EQ) */}
      <div className="sonora-env-parameters-grid" aria-label={`Deck ${deck.deckId} Parameters`}>
        {/* Channel Trim Gain */}
        <div className="sonora-env-param-col">
          <button
            type="button"
            className="sonora-env-param-label"
            onClick={() => deck.onTrimChange(1.0)}
            title="Reset Channel Trim to 1.00x"
          >
            Trim
          </button>
          <span className="sonora-env-param-val">{deck.trim.toFixed(2)}x</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.02"
            value={deck.trim}
            onDoubleClick={() => deck.onTrimChange(1.0)}
            onChange={(e) => deck.onTrimChange(parseFloat(e.target.value))}
            className="sonora-env-slider"
            aria-label={`Deck ${deck.deckId} Channel Trim`}
          />
        </div>

        {/* Channel Level Volume */}
        <div className="sonora-env-param-col">
          <button
            type="button"
            className="sonora-env-param-label"
            onClick={() => deck.onVolumeChange(1.0)}
            title="Reset Channel Volume to 100%"
          >
            Level
          </button>
          <span className="sonora-env-param-val">{Math.round(deck.volume * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={deck.volume}
            onChange={(e) => deck.onVolumeChange(parseFloat(e.target.value))}
            className="sonora-env-slider"
            aria-label={`Deck ${deck.deckId} Level Volume`}
            aria-valuenow={Math.round(deck.volume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${Math.round(deck.volume * 100)}%`}
          />
        </div>

        {/* High EQ */}
        <div className="sonora-env-param-col">
          <button
            type="button"
            className="sonora-env-param-label"
            onClick={() => deck.onEqChange('high', 0)}
            title="Double-click or click to reset High EQ to 0 dB"
          >
            High
          </button>
          <span className="sonora-env-param-val">{formatDecibels(deck.eq.high)}</span>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.5"
            value={deck.eq.high}
            onDoubleClick={() => deck.onEqChange('high', 0)}
            onChange={(e) => deck.onEqChange('high', parseFloat(e.target.value))}
            className="sonora-env-slider"
            aria-label={`Deck ${deck.deckId} High EQ`}
            aria-valuenow={deck.eq.high}
            aria-valuemin={-24}
            aria-valuemax={6}
            aria-valuetext={formatDecibels(deck.eq.high)}
          />
        </div>

        {/* Mid EQ */}
        <div className="sonora-env-param-col">
          <button
            type="button"
            className="sonora-env-param-label"
            onClick={() => deck.onEqChange('mid', 0)}
            title="Double-click or click to reset Mid EQ to 0 dB"
          >
            Mid
          </button>
          <span className="sonora-env-param-val">{formatDecibels(deck.eq.mid)}</span>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.5"
            value={deck.eq.mid}
            onDoubleClick={() => deck.onEqChange('mid', 0)}
            onChange={(e) => deck.onEqChange('mid', parseFloat(e.target.value))}
            className="sonora-env-slider"
            aria-label={`Deck ${deck.deckId} Mid EQ`}
            aria-valuenow={deck.eq.mid}
            aria-valuemin={-24}
            aria-valuemax={6}
            aria-valuetext={formatDecibels(deck.eq.mid)}
          />
        </div>

        {/* Low EQ */}
        <div className="sonora-env-param-col">
          <button
            type="button"
            className="sonora-env-param-label"
            onClick={() => deck.onEqChange('low', 0)}
            title="Double-click or click to reset Low EQ to 0 dB"
          >
            Low
          </button>
          <span className="sonora-env-param-val">{formatDecibels(deck.eq.low)}</span>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.5"
            value={deck.eq.low}
            onDoubleClick={() => deck.onEqChange('low', 0)}
            onChange={(e) => deck.onEqChange('low', parseFloat(e.target.value))}
            className="sonora-env-slider"
            aria-label={`Deck ${deck.deckId} Low EQ`}
            aria-valuenow={deck.eq.low}
            aria-valuemin={-24}
            aria-valuemax={6}
            aria-valuetext={formatDecibels(deck.eq.low)}
          />
        </div>
      </div>

      {/* 5. Sound-Color Filter & Playback Rate Pitch Row */}
      <div className="sonora-deck-fx-row" style={{ marginTop: 'var(--space-2)' }}>
        {/* Filter Bank */}
        <div className="sonora-filter-bank" aria-label={`Deck ${deck.deckId} Sound-Color Filter`}>
          <div className="sonora-filter-modes">
            {(['bypass', 'lowpass', 'highpass'] as FilterType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`sonora-filter-mode-btn ${deck.filter.type === type ? 'active' : ''}`}
                onClick={() => {
                  const defaultFreq = type === 'lowpass' ? 8000 : type === 'highpass' ? 500 : 20000;
                  deck.onFilterChange(type, defaultFreq, deck.filter.q);
                }}
                aria-pressed={deck.filter.type === type}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {deck.filter.type !== 'bypass' && (
            <div className="sonora-filter-controls">
              <div className="sonora-filter-param">
                <div className="sonora-pitch-header">
                  <span className="sonora-control-label">Cutoff</span>
                  <button
                    type="button"
                    className="sonora-eq-label-btn"
                    onClick={() =>
                      deck.onFilterChange(
                        deck.filter.type,
                        deck.filter.type === 'lowpass' ? 20000 : 20,
                        deck.filter.q
                      )
                    }
                    title="Reset Cutoff"
                  >
                    {formatFrequency(deck.filter.frequency)}
                  </button>
                </div>
                <input
                  type="range"
                  min="20"
                  max="20000"
                  step="20"
                  value={deck.filter.frequency}
                  onChange={(e) =>
                    deck.onFilterChange(deck.filter.type, parseFloat(e.target.value), deck.filter.q)
                  }
                  className="sonora-fader-slider"
                  aria-label={`Deck ${deck.deckId} Filter Cutoff Frequency`}
                />
              </div>

              <div className="sonora-filter-param">
                <div className="sonora-pitch-header">
                  <span className="sonora-control-label">Resonance</span>
                  <button
                    type="button"
                    className="sonora-eq-label-btn"
                    onClick={() => deck.onFilterChange(deck.filter.type, deck.filter.frequency, 1.0)}
                    title="Reset Resonance Q to 1.0"
                  >
                    Q {deck.filter.q.toFixed(1)}
                  </button>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="18.0"
                  step="0.1"
                  value={deck.filter.q}
                  onChange={(e) =>
                    deck.onFilterChange(deck.filter.type, deck.filter.frequency, parseFloat(e.target.value))
                  }
                  className="sonora-fader-slider"
                  aria-label={`Deck ${deck.deckId} Filter Resonance Q`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Professional Pitch / Playback Rate Bank with Range & Key Lock */}
        <div className="sonora-pitch-bank" aria-label={`Deck ${deck.deckId} Pitch / Playback Rate`}>
          <div className="sonora-pitch-header">
            <span className="sonora-control-label">Pitch</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                type="button"
                className={`sonora-pro-btn ${deck.keyLock ? 'is-active' : ''}`}
                style={{ fontSize: '0.52rem', padding: '1px 5px' }}
                onClick={deck.onKeyLockToggle}
                title="Key Lock / Master Tempo (preserve musical key)"
                aria-label={`Deck ${deck.deckId} Key Lock ${deck.keyLock ? 'Active' : 'Inactive'}`}
              >
                KEY LOCK
              </button>
              <button
                type="button"
                className="sonora-crossfader-reset-btn"
                onClick={deck.onTempoReset}
                title="Reset Pitch to 1.00x (0%)"
              >
                RESET 0%
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
            <span className="sonora-env-param-val">
              {formatPlaybackRate(deck.playbackRate).text} ({formatPlaybackRate(deck.playbackRate).delta})
            </span>
            {/* Pitch Range Selector */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {([0.06, 0.10, 0.16, 1.00] as PitchRange[]).map((rng) => (
                <button
                  key={rng}
                  type="button"
                  className={`sonora-pro-btn ${deck.pitchRange === rng ? 'is-active' : ''}`}
                  style={{ fontSize: '0.5rem', padding: '1px 4px' }}
                  onClick={() => deck.onPitchRangeChange(rng)}
                  title={`Pitch range ±${Math.round(rng * 100)}%`}
                >
                  ±{Math.round(rng * 100)}%
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min={1 - deck.pitchRange}
            max={1 + deck.pitchRange}
            step={deck.pitchRange > 0.16 ? '0.01' : '0.001'}
            value={deck.playbackRate}
            onDoubleClick={deck.onTempoReset}
            onChange={(e) => deck.onPlaybackRateChange(parseFloat(e.target.value))}
            className="sonora-fader-slider"
            aria-label={`Deck ${deck.deckId} Playback Rate`}
          />
        </div>
      </div>

      {/* Hidden File Input for Local Audio Ingestion */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            deck.onIngestFile(e.target.files[0]);
          }
        }}
        aria-hidden="true"
      />
    </div>
  );
};
