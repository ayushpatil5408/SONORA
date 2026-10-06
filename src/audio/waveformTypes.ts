/**
 * SONORA Waveform Domain & Analysis Contracts
 * Authoritative Reference: PRD.md & PRODUCT_ARCHITECTURE.md
 * 
 * Strict boundary: Compact typed waveform peak data representations.
 * Raw PCM audio samples must NEVER be stored in React state.
 */

export interface WaveformData {
  /** Total audio duration in seconds */
  duration: number;
  /** Audio sample rate in Hz (e.g. 44100, 48000) */
  sampleRate: number;
  /** Number of discrete waveform windows / peak points */
  length: number;
  /** Negative/minimum peak per window (range: -1.0 to 0.0) */
  minPeaks: Float32Array;
  /** Positive/maximum peak per window (range: 0.0 to +1.0) */
  maxPeaks: Float32Array;
  /** Root-mean-square energy magnitude per window (range: 0.0 to 1.0) */
  rmsPeaks: Float32Array;
}

export interface WaveformAnalysisRequest {
  type: 'ANALYZE_WAVEFORM';
  id: string;
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  targetPointCount: number;
}

export interface WaveformAnalysisSuccessResponse {
  type: 'WAVEFORM_ANALYZED';
  id: string;
  duration: number;
  sampleRate: number;
  length: number;
  minPeaks: Float32Array;
  maxPeaks: Float32Array;
  rmsPeaks: Float32Array;
}

export interface WaveformAnalysisErrorResponse {
  type: 'WAVEFORM_ERROR';
  id: string;
  error: string;
  code: string;
}

export type WaveformWorkerMessage =
  | WaveformAnalysisSuccessResponse
  | WaveformAnalysisErrorResponse;

export type WaveformErrorCode =
  | 'WORKER_UNAVAILABLE'
  | 'WORKER_TERMINATED'
  | 'INVALID_SAMPLE_DATA'
  | 'ANALYSIS_FAILED';

export class WaveformError extends Error {
  constructor(message: string, public readonly code: WaveformErrorCode) {
    super(message);
    this.name = 'WaveformError';
  }
}
