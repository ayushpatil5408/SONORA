/**
 * SONORA Audio Warping & Musical Timing Mapping Engine
 * Authoritative Reference: PRD.md Section 19 & 35, Milestone 5.4 Specification
 * 
 * Implements deterministic bidirectional time mapping:
 * - Source Time (immutable audio seconds)
 * - Musical Time (musical beats & bars)
 * - Project Time (arrangement timeline seconds)
 * - Project Musical Time (musical coordinate at project BPM)
 * 
 * Reuses Milestone 4 Audio Analysis (BPM, beats, downbeats, bars, confidence).
 * Pure functions, zero destructive mutations.
 */

import {
  WarpMarker,
  ClipWarpConfig,
  WarpMode,
  WarpMarkerType,
} from './warpTypes';
import { AudioClip } from './types';
import { TrackAnalysis } from '../audio/analysisTypes';

/**
 * Derives initial warp markers from Milestone 4 Audio Analysis beat grid.
 */
export function deriveWarpMarkersFromAnalysis(
  analysis?: TrackAnalysis,
  duration = 16,
  fallbackBpm = 120
): WarpMarker[] {
  const bpm = analysis?.bpm?.bpm && analysis.bpm.bpm > 0 ? analysis.bpm.bpm : fallbackBpm;
  const beatSec = 60 / bpm;
  const markers: WarpMarker[] = [];

  if (analysis?.beats?.beats && analysis.beats.beats.length > 0) {
    const downbeatsSet = new Set(
      (analysis.beats.downbeats || []).map((t) => parseFloat(t.toFixed(3)))
    );

    let beatCounter = 0;
    analysis.beats.beats.forEach((t, idx) => {
      const isDownbeat = downbeatsSet.has(parseFloat(t.toFixed(3))) || idx % 4 === 0;
      const isAnchor = idx === 0;

      let type: WarpMarkerType = 'detected-beat';
      if (isAnchor) type = 'anchor';
      else if (isDownbeat) type = 'detected-downbeat';

      markers.push({
        id: `wm-${idx + 1}-${Math.round(t * 1000)}`,
        sourceTime: parseFloat(t.toFixed(4)),
        musicalBeat: beatCounter,
        musicalBar: Math.floor(beatCounter / 4) + 1,
        type,
        confidence: analysis.beats?.confidence ?? 0.85,
      });

      beatCounter++;
    });
  } else {
    // Generate synthetic anchor grid aligned to fallback tempo
    const totalBeats = Math.max(4, Math.ceil(duration / beatSec));
    for (let b = 0; b <= totalBeats; b++) {
      const t = b * beatSec;
      const isAnchor = b === 0;
      const isDownbeat = b % 4 === 0;

      markers.push({
        id: `wm-synth-${b + 1}`,
        sourceTime: parseFloat(t.toFixed(4)),
        musicalBeat: b,
        musicalBar: Math.floor(b / 4) + 1,
        type: isAnchor ? 'anchor' : isDownbeat ? 'detected-downbeat' : 'detected-beat',
        confidence: analysis?.bpm?.confidence ?? 0.7,
      });
    }
  }

  // Ensure sorted by source time
  return markers.sort((a, b) => a.sourceTime - b.sourceTime);
}

/**
 * Creates default warp configuration for an audio clip.
 */
export function createDefaultWarpConfig(
  sourceBpm: number,
  projectBpm: number,
  analysis?: TrackAnalysis,
  duration = 16,
  initialMode: WarpMode = 'beat_locked'
): ClipWarpConfig {
  const safeSourceBpm = Math.max(30, Math.min(300, sourceBpm || 120));
  const safeProjectBpm = Math.max(30, Math.min(300, projectBpm || 120));
  const ratio = parseFloat((safeProjectBpm / safeSourceBpm).toFixed(4));
  const isExtremeStretch = ratio < 0.5 || ratio > 2.0;

  const markers = deriveWarpMarkersFromAnalysis(analysis, duration, safeSourceBpm);

  return {
    enabled: true,
    mode: initialMode,
    quality: 'balanced',
    sourceBpm: safeSourceBpm,
    sourceBpmConfidence: analysis?.bpm?.confidence ?? 0.85,
    manualBpm: undefined,
    markers,
    pitchLocked: true,
    stretchRatio: ratio,
    isExtremeStretch,
  };
}

/**
 * Calculates current stretch ratio for a clip based on source/manual BPM and project BPM.
 */
export function calculateStretchRatio(
  sourceBpm: number,
  projectBpm: number,
  manualBpm?: number
): { ratio: number; isExtreme: boolean } {
  const effectiveSource = Math.max(30, Math.min(300, manualBpm || sourceBpm || 120));
  const effectiveProject = Math.max(30, Math.min(300, projectBpm || 120));
  const ratio = parseFloat((effectiveProject / effectiveSource).toFixed(4));
  const isExtreme = ratio < 0.5 || ratio > 2.0;
  return { ratio, isExtreme };
}

/**
 * Maps a Source Time (seconds) to Musical Beat using piecewise linear interpolation across warp markers.
 */
