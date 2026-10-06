/**
 * SONORA Render Plan Builder
 * Authoritative Reference: PRD.md Section 35, Milestone 5.5 Specification
 * 
 * Compiles an AudioProject into a deterministic offline RenderPlan:
 * - Computes accurate project duration from clips and arrangement horizons
 * - Enforces Render Range boundaries (project vs custom range)
 * - Isolates tracks for Stem Bouncing vs Full Stereo Mixdown
 * - Enforces Rights & Licensing Guardrails (blocks listen-only / unauthorized sources)
 * - Integrates M5.4 Warping & Stretch Ratios deterministically
 * - Resolves fades, non-linear curves, crossfades, gain, pan, and track processing
 */

import { AudioProject, AudioClip } from './types';
import { RenderPlan, RenderSettings, TrackRenderPlan, ClipRenderPlan, RenderRange } from './renderTypes';
import { calculateStretchRatio } from './warpEngine';

/**
 * Computes the effective duration of an AudioProject based on its clips and markers.
 */
export function calculateEffectiveProjectDuration(project: AudioProject, tailSeconds = 0.5): number {
  if (!project || !project.tracks || project.tracks.length === 0) {
    return 1.0;
  }

  let maxEnd = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const end = clip.timelineStart + clip.duration;
      if (end > maxEnd) {
        maxEnd = end;
      }
    }
  }

  // Also inspect arrangement sections
  if (project.sections) {
    for (const section of project.sections) {
      if (section.end > maxEnd) {
        maxEnd = section.end;
      }
    }
  }

  // Minimum 1 second, with safe tail padding
  const total = maxEnd > 0 ? maxEnd + tailSeconds : 4.0;
  // Maximum safe boundary: 1 hour (3600s) to prevent runaway allocation
  return Math.min(3600, parseFloat(total.toFixed(3)));
}

export interface RightsValidationHook {
  (sourceId: string, metadata?: AudioClip['metadata']): boolean;
}

/**
 * Builds an immutable, deterministic RenderPlan from an AudioProject and RenderSettings.
 */
