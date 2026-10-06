/**
 * SONORA Musical Arrangement & Audio Intelligence Engine
 * Authoritative Reference: PRD.md Section 19, 30 & 35, Milestone 5.3 Specification
 * 
 * Reuses Milestone 4 Audio Intelligence to provide:
 * 1. Deterministic tempo compatibility analysis & time-stretch readiness
 * 2. Harmonic key transition intelligence via 24-key Camelot wheel
 * 3. Arrangement-level energy journey profiling & arc classification
 * 4. Musical phrase & section region intersection helpers
 * 
 * Strict Invariant: Does not use random values or pretend semantic certainty.
 * If confidence is low, relations are reported as 'unknown' or 'uncertain'.
 */

import {
  AudioProject,
  AudioClip,
  ArrangementSection,
  TempoCompatibilityResult,
  HarmonicTransitionResult,
  ArrangementEnergyProfile,
} from './types';
import {
  getHarmonicCompatibility,
  CAMELOT_MAP,
  HarmonicRelation,
} from '../audio/analysisTypes';
import { getBarDuration } from './timelineMath';

/**
 * Evaluates deterministic tempo compatibility between a source audio clip and the project.
 * Explicit thresholds:
 * - Match: diff <= 1.0 BPM
 * - Near: diff <= 6.0 BPM
 * - Mismatch: diff > 6.0 BPM
 * - Unknown: missing source BPM or confidence < 0.4
 */
export function evaluateTempoCompatibility(
  sourceBpm: number | undefined,
  projectBpm: number,
  confidence?: number
): TempoCompatibilityResult {
  const safeProjectBpm = Math.max(20, Math.min(300, projectBpm || 120));

  if (!sourceBpm || sourceBpm <= 0 || (confidence !== undefined && confidence < 0.4)) {
    return {
      state: 'unknown',
      sourceBpm: sourceBpm || 0,
      projectBpm: safeProjectBpm,
      diffBpm: 0,
      ratio: 1.0,
      timeStretchRequired: false,
      timeStretchMode: 'none',
      label: 'Tempo Unknown',
      description: 'Insufficient tempo confidence or metadata for musical alignment.',
      confidence: confidence ?? 0.0,
    };
  }

  const diffBpm = parseFloat(Math.abs(sourceBpm - safeProjectBpm).toFixed(2));
  const ratio = parseFloat((safeProjectBpm / sourceBpm).toFixed(4));
  const conf = confidence ?? 0.9;

  if (diffBpm <= 1.0) {
    return {
      state: 'match',
      sourceBpm,
      projectBpm: safeProjectBpm,
      diffBpm,
      ratio,
      timeStretchRequired: false,
      timeStretchMode: 'none',
      label: 'Tempo Match',
      description: `Source tempo (${sourceBpm.toFixed(1)} BPM) seamlessly aligns with project tempo (${safeProjectBpm.toFixed(1)} BPM).`,
      confidence: conf,
    };
  }

  if (diffBpm <= 6.0) {
    return {
      state: 'near',
      sourceBpm,
      projectBpm: safeProjectBpm,
      diffBpm,
      ratio,
      timeStretchRequired: true,
      timeStretchMode: 'granular',
      label: 'Near Tempo Match',
      description: `Small tempo variance (${diffBpm.toFixed(1)} BPM drift). Playback remains source-accurate; stretch required for tight beatlock.`,
      confidence: conf,
    };
  }

  return {
    state: 'mismatch',
    sourceBpm,
    projectBpm: safeProjectBpm,
    diffBpm,
    ratio,
    timeStretchRequired: true,
    timeStretchMode: 'spectral-vocoder',
    label: 'Tempo Disparity',
    description: `Significant tempo variance (${sourceBpm.toFixed(1)} ➔ ${safeProjectBpm.toFixed(1)} BPM). Playback preserves source duration without destructive scaling.`,
    confidence: conf,
  };
}

/**
 * Evaluates harmonic transition compatibility between two adjacent audio clips.
 * Reuses M4 Camelot wheel mappings and harmonic compatibility formulas.
 */
export function evaluateHarmonicTransition(
  clipA: AudioClip,
  clipB: AudioClip
): HarmonicTransitionResult {
  const keyA = clipA.metadata?.key;
  const keyB = clipB.metadata?.key;
  const confA = clipA.metadata?.confidence?.key ?? 0.8;
  const confB = clipB.metadata?.confidence?.key ?? 0.8;
  const combinedConf = parseFloat((confA * confB).toFixed(2));

  const camelotA = clipA.metadata?.camelot || (keyA ? CAMELOT_MAP[keyA] || '?' : '?');
  const camelotB = clipB.metadata?.camelot || (keyB ? CAMELOT_MAP[keyB] || '?' : '?');

  if (!keyA || !keyB || combinedConf < 0.35) {
    return {
      fromKey: keyA || 'Unknown',
      toKey: keyB || 'Unknown',
      fromCamelot: camelotA,
      toCamelot: camelotB,
      compatible: false,
      relation: 'unknown',
      label: 'Harmonic Unknown',
      description: 'Insufficient harmonic confidence to evaluate transition.',
      score: 0.0,
      confidence: combinedConf,
    };
  }

  const match = getHarmonicCompatibility(keyA, keyB);

  return {
    fromKey: keyA,
    toKey: keyB,
    fromCamelot: camelotA,
    toCamelot: camelotB,
    compatible: match.compatible,
    relation: match.relation as HarmonicRelation,
    label: match.label,
    description: match.description,
    score: match.score,
    confidence: combinedConf,
  };
}

/**
 * Calculates arrangement-level energy profile across timeline sections.
 * Analyzes energy arcs (e.g. low-build-peak-release vs consistent vs dynamic wave).
 */
