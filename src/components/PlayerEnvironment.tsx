import React from 'react';
import { DJWorkspace } from './DJWorkspace';
import './PlayerEnvironment.css';

/**
 * PlayerEnvironment Component
 * Phase 0.4 Foundation: Two-Deck Performance Workspace.
 * Hosts the continuous audiovisual soundstage, header anchors,
 * and the spatial two-deck performance field.
 */
export const PlayerEnvironment: React.FC = () => {
  return (
    <div className="sonora-environment" role="application" aria-label="SONORA Music Environment">
      {/* Ambient Atmospheric Backdrop */}
      <div className="sonora-atmosphere" aria-hidden="true" />

      {/* Top Anchor Header */}
      <header className="sonora-header">
        <div className="sonora-brand">
          <div className="sonora-orb-mark" aria-hidden="true" />
          <span className="sonora-title">SONORA</span>
        </div>
        <div className="sonora-status" aria-live="polite">
          <span className="sonora-status-beacon" aria-hidden="true" />
          <span>Stage Initialized • Two-Deck Workspace Active</span>
        </div>
      </header>

      {/* Central Living Soundstage Shell */}
      <main className="sonora-stage">
        <div className="sonora-stage-content">
          <div className="sonora-soundstage-badge">Performance Architecture • Phase 0.4</div>
          <h1 className="sonora-stage-title">Living Audiovisual Environment</h1>
          <p className="sonora-stage-subtitle">
            One continuous workspace where music becomes space, motion, and interaction.
            Dual tactile decks, equal-power crossfading, and acoustic terrain ribbons online.
          </p>
        </div>

        {/* Two-Deck Performance Stage */}
        <DJWorkspace />
      </main>

      {/* Bottom Architectural Status */}
      <footer className="sonora-footer">
        <nav className="sonora-footer-flow" aria-label="Product Workflow">
          <span>Discover</span>
          <span>→</span>
          <span>Listen</span>
          <span>→</span>
          <span>Analyze</span>
          <span>→</span>
          <span className="sonora-footer-flow-active">Mix</span>
          <span>→</span>
          <span>Edit</span>
          <span>→</span>
          <span>Create</span>
        </nav>
        <span className="sonora-footer-arch">Pure Void • Dual Decks Operational</span>
      </footer>
    </div>
  );
};

export default PlayerEnvironment;
