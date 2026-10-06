/**
 * SONORA SonoraStage Component
 * Authoritative Reference: PRD.md, DESIGN_SYSTEM.md & VISUAL_LANGUAGE.md
 * 
 * Foundational spatial soundstage environment primitive.
 * Hosts the layered cosmic backdrop, AudioReactiveField Canvas layer,
 * and semantic coordinate layout.
 */

import React from 'react';
import { AudioReactiveField } from './AudioReactiveField';
import './SonoraStage.css';

export interface SonoraStageProps {
  children: React.ReactNode;
  variant?: 'default' | 'focal' | 'performance' | 'spatial';
  showReactiveField?: boolean;
  reactiveIntensity?: number;
  className?: string;
  ariaLabel?: string;
}

export const SonoraStage: React.FC<SonoraStageProps> = ({
  children,
  variant = 'default',
  showReactiveField = true,
  reactiveIntensity = 1.0,
  className = '',
  ariaLabel = 'SONORA Living Soundstage',
}) => {
  return (
    <div
      className={`sonora-stage-container is-${variant} ${className}`}
      role="region"
      aria-label={ariaLabel}
    >
      {/* 1. Deep Atmospheric Backdrop */}
      <div className="sonora-stage-backdrop" aria-hidden="true" />

      {/* 2. Decoupled 60fps Canvas Audio Reactive Layer */}
      {showReactiveField && (
        <AudioReactiveField intensity={reactiveIntensity} />
      )}

      {/* 3. Spatial Content Viewport */}
      <div className="sonora-stage-body">
        {children}
      </div>
    </div>
  );
};

export default SonoraStage;
