/**
 * SONORA Creation Domain Types & Contracts
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0, 5.1 & 5.2 Specification
 * 
 * Defines the non-destructive audio project, track, clip, timeline, processing,
 * automation, and history models.
 * Strictly adheres to the Non-Destructive Editing Invariant:
 * Clips store references (sourceStart, sourceEnd) into source audio; original source buffers
 * are NEVER mutated or destructively overwritten.
 */

export type SnapMode = 'off' | 'beat' | 'bar' | 'phrase';

export interface TimeSignature {
  numerator: number;   // e.g. 4
  denominator: number; // e.g. 4
}

export type FadeCurve = 'linear' | 'ease-in' | 'ease-out' | 'equal-power';

export interface ClipCrossfade {
  id: string;
  fromClipId: string;
  toClipId: string;
  startTime: number;   // Timeline timestamp where crossfade begins
  duration: number;    // Duration of overlap in seconds
  curve: 'equal-power' | 'linear';
}

export interface AudioClipMetadata {
  sourceId?: string;
  sourceType?: 'demo' | 'local' | 'creator' | 'jamendo';
  title?: string;
  artist?: string;
  analysisId?: string;
  bpm?: number;
  key?: string;
  camelot?: string;
  energy?: number;
  colorToken?: string;
  confidence?: {
    overall?: number;
    bpm?: number;
    key?: number;
  };
}

/**
 * Milestone 5.3 Musical Arrangement & Intelligence Types
 */
export type ArrangementSectionType =
  | 'intro'
  | 'verse'
  | 'build'
  | 'drop'
  | 'break'
  | 'chorus'
  | 'outro'
  | 'custom';

export interface ArrangementSection {
  id: string;
  name: string;
  type: ArrangementSectionType;
  start: number;       // Start timestamp in seconds
  end: number;         // End timestamp in seconds
  confidence?: number; // 0.0 to 1.0 (from M4 analysis or 1.0 for user-authored)
  color?: string;
  key?: string;        // Optional harmonic key context
  energy?: number;     // 0.0 to 1.0
}

export type TempoCompatibilityState = 'match' | 'near' | 'mismatch' | 'unknown';

export interface TempoCompatibilityResult {
  state: TempoCompatibilityState;
  sourceBpm: number;
  projectBpm: number;
  diffBpm: number;
  ratio: number;
  timeStretchRequired: boolean;
  timeStretchMode?: 'repitch' | 'granular' | 'spectral-vocoder' | 'none';
  label: string;
  description: string;
  confidence: number;
}

export interface HarmonicTransitionResult {
  fromKey: string;
  toKey: string;
  fromCamelot: string;
  toCamelot: string;
  compatible: boolean;
  relation: 'perfect' | 'relative' | 'dominant' | 'subdominant' | 'diagonal' | 'incompatible' | 'unknown';
  label: string;
  description: string;
  score: number;
  confidence: number;
}

export interface ArrangementEnergyProfile {
  overallAverage: number;
  peak: number;
  arcType: 'low-build-peak-release' | 'consistent' | 'dynamic-wave' | 'flat' | 'uncertain';
  points: { time: number; energy: number; bar: number; sectionName?: string }[];
  confidence: number;
}

export interface MusicalPosition {
  bar: number;         // 1-indexed bar number
  beat: number;        // 1-indexed beat number within bar
  tick: number;        // 0-99 sub-beat tick
  phrase: number;      // 1-indexed phrase number (8-bar phrases)
  totalBeats: number;  // Continuous beat counter from 0.0
}

export * from './warpTypes';
import { ClipWarpConfig } from './warpTypes';

/**
 * Non-destructive Audio Clip Model
 */
export interface AudioClip {
  id: string;
  sourceTrackId: string;       // ID of the project track containing this clip
  timelineStart: number;       // Position on the project timeline in seconds
  sourceStart: number;         // Start offset within the source audio in seconds (non-destructive trim/slip)
  sourceEnd: number;           // End offset within the source audio in seconds (non-destructive trim/slip)
  duration: number;            // Active playback duration in seconds (sourceEnd - sourceStart)
  gain: number;                // Clip gain factor (0.0 to 2.0, default 1.0)
  pan: number;                 // Clip stereo pan (-1.0 left to +1.0 right, default 0.0)
  fadeIn: number;              // Fade-in ramp duration in seconds (default 0.0)
  fadeOut: number;             // Fade-out ramp duration in seconds (default 0.0)
  fadeInCurve?: FadeCurve;     // Curve shape for fade-in (default 'linear')
  fadeOutCurve?: FadeCurve;    // Curve shape for fade-out (default 'linear')
  muted?: boolean;             // Whether this clip is muted
  metadata?: AudioClipMetadata;
  warp?: ClipWarpConfig;       // Milestone 5.4 Audio Warping & Timing Configuration
}

/**
 * Track Processor Types & Parameters
 */
export type TrackProcessorType =
  | 'eq'
  | 'filter'
  | 'compressor'
  | 'limiter'
  | 'saturation'
  | 'delay'
  | 'reverb';

