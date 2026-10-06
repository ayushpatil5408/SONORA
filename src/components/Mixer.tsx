/**
 * SONORA Central Mixer Component
 * Authoritative Reference: PRD.md, DESIGN_SYSTEM.md & PRODUCT_ARCHITECTURE.md
 * 
 * Gravitational Center Node: Spatial console mediating audio power between
 * Deck A (Cyan) and Deck B (Amber) with an equal-power crossfader bridge.
 */

import React from 'react';
import { formatCrossfaderPosition } from '../audio/djMath';
import './Mixer.css';

export interface MixerProps {
  crossfaderPosition: number; // -1.0 to +1.0
  gainA: number; // 0.0 to 1.0
  gainB: number; // 0.0 to 1.0
  masterVolume: number; // 0.0 to 1.0
  deckAVolume: number; // 0.0 to 1.0
  deckBVolume: number; // 0.0 to 1.0
  deckAIsPlaying: boolean;
  deckBIsPlaying: boolean;
  onCrossfaderChange: (position: number) => void;
  onMasterVolumeChange: (volume: number) => void;
  className?: string;
}

export const Mixer: React.FC<MixerProps> = ({
  crossfaderPosition,
  gainA,
  gainB,
  masterVolume,
  deckAVolume,
  deckBVolume,
  deckAIsPlaying,
  deckBIsPlaying,
  onCrossfaderChange,
  onMasterVolumeChange,
  className = '',
}) => {
  const masterPercent = Math.round(masterVolume * 100);

  return (
    <aside className={`sonora-mixer ${className}`} aria-label="Central Audio Mixer Console">
      {/* 1. Master Output Stage */}
      <section className="sonora-mixer-master" aria-label="Master Output Gain">
        <div className="sonora-mixer-section-label">
          <span className="sonora-mixer-beacon" aria-hidden="true" />
          <span>Master</span>
        </div>
        <div className="sonora-mixer-fader-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="sonora-fader-slider"
            aria-label="Master Output Volume"
            aria-valuenow={masterPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${masterPercent}%`}
          />
          <span className="sonora-fader-value">{masterPercent}%</span>
        </div>
      </section>

      {/* 2. Channel Convergence Meters (Deck A & B Activity) */}
      <section className="sonora-mixer-channels" aria-label="Channel Convergence Indicators">
        {/* Deck A Channel Telemetry */}
        <div className="sonora-mixer-channel-node sonora-mixer-ch-a">
          <span className="sonora-mixer-ch-tag">DECK A</span>
          <div className="sonora-mixer-meter-vessel" aria-hidden="true">
            <div
              className="sonora-mixer-meter-fill"
              style={{
                height: deckAIsPlaying ? `${Math.round(deckAVolume * 100)}%` : '4%',
                opacity: deckAIsPlaying ? 1 : 0.25,
              }}
            />
          </div>
          <span className="sonora-mixer-ch-telemetry">{Math.round(deckAVolume * 100)}%</span>
        </div>

        {/* Deck B Channel Telemetry */}
        <div className="sonora-mixer-channel-node sonora-mixer-ch-b">
          <span className="sonora-mixer-ch-tag">DECK B</span>
          <div className="sonora-mixer-meter-vessel" aria-hidden="true">
            <div
              className="sonora-mixer-meter-fill"
              style={{
                height: deckBIsPlaying ? `${Math.round(deckBVolume * 100)}%` : '4%',
                opacity: deckBIsPlaying ? 1 : 0.25,
              }}
            />
          </div>
          <span className="sonora-mixer-ch-telemetry">{Math.round(deckBVolume * 100)}%</span>
        </div>
      </section>

      {/* 3. Equal-Power Crossfader Bridge */}
      <section className="sonora-mixer-crossfader-section" aria-label="Equal-Power Crossfader Bridge">
        <div className="sonora-crossfader-telemetry">
          <span className="sonora-crossfader-pos-text">
            {formatCrossfaderPosition(crossfaderPosition)}
          </span>
          <button
            type="button"
            className="sonora-crossfader-reset-btn"
            onClick={() => onCrossfaderChange(0.0)}
            title="Snap Crossfader to Center"
            aria-label="Snap Crossfader to Center (0.0)"
          >
            Center
          </button>
        </div>

        <div className="sonora-crossfader-bridge-track">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={crossfaderPosition}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="sonora-crossfader-input"
            aria-label="Equal-Power Crossfader"
            aria-valuenow={Math.round(crossfaderPosition * 100)}
            aria-valuemin={-100}
            aria-valuemax={100}
            aria-valuetext={formatCrossfaderPosition(crossfaderPosition)}
          />
        </div>

        <div className="sonora-crossfader-gain-readouts" aria-hidden="true">
          <span>A: {gainA.toFixed(2)}</span>
          <span>Equal Power</span>
          <span>B: {gainB.toFixed(2)}</span>
        </div>
      </section>

      {/* 4. Dual Playback Harmonic Convergence Beacon */}
      {deckAIsPlaying && deckBIsPlaying && (
        <div className="sonora-mixer-crossfade-badge" role="status" aria-live="polite">
          <span className="sonora-mixer-pulse-dot" aria-hidden="true" />
          <span>Crossfading • Harmonic Convergence</span>
        </div>
      )}
    </aside>
  );
};
