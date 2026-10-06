/**
 * SONORA Audio Loader Utility
 * Authoritative Reference: PRD.md & PRODUCT_ARCHITECTURE.md
 * 
 * Isolated loading and decoding utilities. Converts browser Files, Blobs,
 * and ArrayBuffers into native Web Audio AudioBuffers.
 * Completely decoupled from React and the UI tree.
 */

import { AudioEngineError } from './types';

/**
 * Validates whether an incoming File/Blob is candidate audio data.
 */
function validateAudioSource(source: File | Blob): void {
  if (!source) {
    throw new AudioEngineError('No audio source provided', 'INVALID_PARAMETER');
  }

  if (source.size === 0) {
    throw new AudioEngineError('Audio source file is empty (0 bytes)', 'INVALID_PARAMETER');
  }

  // If a MIME type is declared, ensure it is not explicitly non-audio
  if (source.type) {
    const isAudio = source.type.startsWith('audio/');
    const isOggMedia = source.type === 'video/ogg' || source.type === 'application/ogg';
    const isOctetStream = source.type === 'application/octet-stream' || source.type === '';
    
    if (!isAudio && !isOggMedia && !isOctetStream) {
      throw new AudioEngineError(
        `Unsupported media type "${source.type}". Expected an audio file.`,
        'INVALID_PARAMETER'
      );
    }
  }
}

/**
 * Decodes an ArrayBuffer of encoded audio into an AudioBuffer using the supplied AudioContext.
 * Automatically handles browser-specific buffer detachment by copying the buffer.
 */
export async function decodeAudioBuffer(
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new AudioEngineError('Empty or invalid ArrayBuffer provided', 'INVALID_PARAMETER');
  }

  if (!audioContext || audioContext.state === 'closed') {
    throw new AudioEngineError('AudioContext is not available or closed', 'CONTEXT_NOT_INITIALIZED');
  }

  try {
    // Clone arrayBuffer before decoding to prevent detachment issues
    const bufferClone = arrayBuffer.slice(0);
    const audioBuffer = await audioContext.decodeAudioData(bufferClone);
    return audioBuffer;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AudioEngineError(
      `Audio decoding failed: ${message}`,
      'DECODE_ERROR'
    );
  }
}

/**
 * Reads a File or Blob, extracts its binary data, and decodes it into an AudioBuffer.
 */
export async function loadAudioFile(
  file: File | Blob,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  validateAudioSource(file);

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AudioEngineError(
      `Failed to read audio file binary data: ${message}`,
      'LOAD_ERROR'
    );
  }

  return decodeAudioBuffer(arrayBuffer, audioContext);
}

export type DemoTrackType = 'deckA' | 'deckB';

/**
 * Synthesizes an in-memory musical AudioBuffer for instant testing,
 * demonstration, and tactile evaluation of dual-deck playback and mixing.
 * Deck A: 120 BPM rhythmic electronic groove (kick, sub bass, hi-hats).
 * Deck B: 120 BPM melodic ambient pad and arpeggiated chord sequence.
 */
export function createSyntheticDemoBuffer(
  audioContext: AudioContext,
  type: DemoTrackType,
  durationSeconds = 16
): AudioBuffer {
  const sampleRate = audioContext.sampleRate || 44100;
  const length = Math.floor(sampleRate * durationSeconds);
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  const chL = buffer.getChannelData(0);
  const chR = buffer.getChannelData(1);

  const bpm = 120;
  const beatDuration = 60 / bpm; // 0.5s per beat

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const beat = t / beatDuration;
    const beatFraction = beat % 1.0;

    let sampleL = 0;
    let sampleR = 0;

    if (type === 'deckA') {
      // 1. Kick transient (exponential pitch envelope from 140Hz to 45Hz)
      const kickEnv = Math.exp(-beatFraction * 14.0);
      const kickFreq = 45 + 95 * Math.exp(-beatFraction * 28.0);
      const kickPhase = 2 * Math.PI * kickFreq * beatFraction * beatDuration;
      const kick = Math.sin(kickPhase) * kickEnv * 0.75;

      // 2. Offbeat Hi-hat transient (white noise burst at beatFraction ~ 0.5)
      const hatFraction = (beat + 0.5) % 1.0;
      const hatEnv = Math.exp(-hatFraction * 32.0);
      const noise = (Math.random() * 2 - 1);
      const hat = noise * hatEnv * 0.18;

      // 3. Sub-bass pulse on 8th notes
      const subFraction = (beat * 2) % 1.0;
      const subEnv = Math.exp(-subFraction * 4.0);
      const subBass = Math.sin(2 * Math.PI * 55 * t) * subEnv * 0.35;

      sampleL = kick + hat * 0.8 + subBass;
      sampleR = kick + hat * 1.2 + subBass;
    } else {
      // Deck B: Ambient harmonic chords (Am - F - C - G sequence)
      const chordIndex = Math.floor(beat / 8) % 4;
      const chords = [
        [220, 261.63, 329.63], // Am (A3, C4, E4)
        [174.61, 220, 261.63], // F (F3, A3, C4)
        [130.81, 164.81, 196], // C (C3, E3, G3)
        [196, 246.94, 293.66], // G (G3, B3, D4)
      ];
      const chord = chords[chordIndex];

      // Arpeggio note (16th note arpeggiation)
      const arpNoteIdx = Math.floor(beat * 4) % chord.length;
      const arpFreq = chord[arpNoteIdx] * 2;
      const arpFraction = (beat * 4) % 1.0;
      const arpEnv = Math.exp(-arpFraction * 6.0);
      const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.22;

      // Warm pad foundation
      let pad = 0;
      for (let c = 0; c < chord.length; c++) {
        pad += Math.sin(2 * Math.PI * chord[c] * t) * 0.1;
      }

      sampleL = pad + arp * 0.9;
      sampleR = pad + arp * 1.1;
    }

    chL[i] = Math.max(-1.0, Math.min(1.0, sampleL));
    chR[i] = Math.max(-1.0, Math.min(1.0, sampleR));
  }

  return buffer;
}