export function createRenderPlan(
  project: AudioProject,
  settings: RenderSettings,
  rightsValidator?: RightsValidationHook
): RenderPlan {
  if (!project || !project.tracks) {
    throw new Error('Cannot create render plan: invalid or missing audio project.');
  }

  const effectiveDuration = calculateEffectiveProjectDuration(project);

  // 1. Resolve and validate render range
  let range: RenderRange;
  if (settings.range === 'selection' && settings.customRange) {
    const rawStart = settings.customRange.startProjectTime;
    const rawEnd = settings.customRange.endProjectTime;

    if (rawStart < 0 || isNaN(rawStart)) {
      throw new Error(`Invalid render range start time: ${rawStart}s (must be >= 0)`);
    }
    if (rawEnd <= rawStart || isNaN(rawEnd)) {
      throw new Error(`Invalid render range end time: ${rawEnd}s (must be > start time ${rawStart}s)`);
    }

    const start = Math.max(0, rawStart);
    const end = Math.min(effectiveDuration, rawEnd);
    range = { startProjectTime: start, endProjectTime: end };
  } else {
    range = { startProjectTime: 0, endProjectTime: effectiveDuration };
  }

  const renderDuration = range.endProjectTime - range.startProjectTime;
  if (renderDuration <= 0) {
    throw new Error(`Render range duration must be greater than zero (got ${renderDuration}s).`);
  }

  // 2. Filter tracks based on mode (Mixdown vs Stem Bounce)
  let targetTracks = project.tracks;
  let targetTrackMeta: { id: string; name: string } | undefined;

  if (settings.mode === 'stem') {
    if (!settings.trackId) {
      throw new Error('Stem bounce mode requires a target track ID.');
    }
    const found = project.tracks.find((t) => t.id === settings.trackId);
    if (!found) {
      throw new Error(`Target track "${settings.trackId}" was not found in project.`);
    }
    targetTracks = [found];
    targetTrackMeta = { id: found.id, name: found.name };
  } else {
    // Mixdown mode: check if any track is soloed
    const hasSolo = project.tracks.some((t) => t.solo);
    if (hasSolo) {
      targetTracks = project.tracks.filter((t) => t.solo);
    } else {
      targetTracks = project.tracks.filter((t) => !t.muted);
    }
  }

  // 3. Compile track and clip render plans with rights validation
  const trackPlans: TrackRenderPlan[] = [];
  let totalClips = 0;

  for (const track of targetTracks) {
    const clipPlans: ClipRenderPlan[] = [];

    for (const clip of track.clips) {
      if (clip.muted) continue;

      const clipEnd = clip.timelineStart + clip.duration;

      // Check if clip intersects render range
      if (clipEnd <= range.startProjectTime || clip.timelineStart >= range.endProjectTime) {
        continue;
      }

      // 4. Rights & Licensing Guardrail
      const sourceId = clip.metadata?.sourceId || clip.id;
      if (rightsValidator) {
        const allowed = rightsValidator(sourceId, clip.metadata);
        if (!allowed) {
          throw new Error(
            `Export rejected: Source "${clip.metadata?.title || sourceId}" requires edit permissions, but rights are restricted to listen-only.`
          );
        }
      }

      // Calculate slice timing relative to render range start
      let timelineStart = 0;
      let sourceOffset = clip.sourceStart;
      let playDuration = clip.duration;

      if (clip.timelineStart < range.startProjectTime) {
        const offsetIntoClip = range.startProjectTime - clip.timelineStart;
        timelineStart = 0;
        sourceOffset = clip.sourceStart + offsetIntoClip;
        playDuration = Math.min(clip.duration - offsetIntoClip, renderDuration);
      } else {
        timelineStart = clip.timelineStart - range.startProjectTime;
        sourceOffset = clip.sourceStart;
        const availableFromClip = range.endProjectTime - clip.timelineStart;
        playDuration = Math.min(clip.duration, availableFromClip);
      }

      if (playDuration <= 0) continue;

      // M5.4 Warping calculation
      const isWarped = Boolean(clip.warp && clip.warp.enabled && clip.warp.mode === 'project_locked');
      let stretchRatio = 1.0;
      if (isWarped && clip.warp) {
        const effectiveSourceBpm = clip.warp.manualBpm || clip.warp.sourceBpm || 120;
        stretchRatio = calculateStretchRatio(effectiveSourceBpm, project.tempo).ratio;
      }

      // Resolve Crossfades
      const xfade = track.crossfades?.find(
        (xf) => xf.fromClipId === clip.id || xf.toClipId === clip.id
      );

      clipPlans.push({
        clipId: clip.id,
        sourceId,
        timelineStart: parseFloat(timelineStart.toFixed(4)),
        playDuration: parseFloat(playDuration.toFixed(4)),
        sourceOffset: parseFloat(sourceOffset.toFixed(4)),
        gain: clip.gain ?? 1.0,
        pan: clip.pan ?? 0.0,
        fadeIn: clip.fadeIn || 0,
        fadeOut: clip.fadeOut || 0,
        fadeInCurve: clip.fadeInCurve || 'linear',
        fadeOutCurve: clip.fadeOutCurve || 'linear',
        crossfade: xfade,
        warp: clip.warp,
        stretchRatio,
      });

      totalClips++;
    }

    trackPlans.push({
      trackId: track.id,
      name: track.name,
      volume: track.volume ?? 0.85,
      pan: track.pan ?? 0.0,
      muted: Boolean(track.muted),
      solo: Boolean(track.solo),
      processingChain: track.processingChain,
      automationLanes: track.automationLanes,
      crossfades: track.crossfades,
      clips: clipPlans,
    });
  }

  return {
    projectName: project.name || 'Untitled Project',
    tempo: project.tempo || 120,
    sampleRate: settings.sampleRate,
    channels: 2, // Stereo output
    range,
    duration: parseFloat(renderDuration.toFixed(4)),
    mode: settings.mode,
    settings,
    targetTrack: targetTrackMeta,
    tracks: trackPlans,
    totalClips,
  };
}