export function sourceTimeToMusicalBeat(
  sourceTime: number,
  markers: WarpMarker[],
  fallbackBpm = 120
): number {
  if (!markers || markers.length === 0) {
    const beatSec = 60 / fallbackBpm;
    return Math.max(0, sourceTime) / beatSec;
  }

  // Exact clamp / extrapolation before first marker
  if (sourceTime <= markers[0].sourceTime) {
    if (markers.length >= 2) {
      const dt = markers[1].sourceTime - markers[0].sourceTime;
      const db = markers[1].musicalBeat - markers[0].musicalBeat;
      const slope = dt > 0.0001 ? db / dt : 1 / (60 / fallbackBpm);
      return markers[0].musicalBeat + (sourceTime - markers[0].sourceTime) * slope;
    }
    const beatSec = 60 / fallbackBpm;
    return markers[0].musicalBeat + (sourceTime - markers[0].sourceTime) / beatSec;
  }

  // Exact clamp / extrapolation after last marker
  const last = markers[markers.length - 1];
  if (sourceTime >= last.sourceTime) {
    if (markers.length >= 2) {
      const prev = markers[markers.length - 2];
      const dt = last.sourceTime - prev.sourceTime;
      const db = last.musicalBeat - prev.musicalBeat;
      const slope = dt > 0.0001 ? db / dt : 1 / (60 / fallbackBpm);
      return last.musicalBeat + (sourceTime - last.sourceTime) * slope;
    }
    const beatSec = 60 / fallbackBpm;
    return last.musicalBeat + (sourceTime - last.sourceTime) / beatSec;
  }

  // Piecewise linear interpolation between adjacent markers
  for (let i = 0; i < markers.length - 1; i++) {
    const m0 = markers[i];
    const m1 = markers[i + 1];
    if (sourceTime >= m0.sourceTime && sourceTime <= m1.sourceTime) {
      const span = m1.sourceTime - m0.sourceTime;
      if (span <= 0.0001) return m0.musicalBeat;
      const fraction = (sourceTime - m0.sourceTime) / span;
      return m0.musicalBeat + fraction * (m1.musicalBeat - m0.musicalBeat);
    }
  }

  return 0;
}

/**
 * Maps a Musical Beat to Source Time (seconds) using inverse piecewise linear interpolation across warp markers.
 */
export function musicalBeatToSourceTime(
  beat: number,
  markers: WarpMarker[],
  fallbackBpm = 120
): number {
  if (!markers || markers.length === 0) {
    const beatSec = 60 / fallbackBpm;
    return Math.max(0, beat) * beatSec;
  }

  // Before first marker
  if (beat <= markers[0].musicalBeat) {
    if (markers.length >= 2) {
      const dt = markers[1].sourceTime - markers[0].sourceTime;
      const db = markers[1].musicalBeat - markers[0].musicalBeat;
      const slope = db > 0.0001 ? dt / db : 60 / fallbackBpm;
      return Math.max(0, markers[0].sourceTime + (beat - markers[0].musicalBeat) * slope);
    }
    const beatSec = 60 / fallbackBpm;
    return Math.max(0, markers[0].sourceTime + (beat - markers[0].musicalBeat) * beatSec);
  }

  // After last marker
  const last = markers[markers.length - 1];
  if (beat >= last.musicalBeat) {
    if (markers.length >= 2) {
      const prev = markers[markers.length - 2];
      const dt = last.sourceTime - prev.sourceTime;
      const db = last.musicalBeat - prev.musicalBeat;
      const slope = db > 0.0001 ? dt / db : 60 / fallbackBpm;
      return Math.max(0, last.sourceTime + (beat - last.musicalBeat) * slope);
    }
    const beatSec = 60 / fallbackBpm;
    return Math.max(0, last.sourceTime + (beat - last.musicalBeat) * beatSec);
  }

  // Segment search
  for (let i = 0; i < markers.length - 1; i++) {
    const m0 = markers[i];
    const m1 = markers[i + 1];
    if (beat >= m0.musicalBeat && beat <= m1.musicalBeat) {
      const span = m1.musicalBeat - m0.musicalBeat;
      if (span <= 0.0001) return m0.sourceTime;
      const fraction = (beat - m0.musicalBeat) / span;
      return m0.sourceTime + fraction * (m1.sourceTime - m0.sourceTime);
    }
  }

  return 0;
}

/**
 * Converts a Musical Beat to Project Timeline Seconds at the given project tempo.
 */
export function musicalBeatToProjectTime(
  beat: number,
  clipTimelineStart: number,
  projectBpm: number
): number {
  const projectBeatSec = 60 / projectBpm;
  return parseFloat((clipTimelineStart + beat * projectBeatSec).toFixed(4));
}

/**
 * Converts Project Timeline Seconds to Musical Beat relative to clip start.
 */
export function projectTimeToMusicalBeat(
  projectTime: number,
  clipTimelineStart: number,
  projectBpm: number
): number {
  const projectBeatSec = 60 / projectBpm;
  return (projectTime - clipTimelineStart) / projectBeatSec;
}

/**
 * Converts Source Time to Project Timeline Time based on clip configuration.
 */
