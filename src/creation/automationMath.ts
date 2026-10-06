/**
 * SONORA Automation & Fade Curve Mathematics Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.2 Specification
 * 
 * Provides:
 * - Linear interpolation for automation lanes
 * - Non-linear fade curve multipliers (linear, ease-in, ease-out, equal-power)
 * - Constant acoustic power crossfade calculations
 */

import { AutomationLane, FadeCurve } from './types';

/**
 * Returns the interpolated automation value at a given timeline timestamp.
 */
export function getInterpolatedAutomationValue(
  lane: AutomationLane,
  time: number,
  defaultValue = 1.0
): number {
  if (!lane || !lane.points || lane.points.length === 0 || !lane.enabled) {
    return defaultValue;
  }

  const sorted = [...lane.points].sort((a, b) => a.time - b.time);

  // Before first point
  if (time <= sorted[0].time) {
    return sorted[0].value;
  }

  // After last point
  if (time >= sorted[sorted.length - 1].time) {
    return sorted[sorted.length - 1].value;
  }

  // Find bounding segment
  for (let i = 0; i < sorted.length - 1; i++) {
    const pA = sorted[i];
    const pB = sorted[i + 1];

    if (time >= pA.time && time <= pB.time) {
      const span = pB.time - pA.time;
      if (span <= 0) return pB.value;
      const ratio = (time - pA.time) / span;
      return pA.value + ratio * (pB.value - pA.value);
    }
  }

  return defaultValue;
}

/**
 * Calculates the amplitude multiplier for a clip fade.
 * @param progress 0.0 to 1.0 progress through the fade duration
 * @param curve Shape curve ('linear' | 'ease-in' | 'ease-out' | 'equal-power')
 * @param isFadeIn True for fade-in, false for fade-out
 */
export function calculateFadeMultiplier(
  progress: number,
  curve: FadeCurve = 'linear',
  isFadeIn = true
): number {
  const x = Math.max(0.0, Math.min(1.0, progress));

  if (isFadeIn) {
    switch (curve) {
      case 'ease-in':
        return x * x;
      case 'ease-out':
        return 1.0 - Math.pow(1.0 - x, 2);
      case 'equal-power':
        return Math.sin(x * 0.5 * Math.PI);
      case 'linear':
      default:
        return x;
    }
  } else {
    // Fade-out
    switch (curve) {
      case 'ease-in':
        return Math.pow(1.0 - x, 2);
      case 'ease-out':
        return 1.0 - x * x;
      case 'equal-power':
        return Math.cos(x * 0.5 * Math.PI);
      case 'linear':
      default:
        return 1.0 - x;
    }
  }
}

/**
 * Calculates equal-power crossfade gains for two overlapping clips.
 * Preserves perceived acoustic energy: gainA^2 + gainB^2 = 1.0
 */
export function calculateCrossfadeGains(
  progress: number,
  curve: 'equal-power' | 'linear' = 'equal-power'
): { gainA: number; gainB: number } {
  const x = Math.max(0.0, Math.min(1.0, progress));

  if (curve === 'linear') {
    return {
      gainA: 1.0 - x,
      gainB: x,
    };
  }

  // Equal-power crossfade (trigonometric quarter-sine/cosine)
  const angle = x * 0.5 * Math.PI;
  return {
    gainA: Math.cos(angle),
    gainB: Math.sin(angle),
  };
}
