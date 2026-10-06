/**
 * SONORA Pure Waveform Peak Analysis
 * Authoritative Reference: PRD.md & PRODUCT_ARCHITECTURE.md
 * 
 * Pure mathematical algorithms for downsampling PCM audio buffers into
 * compact min/max/RMS peak representations.
 * Strictly decoupled from DOM, React, and Web Audio APIs.
 */

import { WaveformData, WaveformError } from './waveformTypes';

/**
 * Extracts compact min, max, and RMS peaks from raw mono PCM samples.
 * 
 * @param samples Mono audio PCM samples (Float32Array)
 * @param targetPointCount Number of resolution buckets requested (e.g. 800 - 1200)
 * @param duration Total duration in seconds
 * @param sampleRate Audio sample rate in Hz
 */
export function calculateWaveformPeaks(
  samples: Float32Array,
  targetPointCount: number,
  duration: number,
  sampleRate: number
): WaveformData {
  if (!samples) {
    throw new WaveformError('No PCM sample data provided for waveform extraction', 'INVALID_SAMPLE_DATA');
  }

  const sampleCount = samples.length;
  if (sampleCount === 0) {
    return {
      duration: Math.max(0, duration),
      sampleRate: Math.max(0, sampleRate),
      length: 0,
      minPeaks: new Float32Array(0),
      maxPeaks: new Float32Array(0),
      rmsPeaks: new Float32Array(0),
    };
  }

  // Sanitize target resolution
  const resolvedPointCount = Math.max(1, Math.min(Math.floor(targetPointCount), sampleCount));

  const minPeaks = new Float32Array(resolvedPointCount);
  const maxPeaks = new Float32Array(resolvedPointCount);
  const rmsPeaks = new Float32Array(resolvedPointCount);

  const windowSize = sampleCount / resolvedPointCount;

  for (let i = 0; i < resolvedPointCount; i++) {
    const startIdx = Math.floor(i * windowSize);
    // Ensure the last bucket covers up to the exact end of samples
    const endIdx = i === resolvedPointCount - 1
      ? sampleCount
      : Math.min(Math.floor((i + 1) * windowSize), sampleCount);

    let min = 0.0;
    let max = 0.0;
    let sumSquares = 0.0;
    const windowLength = Math.max(1, endIdx - startIdx);

    for (let j = startIdx; j < endIdx; j++) {
      const val = samples[j];
      if (val < min) min = val;
      if (val > max) max = val;
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / windowLength);

    // Clamp peaks to standard audio boundaries [-1.0, 1.0]
    minPeaks[i] = Math.max(-1.0, Math.min(0.0, min));
    maxPeaks[i] = Math.max(0.0, Math.min(1.0, max));
    rmsPeaks[i] = Math.max(0.0, Math.min(1.0, rms));
  }

  return {
    duration: Math.max(0, duration),
    sampleRate: Math.max(0, sampleRate),
    length: resolvedPointCount,
    minPeaks,
    maxPeaks,
    rmsPeaks,
  };
}

/**
 * Mixes multi-channel audio buffers into a single mono Float32Array.
 * Leaves original audio data unmutated.
 */
export function downmixAudioBufferToMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  if (numChannels === 1) {
    const mono = new Float32Array(length);
    mono.set(audioBuffer.getChannelData(0));
    return mono;
  }

  // Downmix stereo or multi-channel audio with equal weighting
  const mono = new Float32Array(length);
  const weight = 1.0 / numChannels;

  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] * weight;
    }
  }

  return mono;
}
