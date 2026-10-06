/**
 * SONORA Audio Rendering, Export & Stem Bouncing Types
 * Authoritative Reference: PRD.md Section 35, Milestone 5.5 Specification
 * 
 * Formal definitions for offline rendering, audio mixdowns, stem bouncing,
 * and WAV encoding contracts.
 */

import { FadeCurve, TrackProcessingChain, AutomationLane, ClipCrossfade } from './types';
import { ClipWarpConfig } from './warpTypes';

export type RenderMode = 'mixdown' | 'stem';

export type RenderBitDepth = 16 | 24 | 32;

export interface RenderRange {
  startProjectTime: number; // Seconds on timeline
  endProjectTime: number;   // Seconds on timeline
}

export interface RenderSettings {
  format: 'wav';
  sampleRate: 44100 | 48000;
  bitDepth: RenderBitDepth;
  range: 'project' | 'selection';
  customRange?: RenderRange;
  mode: RenderMode;
  trackId?: string; // Target track ID for stem bounce mode
  normalize?: boolean;
}

export interface ClipRenderPlan {
  clipId: string;
  sourceId: string;
  timelineStart: number;    // Timeline position relative to render range start
  playDuration: number;     // Active render duration in seconds
  sourceOffset: number;     // Offset in source audio in seconds
  gain: number;
  pan: number;
  fadeIn: number;
  fadeOut: number;
  fadeInCurve: FadeCurve;
  fadeOutCurve: FadeCurve;
  crossfade?: ClipCrossfade;
  warp?: ClipWarpConfig;
  stretchRatio: number;
}

export interface TrackRenderPlan {
  trackId: string;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  processingChain?: TrackProcessingChain;
  automationLanes?: AutomationLane[];
  crossfades?: ClipCrossfade[];
  clips: ClipRenderPlan[];
}

export interface RenderPlan {
  projectName: string;
  tempo: number;
  sampleRate: number;
  channels: number;
  range: RenderRange;
  duration: number; // Total rendered seconds (endProjectTime - startProjectTime)
  mode: RenderMode;
  settings: RenderSettings;
  targetTrack?: { id: string; name: string };
  tracks: TrackRenderPlan[];
  totalClips: number;
}

export type RenderStage =
  | 'idle'
  | 'preparing'
  | 'rendering'
  | 'encoding'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface RenderProgress {
  stage: RenderStage;
  progress: number; // 0.0 to 1.0
  message: string;
  elapsedMs?: number;
}

export interface RenderResult {
  blob: Blob;
  url: string;
  filename: string;
  duration: number;
  sampleRate: number;
  bitDepth: RenderBitDepth;
  channels: number;
  fileSize: number;
  mode: RenderMode;
  trackName?: string;
  renderedAt: string;
}

export interface RenderError {
  code:
    | 'INVALID_PROJECT'
    | 'INVALID_RANGE'
    | 'RIGHTS_RESTRICTION'
    | 'MISSING_SOURCE'
    | 'DSP_FAILURE'
    | 'ENCODING_FAILURE'
    | 'CANCELLED'
    | 'UNKNOWN';
  message: string;
  details?: string;
}
