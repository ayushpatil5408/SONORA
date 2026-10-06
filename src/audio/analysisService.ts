/**
 * SONORA Audio Analysis Service Facade
 * Authoritative Reference: PRD.md Section 19, Milestone 4 Specification
 * 
 * Orchestrates:
 * 1. Cache-first analysis lookup (IndexedDB / Memory)
 * 2. Asynchronous Web Worker dispatch (keeps UI thread at 60fps)
 * 3. Graceful main-thread fallback for test / restricted environments
 * 4. Automatic cache persistence of derived intelligence
 */

import { TrackAnalysis } from './analysisTypes';
import { AnalysisInput, analyzeAudioData } from './audioAnalysis';
import { getCachedAnalysis, saveCachedAnalysis } from './analysisCache';
import { AnalysisWorkerRequest, AnalysisWorkerResponse } from './analysisWorker';

class AudioAnalysisService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (analysis: TrackAnalysis) => void;
    reject: (err: Error) => void;
  }>();

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./analysisWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
          const { type, trackId, analysis, error } = event.data;
          const pending = this.pendingRequests.get(trackId);
          if (!pending) return;

          this.pendingRequests.delete(trackId);
          if (type === 'COMPLETE' && analysis) {
            saveCachedAnalysis(analysis).catch(() => {});
            pending.resolve(analysis);
          } else {
            pending.reject(new Error(error || 'Analysis failed in worker'));
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Analysis worker error, falling back to local thread:', err);
          // Reject any pending requests that were waiting on the worker
          this.pendingRequests.forEach(({ reject }) => {
            reject(new Error('Worker encountered error, falling back'));
          });
          this.pendingRequests.clear();
        };
      } catch (e) {
        console.info('Worker initialization skipped (main thread fallback active):', e);
        this.worker = null;
      }
    }
  }

  /**
   * Analyzes an AudioBuffer or returns its cached analysis.
   */
  public async analyzeBuffer(
    trackId: string,
    buffer: AudioBuffer,
    options?: { knownBpm?: number; knownKey?: string; targetPoints?: number }
  ): Promise<TrackAnalysis> {
    // 1. Check persistent cache
    const cached = await getCachedAnalysis(trackId);
    if (cached) {
      return cached;
    }

    // 2. Extract channel PCM
    const channelData = buffer.getChannelData(0);
    const input: AnalysisInput = {
      trackId,
      channelData,
      sampleRate: buffer.sampleRate,
      duration: buffer.duration,
      knownBpm: options?.knownBpm,
      knownKey: options?.knownKey,
      targetWaveformPoints: options?.targetPoints || 200,
    };

    return this.executeAnalysis(input);
  }

  /**
   * Direct execution with Worker or main thread fallback.
   */
  public async executeAnalysis(input: AnalysisInput): Promise<TrackAnalysis> {
    // 1. Check cache first
    const cached = await getCachedAnalysis(input.trackId);
    if (cached) {
      return cached;
    }

    // 2. Try Web Worker
    if (this.worker) {
      return new Promise<TrackAnalysis>((resolve, reject) => {
        this.pendingRequests.set(input.trackId, { resolve, reject });
        const req: AnalysisWorkerRequest = {
          type: 'ANALYZE',
          payload: input,
        };
        try {
          this.worker?.postMessage(req);
        } catch {
          // If postMessage fails (e.g. transfer issue), fall back to local thread
          this.pendingRequests.delete(input.trackId);
          this.analyzeLocalThread(input).then(resolve).catch(reject);
        }
      });
    }

    // 3. Main thread fallback (non-blocking chunking / direct)
    return this.analyzeLocalThread(input);
  }

  private async analyzeLocalThread(input: AnalysisInput): Promise<TrackAnalysis> {
    const analysis = analyzeAudioData(input);
    await saveCachedAnalysis(analysis);
    return analysis;
  }
}

// Singleton export
export const analysisService = new AudioAnalysisService();
