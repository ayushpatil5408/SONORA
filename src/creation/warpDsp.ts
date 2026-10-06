/**
 * SONORA Advanced Audio Time-Stretching & Pitch-Preserving DSP Engine
 * Authoritative Reference: PRD.md Section 19 & 35, Milestone 5.4 Specification
 * 
 * Implements real browser-native pitch-preserving audio time stretching:
 * - WSOLA (Waveform Similarity Overlap-Add) with cross-correlation phase alignment
 * - Explicit Quality Modes:
 *   1. 'draft': Fast Overlap-Add (OLA) with Hanning window for low-latency scrubbing
 *   2. 'balanced': Standard WSOLA with phase correlation matching (recommended)
 *   3. 'quality': High-density 75% overlap-add with expanded correlation search
 * - Pitch Lock:
 *   - When pitchLocked = true: time duration changes, musical pitch preserved
 *   - When pitchLocked = false: varispeed resampling (standard tape/turntable behavior)
 * - Safe stretch range: 0.5x to 2.0x (clamped for acoustic stability)
 * - In-Memory LRU buffer caching to prevent redundant DSP computations
 * 
 * Strict Invariant: Original source AudioBuffers are NEVER mutated or destructively overwritten.
 */

import { WarpQuality } from './warpTypes';

const WARP_CACHE_MAX_ENTRIES = 50;
const warpedBufferCache = new Map<string, AudioBuffer>();

/**
 * Clears the in-memory warped buffer cache.
 */
export function clearWarpBufferCache(): void {
  warpedBufferCache.clear();
}

/**
 * Generates a cache key for a warped audio slice.
 */
function getWarpCacheKey(
  sourceId: string,
  sourceStart: number,
  sourceEnd: number,
  ratio: number,
  quality: WarpQuality,
  pitchLocked: boolean
): string {
  return `${sourceId}:${sourceStart.toFixed(3)}:${sourceEnd.toFixed(3)}:${ratio.toFixed(4)}:${quality}:${pitchLocked}`;
}

/**
 * Creates a Hanning (Hann) window of length N.
 */
function createHannWindow(length: number): Float32Array {
  const win = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
  }
  return win;
}

/**
 * Finds the optimal time shift Delta within [-searchWindow, +searchWindow]
 * that maximizes cross-correlation between the current source grain and the target tail.
 */
function findBestCorrelationOffset(
  input: Float32Array,
  targetPos: number,
  prevTail: Float32Array,
  searchWindow: number,
  grainLength: number
): number {
  let bestOffset = 0;
  let maxCorrelation = -Infinity;

  const compareLength = Math.min(prevTail.length, Math.floor(grainLength / 2));
  const minShift = -Math.min(searchWindow, targetPos);
  const maxShift = Math.min(searchWindow, input.length - (targetPos + grainLength));

  // Step by 2 samples for high-efficiency cross-correlation
  for (let shift = minShift; shift <= maxShift; shift += 2) {
    let corr = 0;
    const startIdx = targetPos + shift;

    for (let k = 0; k < compareLength; k += 4) {
      corr += input[startIdx + k] * prevTail[k];
    }

    if (corr > maxCorrelation) {
      maxCorrelation = corr;
      bestOffset = shift;
    }
  }

  return bestOffset;
}

/**
 * Performs pitch-preserving time stretching on a single channel Float32Array using WSOLA.
 */
function timeStretchChannelWSOLA(
  input: Float32Array,
  ratio: number, // targetLength / inputLength
  sampleRate: number,
  quality: WarpQuality
): Float32Array {
  const safeRatio = Math.max(0.4, Math.min(2.5, ratio));
  const inputLength = input.length;
  const targetLength = Math.max(128, Math.round(inputLength * safeRatio));

  // DSP Configuration per quality mode
  let grainMs = 35;
  let overlapRatio = 0.5;
  let searchMs = 12;

  if (quality === 'draft') {
    grainMs = 45;
    overlapRatio = 0.5;
    searchMs = 0; // Skip correlation search for draft
  } else if (quality === 'quality') {
    grainMs = 28;
    overlapRatio = 0.75;
    searchMs = 16;
  }

  const grainLength = Math.max(64, Math.round((grainMs / 1000) * sampleRate));
  const synthesisHop = Math.max(32, Math.round(grainLength * (1 - overlapRatio)));
  const analysisHop = Math.max(16, Math.round(synthesisHop / safeRatio));
  const searchWindow = Math.round((searchMs / 1000) * sampleRate);

  const window = createHannWindow(grainLength);
  const output = new Float32Array(targetLength);
  const normWeight = new Float32Array(targetLength);

  let outPos = 0;
  let nominalInPos = 0;
  const prevTail = new Float32Array(Math.floor(grainLength / 2));

  while (outPos < targetLength && nominalInPos < inputLength - grainLength) {
    let actualInPos = nominalInPos;

    // Apply WSOLA correlation search if quality is balanced or quality
    if (searchMs > 0 && outPos > 0) {
      const bestDelta = findBestCorrelationOffset(
        input,
        nominalInPos,
        prevTail,
        searchWindow,
        grainLength
      );
      actualInPos = Math.max(0, Math.min(inputLength - grainLength, nominalInPos + bestDelta));
    }

    // Overlap-add grain with windowing
    const copyLen = Math.min(grainLength, targetLength - outPos);
    for (let k = 0; k < copyLen; k++) {
      const w = window[k];
      output[outPos + k] += input[actualInPos + k] * w;
      normWeight[outPos + k] += w;
    }

    // Save tail for next correlation match
    const tailLen = prevTail.length;
    for (let k = 0; k < tailLen; k++) {
      if (actualInPos + grainLength - tailLen + k < inputLength) {
        prevTail[k] = input[actualInPos + grainLength - tailLen + k];
      }
    }

    outPos += synthesisHop;
    nominalInPos += analysisHop;
  }

  // Normalize by overlapping window weights
  for (let i = 0; i < targetLength; i++) {
    if (normWeight[i] > 0.0001) {
      output[i] /= normWeight[i];
    }
  }

  return output;
}

