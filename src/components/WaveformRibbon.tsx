/**
 * SONORA WaveformRibbon Component
 * Authoritative Reference: PRD.md, DESIGN_SYSTEM.md & VISUAL_LANGUAGE.md
 * 
 * Living Acoustic Ribbon: Continuous topographical terrain detailing
 * transient peaks and spectral energy across the True Void.
 * 
 * Strict Performance Boundary: Canvas 2D decoupled rendering.
 * Does NOT poll or cause 60fps React state updates.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WaveformData } from '../audio/waveformTypes';
import { LoopState } from '../audio/types';
import { TrackAnalysis } from '../audio/analysisTypes';
import './WaveformRibbon.css';

export interface WaveformRibbonProps {
  waveform: WaveformData | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  isLoading?: boolean;
  bpm?: number | null;
  cueTime?: number;
  hotCues?: (number | null)[];
  loop?: LoopState | null;
  analysis?: TrackAnalysis | null;
  getTime?: () => number;
  onSeek?: (positionSeconds: number) => void;
  ariaLabel?: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const WaveformRibbon: React.FC<WaveformRibbonProps> = ({
  waveform,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  isLoading = false,
  bpm = null,
  cueTime = 0,
  hotCues = [],
  loop = null,
  analysis = null,
  getTime,
  onSeek,
  ariaLabel = 'Acoustic Waveform Ribbon',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<{ x: number; time: number } | null>(null);
  const timecodeElRef = useRef<HTMLSpanElement>(null);
  const [hoverTimecode, setHoverTimecode] = useState<string | null>(null);

  const effectiveDuration = duration > 0 ? duration : (waveform?.duration || 0);

  // =========================================================================
  // Canvas 2D Decoupled Rendering Core
  // =========================================================================
  const drawWaveform = useCallback((renderTime: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const centerY = height * 0.5;
    const amplitudeScale = height * 0.42;

    // 1. Unloaded State: Serene dormant baseline ribbon
    if (!waveform || waveform.length === 0) {
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    const length = waveform.length;
    const minPeaks = waveform.minPeaks;
    const maxPeaks = waveform.maxPeaks;
    const rmsPeaks = waveform.rmsPeaks;

    const progress = effectiveDuration > 0 ? Math.max(0, Math.min(1, renderTime / effectiveDuration)) : 0;
    const playheadX = progress * width;

    // Path helper to construct the topographical terrain polygon
    const buildRibbonPath = (startX: number, endX: number) => {
      ctx.beginPath();
      let started = false;

      const startIdx = Math.max(0, Math.floor((startX / width) * (length - 1)));
      const endIdx = Math.min(length - 1, Math.ceil((endX / width) * (length - 1)));

      // Top boundary (positive peaks, mirrored upward)
      for (let i = startIdx; i <= endIdx; i++) {
        const x = (i / (length - 1)) * width;
        const peak = maxPeaks[i] ?? 0;
        const y = centerY - (peak * amplitudeScale);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Bottom boundary (negative peaks, mirrored downward)
      for (let i = endIdx; i >= startIdx; i--) {
        const x = (i / (length - 1)) * width;
        const peak = minPeaks[i] ?? 0;
        const y = centerY - (peak * amplitudeScale);
        ctx.lineTo(x, y);
      }

      ctx.closePath();
    };

    // 2. Played Region: Vibrant spectral terrain
    if (playheadX > 0) {
      ctx.save();
      buildRibbonPath(0, playheadX);

      // Vertical harmonic gradient matching DESIGN_SYSTEM.md
      const playedGrad = ctx.createLinearGradient(0, centerY - amplitudeScale, 0, centerY + amplitudeScale);
      playedGrad.addColorStop(0.0, 'rgba(255, 179, 0, 0.95)');  // Highs: Luminous amber
      playedGrad.addColorStop(0.3, 'rgba(0, 229, 255, 0.90)');  // Mids: Electric cyan
      playedGrad.addColorStop(0.5, 'rgba(124, 77, 255, 0.95)'); // Core: Deep radiant violet
      playedGrad.addColorStop(0.7, 'rgba(0, 229, 255, 0.90)');  // Mids: Electric cyan
      playedGrad.addColorStop(1.0, 'rgba(255, 179, 0, 0.95)');  // Highs: Luminous amber

      ctx.fillStyle = playedGrad;
      ctx.shadowColor = 'rgba(0, 229, 255, 0.35)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    // 3. Unplayed Region: Attenuated spectral terrain
    if (playheadX < width) {
      ctx.save();
      buildRibbonPath(playheadX, width);

      const unplayedGrad = ctx.createLinearGradient(0, centerY - amplitudeScale, 0, centerY + amplitudeScale);
      unplayedGrad.addColorStop(0.0, 'rgba(255, 179, 0, 0.28)');
      unplayedGrad.addColorStop(0.3, 'rgba(0, 229, 255, 0.25)');
      unplayedGrad.addColorStop(0.5, 'rgba(124, 77, 255, 0.30)');
      unplayedGrad.addColorStop(0.7, 'rgba(0, 229, 255, 0.25)');
      unplayedGrad.addColorStop(1.0, 'rgba(255, 179, 0, 0.28)');

      ctx.fillStyle = unplayedGrad;
      ctx.fill();
      ctx.restore();
    }

    // 4. RMS Energy Core Spine
    ctx.beginPath();
    for (let i = 0; i < length; i++) {
      const x = (i / (length - 1)) * width;
      const rms = rmsPeaks[i] ?? 0;
      const topY = centerY - (rms * amplitudeScale * 0.4);
      if (i === 0) ctx.moveTo(x, topY);
      else ctx.lineTo(x, topY);
    }
    for (let i = length - 1; i >= 0; i--) {
      const x = (i / (length - 1)) * width;
      const rms = rmsPeaks[i] ?? 0;
      const bottomY = centerY + (rms * amplitudeScale * 0.4);
      ctx.lineTo(x, bottomY);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    // 5. Zero-Axis Horizon Line
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 5b. Professional DJ Beat Grid (Downbeats & Phrase divisions)
    const effectiveBpm = bpm || analysis?.bpm?.bpm || null;
    const beatList = (analysis?.beats?.beats && analysis.beats.beats.length > 0)
      ? analysis.beats.beats
      : (effectiveBpm && effectiveBpm > 0 && effectiveDuration > 0)
        ? Array.from({ length: Math.floor(effectiveDuration / (60 / effectiveBpm)) + 1 }, (_, b) => b * (60 / effectiveBpm))
        : null;

    if (beatList && effectiveDuration > 0) {
      ctx.save();
      for (let b = 0; b < beatList.length; b++) {
        const beatTime = beatList[b];
        const bx = (beatTime / effectiveDuration) * width;
        const isDownbeat = b % 4 === 0;
        ctx.beginPath();
        ctx.moveTo(bx, isDownbeat ? 0 : centerY - 10);
        ctx.lineTo(bx, isDownbeat ? height : centerY + 10);
        ctx.strokeStyle = isDownbeat ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = isDownbeat ? 1.5 : 0.8;
        ctx.stroke();

        if (isDownbeat && height > 36) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
          ctx.font = '8px monospace';
          ctx.fillText(String(Math.floor(b / 4) + 1), bx + 2, 9);
        }
      }
      ctx.restore();
    }

    // Dynamic Energy Contour & Section Markers from Audio Intelligence
    if (analysis && effectiveDuration > 0) {
      ctx.save();
      // Section phrase divisions
      if (analysis.sections && analysis.sections.length > 0) {
        analysis.sections.forEach((sec) => {
          const sx = (sec.start / effectiveDuration) * width;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, 14);
          ctx.strokeStyle = 'rgba(124, 77, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();

          if (height > 40) {
            ctx.fillStyle = 'rgba(124, 77, 255, 0.75)';
            ctx.font = 'bold 7px sans-serif';
            ctx.fillText(sec.label.toUpperCase(), sx + 2, 8);
          }
        });
      }
      ctx.restore();
    }

    // 5c. Active Hardware Loop Region
    if (loop && loop.enabled && loop.end > loop.start && effectiveDuration > 0) {
      ctx.save();
      const loopStartX = (loop.start / effectiveDuration) * width;
      const loopEndX = (loop.end / effectiveDuration) * width;
      const loopW = Math.max(2, loopEndX - loopStartX);

      // Translucent highlight overlay
      ctx.fillStyle = 'rgba(255, 179, 0, 0.18)';
      ctx.fillRect(loopStartX, 0, loopW, height);

      // Border bounds
      ctx.strokeStyle = '#FFB300';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(loopStartX, 0, loopW, height);

      // Start / End flags
      ctx.fillStyle = '#FFB300';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('⟲ IN', loopStartX + 3, height - 6);
      ctx.fillText('OUT ⟲', Math.max(loopStartX + 20, loopEndX - 32), height - 6);
      ctx.restore();
    }

    // 5d. CUE and Hot Cue Markers
    if (cueTime !== undefined && cueTime > 0 && effectiveDuration > 0) {
      ctx.save();
      const cx = (cueTime / effectiveDuration) * width;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('CUE', cx + 2, 20);
      ctx.restore();
    }

    if (hotCues && effectiveDuration > 0) {
      const cueColors = ['#00E5FF', '#FFB300', '#A855F7', '#22C55E', '#EC4899', '#3B82F6', '#F97316', '#EAB308'];
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      ctx.save();
      hotCues.forEach((hcTime, idx) => {
        if (hcTime === null || hcTime === undefined) return;
        const hx = (hcTime / effectiveDuration) * width;
        const color = cueColors[idx % cueColors.length];
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Flag badge at top
        ctx.fillStyle = color;
        ctx.fillRect(hx, 0, 14, 12);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(letters[idx], hx + 7, 10);
      });
      ctx.restore();
    }

    // 6. Active Playhead Stylus & Glow Halo
    if (effectiveDuration > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Top and bottom stylus diamonds
      const diamondRadius = 3.5;
      for (const y of [6, height - 6]) {
        ctx.beginPath();
        ctx.moveTo(playheadX, y - diamondRadius);
        ctx.lineTo(playheadX + diamondRadius, y);
        ctx.lineTo(playheadX, y + diamondRadius);
        ctx.lineTo(playheadX - diamondRadius, y);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.restore();
    }

    // 7. Hover Preview Stylus
    if (hoverRef.current) {
      const hx = hoverRef.current.x;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [waveform, effectiveDuration, bpm, cueTime, hotCues, loop]);

  // Decoupled playback loop: runs via requestAnimationFrame without triggering React renders
  useEffect(() => {
    if (!isPlaying || !getTime) {
      drawWaveform(currentTime);
      if (timecodeElRef.current && !hoverRef.current) {
        timecodeElRef.current.textContent = formatTime(currentTime);
      }
      return;
    }

    let animId: number;
    const loop = () => {
      const now = getTime();
      drawWaveform(now);
      if (timecodeElRef.current && !hoverRef.current) {
        timecodeElRef.current.textContent = formatTime(now);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, getTime, currentTime, drawWaveform]);

  // Observe container resizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const now = getTime ? getTime() : currentTime;
      drawWaveform(now);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [currentTime, drawWaveform, getTime]);

  // =========================================================================
  // User Interaction Handlers (Direct Manipulation)
  // =========================================================================
  const handlePointerAction = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container || effectiveDuration <= 0 || !onSeek) return;

    const rect = container.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const progress = rect.width > 0 ? (clampedX / rect.width) : 0;
    const targetSeconds = progress * effectiveDuration;

    onSeek(targetSeconds);
  }, [effectiveDuration, onSeek]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerAction(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const progress = rect.width > 0 ? (x / rect.width) : 0;
    const hoverSeconds = progress * effectiveDuration;

    hoverRef.current = { x, time: hoverSeconds };
    setHoverTimecode(formatTime(hoverSeconds));

    const now = getTime ? getTime() : currentTime;
    drawWaveform(now);

    // If dragging while pointer down
    if (e.buttons === 1) {
      handlePointerAction(e.clientX);
    }
  };

  const handlePointerLeave = () => {
    hoverRef.current = null;
    setHoverTimecode(null);
    const now = getTime ? getTime() : currentTime;
    drawWaveform(now);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek || effectiveDuration <= 0) return;

    let target = currentTime;
    const step = 5; // ±5 seconds default

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        target = Math.max(0, currentTime - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        target = Math.min(effectiveDuration, currentTime + step);
        break;
      case 'PageUp':
        e.preventDefault();
        target = Math.min(effectiveDuration, currentTime + 30);
        break;
      case 'PageDown':
        e.preventDefault();
        target = Math.max(0, currentTime - 30);
        break;
      case 'Home':
        e.preventDefault();
        target = 0;
        break;
      case 'End':
        e.preventDefault();
        target = effectiveDuration;
        break;
      default:
        return;
    }

    onSeek(target);
  };

  return (
    <div
      ref={containerRef}
      className={`sonora-waveform-ribbon-container ${className}`}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuenow={currentTime}
      aria-valuemin={0}
      aria-valuemax={effectiveDuration}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(effectiveDuration)}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} className="sonora-waveform-canvas" />

      {/* Analyzing / Loading State Overlay */}
      {isLoading && (
        <div className="sonora-waveform-scanning-overlay" aria-live="polite">
          <div className="sonora-waveform-scanning-badge">
            <span className="sonora-waveform-pulse-dot" />
            <span>Analyzing Acoustic Terrain…</span>
          </div>
        </div>
      )}

      {/* Timecode Readout */}
      {effectiveDuration > 0 && (
        <div className="sonora-waveform-readout">
          {hoverTimecode ? (
            <span className="sonora-waveform-readout-active">
              Scrub: <span className="sonora-waveform-readout-time">{hoverTimecode}</span>
            </span>
          ) : (
            <span>
              <span ref={timecodeElRef} className="sonora-waveform-readout-time">{formatTime(currentTime)}</span>
              {' / '}
              <span>{formatTime(effectiveDuration)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
