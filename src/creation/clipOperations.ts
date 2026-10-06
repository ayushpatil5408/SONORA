/**
 * SONORA Non-Destructive Clip & Track Operations Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0 & 5.1 Specification
 * 
 * Implements pure, immutable operations for audio clips, tracks, and markers.
 * Guarantees non-destructive editing: source ranges are trimmed via offsets,
 * never modifying original source audio buffers.
 */

import {
  AudioProject,
  AudioProjectTrack,
  AudioClip,
  ProjectMarker,
  ArrangementSection,
  SnapMode,
  FadeCurve,
  ClipCrossfade,
  TrackProcessorType,
  TrackProcessor,
  AutomationPoint,
  AutomationLane,
  WarpMode,
  WarpQuality,
  WarpMarkerType,
} from './types';
import {
  snapTimeToGrid,
  calculateProjectDuration,
  getBarDuration,
  getBeatDuration,
  formatMusicalTime,
} from './timelineMath';
import { createTrackProcessor } from './trackProcessing';
import {
  getWarpedClipDuration,
  calculateStretchRatio,
  createDefaultWarpConfig,
  sourceTimeToMusicalBeat,
  addWarpMarkerToConfig,
  moveWarpMarkerInConfig,
  deleteWarpMarkerFromConfig,
  resetWarpConfig,
} from './warpEngine';