export function calculateArrangementEnergyProfile(
  project: AudioProject,
  sections?: ArrangementSection[]
): ArrangementEnergyProfile {
  const barSec = getBarDuration(project.tempo, project.timeSignature);
  const activeSections = sections || project.sections || [];
  const totalDuration = project.duration;
  const totalBars = Math.max(8, Math.ceil(totalDuration / barSec));

  const points: { time: number; energy: number; bar: number; sectionName?: string }[] = [];
  let totalEnergy = 0;
  let energyCount = 0;
  let peak = 0;

  // Sample energy at 2-bar intervals across the arrangement
  for (let b = 0; b < totalBars; b += 2) {
    const time = b * barSec;
    // Find intersecting clips
    let sampleEnergy = 0.5; // Neutral baseline
    let clipCount = 0;

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (time >= clip.timelineStart && time <= clip.timelineStart + clip.duration) {
          const clipEnergy = clip.metadata?.energy;
          if (typeof clipEnergy === 'number') {
            sampleEnergy += clipEnergy;
            clipCount++;
          }
        }
      }
    }

    if (clipCount > 0) {
      sampleEnergy = sampleEnergy / (clipCount + 1);
    }

    // Match with arrangement section label if present
    const matchedSection = activeSections.find((s) => time >= s.start && time < s.end);
    if (matchedSection?.energy !== undefined) {
      sampleEnergy = (sampleEnergy + matchedSection.energy) / 2;
    }

    const roundedEnergy = parseFloat(Math.min(1.0, Math.max(0.05, sampleEnergy)).toFixed(2));
    points.push({
      time: parseFloat(time.toFixed(2)),
      energy: roundedEnergy,
      bar: b + 1,
      sectionName: matchedSection?.name,
    });

    totalEnergy += roundedEnergy;
    energyCount++;
    if (roundedEnergy > peak) {
      peak = roundedEnergy;
    }
  }

  const overallAverage = energyCount > 0 ? parseFloat((totalEnergy / energyCount).toFixed(2)) : 0.5;

  // Classify energy arc deterministically
  let arcType: ArrangementEnergyProfile['arcType'] = 'consistent';
  if (points.length < 4) {
    arcType = 'uncertain';
  } else {
    const firstQuarter = points.slice(0, Math.floor(points.length / 4));
    const midSection = points.slice(Math.floor(points.length / 4), Math.floor((points.length * 3) / 4));
    const lastQuarter = points.slice(Math.floor((points.length * 3) / 4));

    const avgFirst = firstQuarter.reduce((acc, p) => acc + p.energy, 0) / firstQuarter.length;
    const avgMid = midSection.reduce((acc, p) => acc + p.energy, 0) / midSection.length;
    const avgLast = lastQuarter.reduce((acc, p) => acc + p.energy, 0) / lastQuarter.length;

    if (avgMid > avgFirst + 0.15 && avgMid > avgLast + 0.1) {
      arcType = 'low-build-peak-release';
    } else {
      let variance = 0;
      for (const p of points) {
        variance += Math.pow(p.energy - overallAverage, 2);
      }
      const stdDev = Math.sqrt(variance / points.length);

      if (stdDev < 0.08) {
        arcType = 'flat';
      } else if (stdDev > 0.2) {
        arcType = 'dynamic-wave';
      } else {
        arcType = 'consistent';
      }
    }
  }

  return {
    overallAverage,
    peak,
    arcType,
    points,
    confidence: points.length >= 4 ? 0.85 : 0.4,
  };
}

/**
 * Finds all clip IDs intersecting a given time interval.
 * Used for musical phrase and section-level selections.
 */
export function findIntersectingClips(
  project: AudioProject,
  startTime: number,
  endTime: number
): string[] {
  const clipIds: string[] = [];
  const safeStart = Math.min(startTime, endTime);
  const safeEnd = Math.max(startTime, endTime);

  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const clipStart = clip.timelineStart;
      const clipEnd = clip.timelineStart + clip.duration;
      // Overlaps if clip starts before selection end and ends after selection start
      if (clipStart < safeEnd && clipEnd > safeStart) {
        clipIds.push(clip.id);
      }
    }
  }

  return clipIds;
}

/**
 * Derives default arrangement sections for a project based on musical bars or analyzed tracks.
 */
export function createDefaultArrangementSections(
  tempo: number,
  timeSignature = { numerator: 4, denominator: 4 },
  _totalBars = 32
): ArrangementSection[] {
  const barSec = getBarDuration(tempo, timeSignature);
  const phraseSec = barSec * 8; // 8 bars per standard section

  return [
    {
      id: 'sec-intro',
      name: 'Intro',
      type: 'intro',
      start: 0,
      end: phraseSec,
      energy: 0.35,
      confidence: 1.0,
      color: 'var(--color-accent-cyan)',
    },
    {
      id: 'sec-verse',
      name: 'Verse',
      type: 'verse',
      start: phraseSec,
      end: phraseSec * 2,
      energy: 0.55,
      confidence: 1.0,
      color: 'var(--color-accent-iris)',
    },
    {
      id: 'sec-build',
      name: 'Build',
      type: 'build',
      start: phraseSec * 2,
      end: phraseSec * 3,
      energy: 0.75,
      confidence: 1.0,
      color: 'var(--color-accent-amber)',
    },
    {
      id: 'sec-drop',
      name: 'Drop',
      type: 'drop',
      start: phraseSec * 3,
      end: phraseSec * 4,
      energy: 0.95,
      confidence: 1.0,
      color: 'var(--color-accent-rose)',
    },
  ];
}
