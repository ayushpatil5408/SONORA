/**
 * SONORA HomeView Component
 * Authoritative Reference: PRD.md Section 10/67, DESIGN_SYSTEM.md & VISUAL_LANGUAGE.md
 * 
 * Signature living audiovisual environment.
 * Replaces generic SaaS dashboard cards with the central Living Sound Object (SoundOrb),
 * decoupled Canvas 2D reactive field, and spatial trajectory controls.
 */

import React, { useState, useEffect } from 'react';
import { RouteId } from '../../types/routes';
import { SonoraStage } from '../stage/SonoraStage';
import { SoundOrb } from '../stage/SoundOrb';
import { getAudioEngine } from '../../audio/AudioEngine';
import { createSyntheticDemoBuffer } from '../../audio/audioLoader';
import { getCatalogService } from '../../catalog/catalogService';
import './HomeView.css';

export interface HomeViewProps {
  onNavigate: (route: RouteId) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeDeck, setActiveDeck] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    const engine = getAudioEngine();
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
    return engine.subscribe(syncAudio);
  }, []);

  const handleIgniteDemo = async () => {
    try {
      const feat = await getCatalogService().getFeatured();
      if (feat.length > 0) {
        await getCatalogService().playTrack(feat[0], 'A');
      } else {
        const engine = getAudioEngine();
        const ctx = await engine.initialize();
        const demoBuffer = createSyntheticDemoBuffer(ctx, 'deckA', 16);
        await engine.loadDeck('A', demoBuffer, 'SONORA Cyan Resonance (Synthetic Demo)');
        await engine.play('A');
      }
    } catch {
      onNavigate('dj-studio');
    }
  };

  return (
    <SonoraStage variant="focal" ariaLabel="SONORA Living Music Soundstage">
      <div className="sonora-home-environment">
        {/* 1. Architectural Header */}
        <header className="sonora-home-header">
          <div className="sonora-home-archetype-tag">
            <span className="sonora-home-beacon-dot" aria-hidden="true" />
            <span>Continuous Audio Soundstage</span>
            <span aria-hidden="true">•</span>
            <span>{isPlaying ? `Deck ${activeDeck} Resonating` : 'Milestone 1 Active'}</span>
          </div>

          <h1 className="sonora-home-title">SONORA</h1>

          <p className="sonora-home-subtitle">
            One music workspace from listening to creation.
            The music you hear becomes living matter for performance and remixing.
          </p>
        </header>

        {/* 2. Central Living Sound Object with Orbiting Workflow Satellites */}
        <SoundOrb onNavigate={onNavigate} />

        {/* 3. Spatial Action Horizon (No Generic Cards) */}
        <div className="sonora-home-actions-horizon">
          <div className="sonora-home-buttons-group">
            <button
              type="button"
              className="sonora-home-primary-launch-btn"
              onClick={() => onNavigate('dj-studio')}
              aria-label="Enter Performance Studio Workspace"
            >
              <span>Enter Performance Studio</span>
              <span className="sonora-home-launch-arrow" aria-hidden="true">→</span>
            </button>

            {!isPlaying && (
              <button
                type="button"
                className="sonora-home-secondary-demo-btn"
                onClick={handleIgniteDemo}
                aria-label="Ignite Synthetic Demo Audio"
              >
                <span>✦ Ignite Acoustic Matter</span>
              </button>
            )}
          </div>

          {/* Minimal Telemetry Strip */}
          <div className="sonora-home-telemetry-strip" aria-label="Audio Engine Status">
            <div className="sonora-home-telemetry-node">
              <span className="sonora-home-telemetry-dot" aria-hidden="true" />
              <span>Deck A • 3-Band EQ & Filter</span>
            </div>
            <div className="sonora-home-telemetry-node">
              <span className="sonora-home-telemetry-dot is-amber" aria-hidden="true" />
              <span>Deck B • Tactile Turntable</span>
            </div>
            <div className="sonora-home-telemetry-node">
              <span className="sonora-home-telemetry-dot is-iris" aria-hidden="true" />
              <span>Equal-Power Crossfader Active</span>
            </div>
          </div>
        </div>
      </div>
    </SonoraStage>
  );
};

export default HomeView;
