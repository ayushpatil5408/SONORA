/**
 * SONORA Audio Analysis Web Worker
 * Authoritative Reference: PRD.md Section 19, Milestone 4 Specification
 * 
 * Performs heavy audio DSP analysis off the main thread:
 * - FFT & multi-band spectral decomposition
 * - Energy envelope extraction
 * - BPM autocorrelation
 * - Key chroma correlation
 * - Section segmentation
 */

import { analyzeAudioData, AnalysisInput } from './audioAnalysis';
import { TrackAnalysis } from './analysisTypes';

export interface AnalysisWorkerRequest {
  type: 'ANALYZE';
  payload: AnalysisInput;
}

export interface AnalysisWorkerResponse {
  type: 'COMPLETE' | 'ERROR';
  trackId: string;
  analysis?: TrackAnalysis;
  error?: string;
}

// Web Worker message listener
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', (event: MessageEvent<AnalysisWorkerRequest>) => {
    const data = event.data;
    if (!data || data.type !== 'ANALYZE') return;

    try {
      const analysis = analyzeAudioData(data.payload);
      const response: AnalysisWorkerResponse = {
        type: 'COMPLETE',
        trackId: data.payload.trackId,
        analysis,
      };
      self.postMessage(response);
    } catch (err) {
      const response: AnalysisWorkerResponse = {
        type: 'ERROR',
        trackId: data.payload.trackId,
        error: err instanceof Error ? err.message : 'Unknown audio analysis error',
      };
      self.postMessage(response);
    }
  });
}
