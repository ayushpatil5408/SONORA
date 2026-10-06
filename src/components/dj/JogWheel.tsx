/**
 * SONORA Interactive Jog Wheel Component
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3.5
 * 
 * Capabilities:
 * - Direct pointer/touch rotation interaction
 * - Vinyl Mode (center platter scratch/scrub via AudioEngine.jogScrub)
 * - CDJ Mode (outer rim temporary pitch bend via AudioEngine.pitchBend)
 * - Smooth decoupled visual rotation (33 1/3 RPM during playback)
 * - Sized and styled for each environment (Orbital, Liquid, Organism)
 * - Full ARIA semantics & keyboard accessibility (Left/Right nudges)
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DJEnvironment } from './types';

export interface JogWheelProps {
  deckId: 'A' | 'B';
  isPlaying: boolean;
  vinylMode: boolean;
  variant: DJEnvironment;
  onJogTurn: (deltaDeg: number, isScratch?: boolean) => void;
  onVinylModeToggle: () => void;
  onPlayToggle: () => void;
  className?: string;
}

export const JogWheel: React.FC<JogWheelProps> = ({
  deckId,
  isPlaying,
  vinylMode,
  variant,
  onJogTurn,
  onVinylModeToggle,
  onPlayToggle,
  className = '',
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastAngleRef = useRef<number>(0);
  const isScratchingRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  const isDeckA = deckId === 'A';
  const accentColor = isDeckA ? 'var(--color-accent-cyan)' : 'var(--color-accent-amber)';

  // Continuous visual spin when playing and not user-manipulated
  useEffect(() => {
    if (!isPlaying) return;

    let prevTimestamp: number | null = null;
    const rpmSpeedDegPerSec = (33.333 / 60) * 360; // ~200 deg/sec

    const tick = (timestamp: number) => {
      if (prevTimestamp !== null && !isDraggingRef.current) {
        const deltaSec = (timestamp - prevTimestamp) / 1000;
        setRotationAngle((prev) => (prev + deltaSec * rpmSpeedDegPerSec) % 360);
      }
      prevTimestamp = timestamp;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Track pointer angle relative to center of wheel
  const getPointerAngle = useCallback((clientX: number, clientY: number): number => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const rad = Math.atan2(dy, dx);
    let deg = rad * (180 / Math.PI);
    if (deg < 0) deg += 360;
    return deg;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    wheelRef.current?.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    const angle = getPointerAngle(e.clientX, e.clientY);
    lastAngleRef.current = angle;

    // Check if touch was in center platter (scratch) or rim (pitch bend)
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const radius = rect.width / 2;
      isScratchingRef.current = vinylMode && dist < radius * 0.72;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const angle = getPointerAngle(e.clientX, e.clientY);
    let delta = angle - lastAngleRef.current;

    // Normalize wrap-around (-180 to +180)
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngleRef.current = angle;
    setRotationAngle((prev) => (prev + delta) % 360);
    onJogTurn(delta, isScratchingRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      isScratchingRef.current = false;
      try {
        wheelRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Safe pointer release ignore
      }
      // Release pitch bend
      onJogTurn(0, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onJogTurn(e.shiftKey ? 45 : 15, e.shiftKey);
      setRotationAngle((prev) => (prev + 15) % 360);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onJogTurn(e.shiftKey ? -45 : -15, e.shiftKey);
      setRotationAngle((prev) => (prev - 15) % 360);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onPlayToggle();
    }
  };

  // Environment-specific wheel styles
  const getWheelStyle = () => {
    if (variant === 'liquid') {
      return {
        borderRadius: '50%',
        background: isDeckA
          ? 'radial-gradient(circle at 40% 40%, #032030 0%, #021018 60%, #000000 100%)'
          : 'radial-gradient(circle at 40% 40%, #281705 0%, #150b02 60%, #000000 100%)',
        border: `2px solid ${isDeckA ? 'rgba(56, 189, 248, 0.45)' : 'rgba(251, 146, 60, 0.45)'}`,
        boxShadow: isPlaying
          ? `0 0 35px ${isDeckA ? 'rgba(56, 189, 248, 0.5)' : 'rgba(251, 146, 60, 0.5)'}, inset 0 0 20px ${accentColor}`
          : '0 0 15px rgba(0,0,0,0.5)',
      };
    }
    if (variant === 'organism') {
      return {
        borderRadius: '50%',
        background: isDeckA
          ? 'radial-gradient(circle at 45% 45%, #041a24 0%, #010c12 60%, #000000 100%)'
          : 'radial-gradient(circle at 45% 45%, #231404 0%, #0f0701 60%, #000000 100%)',
        border: `2px solid ${isDeckA ? 'rgba(0, 229, 255, 0.5)' : 'rgba(255, 179, 0, 0.5)'}`,
        boxShadow: isPlaying
          ? `0 0 35px ${isDeckA ? 'rgba(0, 229, 255, 0.55)' : 'rgba(255, 179, 0, 0.55)'}, inset 0 0 25px rgba(0,0,0,0.8)`
          : '0 0 15px rgba(0,0,0,0.5)',
      };
    }
    // Orbital default
    return {
      borderRadius: '50%',
      background: isDeckA
        ? 'radial-gradient(circle at 35% 35%, #051824 0%, #010a12 70%, #000000 100%)'
        : 'radial-gradient(circle at 35% 35%, #261704 0%, #120a02 70%, #000000 100%)',
      border: `2px solid ${isDeckA ? 'rgba(0, 229, 255, 0.45)' : 'rgba(255, 179, 0, 0.45)'}`,
      boxShadow: isPlaying
        ? `0 0 35px ${isDeckA ? 'rgba(0, 229, 255, 0.5)' : 'rgba(255, 179, 0, 0.5)'}, inset 0 0 25px rgba(0,0,0,0.8)`
        : '0 0 15px rgba(0,0,0,0.5)',
    };
  };

  return (
    <div className={`sonora-jog-wheel-container env-${variant} ${className}`}>
      {/* Vinyl / CDJ Mode Switch */}
      <div className="sonora-jog-mode-strip">
        <button
          type="button"
          className={`sonora-jog-mode-toggle ${vinylMode ? 'is-vinyl' : 'is-cdj'}`}
          onClick={onVinylModeToggle}
          title={vinylMode ? 'Vinyl Mode Active (Center scratch / Rim pitch bend)' : 'CDJ Mode Active (Pitch bend)'}
          aria-label={`Deck ${deckId} Jog Mode: ${vinylMode ? 'Vinyl Scratch' : 'CDJ Pitch Bend'}`}
        >
          <span className="sonora-jog-mode-glyph">{vinylMode ? '◉ VINYL' : '◎ CDJ'}</span>
        </button>
        <span className="sonora-jog-sublabel">TOUCH PLATTER</span>
      </div>

      {/* Main Interactive Disc */}
      <div
        ref={wheelRef}
        className={`sonora-jog-disc ${isPlaying ? 'is-spinning' : ''}`}
        style={{
          ...getWheelStyle(),
          touchAction: 'none',
          userSelect: 'none',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={`Deck ${deckId} Jog Wheel (${vinylMode ? 'Vinyl' : 'CDJ'})`}
        aria-valuenow={Math.round(rotationAngle)}
        aria-valuemin={0}
        aria-valuemax={360}
      >
        {/* Rotating Groove Surface */}
        <div
          className="sonora-jog-rotator"
          style={{
            transform: `rotate(${rotationAngle}deg)`,
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {/* Groove Rings */}
          <div className="sonora-disc-groove sonora-disc-groove-1" />
          <div className="sonora-disc-groove sonora-disc-groove-2" />

          {/* Radial Angle Position Marker Line */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              width: 3,
              height: 24,
              background: accentColor,
              borderRadius: 2,
              transform: 'translateX(-50%)',
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />

          {/* Satellite Tracker for Orbital Environment */}
          {variant === 'orbital' && (
            <div
              style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accentColor,
                transform: 'translateX(-50%)',
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
          )}
        </div>

        {/* Center Platter Spindle Node */}
        <div
          className="sonora-env-disc-center-node"
          style={{ borderColor: accentColor }}
          onClick={(e) => {
            e.stopPropagation();
            onPlayToggle();
          }}
          title={isPlaying ? 'Click to Pause' : 'Click to Play'}
        >
          <div
            className="sonora-env-disc-spindle"
            style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
          />
        </div>
      </div>
    </div>
  );
};
