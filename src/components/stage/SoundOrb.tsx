/**
 * SONORA SoundOrb Component
 * Authoritative Reference: PRD.md Section 10, DESIGN_SYSTEM.md & VISUAL_LANGUAGE.md
 * 
 * Living central sound object representing active acoustic matter.
 * Subscribes to discrete AudioEngine snapshots (zero 60fps React state updates).
 * Concentric orbital rings host the continuous workflow trajectory:
 * Listen → Analyze → Mix → Edit → Create
 */

import React, { useState, useEffect } from 'react';
import { getAudioEngine } from '../../audio/AudioEngine';
import { createSyntheticDemoBuffer } from '../../audio/audioLoader';
import { getCatalogService } from '../../catalog/catalogService';
import { RouteId } from '../../types/routes';
import './SoundOrb.css';

export interface SoundOrbProps {
  onNavigate: (route: RouteId) => void;
}

const WORKFLOW_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  listen: { label: 'Listen', desc: 'Direct Audio Playback & Resonant Diaphragm' },
  analyze: { label: 'Analyze', desc: 'High-Resolution Waveform Topography in DJ Studio' },
  mix: { label: 'Mix', desc: 'Two-Deck Tactile Performance Stage • Operational' },
  edit: { label: 'Edit', desc: 'Temporal Slicing & Waveform Shards • Phase 4 Horizon' },
  create: { label: 'Create', desc: 'Stem Lineage & Remix Publishing • Future Horizon' },
};

