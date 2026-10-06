/**
 * SONORA DJ Math & Formatting Utilities
 * Authoritative Reference: PRD.md, DESIGN_SYSTEM.md & PRODUCT_ARCHITECTURE.md
 * 
 * Pure mathematical utilities for formatting audio readouts, logarithmic
 * frequency curves, decibel conversions, and crossfader telemetry.
 */

import { clamp } from './types';

/**
 * Formats a frequency in Hertz to human-readable string (e.g. "250 Hz", "1.2 kHz").
 */
export function formatFrequency(hz: number): string {
  const clampedHz = clamp(hz, 20, 20000);
  if (clampedHz >= 1000) {
    const khz = (clampedHz / 1000).toFixed(1);
    return `${khz.endsWith('.0') ? khz.slice(0, -2) : khz} kHz`;
  }
  return `${Math.round(clampedHz)} Hz`;
}

/**
 * Formats a decibel value with explicit sign (e.g. "+6.0 dB", "0.0 dB", "-12.0 dB").
 */
export function formatDecibels(db: number): string {
  if (db === 0) return '0.0 dB';
  const prefix = db > 0 ? '+' : '';
  return `${prefix}${db.toFixed(1)} dB`;
}

/**
 * Formats playback rate as multiplier and pitch delta (e.g. "1.00x (0%)", "1.08x (+8%)").
 */
export function formatPlaybackRate(rate: number): { text: string; delta: string } {
  const clamped = clamp(rate, 0.5, 1.5);
  const deltaPercent = Math.round((clamped - 1.0) * 100);
  const sign = deltaPercent > 0 ? '+' : '';
  return {
    text: `${clamped.toFixed(2)}x`,
    delta: `${sign}${deltaPercent}%`,
  };
}

/**
 * Formats crossfader position (-1.0 to +1.0) into semantic DJ telemetry.
 */
export function formatCrossfaderPosition(position: number): string {
  const clamped = clamp(position, -1.0, 1.0);
  if (Math.abs(clamped) < 0.02) {
    return 'CENTER';
  }
  if (clamped < 0) {
    const percent = Math.round(Math.abs(clamped) * 100);
    return `DECK A (${percent}%)`;
  }
  const percent = Math.round(clamped * 100);
  return `DECK B (${percent}%)`;
}
