/**
 * SONORA Audio-Reactive Environment Canvas
 * Authoritative Reference: PRD.md Section 19, MOTION_SYSTEM.md, Milestone 3
 * 
 * High-performance 60fps decoupled Canvas 2D render loop.
 * Samples Web Audio AnalyserNode directly without React state polling.
 * Renders distinct physical & acoustic geometry for each environment:
 * - Orbital: Gravitational particle fields, celestial rings, central singularity.
 * - Liquid: Viscous fluid membranes, surface tension undulations, capillary streams.
 * - Organism: Bio-acoustic radiating filaments, breathing resonant spine, wave ciliated structures.
 * 
 * Strict fallback for `prefers-reduced-motion`.
 */

import React, { useRef, useEffect } from 'react';
import { DJEnvironment } from './types';
import { getAudioEngine } from '../../audio/AudioEngine';

export interface AudioReactiveCanvasProps {
  activeEnvironment: DJEnvironment;
  crossfaderPosition: number; // -1.0 to +1.0
  deckAIsPlaying: boolean;
  deckBIsPlaying: boolean;
  deckAVolume: number;
  deckBVolume: number;
  className?: string;
}

export const AudioReactiveCanvas: React.FC<AudioReactiveCanvasProps> = ({
  activeEnvironment,
  crossfaderPosition,
  deckAIsPlaying,
  deckBIsPlaying,
  deckAVolume,
  deckBVolume,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store transient parameters in refs to avoid restarting rAF loop on React prop changes
  const envRef = useRef<DJEnvironment>(activeEnvironment);
  const xfaderRef = useRef<number>(crossfaderPosition);
  const isPlayingARef = useRef<boolean>(deckAIsPlaying);
  const isPlayingBRef = useRef<boolean>(deckBIsPlaying);
  const volARef = useRef<number>(deckAVolume);
  const volBRef = useRef<number>(deckBVolume);

  useEffect(() => {
    envRef.current = activeEnvironment;
  }, [activeEnvironment]);

  useEffect(() => {
    xfaderRef.current = crossfaderPosition;
  }, [crossfaderPosition]);

  useEffect(() => {
    isPlayingARef.current = deckAIsPlaying;
  }, [deckAIsPlaying]);

  useEffect(() => {
    isPlayingBRef.current = deckBIsPlaying;
  }, [deckBIsPlaying]);

  useEffect(() => {
    volARef.current = deckAVolume;
  }, [deckAVolume]);

  useEffect(() => {
    volBRef.current = deckBVolume;
  }, [deckBVolume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const engine = getAudioEngine();

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fixed frequency buffers for analyser sampling
    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(128);

    // Particle state pools
    const orbitalParticles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      speed: number;
      distance: number;
      deck: 'A' | 'B' | 'center';
    }> = [];

    for (let i = 0; i < 48; i++) {
      orbitalParticles.push({
        x: 0,
        y: 0,
        radius: Math.random() * 2 + 0.8,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        distance: Math.random() * 120 + 40,
        deck: i < 20 ? 'A' : i < 40 ? 'B' : 'center',
      });
    }

    let globalTick = 0;
    let smoothBass = 0;
    let smoothMid = 0;
    let smoothTreble = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      globalTick += 0.016;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear with subtle alpha trail for cinematic optical luminescence
      ctx.clearRect(0, 0, width, height);

      // Sample AnalyserNode tap directly from Web Audio engine
      const analyserNode = engine.getAnalyserNode();
      if (analyserNode) {
        analyserNode.getByteFrequencyData(freqData);
        analyserNode.getByteTimeDomainData(timeData);
      }

      // Compute spectral bands
      let rawBass = 0;
      for (let i = 0; i < 8; i++) rawBass += freqData[i];
      rawBass = rawBass / (8 * 255);

      let rawMid = 0;
      for (let i = 8; i < 40; i++) rawMid += freqData[i];
      rawMid = rawMid / (32 * 255);

      let rawTreble = 0;
      for (let i = 40; i < 96; i++) rawTreble += freqData[i];
      rawTreble = rawTreble / (56 * 255);

      // Active state gating
      const hasAudio = isPlayingARef.current || isPlayingBRef.current;
      const targetBass = hasAudio ? rawBass : 0.05;
      const targetMid = hasAudio ? rawMid : 0.04;
      const targetTreble = hasAudio ? rawTreble : 0.03;

      // Smooth decay filter
      smoothBass += (targetBass - smoothBass) * 0.15;
      smoothMid += (targetMid - smoothMid) * 0.12;
      smoothTreble += (targetTreble - smoothTreble) * 0.12;

      // Motion scale for reduced motion accessibility
      const motionMult = prefersReducedMotion ? 0.1 : 1.0;

      // Spatial Center Anchors: Deck A, Center Mixer, Deck B
      const deckACenter = { x: width * 0.22, y: height * 0.5 };
      const mixerCenter = { x: width * 0.5, y: height * 0.5 };
      const deckBCenter = { x: width * 0.78, y: height * 0.5 };

      const xfader = xfaderRef.current; // -1 (A) to +1 (B)
      const normXfader = (xfader + 1) / 2; // 0 (A) to 1 (B)

      // =======================================================================
      // ENVIRONMENT 1: ORGANIC ORBITAL
      // =======================================================================
      if (envRef.current === 'orbital') {
        // 1. Concentric Orbital Resonance Rings
        // Deck A Celestial Rings (Cyan)
        const radiusA = 120 + smoothBass * 30 * motionMult;
        ctx.beginPath();
        ctx.arc(deckACenter.x, deckACenter.y, radiusA, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.12 + (1 - normXfader) * 0.2 * (isPlayingARef.current ? 1 : 0.3)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(deckACenter.x, deckACenter.y, radiusA * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.setLineDash([2, 6]);
        ctx.stroke();

        // Deck B Solar Rings (Amber)
        const radiusB = 120 + smoothBass * 30 * motionMult;
        ctx.beginPath();
        ctx.arc(deckBCenter.x, deckBCenter.y, radiusB, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 179, 0, ${0.12 + normXfader * 0.2 * (isPlayingBRef.current ? 1 : 0.3)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(deckBCenter.x, deckBCenter.y, radiusB * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 179, 0, 0.08)';
        ctx.setLineDash([2, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Central Gravitational Singularity Core
        const coreBloom = (smoothBass * 0.8 + smoothMid * 0.4) * motionMult;
        const centerGradient = ctx.createRadialGradient(
          mixerCenter.x,
          mixerCenter.y,
          4,
          mixerCenter.x,
          mixerCenter.y,
          70 + coreBloom * 45
        );

        // Core blends from Cyan (left) to Violet (center) to Amber (right) based on crossfader
        if (normXfader < 0.4) {
          centerGradient.addColorStop(0, `rgba(0, 229, 255, ${0.45 + coreBloom * 0.3})`);
          centerGradient.addColorStop(0.5, 'rgba(124, 77, 255, 0.25)');
        } else if (normXfader > 0.6) {
          centerGradient.addColorStop(0, `rgba(255, 179, 0, ${0.45 + coreBloom * 0.3})`);
          centerGradient.addColorStop(0.5, 'rgba(192, 132, 252, 0.25)');
        } else {
          // Harmonic Convergence in center
          centerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.7 + coreBloom * 0.3})`);
          centerGradient.addColorStop(0.3, 'rgba(168, 85, 247, 0.4)');
          centerGradient.addColorStop(0.7, 'rgba(0, 229, 255, 0.2)');
        }
        centerGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(mixerCenter.x, mixerCenter.y, 80 + coreBloom * 50, 0, Math.PI * 2);
        ctx.fill();

        // 3. Orbital Particles
        for (const p of orbitalParticles) {
          if (!prefersReducedMotion) {
            p.angle += p.speed * (1 + smoothMid * 2.5);
          }

          let origin = mixerCenter;
          let color = 'rgba(168, 85, 247, 0.6)';

          if (p.deck === 'A') {
            origin = deckACenter;
            color = `rgba(0, 229, 255, ${isPlayingARef.current ? 0.75 : 0.25})`;
          } else if (p.deck === 'B') {
            origin = deckBCenter;
            color = `rgba(255, 179, 0, ${isPlayingBRef.current ? 0.75 : 0.25})`;
          }

          const dist = p.distance + Math.sin(globalTick + p.angle) * 10 * smoothBass;
          const px = origin.x + Math.cos(p.angle) * dist;
          const py = origin.y + Math.sin(p.angle) * (dist * 0.7);

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, p.radius * (1 + smoothTreble * 1.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // =======================================================================
      // ENVIRONMENT 2: LIQUID INSTRUMENT
      // =======================================================================
      else if (envRef.current === 'liquid') {
        // Fluid membrane wave undulations
        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const offsetY = height * (0.42 + w * 0.08);

          ctx.moveTo(0, offsetY);
          const steps = 18;
          for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * width;
            // Capillary fluid surface tension calculation
            const waveFreq = 0.005 + w * 0.003;
            const waveSpeed = globalTick * (0.8 + w * 0.4) * motionMult;
            const amp = (12 + smoothBass * 32 + w * 8) * motionMult;

            // Surface dip influenced by crossfader energy
            const distFromCenter = Math.abs(x - width * (0.2 + normXfader * 0.6)) / width;
            const tension = Math.exp(-distFromCenter * 4);

            const y = offsetY + Math.sin(x * waveFreq + waveSpeed) * amp + tension * smoothMid * 25;
            ctx.lineTo(x, y);
          }

          const grad = ctx.createLinearGradient(0, 0, width, 0);
          grad.addColorStop(0, `rgba(0, 229, 255, ${0.15 * (1 - normXfader * 0.6)})`);
          grad.addColorStop(0.5, `rgba(168, 85, 247, ${0.25 + smoothBass * 0.3})`);
          grad.addColorStop(1, `rgba(255, 179, 0, ${0.15 * (0.4 + normXfader * 0.6)})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.0 - w * 0.4;
          ctx.stroke();
        }

        // Viscous Tendril Flow connecting Decks across Crossfader
        ctx.beginPath();
        const startX = deckACenter.x + 80;
        const startY = deckACenter.y + Math.sin(globalTick * 2) * 6 * motionMult;
        const endX = deckBCenter.x - 80;
        const endY = deckBCenter.y + Math.cos(globalTick * 2) * 6 * motionMult;

        const cp1X = width * 0.4;
        const cp1Y = height * 0.58 + (normXfader - 0.5) * 40 * smoothMid;
        const cp2X = width * 0.6;
        const cp2Y = height * 0.58 - (normXfader - 0.5) * 40 * smoothMid;

        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);

        ctx.strokeStyle = `rgba(129, 140, 248, ${0.35 + smoothTreble * 0.4})`;
        ctx.lineWidth = 3 + smoothBass * 6 * motionMult;
        ctx.stroke();

        // Liquid Droplet Plinths Glow
        const liquidDropGradA = ctx.createRadialGradient(
          deckACenter.x,
          deckACenter.y,
          20,
          deckACenter.x,
          deckACenter.y,
          130 + smoothBass * 25
        );
        liquidDropGradA.addColorStop(0, `rgba(0, 229, 255, ${isPlayingARef.current ? 0.3 : 0.08})`);
        liquidDropGradA.addColorStop(1, 'transparent');
        ctx.fillStyle = liquidDropGradA;
        ctx.beginPath();
        ctx.arc(deckACenter.x, deckACenter.y, 140, 0, Math.PI * 2);
        ctx.fill();

        const liquidDropGradB = ctx.createRadialGradient(
          deckBCenter.x,
          deckBCenter.y,
          20,
          deckBCenter.x,
          deckBCenter.y,
          130 + smoothBass * 25
        );
        liquidDropGradB.addColorStop(0, `rgba(255, 179, 0, ${isPlayingBRef.current ? 0.3 : 0.08})`);
        liquidDropGradB.addColorStop(1, 'transparent');
        ctx.fillStyle = liquidDropGradB;
        ctx.beginPath();
        ctx.arc(deckBCenter.x, deckBCenter.y, 140, 0, Math.PI * 2);
        ctx.fill();
      }

      // =======================================================================
      // ENVIRONMENT 3: ACOUSTIC ORGANISM
      // =======================================================================
      else if (envRef.current === 'organism') {
        // 1. Resonant Living Acoustic Spine (Central Mixer Organ)
        const spineSegments = 16;
        const spineHeight = height * 0.65;
        const spineTop = height * 0.18;

        ctx.beginPath();
        for (let i = 0; i <= spineSegments; i++) {
          const t = i / spineSegments;
          const y = spineTop + t * spineHeight;
          // Rib breathing expansion driven by bass & mid harmonics
          const ribWidth = (Math.sin(t * Math.PI) * 45 + smoothBass * 35) * motionMult;
          const ribPulse = Math.sin(globalTick * 3 + t * 6) * 5 * motionMult;

          // Draw horizontal acoustic rib vertebra
          ctx.moveTo(mixerCenter.x - ribWidth - ribPulse, y);
          ctx.lineTo(mixerCenter.x + ribWidth + ribPulse, y);
        }

        ctx.strokeStyle = `rgba(192, 132, 252, ${0.35 + smoothMid * 0.45})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 2. Central Breathing Vertebrae Core
        ctx.beginPath();
        ctx.moveTo(mixerCenter.x, spineTop);
        ctx.lineTo(mixerCenter.x, spineTop + spineHeight);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + smoothBass * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 3. Radial Acoustic Filaments / Cilia (Deck Gills)
        const renderFilaments = (center: { x: number; y: number }, colorHex: string, isPlaying: boolean) => {
          const filamentCount = 28;
          ctx.lineWidth = 1.0;
          for (let f = 0; f < filamentCount; f++) {
            const angle = (f / filamentCount) * Math.PI * 2;
            const baseLen = 90 + Math.sin(f * 4 + globalTick * 2) * 10;
            const fftIdx = f % 64;
            const fftVal = (freqData[fftIdx] / 255) * motionMult;
            const length = baseLen + fftVal * 40;

            const x1 = center.x + Math.cos(angle) * 35;
            const y1 = center.y + Math.sin(angle) * 35;
            const x2 = center.x + Math.cos(angle) * length;
            const y2 = center.y + Math.sin(angle) * length;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `${colorHex}${isPlaying ? '44' : '15'}`;
            ctx.stroke();
          }
        };

        renderFilaments(deckACenter, '#00E5FF', isPlayingARef.current);
        renderFilaments(deckBCenter, '#FFB300', isPlayingBRef.current);

        // 4. Bio-Acoustic Signal Tendrils flowing to central spine
        ctx.beginPath();
        ctx.moveTo(deckACenter.x + 50, deckACenter.y);
        ctx.quadraticCurveTo(width * 0.38, height * 0.48, mixerCenter.x - 20, mixerCenter.y);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.25 + (1 - normXfader) * 0.3})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(deckBCenter.x - 50, deckBCenter.y);
        ctx.quadraticCurveTo(width * 0.62, height * 0.48, mixerCenter.x + 20, mixerCenter.y);
        ctx.strokeStyle = `rgba(255, 179, 0, ${0.25 + normXfader * 0.3})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`sonora-audio-reactive-canvas is-${activeEnvironment} ${className}`}
      aria-hidden="true"
    />
  );
};