export const SoundOrb: React.FC<SoundOrbProps> = ({ onNavigate }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeDeck, setActiveDeck] = useState<'A' | 'B' | null>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const engine = getAudioEngine();

    const syncState = () => {
      const state = engine.getState();
      const isAPlaying = state.deckA.transportState === 'playing';
      const isBPlaying = state.deckB.transportState === 'playing';

      if (isAPlaying) {
        setIsPlaying(true);
        setActiveDeck('A');
        setTrackName(state.deckA.trackName || 'Deck A Stream');
      } else if (isBPlaying) {
        setIsPlaying(true);
        setActiveDeck('B');
        setTrackName(state.deckB.trackName || 'Deck B Stream');
      } else if (state.deckA.isLoaded) {
        setIsPlaying(false);
        setActiveDeck('A');
        setTrackName(state.deckA.trackName || 'Deck A Ready');
      } else if (state.deckB.isLoaded) {
        setIsPlaying(false);
        setActiveDeck('B');
        setTrackName(state.deckB.trackName || 'Deck B Ready');
      } else {
        setIsPlaying(false);
        setActiveDeck(null);
        setTrackName(null);
      }
    };

    syncState();
    const unsub = engine.subscribe(syncState);
    return unsub;
  }, []);

  const handleCoreClick = async () => {
    const engine = getAudioEngine();
    if (!activeDeck) {
      try {
        const feat = await getCatalogService().getFeatured();
        if (feat.length > 0) {
          await getCatalogService().playTrack(feat[0], 'A');
        } else {
          const ctx = await engine.initialize();
          const demoBuffer = createSyntheticDemoBuffer(ctx, 'deckA', 16);
          await engine.loadDeck('A', demoBuffer, 'SONORA Cyan Resonance (Synthetic Demo)');
          await engine.play('A');
        }
      } catch (err) {
        console.error('Audio initialization error:', err);
        onNavigate('dj-studio');
      }
      return;
    }

    if (isPlaying) {
      engine.pause(activeDeck);
    } else {
      await engine.play(activeDeck);
    }
  };

  const deckClass = activeDeck === 'A' ? 'is-deck-a' : activeDeck === 'B' ? 'is-deck-b' : '';

  return (
    <div className="sonora-sound-orb-stage" aria-label="Living Sound Object Stage">
      {/* 1. Harmonic Constellation Tethers & Orbital Lattice (SVG Layer) */}
      <svg
        className="sonora-orb-constellation-web"
        viewBox="0 0 440 440"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tether-grad-iris" x1="50%" y1="50%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="rgba(124, 77, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(124, 77, 255, 0.05)" />
          </linearGradient>
          <linearGradient id="tether-grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-cyan)" />
            <stop offset="100%" stopColor="var(--color-accent-iris)" />
          </linearGradient>
        </defs>

        {/* Concentric Guide Geometries */}
        <circle cx="220" cy="220" r="190" className="sonora-web-orbit-outer" />
        <circle cx="220" cy="220" r="130" className="sonora-web-orbit-mid" />
        <circle cx="220" cy="220" r="85" className="sonora-web-orbit-inner" />

        {/* Resonant Harmonic Chords (Tethers from center to 5 workflow node positions) */}
        {/* Listen: (220, 24) */}
        <line
          x1="220" y1="220" x2="220" y2="28"
          className={`sonora-web-chord ${hoveredNode === 'listen' ? 'is-highlighted' : ''}`}
        />
        {/* Analyze: (382, 105) */}
        <line
          x1="220" y1="220" x2="382" y2="105"
          className={`sonora-web-chord ${hoveredNode === 'analyze' ? 'is-highlighted' : ''}`}
        />
        {/* Mix: (375, 335) */}
        <line
          x1="220" y1="220" x2="375" y2="335"
          className={`sonora-web-chord is-active-route ${hoveredNode === 'mix' ? 'is-highlighted' : ''}`}
        />
        {/* Edit: (220, 400) */}
        <line
          x1="220" y1="220" x2="220" y2="400"
          className={`sonora-web-chord ${hoveredNode === 'edit' ? 'is-highlighted' : ''}`}
        />
        {/* Create: (35, 175) */}
        <line
          x1="220" y1="220" x2="35" y2="175"
          className={`sonora-web-chord ${hoveredNode === 'create' ? 'is-highlighted' : ''}`}
        />
      </svg>

      {/* 2. Concentric Resonant Rings */}
      <div className="sonora-orb-ring sonora-orb-ring-inner" aria-hidden="true" />
      <div className="sonora-orb-ring sonora-orb-ring-outer" aria-hidden="true" />

      {/* 3. Central Living Core */}
      <button
        type="button"
        className={`sonora-orb-core-btn ${deckClass} ${isPlaying ? 'is-playing' : ''}`}
        onClick={handleCoreClick}
        aria-label={
          isPlaying
            ? `Pause Deck ${activeDeck}`
            : activeDeck
            ? `Play Deck ${activeDeck}`
            : 'Open DJ Studio to load sound matter'
        }
      >
        <div className="sonora-orb-corona" aria-hidden="true" />
        <span className="sonora-orb-symbol" aria-hidden="true">
          {isPlaying ? '⦿' : activeDeck ? '▶' : '✦'}
        </span>
        <span className="sonora-orb-state-label">
          {isPlaying ? 'Resonating' : activeDeck ? 'Ready' : 'Pure Void'}
        </span>
        {trackName ? (
          <span className="sonora-orb-track-hint" title={trackName}>
            {trackName}
          </span>
        ) : (
          <span className="sonora-orb-harmonic-hint" aria-hidden="true">
            {activeDeck ? `Deck ${activeDeck}` : 'Awaiting Sound'}
          </span>
        )}
      </button>

      {/* 4. Orbiting Continuous Workflow Nodes */}
      {/* Node 1: Listen */}
      <button
        type="button"
        className="sonora-orbit-node node-listen"
        onMouseEnter={() => setHoveredNode('listen')}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={() => {
          if (activeDeck) handleCoreClick();
          else onNavigate('dj-studio');
        }}
        aria-label="Listen state"
      >
        <span className="sonora-orbit-dot" aria-hidden="true" />
        <span>Listen</span>
      </button>

      {/* Node 2: Analyze */}
      <button
        type="button"
        className="sonora-orbit-node node-analyze"
        onMouseEnter={() => setHoveredNode('analyze')}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={() => onNavigate('dj-studio')}
        aria-label="Analyze sound waveform in DJ Studio"
      >
        <span className="sonora-orbit-dot" aria-hidden="true" />
        <span>Analyze</span>
      </button>

      {/* Node 3: Mix (Operational) */}
      <button
        type="button"
        className="sonora-orbit-node node-mix is-active-step"
        onMouseEnter={() => setHoveredNode('mix')}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={() => onNavigate('dj-studio')}
        aria-label="Mix: Enter DJ Studio Workspace"
      >
        <span className="sonora-orbit-dot" aria-hidden="true" />
        <span>Mix • Studio</span>
      </button>

      {/* Node 4: Edit */}
      <button
        type="button"
        className="sonora-orbit-node node-edit"
        onMouseEnter={() => setHoveredNode('edit')}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={() => onNavigate('audio-lab')}
        aria-label="Edit: Audio Lab preview"
      >
        <span className="sonora-orbit-dot" aria-hidden="true" />
        <span>Edit</span>
      </button>

      {/* Node 5: Create */}
      <button
        type="button"
        className="sonora-orbit-node node-create"
        onMouseEnter={() => setHoveredNode('create')}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={() => onNavigate('creator')}
        aria-label="Create: Creator workspace preview"
      >
        <span className="sonora-orbit-dot" aria-hidden="true" />
        <span>Create</span>
      </button>

      {/* 5. Dynamic Harmonic Node Description Horizon */}
      <div className="sonora-orb-node-tooltip" aria-live="polite">
        {hoveredNode && WORKFLOW_DESCRIPTIONS[hoveredNode] ? (
          <div className="sonora-orb-tooltip-content is-active">
            <span className="sonora-orb-tooltip-title">{WORKFLOW_DESCRIPTIONS[hoveredNode].label}</span>
            <span className="sonora-orb-tooltip-desc">{WORKFLOW_DESCRIPTIONS[hoveredNode].desc}</span>
          </div>
        ) : (
          <div className="sonora-orb-tooltip-content">
            <span className="sonora-orb-tooltip-idle">
              {isPlaying
                ? 'Sound Matter Resonating • Click Core to Pause'
                : activeDeck
                ? 'Deck Ready • Click Core to Play'
                : 'Click Core to Ignite Acoustic Matter (Demo)'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundOrb;