function generateId(prefix = 'clip'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Adds an audio clip to a project track.
 */
export function addClip(
  project: AudioProject,
  trackId: string,
  clipData: Omit<AudioClip, 'id' | 'sourceTrackId'>
): AudioProject {
  const initialWarp = clipData.warp || createDefaultWarpConfig(
    clipData.metadata?.bpm || 120,
    project.tempo,
    undefined,
    clipData.duration || 16,
    'beat_locked'
  );

  const initialClip: AudioClip = {
    ...clipData,
    id: generateId('clip'),
    sourceTrackId: trackId,
    gain: clipData.gain ?? 1.0,
    pan: clipData.pan ?? 0.0,
    fadeIn: clipData.fadeIn ?? 0.0,
    fadeOut: clipData.fadeOut ?? 0.0,
    warp: initialWarp,
  };

  const resolvedDuration = initialWarp.mode === 'project_locked'
    ? getWarpedClipDuration(initialClip, project.tempo)
    : initialClip.duration;

  const newClip: AudioClip = {
    ...initialClip,
    duration: resolvedDuration,
  };

  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId) return track;
    return {
      ...track,
      clips: [...track.clips, newClip],
    };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Moves an audio clip to a new timeline position, optionally snapped to grid.
 */
export function moveClip(
  project: AudioProject,
  clipId: string,
  newTimelineStart: number,
  snapMode: SnapMode = 'off'
): AudioProject {
  const snappedStart = snapTimeToGrid(
    Math.max(0, newTimelineStart),
    snapMode,
    project.tempo,
    project.timeSignature
  );

  const updatedTracks = project.tracks.map((track) => {
    const clipIndex = track.clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return track;

    const updatedClips = [...track.clips];
    updatedClips[clipIndex] = {
      ...updatedClips[clipIndex],
      timelineStart: snappedStart,
    };

    return {
      ...track,
      clips: updatedClips,
    };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Trims the start of a clip non-destructively.
 * Advances `timelineStart` and `sourceStart` by the delta.
 */
export function trimClipStart(
  project: AudioProject,
  clipId: string,
  targetTimelineStart: number,
  snapMode: SnapMode = 'off'
): AudioProject {
  const snappedStart = snapTimeToGrid(
    Math.max(0, targetTimelineStart),
    snapMode,
    project.tempo,
    project.timeSignature
  );

  const updatedTracks = project.tracks.map((track) => {
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return track;

    const delta = snappedStart - clip.timelineStart;
    const newSourceStart = clip.sourceStart + delta;
    const newDuration = clip.sourceEnd - newSourceStart;

    // Minimum clip duration of 0.05s
    if (newSourceStart < 0 || newDuration < 0.05) {
      return track;
    }

    const updatedClips = track.clips.map((c) => {
      if (c.id !== clipId) return c;
      const updated = {
        ...c,
        timelineStart: snappedStart,
        sourceStart: parseFloat(newSourceStart.toFixed(4)),
      };
      const finalDuration = c.warp?.mode === 'project_locked'
        ? getWarpedClipDuration(updated, project.tempo)
        : parseFloat(newDuration.toFixed(4));
      return {
        ...updated,
        duration: finalDuration,
      };
    });

    return { ...track, clips: updatedClips };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Trims the end of a clip non-destructively.
 * Adjusts `duration` and `sourceEnd`.
 */
export function trimClipEnd(
  project: AudioProject,
  clipId: string,
  targetDuration: number,
  snapMode: SnapMode = 'off'
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return track;

    let resolvedDuration = Math.max(0.05, targetDuration);
    if (snapMode !== 'off') {
      const targetEnd = clip.timelineStart + resolvedDuration;
      const snappedEnd = snapTimeToGrid(targetEnd, snapMode, project.tempo, project.timeSignature);
      resolvedDuration = Math.max(0.05, snappedEnd - clip.timelineStart);
    }

    const newSourceEnd = clip.sourceStart + resolvedDuration;

    const updatedClips = track.clips.map((c) => {
      if (c.id !== clipId) return c;
      const updated = {
        ...c,
        sourceEnd: parseFloat(newSourceEnd.toFixed(4)),
      };
      const finalDuration = c.warp?.mode === 'project_locked'
        ? getWarpedClipDuration(updated, project.tempo)
        : parseFloat(resolvedDuration.toFixed(4));
      return {
        ...updated,
        duration: finalDuration,
      };
    });

    return { ...track, clips: updatedClips };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Splits an audio clip at a specified timeline position into two non-destructive clips.
 */
export function splitClip(
  project: AudioProject,
  clipId: string,
  splitTime: number
): AudioProject {
  let wasSplit = false;

  const updatedTracks = project.tracks.map((track) => {
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return track;

    const clipEnd = clip.timelineStart + clip.duration;
    // Split must occur strictly inside the clip boundaries (with 0.05s margins)
    if (splitTime <= clip.timelineStart + 0.05 || splitTime >= clipEnd - 0.05) {
      return track;
    }

    const splitOffset = splitTime - clip.timelineStart;
    const firstDuration = splitOffset;
    const secondDuration = clip.duration - splitOffset;

    const firstClip: AudioClip = {
      ...clip,
      sourceEnd: parseFloat((clip.sourceStart + firstDuration).toFixed(4)),
      duration: parseFloat(firstDuration.toFixed(4)),
    };

    const secondClip: AudioClip = {
      ...clip,
      id: generateId('clip'),
      timelineStart: parseFloat(splitTime.toFixed(4)),
      sourceStart: parseFloat((clip.sourceStart + firstDuration).toFixed(4)),
      sourceEnd: clip.sourceEnd,
      duration: parseFloat(secondDuration.toFixed(4)),
      fadeIn: 0.0, // Reset default fades on split point
    };

    wasSplit = true;
    const updatedClips = track.clips.flatMap((c) => (c.id === clipId ? [firstClip, secondClip] : [c]));
    return { ...track, clips: updatedClips };
  });

  if (!wasSplit) return project;

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Duplicates a clip at an offset position on the timeline.
 */
export function duplicateClip(
  project: AudioProject,
  clipId: string,
  offsetSeconds?: number
): AudioProject {
  let wasDuplicated = false;

  const updatedTracks = project.tracks.map((track) => {
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return track;

    const shift = offsetSeconds !== undefined ? offsetSeconds : clip.duration;
    const duplicated: AudioClip = {
      ...clip,
      id: generateId('clip'),
      timelineStart: parseFloat((clip.timelineStart + shift).toFixed(4)),
      warp: clip.warp ? { ...clip.warp, markers: [...clip.warp.markers] } : undefined,
    };

    wasDuplicated = true;
    return {
      ...track,
      clips: [...track.clips, duplicated],
    };
  });

  if (!wasDuplicated) return project;

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Deletes a clip from a project track.
 */
export function deleteClip(project: AudioProject, clipId: string): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.filter((c) => c.id !== clipId),
  }));

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Updates clip gain factor (0.0 to 2.0).
 */
export function setClipGain(project: AudioProject, clipId: string, gain: number): AudioProject {
  const clampedGain = Math.max(0.0, Math.min(2.0, gain));
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((c) => (c.id === clipId ? { ...c, gain: clampedGain } : c)),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates clip stereo pan (-1.0 to 1.0).
 */
export function setClipPan(project: AudioProject, clipId: string, pan: number): AudioProject {
  const clampedPan = Math.max(-1.0, Math.min(1.0, pan));
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((c) => (c.id === clipId ? { ...c, pan: clampedPan } : c)),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sets fade-in and fade-out durations on a clip.
 */
export function setClipFades(
  project: AudioProject,
  clipId: string,
  fadeIn: number,
  fadeOut: number
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((c) => {
      if (c.id !== clipId) return c;
      const safeFadeIn = Math.max(0, Math.min(c.duration / 2, fadeIn));
      const safeFadeOut = Math.max(0, Math.min(c.duration / 2, fadeOut));
      return { ...c, fadeIn: safeFadeIn, fadeOut: safeFadeOut };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds a new audio track lane to the project.
 */
export function addTrack(
  project: AudioProject,
  name?: string,
  colorToken?: string
): AudioProject {
  const trackCount = project.tracks.length + 1;
  const newTrack: AudioProjectTrack = {
    id: generateId('track'),
    name: name || `Audio Lane ${trackCount}`,
    clips: [],
    volume: 0.85,
    pan: 0.0,
    muted: false,
    solo: false,
    colorToken: colorToken || `var(--color-accent-${trackCount % 2 === 0 ? 'cyan' : 'iris'})`,
    processingChain: {
      enabled: true,
      processors: [
        createTrackProcessor('eq', 'Spectral Sculptor'),
        createTrackProcessor('filter', 'Harmonic Filter'),
        createTrackProcessor('compressor', 'Dynamic Field'),
        createTrackProcessor('saturation', 'Harmonic Warmth'),
        createTrackProcessor('delay', 'Temporal Echo'),
        createTrackProcessor('reverb', 'Spatial Aura'),
        createTrackProcessor('limiter', 'Ceiling Guard'),
      ],
    },
    crossfades: [],
    automationLanes: [
      { parameter: 'volume', enabled: true, points: [{ id: generateId('pt'), time: 0, value: 0.85 }] },
      { parameter: 'pan', enabled: false, points: [{ id: generateId('pt'), time: 0, value: 0 }] },
    ],
  };

  return {
    ...project,
    tracks: [...project.tracks, newTrack],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes an audio track and all its child clips.
 */
export function removeTrack(project: AudioProject, trackId: string): AudioProject {
  if (project.tracks.length <= 1) {
    // Keep at least 1 track in the project
    return project;
  }

  const updatedTracks = project.tracks.filter((t) => t.id !== trackId);
  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Adds a project marker at the given timeline timestamp.
 */
export function addMarker(
  project: AudioProject,
  time: number,
  label: string,
  type: ProjectMarker['type'] = 'marker'
): AudioProject {
  const marker: ProjectMarker = {
    id: generateId('marker'),
    time: Math.max(0, parseFloat(time.toFixed(4))),
    label: label || `Marker ${project.markers.length + 1}`,
    type,
  };

  return {
    ...project,
    markers: [...project.markers, marker].sort((a, b) => a.time - b.time),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deletes a project marker.
 */
export function deleteMarker(project: AudioProject, markerId: string): AudioProject {
  return {
    ...project,
    markers: project.markers.filter((m) => m.id !== markerId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates the project tempo (BPM) and adjusts duration.
 */
export function setProjectTempo(project: AudioProject, tempo: number): AudioProject {
  const safeTempo = Math.max(40, Math.min(240, Math.round(tempo)));

  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.warp && clip.warp.enabled && clip.warp.mode === 'project_locked') {
        const { ratio, isExtreme } = calculateStretchRatio(
          clip.warp.sourceBpm,
          safeTempo,
          clip.warp.manualBpm
        );
        const updatedWarp = {
          ...clip.warp,
          stretchRatio: ratio,
          isExtremeStretch: isExtreme,
        };
        const updatedClip = { ...clip, warp: updatedWarp };
        const newDuration = getWarpedClipDuration(updatedClip, safeTempo);
        return {
          ...updatedClip,
          duration: newDuration,
        };
      }
      return clip;
    }),
  }));

  const nextProject: AudioProject = {
    ...project,
    tempo: safeTempo,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Performs a non-destructive slip edit on an audio clip.
 * Shifts `sourceStart` and `sourceEnd` by `sourceDelta` while `timelineStart` and `duration` remain fixed.
 */
export function slipClip(
  project: AudioProject,
  clipId: string,
  sourceDelta: number,
  maxSourceDuration?: number
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return track;

    let newSourceStart = clip.sourceStart + sourceDelta;
    let newSourceEnd = clip.sourceEnd + sourceDelta;

    if (newSourceStart < 0) {
      newSourceEnd += -newSourceStart;
      newSourceStart = 0;
    }

    if (maxSourceDuration !== undefined && newSourceEnd > maxSourceDuration) {
      const excess = newSourceEnd - maxSourceDuration;
      newSourceStart = Math.max(0, newSourceStart - excess);
      newSourceEnd = maxSourceDuration;
    }

    const updatedClips = track.clips.map((c) => {
      if (c.id !== clipId) return c;
      return {
        ...c,
        sourceStart: parseFloat(newSourceStart.toFixed(4)),
        sourceEnd: parseFloat(newSourceEnd.toFixed(4)),
      };
    });

    return { ...track, clips: updatedClips };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sets fade curve types for fade-in and/or fade-out on a clip.
 */
export function setClipFadeCurves(
  project: AudioProject,
  clipId: string,
  fadeInCurve?: FadeCurve,
  fadeOutCurve?: FadeCurve
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((c) => {
      if (c.id !== clipId) return c;
      return {
        ...c,
        fadeInCurve: fadeInCurve !== undefined ? fadeInCurve : c.fadeInCurve,
        fadeOutCurve: fadeOutCurve !== undefined ? fadeOutCurve : c.fadeOutCurve,
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sets or updates an overlapping crossfade on a track.
 */
export function setTrackCrossfade(
  project: AudioProject,
  trackId: string,
  fromClipId: string,
  toClipId: string,
  duration: number,
  curve: 'equal-power' | 'linear' = 'equal-power'
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId) return track;

    const fromClip = track.clips.find((c) => c.id === fromClipId);
    const toClip = track.clips.find((c) => c.id === toClipId);
    if (!fromClip || !toClip) return track;

    const crossfadeId = `xfade-${fromClipId}-${toClipId}`;
    const newCrossfade: ClipCrossfade = {
      id: crossfadeId,
      fromClipId,
      toClipId,
      startTime: toClip.timelineStart,
      duration: Math.max(0.05, duration),
      curve,
    };

    const existingCrossfades = track.crossfades || [];
    const filtered = existingCrossfades.filter((xf) => xf.id !== crossfadeId);

    return {
      ...track,
      crossfades: [...filtered, newCrossfade],
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes a crossfade from a track.
 */
export function removeTrackCrossfade(
  project: AudioProject,
  trackId: string,
  crossfadeId: string
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.crossfades) return track;
    return {
      ...track,
      crossfades: track.crossfades.filter((xf) => xf.id !== crossfadeId),
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Automatically detects overlapping clips on a track and configures equal-power crossfades.
 */
export function detectTrackCrossfades(project: AudioProject, trackId: string): AudioProject {
  let modified = false;

  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId) return track;

    const sortedClips = [...track.clips].sort((a, b) => a.timelineStart - b.timelineStart);
    const detected: ClipCrossfade[] = [];

    for (let i = 0; i < sortedClips.length - 1; i++) {
      const clipA = sortedClips[i];
      const clipB = sortedClips[i + 1];
      const clipAEnd = clipA.timelineStart + clipA.duration;

      // Overlap detected
      if (clipB.timelineStart < clipAEnd) {
        const overlap = clipAEnd - clipB.timelineStart;
        if (overlap > 0.05) {
          detected.push({
            id: `xfade-${clipA.id}-${clipB.id}`,
            fromClipId: clipA.id,
            toClipId: clipB.id,
            startTime: clipB.timelineStart,
            duration: parseFloat(overlap.toFixed(4)),
            curve: 'equal-power',
          });
          modified = true;
        }
      }
    }

    return {
      ...track,
      crossfades: detected,
    };
  });

  if (!modified) return project;

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds a processor to a track's processing chain.
 */
export function addTrackProcessor(
  project: AudioProject,
  trackId: string,
  type: TrackProcessorType,
  name?: string
): AudioProject {
  const newProcessor = createTrackProcessor(type, name);

  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId) return track;

    const currentChain = track.processingChain || { enabled: true, processors: [] };
    return {
      ...track,
      processingChain: {
        ...currentChain,
        processors: [...currentChain.processors, newProcessor],
      },
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates parameters for a track processor non-destructively.
 */
export function updateTrackProcessorParams(
  project: AudioProject,
  trackId: string,
  processorId: string,
  params: Record<string, number | string | boolean>
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.processingChain) return track;

    const updatedProcessors = track.processingChain.processors.map((p) => {
      if (p.id !== processorId) return p;
      return {
        ...p,
        params: { ...p.params, ...params },
      };
    });

    return {
      ...track,
      processingChain: {
        ...track.processingChain,
        processors: updatedProcessors,
      },
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Toggles bypass on a track processor without losing its parameter settings.
 */
export function bypassTrackProcessor(
  project: AudioProject,
  trackId: string,
  processorId: string,
  bypassed: boolean
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.processingChain) return track;

    const updatedProcessors = track.processingChain.processors.map((p) => {
      if (p.id !== processorId) return p;
      return { ...p, bypassed };
    });

    return {
      ...track,
      processingChain: {
        ...track.processingChain,
        processors: updatedProcessors,
      },
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Reorders processors in a track's processing chain.
 */
export function reorderTrackProcessors(
  project: AudioProject,
  trackId: string,
  processorIds: string[]
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.processingChain) return track;

    const procMap = new Map(track.processingChain.processors.map((p) => [p.id, p]));
    const reordered: TrackProcessor[] = [];

    for (const id of processorIds) {
      const p = procMap.get(id);
      if (p) {
        reordered.push(p);
        procMap.delete(id);
      }
    }
    // Append any unmentioned processors
    for (const p of procMap.values()) {
      reordered.push(p);
    }

    return {
      ...track,
      processingChain: {
        ...track.processingChain,
        processors: reordered,
      },
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes a processor from a track's chain.
 */
export function removeTrackProcessor(
  project: AudioProject,
  trackId: string,
  processorId: string
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.processingChain) return track;

    return {
      ...track,
      processingChain: {
        ...track.processingChain,
        processors: track.processingChain.processors.filter((p) => p.id !== processorId),
      },
    };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds an automation point to a track's automation lane.
 */
export function addAutomationPoint(
  project: AudioProject,
  trackId: string,
  laneParameter: string,
  time: number,
  value: number,
  targetType: 'track-volume' | 'track-pan' | 'processor' = 'track-volume',
  processorId?: string
): AudioProject {
  const point: AutomationPoint = {
    id: `pt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    time: Math.max(0, parseFloat(time.toFixed(4))),
    value,
  };

  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId) return track;

    const lanes = track.automationLanes || [];
    const laneIndex = lanes.findIndex((l) => l.parameter === laneParameter && l.processorId === processorId);

    if (laneIndex === -1) {
      // Create new lane
      const newLane: AutomationLane = {
        id: `lane-${Date.now().toString(36)}`,
        trackId,
        parameter: laneParameter,
        targetType,
        processorId,
        points: [point],
        enabled: true,
      };
      return { ...track, automationLanes: [...lanes, newLane] };
    }

    const lane = lanes[laneIndex];
    const updatedPoints = [...lane.points, point].sort((a, b) => a.time - b.time);
    const updatedLanes = [...lanes];
    updatedLanes[laneIndex] = { ...lane, points: updatedPoints };

    return { ...track, automationLanes: updatedLanes };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Moves an automation point to a new time and value.
 */
export function moveAutomationPoint(
  project: AudioProject,
  trackId: string,
  laneId: string,
  pointId: string,
  newTime: number,
  newValue: number
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.automationLanes) return track;

    const updatedLanes = track.automationLanes.map((lane) => {
      if (lane.id !== laneId) return lane;

      const updatedPoints = lane.points
        .map((p) => (p.id === pointId ? { ...p, time: Math.max(0, newTime), value: newValue } : p))
        .sort((a, b) => a.time - b.time);

      return { ...lane, points: updatedPoints };
    });

    return { ...track, automationLanes: updatedLanes };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deletes an automation point.
 */
export function deleteAutomationPoint(
  project: AudioProject,
  trackId: string,
  laneId: string,
  pointId: string
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.automationLanes) return track;

    const updatedLanes = track.automationLanes.map((lane) => {
      if (lane.id !== laneId) return lane;
      return {
        ...lane,
        points: lane.points.filter((p) => p.id !== pointId),
      };
    });

    return { ...track, automationLanes: updatedLanes };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Toggles an automation lane active/inactive.
 */
export function toggleAutomationLane(
  project: AudioProject,
  trackId: string,
  laneId: string,
  enabled?: boolean
): AudioProject {
  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== trackId || !track.automationLanes) return track;

    const updatedLanes = track.automationLanes.map((lane) => {
      if (lane.id !== laneId) return lane;
      return {
        ...lane,
        enabled: enabled !== undefined ? enabled : !lane.enabled,
      };
    });

    return { ...track, automationLanes: updatedLanes };
  });

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sets the project musical key (e.g. "Am", "C", "F#m").
 */
export function setProjectKey(project: AudioProject, key: string): AudioProject {
  return {
    ...project,
    key: key || 'Am',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates an arrangement section.
 */
export function createSection(
  project: AudioProject,
  sectionData: Omit<ArrangementSection, 'id'>
): AudioProject {
  const newSection: ArrangementSection = {
    ...sectionData,
    id: generateId('sec'),
    start: Math.max(0, parseFloat(sectionData.start.toFixed(4))),
    end: Math.max(sectionData.start + 0.1, parseFloat(sectionData.end.toFixed(4))),
    confidence: sectionData.confidence ?? 1.0,
  };

  const sections = [...(project.sections || []), newSection].sort((a, b) => a.start - b.start);
  const nextProject: AudioProject = {
    ...project,
    sections,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Renames an arrangement section.
 */
export function renameSection(
  project: AudioProject,
  sectionId: string,
  newName: string
): AudioProject {
  if (!project.sections) return project;
  const sections = project.sections.map((s) =>
    s.id === sectionId ? { ...s, name: newName } : s
  );
  return {
    ...project,
    sections,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resizes an arrangement section.
 */
export function resizeSection(
  project: AudioProject,
  sectionId: string,
  newStart: number,
  newEnd: number
): AudioProject {
  if (!project.sections) return project;
  const safeStart = Math.max(0, parseFloat(newStart.toFixed(4)));
  const safeEnd = Math.max(safeStart + 0.1, parseFloat(newEnd.toFixed(4)));

  const sections = project.sections
    .map((s) => (s.id === sectionId ? { ...s, start: safeStart, end: safeEnd } : s))
    .sort((a, b) => a.start - b.start);

  const nextProject: AudioProject = {
    ...project,
    sections,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Deletes an arrangement section.
 */
export function deleteSection(project: AudioProject, sectionId: string): AudioProject {
  if (!project.sections) return project;
  const sections = project.sections.filter((s) => s.id !== sectionId);
  const nextProject: AudioProject = {
    ...project,
    sections,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Moves an arrangement marker to a new timeline timestamp.
 */
export function moveMarker(project: AudioProject, markerId: string, newTime: number): AudioProject {
  const safeTime = Math.max(0, parseFloat(newTime.toFixed(4)));
  const markers = project.markers
    .map((m) =>
      m.id === markerId
        ? {
            ...m,
            time: safeTime,
            musicalTime: formatMusicalTime(safeTime, project.tempo, project.timeSignature),
          }
        : m
    )
    .sort((a, b) => a.time - b.time);

  return {
    ...project,
    markers,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Renames an arrangement marker.
 */
export function renameMarker(project: AudioProject, markerId: string, newLabel: string): AudioProject {
  const markers = project.markers.map((m) =>
    m.id === markerId ? { ...m, label: newLabel } : m
  );
  return {
    ...project,
    markers,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Quantized clip duplication: duplicates a clip shifted by a musical grid interval (1 beat, 1 bar, 2 bars, 4 bars, 8 bars, etc.).
 */
export function quantizedDuplicateClip(
  project: AudioProject,
  clipId: string,
  quantizeInterval: 'beat' | '1-bar' | '2-bars' | '4-bars' | '8-bars' | '16-bars' | '32-bars' | 'phrase' = '1-bar',
  snapMode: SnapMode = 'bar'
): AudioProject {
  let targetClip: AudioClip | null = null;
  let targetTrackId: string | null = null;

  for (const track of project.tracks) {
    const c = track.clips.find((item) => item.id === clipId);
    if (c) {
      targetClip = c;
      targetTrackId = track.id;
      break;
    }
  }

  if (!targetClip || !targetTrackId) return project;

  const beatSec = getBeatDuration(project.tempo);
  const barSec = getBarDuration(project.tempo, project.timeSignature);

  let shiftSeconds = barSec;
  switch (quantizeInterval) {
    case 'beat':
      shiftSeconds = beatSec;
      break;
    case '1-bar':
      shiftSeconds = barSec;
      break;
    case '2-bars':
      shiftSeconds = barSec * 2;
      break;
    case '4-bars':
      shiftSeconds = barSec * 4;
      break;
    case '8-bars':
    case 'phrase':
      shiftSeconds = barSec * 8;
      break;
    case '16-bars':
      shiftSeconds = barSec * 16;
      break;
    case '32-bars':
      shiftSeconds = barSec * 32;
      break;
  }

  const rawStart = targetClip.timelineStart + shiftSeconds;
  const snappedStart = snapTimeToGrid(rawStart, snapMode, project.tempo, project.timeSignature);

  const duplicatedClip: AudioClip = {
    ...targetClip,
    id: generateId('clip'),
    timelineStart: snappedStart,
    warp: targetClip.warp ? { ...targetClip.warp, markers: [...targetClip.warp.markers] } : undefined,
  };

  const updatedTracks = project.tracks.map((track) => {
    if (track.id !== targetTrackId) return track;
    return {
      ...track,
      clips: [...track.clips, duplicatedClip],
    };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Duplicates an entire musical phrase on a track, advancing by the phrase duration.
 */
export function duplicatePhrase(
  project: AudioProject,
  trackId: string,
  phraseStartTime: number,
  phraseDuration: number
): AudioProject {
  const track = project.tracks.find((t) => t.id === trackId);
  if (!track) return project;

  const phraseEnd = phraseStartTime + phraseDuration;
  const phraseClips = track.clips.filter(
    (c) => c.timelineStart >= phraseStartTime && c.timelineStart < phraseEnd
  );

  if (phraseClips.length === 0) return project;

  const duplicatedClips: AudioClip[] = phraseClips.map((c) => ({
    ...c,
    id: generateId('clip'),
    timelineStart: parseFloat((c.timelineStart + phraseDuration).toFixed(4)),
    warp: c.warp ? { ...c.warp, markers: [...c.warp.markers] } : undefined,
  }));

  const updatedTracks = project.tracks.map((t) => {
    if (t.id !== trackId) return t;
    return {
      ...t,
      clips: [...t.clips, ...duplicatedClips],
    };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Repeats an arrangement region across all tracks by N repetitions.
 */
export function repeatRegion(
  project: AudioProject,
  startTime: number,
  duration: number,
  repetitions = 1
): AudioProject {
  const safeReps = Math.max(1, Math.min(8, repetitions));
  const regionEnd = startTime + duration;

  const updatedTracks = project.tracks.map((track) => {
    const regionClips = track.clips.filter(
      (c) => c.timelineStart >= startTime && c.timelineStart < regionEnd
    );

    const newClips: AudioClip[] = [];
    for (let r = 1; r <= safeReps; r++) {
      const shift = r * duration;
      for (const clip of regionClips) {
        newClips.push({
          ...clip,
          id: generateId('clip'),
          timelineStart: parseFloat((clip.timelineStart + shift).toFixed(4)),
          warp: clip.warp ? { ...clip.warp, markers: [...clip.warp.markers] } : undefined,
        });
      }
    }

    return {
      ...track,
      clips: [...track.clips, ...newClips],
    };
  });

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Updates the warping mode for an audio clip (free, beat_locked, project_locked).
 */
export function setClipWarpMode(
  project: AudioProject,
  clipId: string,
  mode: WarpMode
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId) return clip;
      const currentWarp = clip.warp || createDefaultWarpConfig(
        clip.metadata?.bpm || 120,
        project.tempo,
        undefined,
        clip.duration
      );
      const updatedWarp = { ...currentWarp, mode, enabled: mode !== 'free' };
      const updatedClip = { ...clip, warp: updatedWarp };
      const resolvedDuration = mode === 'project_locked'
        ? getWarpedClipDuration(updatedClip, project.tempo)
        : parseFloat((clip.sourceEnd - clip.sourceStart).toFixed(4));
      return {
        ...updatedClip,
        duration: resolvedDuration,
      };
    }),
  }));

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Updates stretch quality for a clip ('draft', 'balanced', 'quality').
 */
export function setClipWarpQuality(
  project: AudioProject,
  clipId: string,
  quality: WarpQuality
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId || !clip.warp) return clip;
      return {
        ...clip,
        warp: {
          ...clip.warp,
          quality,
        },
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Toggles pitch-preservation key lock on a warped clip.
 */
export function toggleClipPitchLock(
  project: AudioProject,
  clipId: string
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId || !clip.warp) return clip;
      return {
        ...clip,
        warp: {
          ...clip.warp,
          pitchLocked: !clip.warp.pitchLocked,
        },
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Overrides detected source BPM with a manual user-defined tempo.
 */
export function setClipManualBpm(
  project: AudioProject,
  clipId: string,
  manualBpm?: number
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId || !clip.warp) return clip;
      const { ratio, isExtreme } = calculateStretchRatio(
        clip.warp.sourceBpm,
        project.tempo,
        manualBpm
      );
      const updatedWarp = {
        ...clip.warp,
        manualBpm,
        stretchRatio: ratio,
        isExtremeStretch: isExtreme,
      };
      const updatedClip = { ...clip, warp: updatedWarp };
      const resolvedDuration = clip.warp.mode === 'project_locked'
        ? getWarpedClipDuration(updatedClip, project.tempo)
        : clip.duration;
      return {
        ...updatedClip,
        duration: resolvedDuration,
      };
    }),
  }));

  const nextProject: AudioProject = {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...nextProject,
    duration: calculateProjectDuration(nextProject),
  };
}

/**
 * Adds an interactive warp marker to a clip's warp configuration.
 */
export function addClipWarpMarker(
  project: AudioProject,
  clipId: string,
  sourceTime: number,
  musicalBeat?: number,
  type: WarpMarkerType = 'manual'
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId) return clip;
      const currentWarp = clip.warp || createDefaultWarpConfig(
        clip.metadata?.bpm || 120,
        project.tempo,
        undefined,
        clip.duration
      );
      const beat = musicalBeat ?? sourceTimeToMusicalBeat(
        sourceTime,
        currentWarp.markers,
        currentWarp.manualBpm || currentWarp.sourceBpm
      );
      return {
        ...clip,
        warp: addWarpMarkerToConfig(currentWarp, sourceTime, beat, type),
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Moves an existing warp marker on a clip.
 */
export function moveClipWarpMarker(
  project: AudioProject,
  clipId: string,
  markerId: string,
  newSourceTime: number
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId || !clip.warp) return clip;
      return {
        ...clip,
        warp: moveWarpMarkerInConfig(clip.warp, markerId, newSourceTime),
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deletes a warp marker from a clip.
 */
export function deleteClipWarpMarker(
  project: AudioProject,
  clipId: string,
  markerId: string
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId || !clip.warp) return clip;
      return {
        ...clip,
        warp: deleteWarpMarkerFromConfig(clip.warp, markerId),
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resets clip warping back to initial analyzed state.
 */
export function resetClipWarp(
  project: AudioProject,
  clipId: string
): AudioProject {
  const updatedTracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId || !clip.warp) return clip;
      return {
        ...clip,
        warp: resetWarpConfig(clip.warp, undefined, clip.duration),
      };
    }),
  }));

  return {
    ...project,
    tracks: updatedTracks,
    updatedAt: new Date().toISOString(),
  };
}



