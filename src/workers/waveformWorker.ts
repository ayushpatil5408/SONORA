/**
 * SONORA Off-Thread Waveform Analysis Web Worker
 * Authoritative Reference: PRD.md & PRODUCT_ARCHITECTURE.md
 * 
 * Computes min/max/RMS peak representations off the main browser thread.
 * Strict Isolation: Has NO access to DOM, React, or AudioEngine.
 * Uses transferable TypedArray buffers for zero-copy IPC.
 */

import { calculateWaveformPeaks } from '../audio/waveformAnalysis';
import {
  WaveformAnalysisRequest,
  WaveformAnalysisSuccessResponse,
  WaveformAnalysisErrorResponse,
} from '../audio/waveformTypes';

addEventListener('message', (event: MessageEvent<WaveformAnalysisRequest>) => {
  const request = event.data;

  if (!request || request.type !== 'ANALYZE_WAVEFORM') {
    return;
  }

  try {
    const { samples, targetPointCount, duration, sampleRate, id } = request;

    const waveform = calculateWaveformPeaks(samples, targetPointCount, duration, sampleRate);

    const response: WaveformAnalysisSuccessResponse = {
      type: 'WAVEFORM_ANALYZED',
      id,
      duration: waveform.duration,
      sampleRate: waveform.sampleRate,
      length: waveform.length,
      minPeaks: waveform.minPeaks,
      maxPeaks: waveform.maxPeaks,
      rmsPeaks: waveform.rmsPeaks,
    };

    // Zero-copy transferable buffers back to main thread
    const workerPost = postMessage as (message: unknown, transfer?: Transferable[]) => void;
    workerPost(response, [
      waveform.minPeaks.buffer,
      waveform.maxPeaks.buffer,
      waveform.rmsPeaks.buffer,
    ]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const errorResponse: WaveformAnalysisErrorResponse = {
      type: 'WAVEFORM_ERROR',
      id: request.id,
      error: message,
      code: 'ANALYSIS_FAILED',
    };
    postMessage(errorResponse);
  }
});