export function sourceTimeToProjectTime(
  sourceTime: number,
  clip: AudioClip,
  projectBpm: number
): number {
  if (!clip.warp || !clip.warp.enabled || clip.warp.mode === 'free') {
    // Free mode: 1-to-1 unwarped seconds offset from sourceStart
    const elapsed = sourceTime - clip.sourceStart;
    return parseFloat((clip.timelineStart + elapsed).toFixed(4));
  }

  const effectiveBpm = clip.warp.manualBpm || clip.warp.sourceBpm;
  const startBeat = sourceTimeToMusicalBeat(clip.sourceStart, clip.warp.markers, effectiveBpm);
  const currentBeat = sourceTimeToMusicalBeat(sourceTime, clip.warp.markers, effectiveBpm);
  const relativeBeats = currentBeat - startBeat;

  const projectBeatSec = 60 / projectBpm;
  return parseFloat((clip.timelineStart + relativeBeats * projectBeatSec).toFixed(4));
}

/**
 * Converts Project Timeline Time to Source Audio Time based on clip configuration.
 */
export function projectTimeToSourceTime(
  projectTime: number,
  clip: AudioClip,
  projectBpm: number
): number {
  if (!clip.warp || !clip.warp.enabled || clip.warp.mode === 'free') {
    const elapsed = projectTime - clip.timelineStart;
    return parseFloat((clip.sourceStart + elapsed).toFixed(4));
  }

  const effectiveBpm = clip.warp.manualBpm || clip.warp.sourceBpm;
  const projectBeatSec = 60 / projectBpm;
  const relativeBeats = (projectTime - clip.timelineStart) / projectBeatSec;
  const startBeat = sourceTimeToMusicalBeat(clip.sourceStart, clip.warp.markers, effectiveBpm);
  const targetBeat = startBeat + relativeBeats;

  return parseFloat(musicalBeatToSourceTime(targetBeat, clip.warp.markers, effectiveBpm).toFixed(4));
}

/**
 * Computes active timeline playback duration for a clip given project tempo.
 * For project_locked clips, duration scales according to musical length.
 */
export function getWarpedClipDuration(clip: AudioClip, projectBpm: number): number {
  const sourceWindow = Math.max(0.1, clip.sourceEnd - clip.sourceStart);

  if (!clip.warp || !clip.warp.enabled || clip.warp.mode === 'free') {
    return parseFloat(sourceWindow.toFixed(4));
  }

  const effectiveBpm = clip.warp.manualBpm || clip.warp.sourceBpm || 120;
  const startBeat = sourceTimeToMusicalBeat(clip.sourceStart, clip.warp.markers, effectiveBpm);
  const endBeat = sourceTimeToMusicalBeat(clip.sourceEnd, clip.warp.markers, effectiveBpm);
  const beatSpan = Math.max(0.1, endBeat - startBeat);

  const projectBeatSec = 60 / projectBpm;
  return parseFloat((beatSpan * projectBeatSec).toFixed(4));
}

/**
 * Adds a warp marker to a warp config, maintaining sorted order by source time.
 */
export function addWarpMarkerToConfig(
  warp: ClipWarpConfig,
  sourceTime: number,
  musicalBeat: number,
  type: WarpMarkerType = 'manual'
): ClipWarpConfig {
  const newMarker: WarpMarker = {
    id: `wm-user-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    sourceTime: parseFloat(sourceTime.toFixed(4)),
    musicalBeat: parseFloat(musicalBeat.toFixed(2)),
    musicalBar: Math.floor(musicalBeat / 4) + 1,
    type,
    confidence: 1.0,
  };

  const markers = [...warp.markers, newMarker].sort((a, b) => a.sourceTime - b.sourceTime);
  return { ...warp, markers };
}

/**
 * Moves an existing warp marker to a new source timestamp.
 */
export function moveWarpMarkerInConfig(
  warp: ClipWarpConfig,
  markerId: string,
  newSourceTime: number
): ClipWarpConfig {
  const markers = warp.markers
    .map((m) => {
      if (m.id !== markerId) return m;
      return {
        ...m,
        sourceTime: parseFloat(Math.max(0, newSourceTime).toFixed(4)),
      };
    })
    .sort((a, b) => a.sourceTime - b.sourceTime);

  return { ...warp, markers };
}

/**
 * Deletes a warp marker by ID (preserving at least 1 anchor).
 */
export function deleteWarpMarkerFromConfig(
  warp: ClipWarpConfig,
  markerId: string
): ClipWarpConfig {
  if (warp.markers.length <= 1) return warp; // Do not delete sole anchor
  const markers = warp.markers.filter((m) => m.id !== markerId);
  return { ...warp, markers };
}

/**
 * Resets warp configuration to initial analysis state.
 */
export function resetWarpConfig(
  warp: ClipWarpConfig,
  analysis?: TrackAnalysis,
  duration = 16
): ClipWarpConfig {
  const baseBpm = warp.sourceBpm;
  const markers = deriveWarpMarkersFromAnalysis(analysis, duration, baseBpm);
  return {
    ...warp,
    manualBpm: undefined,
    markers,
  };
}
