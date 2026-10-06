/**
 * SONORA CreatorView Component
 * Authoritative Reference: PRD.md Section 35 & Milestone 1 Step 5
 * 
 * Honest future-facing visual shell for the creator publishing and remix layer.
 * Strictly adheres to Milestone 1 instructions: NO fake publishing/remix widgets.
 */

import React from 'react';
import { SonoraStage } from '../stage/SonoraStage';
import { CreatorWorkspace } from '../creation/CreatorWorkspace';
import './Views.css';

export const CreatorView: React.FC = () => {
  const [activeShard, setActiveShard] = React.useState<'vocal' | 'drum' | 'bass'>('vocal');

  return (
    <SonoraStage variant="spatial" ariaLabel="Creator Workspace Horizon">
      <section className="sonora-view-container" aria-label="Creator Workspace">
        <header className="sonora-view-header">
          <div className="sonora-view-badge-row">
            <span className="sonora-view-badge">Creator & Publishing Layer</span>
            <span className="sonora-view-status-pill">Milestone 5 Active</span>
          </div>
          <h1 className="sonora-view-title">Creator Workspace</h1>
          <p className="sonora-view-subtitle">
            Non-destructive timeline and clip arrangement engine. Full remix stem manipulation
            and public cloud publishing are part of future milestones. Not implemented in Milestone 1.
          </p>
        </header>

        {/* Milestone 5.0 + 5.1 Active Creator Timeline Workspace */}
        <div style={{ marginBottom: 'var(--space-6, 24px)', width: '100%' }}>
          <CreatorWorkspace />
        </div>

        {/* 1. Spatial Stem Attribution Matrix */}
        <div className="sonora-lineage-preview-stage" aria-label="Stem attribution lineage graph">
          <svg className="sonora-lineage-svg" viewBox="0 0 760 220" aria-hidden="true">
            <defs>
              <linearGradient id="lineage-tether-a" x1="0%" y1="50%" x2="100%" y2="20%">
                <stop offset="0%" stopColor="var(--color-accent-iris)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(0, 229, 255, 0.4)" />
              </linearGradient>
              <linearGradient id="lineage-tether-b" x1="0%" y1="50%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="var(--color-accent-iris)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(255, 179, 0, 0.4)" />
              </linearGradient>
            </defs>

            {/* Connecting Tethers from Master to 3 Stem Shards */}
            <path d="M120,110 C220,110 260,50 360,50" fill="none" stroke="url(#lineage-tether-a)" strokeWidth="1.5" strokeDasharray="3 4" />
            <path d="M120,110 C220,110 260,110 360,110" fill="none" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1.5" strokeDasharray="3 4" />
            <path d="M120,110 C220,110 260,170 360,170" fill="none" stroke="url(#lineage-tether-b)" strokeWidth="1.5" strokeDasharray="3 4" />

            {/* Downstream Tethers from Shards to Derivative Set Node */}
            <path d="M480,50 C560,50 580,110 640,110" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" strokeDasharray="2 4" />
            <path d="M480,110 C560,110 580,110 640,110" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" strokeDasharray="2 4" />
            <path d="M480,170 C560,170 580,110 640,110" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" strokeDasharray="2 4" />

            {/* Root Master Track Node */}
            <circle cx="120" cy="110" r="28" fill="rgba(12, 10, 22, 0.9)" stroke="var(--color-accent-iris)" strokeWidth="1.5" />
            <circle cx="120" cy="110" r="8" fill="var(--color-accent-iris)" />
            <text x="120" y="155" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10" fontFamily="var(--font-mono)">MASTER TRACK</text>

            {/* Derivative Performance Set Node */}
            <circle cx="640" cy="110" r="24" fill="rgba(10, 18, 16, 0.9)" stroke="var(--color-accent-emerald)" strokeWidth="1.5" />
            <circle cx="640" cy="110" r="6" fill="var(--color-accent-emerald)" />
            <text x="640" y="155" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10" fontFamily="var(--font-mono)">REMIX CRATE</text>
          </svg>

          {/* Interactive Shard Pill Buttons */}
          <div className="sonora-shard-cards-row">
            <button
              type="button"
              className={`sonora-shard-node ${activeShard === 'vocal' ? 'is-active' : ''}`}
              onClick={() => setActiveShard('vocal')}
            >
              <span className="sonora-shard-type">Stem Shard 1</span>
              <span className="sonora-shard-name">Vocal Acapella (Key 8A)</span>
              <span className="sonora-shard-meta">100% Attribution Link</span>
            </button>

            <button
              type="button"
              className={`sonora-shard-node ${activeShard === 'drum' ? 'is-active' : ''}`}
              onClick={() => setActiveShard('drum')}
            >
              <span className="sonora-shard-type">Stem Shard 2</span>
              <span className="sonora-shard-name">Drum Groove (126 BPM)</span>
              <span className="sonora-shard-meta">Transient Synchronized</span>
            </button>

            <button
              type="button"
              className={`sonora-shard-node ${activeShard === 'bass' ? 'is-active' : ''}`}
              onClick={() => setActiveShard('bass')}
            >
              <span className="sonora-shard-type">Stem Shard 3</span>
              <span className="sonora-shard-name">Sub Bass Stabs (Key 8A)</span>
              <span className="sonora-shard-meta">Resonant Filter Pass</span>
            </button>
          </div>
        </div>

        {/* 2. Spatial Focal Horizon */}
        <div className="sonora-spatial-horizon">
          <div className="sonora-spatial-icon-orbit" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" stroke="var(--color-accent-iris)" strokeWidth="1.2" />
              <circle cx="12" cy="12" r="3" fill="var(--color-accent-amber)" />
              <line x1="12" y1="2" x2="12" y2="9" stroke="var(--color-accent-cyan)" />
              <line x1="12" y1="15" x2="12" y2="22" stroke="var(--color-accent-cyan)" />
            </svg>
          </div>
          <h2 className="sonora-spatial-title">Remix & Publishing Horizon</h2>
          <p className="sonora-spatial-desc">
            The Creator Workspace will allow producers and DJs to publish derivative sets,
            trace attribution chains, share stems, and release live recordings.
            Activates once the core catalog and library architecture are operational.
          </p>
          <span className="sonora-spatial-status-tag">
            Future Milestone Requirement • PRD Sections 35, 36, 37 & 39
          </span>
        </div>

        {/* 3. Spatial Concepts Flow */}
        <div className="sonora-spatial-node-flow">
          <div className="sonora-spatial-node">
            <span className="sonora-spatial-node-lead">Sample Crates</span>
            <span className="sonora-spatial-node-body">
              Organize extracted samples with automatic BPM, root key, and transient tagging.
            </span>
            <span className="sonora-spatial-node-meta">Future Milestone</span>
          </div>

          <div className="sonora-spatial-node">
            <span className="sonora-spatial-node-lead">Attribution Chain</span>
            <span className="sonora-spatial-node-body">
              Track original track credits and sample lineage across derivative works.
            </span>
            <span className="sonora-spatial-node-meta">Future Milestone</span>
          </div>

          <div className="sonora-spatial-node">
            <span className="sonora-spatial-node-lead">Live Sessions</span>
            <span className="sonora-spatial-node-body">
              Publish recorded DJ sets directly to your public creator profile.
            </span>
            <span className="sonora-spatial-node-meta">Future Milestone</span>
          </div>
        </div>
      </section>
    </SonoraStage>
  );
};

export default CreatorView;
