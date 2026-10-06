/**
 * SONORA DJStudioView Component
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md & Milestone 1 Step 6
 * 
 * Environmental integration of the frozen Phase 0.4 DJWorkspace into SonoraStage.
 * Preserves every line of existing audio logic, EQ filters, and turntable physics.
 */

import React from 'react';
import { SonoraStage } from '../stage/SonoraStage';
import { DJWorkspace } from '../DJWorkspace';
import './Views.css';

export const DJStudioView: React.FC = () => {
  return (
    <SonoraStage
      variant="performance"
      showReactiveField={true}
      reactiveIntensity={1.25}
      ariaLabel="DJ Studio Performance Stage"
    >
      <div className="sonora-view-container sonora-dj-studio-view">
        <header className="sonora-view-header">
          <div className="sonora-view-badge-row">
            <span className="sonora-view-badge">Performance Architecture</span>
            <span className="sonora-view-status-pill is-active">Phase 0.4 Operational</span>
            <span className="sonora-view-status-pill">Equal-Power Invariant</span>
          </div>
          <h1 className="sonora-view-title">Two-Deck Performance Stage</h1>
          <p className="sonora-view-subtitle">
            Dual tactile turntable plinths with independent 3-band isolator EQ, resonant
            sound-color filter sweeps, acoustic waveform ribbons, and crossfader telemetry.
          </p>
        </header>

        {/* Frozen Phase 0.4 DJ Workspace Infrastructure */}
        <DJWorkspace />
      </div>
    </SonoraStage>
  );
};

export default DJStudioView;
