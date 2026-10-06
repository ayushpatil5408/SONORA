/**
 * SONORA Audio Warping & Musical Timing Domain Types
 * Authoritative Reference: PRD.md Section 19 & 35, Milestone 5.4 Specification
 * 
 * Formal definitions for musical timing and audio warping:
 * - Source Time: native immutable seconds of original audio recording
 * - Musical Time: position in musical beats and bars (Bar.Beat.Tick)
 * - Project Time: continuous timeline seconds on the arrangement canvas
 * - Project Musical Time: musical coordinates relative to project tempo clock
 * - Warp Markers: deterministic anchors binding source time to musical beats
 * - Pitch-Preserving Time Stretching: duration scaling without pitch distortion
 */

export type WarpMode = 'free' | 'beat_locked' | 'project_locked';

export type WarpQuality = 'draft' | 'balanced' | 'quality';

export type WarpMarkerType =
  | 'detected-beat'
  | 'detected-downbeat'
  | 'manual'
  | 'anchor';

export interface WarpMarker {
  id: string;
  sourceTime: number;       // Timestamp within source audio in seconds
  musicalBeat: number;      // Beat number relative to musical start (0.0 = Beat 1)
  musicalBar?: number;      // Optional bar index (1-indexed)
  type: WarpMarkerType;
  confidence?: number;      // 0.0 to 1.0 (from M4 analysis or 1.0 for manual)
}

export interface ClipWarpConfig {
  enabled: boolean;
  mode: WarpMode;
  quality: WarpQuality;
  sourceBpm: number;
  sourceBpmConfidence?: number;
  manualBpm?: number;        // Explicit user override if analysis is inaccurate
  markers: WarpMarker[];
  pitchLocked: boolean;      // True: pitch preserved via WSOLA; False: varispeed
  stretchRatio: number;      // Current calculated ratio (projectBpm / effectiveBpm)
  isExtremeStretch?: boolean;// True if ratio < 0.5 or > 2.0
}

export interface WarpTimeMapping {
  sourceTime: number;
  musicalBeat: number;
  projectTime: number;
  bar: number;
  beatInBar: number;
}