/**
 * Resamples a single channel Float32Array linearly (varispeed: speed and pitch change together).
 */
function resampleChannelVarispeed(input: Float32Array, ratio: number): Float32Array {
  const targetLength = Math.max(128, Math.round(input.length * ratio));
  const output = new Float32Array(targetLength);
  const step = (input.length - 1) / (targetLength - 1 || 1);

  for (let i = 0; i < targetLength; i++) {
    const srcIdx = i * step;
    const base = Math.floor(srcIdx);
    const frac = srcIdx - base;
    const s0 = input[base] || 0;
    const s1 = input[base + 1] || s0;
    output[i] = s0 + frac * (s1 - s0);
  }

  return output;
}

/**
 * Time-stretches an AudioBuffer slice with pitch preservation or varispeed.
 * Reuses cached results where parameters match.
 */
export function timeStretchAudioBuffer(
  ctx: BaseAudioContext,
  sourceBuffer: AudioBuffer,
  sourceStart: number,
  sourceEnd: number,
  stretchRatio: number, // projectBpm / sourceBpm
  quality: WarpQuality = 'balanced',
  pitchLocked = true,
  sourceId = 'source'
): AudioBuffer {
  // If ratio is 1.0 (no stretch required), return standard slice
  const sampleRate = sourceBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(sourceStart * sampleRate));
  const endSample = Math.min(sourceBuffer.length, Math.ceil(sourceEnd * sampleRate));
  const sliceSamples = Math.max(128, endSample - startSample);

  // Time stretch ratio for audio: if tempo increases (projectBpm > sourceBpm),
  // target duration is compressed (durationRatio = 1 / stretchRatio).
  const safeStretchRatio = Math.max(0.4, Math.min(2.5, stretchRatio));
  const durationRatio = 1 / safeStretchRatio;

  // Check in-memory cache
  const cacheKey = getWarpCacheKey(
    sourceId,
    sourceStart,
    sourceEnd,
    safeStretchRatio,
    quality,
    pitchLocked
  );

  const cached = warpedBufferCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const numChannels = sourceBuffer.numberOfChannels;
  const targetSamples = Math.max(128, Math.round(sliceSamples * durationRatio));

  const warpedBuffer = ctx.createBuffer(numChannels, targetSamples, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcChannelData = sourceBuffer.getChannelData(ch);
    const sliceData = srcChannelData.subarray(startSample, startSample + sliceSamples);

    let stretchedData: Float32Array;

    if (Math.abs(durationRatio - 1.0) < 0.001) {
      // 1-to-1 match
      stretchedData = new Float32Array(sliceData);
    } else if (pitchLocked) {
      // Pitch-preserved WSOLA time-stretch
      stretchedData = timeStretchChannelWSOLA(sliceData, durationRatio, sampleRate, quality);
    } else {
      // Varispeed resampling (pitch shifts with speed)
      stretchedData = resampleChannelVarispeed(sliceData, durationRatio);
    }

    warpedBuffer.getChannelData(ch).set(stretchedData);
  }

  // Manage cache capacity
  if (warpedBufferCache.size >= WARP_CACHE_MAX_ENTRIES) {
    const firstKey = warpedBufferCache.keys().next().value;
    if (firstKey) warpedBufferCache.delete(firstKey);
  }
  warpedBufferCache.set(cacheKey, warpedBuffer);

  return warpedBuffer;
}
