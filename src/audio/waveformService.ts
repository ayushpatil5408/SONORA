/**
 * SONORA Waveform Analysis Bridge Service
 * Authoritative Reference: PRD.md & PRODUCT_ARCHITECTURE.md
 * 
 * Manages audio buffer handoff and coordinates off-thread peak extraction
 * with the Web Worker. Preserves AudioBuffer instances without mutation.
 */

import { WaveformData, WaveformError, WaveformWorkerMessage } from './waveformTypes';
import { downmixAudioBufferToMono, calculateWaveformPeaks } from './waveformAnalysis';

interface PendingRequest {
  resolve: (data: WaveformData) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

class WaveformAnalysisService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter = 0;

  private getWorker(): Worker | null {
    if (typeof Worker === 'undefined') {
      return null;
    }

    if (!this.worker) {
      try {
        this.worker = new Worker(
          new URL('../workers/waveformWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WaveformWorkerMessage>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (event: ErrorEvent) => {
          this.handleWorkerError(event);
        };
      } catch (err) {
        console.warn('Could not initialize waveform Web Worker. Falling back to main-thread analysis.', err);
        this.worker = null;
      }
    }

    return this.worker;
  }

  private handleWorkerMessage(message: WaveformWorkerMessage): void {
    if (!message || !message.id) return;

    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;

    this.pendingRequests.delete(message.id);
    clearTimeout(pending.timeoutId);

    if (message.type === 'WAVEFORM_ANALYZED') {
      pending.resolve({
        duration: message.duration,
        sampleRate: message.sampleRate,
        length: message.length,
        minPeaks: message.minPeaks,
        maxPeaks: message.maxPeaks,
        rmsPeaks: message.rmsPeaks,
      });
    } else if (message.type === 'WAVEFORM_ERROR') {
      pending.reject(new WaveformError(message.error, 'ANALYSIS_FAILED'));
    }
  }

  private handleWorkerError(event: ErrorEvent): void {
    console.error('Waveform Worker encountered error:', event);
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new WaveformError(`Worker failure: ${event.message}`, 'WORKER_TERMINATED'));
      this.pendingRequests.delete(id);
    }
    this.terminate();
  }

  /**
   * Extracts compact waveform peaks from an AudioBuffer.
   * Delegates compute to a Web Worker, falling back to synchronous execution
   * if workers are unavailable.
   * 
   * @param audioBuffer Decoded native AudioBuffer (unmutated)
   * @param targetPointCount Target visual resolution (default: 1000 points)
   */
  public async analyzeAudioBuffer(
    audioBuffer: AudioBuffer,
    targetPointCount = 1000
  ): Promise<WaveformData> {
    if (!audioBuffer) {
      throw new WaveformError('AudioBuffer is required for waveform extraction', 'INVALID_SAMPLE_DATA');
    }

    // Downmix to mono Float32Array (preserves playback buffer completely)
    const monoSamples = downmixAudioBufferToMono(audioBuffer);
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;

    const worker = this.getWorker();

    // Fallback: Synchronous execution if workers are unsupported in environment
    if (!worker) {
      return calculateWaveformPeaks(monoSamples, targetPointCount, duration, sampleRate);
    }

    const requestId = `wf_${++this.requestCounter}_${Date.now()}`;

    return new Promise<WaveformData>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new WaveformError('Waveform extraction timed out', 'ANALYSIS_FAILED'));
        }
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });

      try {
        // Zero-copy transfer of mono Float32Array buffer
        worker.postMessage(
          {
            type: 'ANALYZE_WAVEFORM',
            id: requestId,
            samples: monoSamples,
            sampleRate,
            duration,
            targetPointCount,
          },
          [monoSamples.buffer]
        );
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        // If transfer fails, fall back to synchronous calculation
        const fallbackWaveform = calculateWaveformPeaks(
          downmixAudioBufferToMono(audioBuffer),
          targetPointCount,
          duration,
          sampleRate
        );
        resolve(fallbackWaveform);
      }
    });
  }

  /**
   * Terminates active worker instance and clears pending requests.
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new WaveformError('Waveform worker terminated', 'WORKER_TERMINATED'));
    }
    this.pendingRequests.clear();
  }
}

export const waveformService = new WaveformAnalysisService();
