/**
 * SONORA Acoustic Organism Environment
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3
 * 
 * Aesthetic: Biological • Sonic • Living • Sculptural • Distinctive
 * 
 * Deck A: Bio-acoustic fan with radiating electric cyan filaments (#00E5FF),
 *         acoustic cilia, living respiration contours.
 * Deck B: Bio-acoustic fan with radiating golden amber filaments (#FFB300),
 *         living ciliated contours, solar acoustic gills.
 * Mixer:  Living acoustic spine & ribcage with vertical resonant chord,
 *         breathing rib bars responding to audio harmonics, and wave-based crossfader.
 */

import React from 'react';
import { DJEnvironmentProps } from '../types';
import { SharedDeckControls } from './SharedDeckControls';
import { SharedMixerControls } from './SharedMixerControls';
import { JogWheel } from '../JogWheel';

export const OrganismEnvironment: React.FC<DJEnvironmentProps> = ({
  deckA,
  deckB,
  mixer,
}) => {
  return (
    <div className="sonora-env-assembly sonora-organism-assembly" aria-label="Acoustic Organism Performance Stage">
      {/* =====================================================================
          1. DECK A: BIO-ACOUSTIC FAN PLINTH (CYAN FILAMENTS #00E5FF)
          ===================================================================== */}
      <article
        className="sonora-env-deck is-deck-a sonora-organism-deck"
        style={{
          borderRadius: '24px',
          background: 'radial-gradient(ellipse at 30% 30%, rgba(0, 229, 255, 0.08) 0%, rgba(10, 14, 22, 0.75) 100%)',
          borderColor: 'rgba(0, 229, 255, 0.3)',
        }}
        aria-label="Deck A Acoustic Organism"
      >
        {/* Filament Turntable Plinth with Interactive Jog Wheel */}
        <div className="sonora-env-turntable-zone">
          <JogWheel
            deckId="A"
            isPlaying={deckA.isPlaying}
            vinylMode={deckA.vinylMode}
            variant="organism"
            onJogTurn={deckA.onJogTurn}
            onVinylModeToggle={deckA.onVinylModeToggle}
            onPlayToggle={deckA.isPlaying ? deckA.onPause : deckA.onPlay}
          />
        </div>

        {/* Shared Deck Controls (Preserves 100% controls & discoverability) */}
        <SharedDeckControls deck={deckA} variant="organism" />
      </article>

      {/* =====================================================================
          2. CENTRAL MIXER: BIO-ACOUSTIC RESONANT SPINE
          ===================================================================== */}
      <SharedMixerControls
        mixer={mixer}
        variant="organism"
        coreSlot={
          <div className="sonora-organism-spine-core" aria-label="Central Living Acoustic Spine">
            {/* Central Vertical Nerve Cord */}
            <div className="sonora-organism-spine-cord" aria-hidden="true" />

            {/* Pulsating Acoustic Rib Bars (Breathing Vertebrae) */}
            <div className="sonora-organism-rib-bar" style={{ width: mixer.deckAIsPlaying || mixer.deckBIsPlaying ? 54 : 32 }} />
            <div className="sonora-organism-rib-bar" style={{ width: mixer.deckAIsPlaying || mixer.deckBIsPlaying ? 74 : 44 }} />
            <div className="sonora-organism-rib-bar" style={{ width: mixer.deckAIsPlaying || mixer.deckBIsPlaying ? 88 : 52 }} />
            <div className="sonora-organism-rib-bar" style={{ width: mixer.deckAIsPlaying || mixer.deckBIsPlaying ? 78 : 46 }} />
            <div className="sonora-organism-rib-bar" style={{ width: mixer.deckAIsPlaying || mixer.deckBIsPlaying ? 56 : 34 }} />
          </div>
        }
      />

      {/* =====================================================================
          3. DECK B: BIO-ACOUSTIC FAN PLINTH (AMBER FILAMENTS #FFB300)
          ===================================================================== */}
      <article
        className="sonora-env-deck is-deck-b sonora-organism-deck"
        style={{
          borderRadius: '24px',
          background: 'radial-gradient(ellipse at 70% 30%, rgba(255, 179, 0, 0.08) 0%, rgba(24, 16, 10, 0.75) 100%)',
          borderColor: 'rgba(255, 179, 0, 0.3)',
        }}
        aria-label="Deck B Acoustic Organism"
      >
        {/* Filament Turntable Plinth with Interactive Jog Wheel */}
        <div className="sonora-env-turntable-zone">
          <JogWheel
            deckId="B"
            isPlaying={deckB.isPlaying}
            vinylMode={deckB.vinylMode}
            variant="organism"
            onJogTurn={deckB.onJogTurn}
            onVinylModeToggle={deckB.onVinylModeToggle}
            onPlayToggle={deckB.isPlaying ? deckB.onPause : deckB.onPlay}
          />
        </div>

        {/* Shared Deck Controls (Preserves 100% controls & discoverability) */}
        <SharedDeckControls deck={deckB} variant="organism" />
      </article>
    </div>
  );
};
