/**
 * SONORA Liquid Instrument Environment
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3
 * 
 * Aesthetic: Fluid • Experimental • Tactile • Expressive • Organic
 * 
 * Deck A: Viscous fluid droplet membrane in cyan (#00E5FF) with flowing tendril,
 *         concentric liquid mercury ripple disc, soft organic contours.
 * Deck B: Molten amber liquid membrane (#FFB300) with dipping tendril,
 *         liquid ripple disc, flowing organic contours.
 * Mixer:  Vertical organic liquid chamber with undulating fluid core,
 *         liquid level column meters, and capillary fluid crossfader stream.
 */

import React from 'react';
import { DJEnvironmentProps } from '../types';
import { SharedDeckControls } from './SharedDeckControls';
import { SharedMixerControls } from './SharedMixerControls';
import { JogWheel } from '../JogWheel';

export const LiquidEnvironment: React.FC<DJEnvironmentProps> = ({
  deckA,
  deckB,
  mixer,
}) => {
  return (
    <div className="sonora-env-assembly sonora-liquid-assembly" aria-label="Liquid Instrument Performance Stage">
      {/* =====================================================================
          1. DECK A: VISCOUS LIQUID MEMBRANE (CYAN ENERGY #00E5FF)
          ===================================================================== */}
      <article
        className="sonora-env-deck is-deck-a sonora-liquid-deck"
        style={{
          borderRadius: '40px 16px 32px 24px',
          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(12, 16, 28, 0.6) 100%)',
          borderColor: 'rgba(0, 229, 255, 0.25)',
        }}
        aria-label="Deck A Liquid Membrane"
      >
        {/* Liquid Mercury Turntable Plinth with Interactive Jog Wheel */}
        <div className="sonora-env-turntable-zone">
          <JogWheel
            deckId="A"
            isPlaying={deckA.isPlaying}
            vinylMode={deckA.vinylMode}
            variant="liquid"
            onJogTurn={deckA.onJogTurn}
            onVinylModeToggle={deckA.onVinylModeToggle}
            onPlayToggle={deckA.isPlaying ? deckA.onPause : deckA.onPlay}
          />
        </div>

        {/* Shared Deck Controls (Preserves 100% controls & discoverability) */}
        <SharedDeckControls deck={deckA} variant="liquid" />
      </article>

      {/* =====================================================================
          2. CENTRAL MIXER: VERTICAL LIQUID CHAMBER
          ===================================================================== */}
      <SharedMixerControls
        mixer={mixer}
        variant="liquid"
        coreSlot={
          <div className="sonora-liquid-chamber-core" aria-label="Central Liquid Vessel Chamber">
            {/* Bioluminescent Undulating Fluid Droplet */}
            <div
              className="sonora-liquid-droplet-inner"
              style={{
                opacity: mixer.deckAIsPlaying || mixer.deckBIsPlaying ? 0.95 : 0.6,
                filter: `drop-shadow(0 0 12px ${
                  mixer.crossfaderPosition < -0.2
                    ? '#38bdf8'
                    : mixer.crossfaderPosition > 0.2
                    ? '#fb923c'
                    : '#c084fc'
                })`,
              }}
            />
          </div>
        }
      />

      {/* =====================================================================
          3. DECK B: MOLTEN LIQUID MEMBRANE (AMBER ENERGY #FFB300)
          ===================================================================== */}
      <article
        className="sonora-env-deck is-deck-b sonora-liquid-deck"
        style={{
          borderRadius: '16px 40px 24px 32px',
          background: 'linear-gradient(225deg, rgba(255, 179, 0, 0.08) 0%, rgba(28, 18, 12, 0.6) 100%)',
          borderColor: 'rgba(255, 179, 0, 0.25)',
        }}
        aria-label="Deck B Liquid Membrane"
      >
        {/* Molten Liquid Turntable Plinth with Interactive Jog Wheel */}
        <div className="sonora-env-turntable-zone">
          <JogWheel
            deckId="B"
            isPlaying={deckB.isPlaying}
            vinylMode={deckB.vinylMode}
            variant="liquid"
            onJogTurn={deckB.onJogTurn}
            onVinylModeToggle={deckB.onVinylModeToggle}
            onPlayToggle={deckB.isPlaying ? deckB.onPause : deckB.onPlay}
          />
        </div>

        {/* Shared Deck Controls (Preserves 100% controls & discoverability) */}
        <SharedDeckControls deck={deckB} variant="liquid" />
      </article>
    </div>
  );
};
