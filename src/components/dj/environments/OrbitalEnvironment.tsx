/**
 * SONORA Organic Orbital Environment
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3
 * 
 * Aesthetic: Cosmic • Gravitational • Technical • Precise • Alive
 * 
 * Deck A: Celestial circular plinth with electric cyan energy (#00E5FF),
 *         concentric orbit rings, revolving satellite orb, vinyl disc grooves.
 * Deck B: Solar circular plinth with solar amber energy (#FFB300),
 *         orbit rings, revolving solar orb, independent solar field.
 * Mixer:  Central gravitational singularity orb with orbital SVG rings,
 *         flanking telemetry meters, and gravitational curved crossfader.
 */

import React from 'react';
import { DJEnvironmentProps } from '../types';
import { SharedDeckControls } from './SharedDeckControls';
import { SharedMixerControls } from './SharedMixerControls';
import { JogWheel } from '../JogWheel';

export const OrbitalEnvironment: React.FC<DJEnvironmentProps> = ({
  deckA,
  deckB,
  mixer,
}) => {
  return (
    <div className="sonora-env-assembly sonora-orbital-assembly" aria-label="Organic Orbital Performance Stage">
      {/* =====================================================================
          1. DECK A: CELESTIAL CIRCULAR PLINTH (CYAN ENERGY #00E5FF)
          ===================================================================== */}
      <article className="sonora-env-deck is-deck-a sonora-orbital-deck" aria-label="Deck A Celestial Plinth">
        {/* Celestial Orbital Plinth Disc with Interactive Jog Wheel */}
        <div className="sonora-env-turntable-zone">
          <JogWheel
            deckId="A"
            isPlaying={deckA.isPlaying}
            vinylMode={deckA.vinylMode}
            variant="orbital"
            onJogTurn={deckA.onJogTurn}
            onVinylModeToggle={deckA.onVinylModeToggle}
            onPlayToggle={deckA.isPlaying ? deckA.onPause : deckA.onPlay}
          />
        </div>

        {/* Shared Deck Controls (Preserves 100% controls & discoverability) */}
        <SharedDeckControls deck={deckA} variant="orbital" />
      </article>

      {/* =====================================================================
          2. CENTRAL MIXER: GRAVITATIONAL SINGULARITY CORE
          ===================================================================== */}
      <SharedMixerControls
        mixer={mixer}
        variant="orbital"
        coreSlot={
          <div className="sonora-orbital-core-orb" aria-label="Central Gravitational Core Singularity">
            {/* Orbiting Celestial Ring SVG */}
            <svg className="orbital-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="rgba(168, 85, 247, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="4 8"
              />
              <circle
                cx="60"
                cy="60"
                r="40"
                fill="none"
                stroke="rgba(0, 229, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
            </svg>

            {/* Singularity Inner Glow */}
            <div
              className="sonora-orbital-core-inner"
              style={{
                boxShadow:
                  mixer.crossfaderPosition < -0.2
                    ? '0 0 30px rgba(0, 229, 255, 0.7)'
                    : mixer.crossfaderPosition > 0.2
                    ? '0 0 30px rgba(255, 179, 0, 0.7)'
                    : '0 0 35px rgba(168, 85, 247, 0.8)',
              }}
            />
          </div>
        }
      />

      {/* =====================================================================
          3. DECK B: SOLAR CIRCULAR PLINTH (AMBER ENERGY #FFB300)
          ===================================================================== */}
      <article className="sonora-env-deck is-deck-b sonora-orbital-deck" style={{ borderColor: '#FFB300' }} aria-label="Deck B Solar Plinth">
        {/* Solar Orbital Plinth Disc with Interactive Jog Wheel */}
        <div className="sonora-env-turntable-zone">
          <JogWheel
            deckId="B"
            isPlaying={deckB.isPlaying}
            vinylMode={deckB.vinylMode}
            variant="orbital"
            onJogTurn={deckB.onJogTurn}
            onVinylModeToggle={deckB.onVinylModeToggle}
            onPlayToggle={deckB.isPlaying ? deckB.onPause : deckB.onPlay}
          />
        </div>

        {/* Shared Deck Controls (Preserves 100% controls & discoverability) */}
        <SharedDeckControls deck={deckB} variant="orbital" />
      </article>
    </div>
  );
};
