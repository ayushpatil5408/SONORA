/**
 * SONORA Shared Mixer Controls
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3.5
 * 
 * Reusable Central Mixer Console coordinating:
 * - Audio Telemetry Live Beacon (AUDIO ● LIVE / AUDIO ● TAP TO ENABLE)
 * - Environment-specific acoustic singularity / core slot
 * - Channel A & Channel B Activity Meters
 * - Channel Trim Knobs (Gain A and Gain B)
 * - Vertical Channel Faders (Deck A & Deck B volume)
 * - Channel Cue (PFL) Monitoring Buttons (CUE A & CUE B)
 * - Master & Booth Output Volume Faders
 * - Headphone Monitoring Bus (Headphone Volume & Cue/Master Mix)
 * - Equal-Power Crossfader Bridge with real-time audio gain coupling
 * - Dual-Deck Harmonic Convergence Beacon
 */

import React from 'react';
import { SharedMixerState, DJEnvironment } from '../types';
import { formatCrossfaderPosition } from '../../../audio/djMath';

export interface SharedMixerControlsProps {
  mixer: SharedMixerState;
  variant: DJEnvironment;
  coreSlot?: React.ReactNode;
  className?: string;
}

export const SharedMixerControls: React.FC<SharedMixerControlsProps> = ({
  mixer,
  variant,
  coreSlot,
  className = '',
}) => {
  const masterPercent = Math.round(mixer.masterVolume * 100);
  const boothPercent = Math.round(mixer.boothVolume * 100);
  const hpPercent = Math.round(mixer.headphoneVolume * 100);
  const cueMixPercent = Math.round(mixer.cueMasterMix * 100);
  const isDualPlaying = mixer.deckAIsPlaying && mixer.deckBIsPlaying;

  return (
    <aside
      className={`sonora-env-mixer env-${variant} ${className}`}
      aria-label="Central Audio Mixer Console"
    >
      {/* 1. Audio Telemetry Live Beacon */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '4px' }}>
        <button
          type="button"
          className={`sonora-audio-telemetry-beacon ${mixer.audioLive ? 'is-live' : 'is-suspended'}`}
          onClick={mixer.onUnlockAudio}
          title={
            mixer.audioLive
              ? 'Web Audio Engine active & running. Click to re-verify.'
              : 'Web AudioContext is suspended. Click to enable audio output.'
          }
          aria-label={`Audio Engine Status: ${mixer.audioLive ? 'Live' : 'Suspended, Tap to Enable'}`}
        >
          <span className="sonora-beacon-dot" />
          <span>{mixer.audioLive ? 'AUDIO ● LIVE' : 'AUDIO ● TAP TO ENABLE'}</span>
        </button>
      </div>

      {/* 2. Environment-Specific Singularity / Core Slot */}
      {coreSlot}

      {/* 3. Master & Booth Output Strip */}
      <section className="sonora-env-master-strip" aria-label="Master & Booth Output Controls" style={{ marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span className="sonora-env-param-label" style={{ color: 'var(--color-accent-iris)' }}>
            Master
          </span>
          <span className="sonora-env-param-val">{masterPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mixer.masterVolume}
          onChange={(e) => mixer.onMasterVolumeChange(parseFloat(e.target.value))}
          className="sonora-env-master-slider"
          aria-label="Master Output Volume"
          aria-valuenow={masterPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${masterPercent}%`}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
          <span className="sonora-env-param-label" style={{ color: 'var(--color-text-tertiary)' }}>
            Booth
          </span>
          <span className="sonora-env-param-val">{boothPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mixer.boothVolume}
          onChange={(e) => mixer.onBoothVolumeChange(parseFloat(e.target.value))}
          className="sonora-env-master-slider"
          aria-label="Booth Output Volume"
          aria-valuenow={boothPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${boothPercent}%`}
        />
      </section>

      {/* 4. Channel Convergence Meters with Trim & CUE (PFL) Buttons */}
      <section className="sonora-env-mixer-meters" aria-label="Channel Meters and PFL Monitoring">
        {/* Channel A Column */}
        <div className="sonora-env-meter-column">
          <span className="sonora-env-deck-badge" style={{ color: 'var(--color-accent-cyan)' }}>
            CH A
          </span>
          <div className="sonora-env-meter-track" aria-hidden="true">
            <div
              className="sonora-env-meter-fill ch-a"
              style={{
                height: mixer.deckAIsPlaying ? `${Math.max(6, Math.round(mixer.deckAVolume * 100))}%` : '4%',
                opacity: mixer.deckAIsPlaying ? 1 : 0.25,
              }}
            />
          </div>
          <button
            type="button"
            className={`sonora-pro-btn ${mixer.cueA ? 'is-active' : ''}`}
            style={{ fontSize: '0.52rem', padding: '2px 5px', marginTop: '2px' }}
            onClick={() => mixer.onCueAChange(!mixer.cueA)}
            title="Headphone Cue Channel A (PFL)"
            aria-label={`Headphone Cue Channel A ${mixer.cueA ? 'Active' : 'Inactive'}`}
          >
            CUE A
          </button>
        </div>

        {/* Vertical Channel Faders Section */}
        <div className="sonora-mixer-channels-faders" style={{ margin: '0 4px', padding: '4px' }}>
          <div className="sonora-channel-strip">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#00e5ff' }}>
              {Math.round(mixer.deckAVolume * 100)}%
            </span>
            <div className="sonora-vertical-fader-wrapper">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixer.deckAVolume}
                onChange={(e) => mixer.onChannelFaderAChange(parseFloat(e.target.value))}
                className="sonora-vertical-fader"
                aria-label="Channel A Level Fader"
              />
            </div>
          </div>

          <div className="sonora-channel-strip">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#ffb300' }}>
              {Math.round(mixer.deckBVolume * 100)}%
            </span>
            <div className="sonora-vertical-fader-wrapper">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixer.deckBVolume}
                onChange={(e) => mixer.onChannelFaderBChange(parseFloat(e.target.value))}
                className="sonora-vertical-fader"
                aria-label="Channel B Level Fader"
              />
            </div>
          </div>
        </div>

        {/* Channel B Column */}
        <div className="sonora-env-meter-column">
          <span className="sonora-env-deck-badge" style={{ color: 'var(--color-accent-amber)' }}>
            CH B
          </span>
          <div className="sonora-env-meter-track" aria-hidden="true">
            <div
              className="sonora-env-meter-fill ch-b"
              style={{
                height: mixer.deckBIsPlaying ? `${Math.max(6, Math.round(mixer.deckBVolume * 100))}%` : '4%',
                opacity: mixer.deckBIsPlaying ? 1 : 0.25,
              }}
            />
          </div>
          <button
            type="button"
            className={`sonora-pro-btn ${mixer.cueB ? 'is-active-amber' : ''}`}
            style={{ fontSize: '0.52rem', padding: '2px 5px', marginTop: '2px' }}
            onClick={() => mixer.onCueBChange(!mixer.cueB)}
            title="Headphone Cue Channel B (PFL)"
            aria-label={`Headphone Cue Channel B ${mixer.cueB ? 'Active' : 'Inactive'}`}
          >
            CUE B
          </button>
        </div>
      </section>

      {/* 5. Headphone Monitoring Bus Controls */}
      <section className="sonora-headphone-monitoring-bank" aria-label="Headphone Cue Monitoring">
        <div className="sonora-pfl-row">
          <span className="sonora-env-param-label">HEADPHONES</span>
          <span className="sonora-env-param-val">{hpPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mixer.headphoneVolume}
          onChange={(e) => mixer.onHeadphoneVolumeChange(parseFloat(e.target.value))}
          className="sonora-fader-slider"
          aria-label="Headphone Output Level"
        />

        <div className="sonora-pfl-row" style={{ marginTop: '2px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--color-text-tertiary)' }}>
            CUE / MASTER MIX
          </span>
          <span className="sonora-env-param-val">
            {cueMixPercent === 0 ? 'CUE' : cueMixPercent === 100 ? 'MASTER' : `${cueMixPercent}% MST`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mixer.cueMasterMix}
          onChange={(e) => mixer.onCueMasterMixChange(parseFloat(e.target.value))}
          className="sonora-fader-slider"
          aria-label="Headphone Cue Master Mix"
        />
      </section>

      {/* 6. Equal-Power Crossfader Bridge */}
      <section className="sonora-env-crossfader-section" aria-label="Equal-Power Crossfader Bridge">
        <div className="sonora-env-crossfader-telemetry">
          <span className="sonora-env-crossfader-pos-text">
            {formatCrossfaderPosition(mixer.crossfaderPosition)}
          </span>
          <button
            type="button"
            className="sonora-env-crossfader-center-btn"
            onClick={() => mixer.onCrossfaderChange(0.0)}
            title="Snap Crossfader to Center (0.0)"
            aria-label="Snap Crossfader to Center"
          >
            Snap Center
          </button>
        </div>

        <div className="sonora-env-crossfader-track-wrapper">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={mixer.crossfaderPosition}
            onChange={(e) => mixer.onCrossfaderChange(parseFloat(e.target.value))}
            className="sonora-env-crossfader-slider"
            aria-label="Equal-Power Crossfader"
            aria-valuenow={Math.round(mixer.crossfaderPosition * 100)}
            aria-valuemin={-100}
            aria-valuemax={100}
            aria-valuetext={formatCrossfaderPosition(mixer.crossfaderPosition)}
          />
        </div>

        <div className="sonora-env-crossfader-readout-row" aria-hidden="true">
          <span>A: {mixer.gainA.toFixed(2)}</span>
          <span>Equal Power</span>
          <span>B: {mixer.gainB.toFixed(2)}</span>
        </div>
      </section>

      {/* 7. Dual Playback Harmonic Convergence Beacon */}
      {isDualPlaying && (
        <div className="sonora-mixer-crossfade-badge" role="status" aria-live="polite">
          <span className="sonora-mixer-pulse-dot" aria-hidden="true" />
          <span>Harmonic Convergence Active</span>
          {mixer.harmonicMatch && mixer.harmonicMatch.relation !== 'unknown' && (
            <span style={{ marginLeft: '6px', opacity: 0.85, fontSize: '0.68rem', letterSpacing: '0.04em' }}>
              • {mixer.harmonicMatch.label}
            </span>
          )}
        </div>
      )}
    </aside>
  );
};