export interface TrackProcessor {
  id: string;
  type: TrackProcessorType;
  name: string;
  enabled: boolean;
  bypassed: boolean;
  params: Record<string, number | string | boolean>;
}

export interface TrackProcessingChain {
  enabled: boolean;
  processors: TrackProcessor[];
}

/**
 * Automation Foundation Models
 */
export interface AutomationPoint {
  id: string;
  time: number;  // Seconds on timeline
  value: number; // Normalized (0.0 to 1.0) or target parameter scale
}

export interface AutomationLane {
  id?: string;
  trackId?: string;
  parameter: 'volume' | 'pan' | string;
  targetType?: 'track-volume' | 'track-pan' | 'processor';
  processorId?: string;
  paramKey?: string;
  points: AutomationPoint[];
  enabled: boolean;
  color?: string;
}

/**
 * Project-Level Audio Track Lane
 */
export interface AudioProjectTrack {
  id: string;
  name: string;
  clips: AudioClip[];
  volume: number;              // Track fader volume (0.0 to 1.0, default 0.85)
  pan: number;                 // Track stereo pan (-1.0 to 1.0, default 0.0)
  muted: boolean;
  solo: boolean;
  armed?: boolean;
  colorToken?: string;         // Visual accent token for this track lane
  processingChain?: TrackProcessingChain;
  crossfades?: ClipCrossfade[];
  automationLanes?: AutomationLane[];
}

export interface ProjectMarker {
  id: string;
  time: number;                // Timestamp in seconds
  label: string;
  type?: 'marker' | 'section' | 'cue';
  color?: string;
  musicalTime?: string;        // e.g. "1.1.00"
  sectionType?: ArrangementSectionType;
  energy?: number;             // 0.0 to 1.0
}

export interface TimelineSelection {
  clipIds: string[];
  start?: number;              // Range selection start in seconds
  end?: number;                // Range selection end in seconds
}

export interface TimelineState {
  currentTime: number;         // Current playhead in seconds
  visibleStart: number;        // Viewport start in seconds
  visibleEnd: number;          // Viewport end in seconds
  zoom: number;                // Pixels per second
  selection: TimelineSelection;
  snapMode: SnapMode;
  isPlaying: boolean;
}

export interface AudioProjectMetadata {
  description?: string;
  author?: string;
  tags?: string[];
  sampleRate?: number;
}

/**
 * Root Creation Project Model
 */
export interface AudioProject {
  id: string;
  name: string;
  tempo: number;               // Project BPM (e.g. 120, 124, 128)
  timeSignature: TimeSignature;
  duration: number;            // Total project length in seconds (max clip end)
  tracks: AudioProjectTrack[];
  markers: ProjectMarker[];
  sections?: ArrangementSection[];
  key?: string;                // Project musical key (e.g. "Am", "C")
  metadata?: AudioProjectMetadata;
  version: string;             // Project model version (e.g. '1.0.0')
  createdAt: string;
  updatedAt: string;
}

/**
 * History & Command Types
 */
export type CommandType =
  | 'ADD_CLIP'
  | 'MOVE_CLIP'
  | 'TRIM_CLIP'
  | 'SLIP_CLIP'
  | 'SPLIT_CLIP'
  | 'DUPLICATE_CLIP'
  | 'DELETE_CLIP'
  | 'CHANGE_GAIN'
  | 'CHANGE_PAN'
  | 'CHANGE_FADE'
  | 'CHANGE_FADE_CURVE'
  | 'SET_CROSSFADE'
  | 'ADD_TRACK'
  | 'REMOVE_TRACK'
  | 'ADD_TRACK_PROCESSOR'
  | 'UPDATE_PROCESSOR_PARAMS'
  | 'BYPASS_PROCESSOR'
  | 'REORDER_PROCESSORS'
  | 'REMOVE_PROCESSOR'
  | 'ADD_AUTOMATION_POINT'
  | 'MOVE_AUTOMATION_POINT'
  | 'DELETE_AUTOMATION_POINT'
  | 'TOGGLE_AUTOMATION_LANE'
  | 'ADD_MARKER'
  | 'DELETE_MARKER'
  | 'SET_TEMPO'
  | 'SET_PROJECT_KEY'
  | 'CREATE_SECTION'
  | 'RENAME_SECTION'
  | 'RESIZE_SECTION'
  | 'DELETE_SECTION'
  | 'DUPLICATE_PHRASE'
  | 'REPEAT_REGION'
  | 'SET_CLIP_WARP_MODE'
  | 'SET_CLIP_WARP_QUALITY'
  | 'TOGGLE_CLIP_PITCH_LOCK'
  | 'SET_CLIP_MANUAL_BPM'
  | 'ADD_WARP_MARKER'
  | 'MOVE_WARP_MARKER'
  | 'DELETE_WARP_MARKER'
  | 'RESET_CLIP_WARP';

export interface ProjectHistoryState {
  past: AudioProject[];
  present: AudioProject;
  future: AudioProject[];
}
