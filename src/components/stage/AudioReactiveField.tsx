/**
 * SONORA AudioReactiveField Component
 * Authoritative Reference: PRD.md, VISUAL_LANGUAGE.md & MOTION_SYSTEM.md
 * 
 * High-performance, decoupled Canvas 2D reactive visualizer.
 * Samples master Web Audio AnalyserNode Float/Byte arrays directly in a rAF loop.
 * React state is strictly decoupled (zero React re-renders at 60fps).
 * 
 * Frequency mapping:
 * - Low/Bass (20-250Hz): Radial acoustic wave expansion, central breathing core.
 * - Mid (250-3500Hz): Resonant orbital contours and harmonic wave distortion.
 * - High/Treble (3.5k-16kHz): Sparkling transient particles and perimeter stardust.
 * - Idle state: Meditative, slow-breathing cosmic field with gentle orbital drift.
 */

import React, { useRef, useEffect } from 'react';
import { getAudioEngine } from '../../audio/AudioEngine';

export interface AudioReactiveFieldProps {
  className?: string;
  intensity?: number; // 0.0 to 1.0 multiplier
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  angle: number;
  speed: number;
  orbitRadius: number;
  color: string;
  alpha: number;
}

interface Shockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  color: string;
}

export const AudioReactiveField: React.FC<AudioReactiveFieldProps> = ({
  className = '',
  intensity = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isDestroyed = false;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Setup frequency and time buffers
    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(128);

    // Particle field: Restrained 36-star celestial constellation (16 in reduced motion)
    const particleCount = prefersReducedMotion ? 16 : 36;
    const particles: Particle[] = [];
    const shockwaves: Shockwave[] = [];

    const baseColors = [
      'rgba(124, 77, 255, ', // Iris
      'rgba(0, 229, 255, ',   // Cyan (Deck A)
      'rgba(255, 179, 0, ',   // Amber (Deck B)
      'rgba(255, 255, 255, ', // Starlight
    ];

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      particles.length = 0;
      const cx = width / 2;
      const cy = height / 2;
      const maxDist = Math.hypot(cx, cy);

      for (let i = 0; i < particleCount; i++) {
        const orbitRadius = Math.random() * maxDist * 0.8 + 60;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: cx + Math.cos(angle) * orbitRadius,
          y: cy + Math.sin(angle) * orbitRadius,
          radius: Math.random() * 1.4 + 0.8,
          baseRadius: Math.random() * 1.4 + 0.8,
          angle,
          speed: (Math.random() * 0.0005 + 0.0002) * (Math.random() > 0.5 ? 1 : -1),
          orbitRadius,
          color: baseColors[i % baseColors.length],
          alpha: Math.random() * 0.35 + 0.15,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let phase = 0;
    let smoothedBass = 0;
    let smoothedMids = 0;
    let smoothedHighs = 0;
    let energyEnvelope = 0; // Musical envelope with graceful decay
    let lastShockwaveTime = 0;

    const render = () => {
      if (isDestroyed) return;

      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;
      const cx = width / 2;
      const cy = height / 2;

      // Sample AudioEngine (discrete snapshot lookup)
      const engine = getAudioEngine();
      engine.getFrequencyData(freqData);
      engine.getTimeDomainData(timeData);
      const state = engine.getState();

      const isDeckAPlaying = state.deckA.transportState === 'playing';
      const isDeckBPlaying = state.deckB.transportState === 'playing';
      const isPlaybackActive = isDeckAPlaying || isDeckBPlaying;

      // Compute chromatic deck bias (Cyan Deck A vs Amber Deck B vs Iris Void)
      let deckColorR = 124;
      let deckColorG = 77;
      let deckColorB = 255;

      if (isDeckAPlaying && !isDeckBPlaying) {
        deckColorR = 0;
        deckColorG = 229;
        deckColorB = 255; // Pure Cyan
      } else if (isDeckBPlaying && !isDeckAPlaying) {
        deckColorR = 255;
        deckColorG = 179;
        deckColorB = 0; // Pure Amber
      } else if (isDeckAPlaying && isDeckBPlaying) {
        const aWeight = Math.max(0, Math.min(1, (1 - state.crossfader.position) / 2));
        deckColorR = Math.round(0 * aWeight + 255 * (1 - aWeight));
        deckColorG = Math.round(229 * aWeight + 179 * (1 - aWeight));
        deckColorB = Math.round(255 * aWeight + 0 * (1 - aWeight));
      }

      // Calculate band energies
      let rawBass = 0;
      let rawMids = 0;
      let rawHighs = 0;

      for (let i = 0; i < 8; i++) rawBass += freqData[i];
      for (let i = 8; i < 40; i++) rawMids += freqData[i];
      for (let i = 40; i < 100; i++) rawHighs += freqData[i];

      rawBass = (rawBass / 8 / 255) * intensity;
      rawMids = (rawMids / 32 / 255) * intensity;
      rawHighs = (rawHighs / 60 / 255) * intensity;

      // Smooth filtering
      const bassDelta = rawBass - smoothedBass;
      smoothedBass += (rawBass - smoothedBass) * 0.12;
      smoothedMids += (rawMids - smoothedMids) * 0.1;
      smoothedHighs += (rawHighs - smoothedHighs) * 0.15;

      // Musical envelope: Fast attack on musical energy, graceful ~1.5s decay back to quiet dormant state
      const targetEnergy = isPlaybackActive ? Math.max(rawBass, rawMids) : 0;
      if (targetEnergy > energyEnvelope) {
        energyEnvelope += (targetEnergy - energyEnvelope) * 0.2;
      } else {
        energyEnvelope += (targetEnergy - energyEnvelope) * 0.035; // Gentle gradual return
      }

      // Spawn radial shockwave only on genuine sub-bass impulses
      const now = performance.now();
      if (!prefersReducedMotion && isPlaybackActive && bassDelta > 0.26 && now - lastShockwaveTime > 450) {
        lastShockwaveTime = now;
        if (shockwaves.length < 2) {
          shockwaves.push({
            radius: 50,
            maxRadius: Math.min(width, height) * 0.65,
            alpha: 0.3 + smoothedBass * 0.25,
            speed: 3.0 + smoothedBass * 3.5,
            color: `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, `,
          });
        }
      }

      // Clear frame
      ctx.clearRect(0, 0, width, height);

      // 1. Central Ambient Luminous Bloom (Controlled Acoustic Aura)
      const ambientRadius = 150 + energyEnvelope * 180;
      const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientRadius);
      const coreAlpha = 0.03 + energyEnvelope * 0.15;
      const outerAlpha = 0.01 + energyEnvelope * 0.08;

      bloomGrad.addColorStop(0, `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, ${coreAlpha})`);
      bloomGrad.addColorStop(0.5, `rgba(124, 77, 255, ${outerAlpha})`);
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ambientRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Active Acoustic Shockwaves (Decaying concentric ripples)
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += sw.speed;
        sw.alpha *= 0.95;

        if (sw.alpha < 0.01 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${sw.color}${sw.alpha})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // 3. Single Harmonic Resonant Ring (Uncluttered Acoustic Horizon)
      const baseRingRadius = 130 + energyEnvelope * 24;
      const pulse = Math.sin(phase * 1.2) * (3 + energyEnvelope * 10);
      const currentRingRadius = baseRingRadius + pulse;

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(10, currentRingRadius), 0, Math.PI * 2);
      const ringAlpha = 0.04 + energyEnvelope * 0.12;
      ctx.strokeStyle = `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, ${ringAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Elegant Single Acoustic Horizon Filament (Fades gracefully with energy envelope)
      if (energyEnvelope > 0.02 && !prefersReducedMotion) {
        const filamentWidth = Math.min(width * 0.75, 780);
        const startX = cx - filamentWidth / 2;
        const step = filamentWidth / (timeData.length - 1);
        const waveScale = (10 + smoothedMids * 36) * energyEnvelope;

        ctx.beginPath();
        for (let t = 0; t < timeData.length; t++) {
          const sample = (timeData[t] - 128) / 128; // -1.0 to 1.0
          const x = startX + t * step;
          const y = cy + 140 + sample * waveScale + Math.sin(phase * 1.1 + t * 0.1) * 3;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const filamentGrad = ctx.createLinearGradient(startX, 0, startX + filamentWidth, 0);
        filamentGrad.addColorStop(0, `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, 0)`);
        filamentGrad.addColorStop(0.5, `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, ${0.12 + energyEnvelope * 0.22})`);
        filamentGrad.addColorStop(1, `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, 0)`);
        ctx.strokeStyle = filamentGrad;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 5. Celestial Constellation Stars & Organic Orbital Drift
      const speedMultiplier = 0.35 + energyEnvelope * 1.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.angle += p.speed * speedMultiplier;
        }

        const dynamicOrbit = p.orbitRadius + Math.sin(phase * 0.8 + i) * (4 + smoothedBass * 12);
        p.x = cx + Math.cos(p.angle) * dynamicOrbit;
        p.y = cy + Math.sin(p.angle) * dynamicOrbit;

        const currentRadius = p.baseRadius + (i % 2 === 0 ? smoothedHighs * 1.5 : smoothedBass * 1.0);
        const currentAlpha = Math.min(0.85, p.alpha + energyEnvelope * 0.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${currentAlpha})`;
        ctx.fill();

        // Subtle transient stardust on high-frequency spikes
        if (smoothedHighs > 0.18 && i % 5 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.25})`;
          ctx.fill();
        }

        // Faint harmonic constellation tethers between immediate nearest neighbors
        if (energyEnvelope > 0.06 && i % 2 === 0 && !prefersReducedMotion) {
          for (let j = i + 1; j < Math.min(i + 3, particles.length); j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 75) {
              const lineAlpha = (1 - dist / 75) * (energyEnvelope * 0.12);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(${deckColorR}, ${deckColorG}, ${deckColorB}, ${lineAlpha})`;
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          }
        }
      }

      phase += 0.012;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Pause animation when tab is not visible to preserve GPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial trigger
    if (prefersReducedMotion) {
      render(); // Single stationary frame
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`sonora-reactive-field ${className}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 'var(--z-field)',
      }}
    />
  );
};
