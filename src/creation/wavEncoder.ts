/**
 * SONORA High-Fidelity WAV Audio Encoder
 * Authoritative Reference: PRD.md Section 35, Milestone 5.5 Specification
 * 
 * Encodes audio buffer channels into standard RIFF WAVE binary formats:
 * - 16-bit Linear PCM (audioFormat = 1, CD-standard)
 * - 24-bit Linear PCM (audioFormat = 1, Studio-standard)
 * - 32-bit IEEE Floating Point (audioFormat = 3, High-dynamic range mastering)
 * 
 * Supports stereo interleaving, proper RIFF chunk alignment, and header validation.
 */

import { RenderBitDepth } from './renderTypes';

export interface WavMetadata {
  title?: string;
  artist?: string;
  comment?: string;
}

export interface WavHeaderInfo {
  format: 'RIFF';
  audioFormat: number; // 1 = PCM, 3 = IEEE Float
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataSize: number;
  totalDurationSeconds: number;
}

/**
 * Encodes audio channel arrays into a binary WAV ArrayBuffer.
 */
export function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
  bitDepth: RenderBitDepth = 16
): ArrayBuffer {
  const numChannels = channels.length;
  if (numChannels === 0) {
    throw new Error('Cannot encode WAV: zero audio channels provided.');
  }

  const numSamples = channels[0].length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  // Standard RIFF format chunk is 16 bytes for PCM/Float
  const fmtChunkSize = 16;
  const headerSize = 44; // 12 (RIFF) + 8 + 16 (fmt) + 8 (data header)
  const totalBufferSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalBufferSize);
  const view = new DataView(buffer);

  // 1. RIFF Header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Total file size minus 8 bytes
  writeString(view, 8, 'WAVE');

  // 2. "fmt " Subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, fmtChunkSize, true);
  // AudioFormat: 1 = Linear PCM, 3 = IEEE Float
  const audioFormat = bitDepth === 32 ? 3 : 1;
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // 3. "data" Subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // 4. Sample Interleaving & Quantization
  let offset = 44;

  if (bitDepth === 16) {
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = channels[ch][i];
        // Clamp and quantize to 16-bit signed integer [-32768, 32767]
        const clamped = Math.max(-1.0, Math.min(1.0, sample));
        const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        view.setInt16(offset, Math.round(int16), true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = channels[ch][i];
        // Clamp and quantize to 24-bit signed integer [-8388608, 8388607]
        const clamped = Math.max(-1.0, Math.min(1.0, sample));
        const int24 = Math.round(clamped < 0 ? clamped * 0x800000 : clamped * 0x7fffff);
        // Write 3 bytes little-endian
        view.setUint8(offset, int24 & 0xff);
        view.setUint8(offset + 1, (int24 >> 8) & 0xff);
        view.setUint8(offset + 2, (int24 >> 16) & 0xff);
        offset += 3;
      }
    }
  } else if (bitDepth === 32) {
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = channels[ch][i];
        // 32-bit IEEE float (little-endian)
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return buffer;
}

/**
 * Convenience helper to encode a Web Audio AudioBuffer into a WAV Blob.
 */
export function encodeAudioBufferToWavBlob(
  audioBuffer: AudioBuffer,
  bitDepth: RenderBitDepth = 16
): Blob {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  const arrayBuffer = encodeWav(channels, audioBuffer.sampleRate, bitDepth);
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Validates and extracts header metadata from a RIFF WAVE ArrayBuffer or Uint8Array.
 */
export function validateWavHeader(data: ArrayBuffer | Uint8Array): WavHeaderInfo {
  const view = data instanceof Uint8Array
    ? new DataView(data.buffer, data.byteOffset, data.byteLength)
    : new DataView(data);

  if (view.byteLength < 44) {
    throw new Error(`Invalid WAV file: buffer too small (${view.byteLength} bytes)`);
  }

  const riff = readString(view, 0, 4);
  if (riff !== 'RIFF') {
    throw new Error(`Invalid RIFF header: expected "RIFF", found "${riff}"`);
  }

  const wave = readString(view, 8, 4);
  if (wave !== 'WAVE') {
    throw new Error(`Invalid format identifier: expected "WAVE", found "${wave}"`);
  }

  const fmt = readString(view, 12, 4);
  if (fmt !== 'fmt ') {
    throw new Error(`Invalid subchunk identifier: expected "fmt ", found "${fmt}"`);
  }

  const audioFormat = view.getUint16(20, true);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const byteRate = view.getUint32(28, true);
  const blockAlign = view.getUint16(32, true);
  const bitsPerSample = view.getUint16(34, true);

  // Search for the "data" chunk (standard is offset 36)
  let dataOffset = 36;
  while (dataOffset < view.byteLength - 8) {
    const chunkId = readString(view, dataOffset, 4);
    if (chunkId === 'data') break;
    const chunkSize = view.getUint32(dataOffset + 4, true);
    dataOffset += 8 + chunkSize;
  }

  const dataChunkId = readString(view, dataOffset, 4);
  if (dataChunkId !== 'data') {
    throw new Error('Invalid WAV file: missing "data" chunk');
  }

  const dataSize = view.getUint32(dataOffset + 4, true);
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = dataSize / (channels * bytesPerSample);
  const totalDurationSeconds = parseFloat((totalSamples / sampleRate).toFixed(4));

  return {
    format: 'RIFF',
    audioFormat,
    channels,
    sampleRate,
    byteRate,
    blockAlign,
    bitsPerSample,
    dataSize,
    totalDurationSeconds,
  };
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function readString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}
