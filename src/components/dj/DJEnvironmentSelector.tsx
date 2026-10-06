/**
 * SONORA DJ Environment Selector Component
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md & Milestone 3
 * 
 * Tactile Instrument Selector for the three sonic environments:
 * 1. ORGANIC ORBITAL
 * 2. LIQUID INSTRUMENT
 * 3. ACOUSTIC ORGANISM
 * 
 * Seamless switching preserves 100% of underlying deck, playback, and audio states.
 */

import React from 'react';
import { DJEnvironment, DJ_ENVIRONMENTS } from './types';
import './DJEnvironmentSelector.css';

export interface DJEnvironmentSelectorProps {
  currentEnvironment: DJEnvironment;
  onSelectEnvironment: (env: DJEnvironment) => void;
  className?: string;
}

export const DJEnvironmentSelector: React.FC<DJEnvironmentSelectorProps> = ({
  currentEnvironment,
  onSelectEnvironment,
  className = '',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % DJ_ENVIRONMENTS.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + DJ_ENVIRONMENTS.length) % DJ_ENVIRONMENTS.length;
      e.preventDefault();
    }

    if (nextIndex !== index) {
      onSelectEnvironment(DJ_ENVIRONMENTS[nextIndex].id);
    }
  };

  const activeMeta = DJ_ENVIRONMENTS.find((e) => e.id === currentEnvironment) || DJ_ENVIRONMENTS[0];

  return (
    <div className={`sonora-env-selector-container ${className}`} role="region" aria-label="DJ Environment System">
      <div className="sonora-env-selector-header">
        <span className="sonora-env-selector-title">
          <span className="sonora-env-indicator-dot" style={{ background: activeMeta.accentColor }} />
          <span>DJ Visual Instrument</span>
        </span>
        <span className="sonora-env-active-subtitle">{activeMeta.subtitle}</span>
      </div>

      <div
        className="sonora-env-selector-pill"
        role="radiogroup"
        aria-label="Select DJ Visual Environment"
      >
        {DJ_ENVIRONMENTS.map((env, idx) => {
          const isActive = env.id === currentEnvironment;
          return (
            <button
              key={env.id}
              type="button"
              className={`sonora-env-option-btn ${isActive ? 'is-active' : ''} is-${env.id}`}
              onClick={() => onSelectEnvironment(env.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              title={`${env.name}: ${env.tagline}`}
            >
              <span className="sonora-env-glyph" aria-hidden="true" style={{ color: isActive ? env.accentColor : undefined }}>
                {env.glyph}
              </span>
              <span className="sonora-env-label">{env.name.toUpperCase()}</span>
              {isActive && (
                <span className="sonora-env-active-glider" aria-hidden="true" style={{ borderColor: env.accentColor }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
