/**
 * SONORA Audio Engine Type Contracts
 * Authoritative Reference: PRD.md, PRODUCT_ARCHITECTURE.md, Milestone 3.5
 * 
 * Strict boundary: Domain contracts describing audio state without
 * coupling to React component rendering lifecycles or Web Audio nodes.
 */

export type DeckId = 'A' | 'B';

export type TransportState = 'stopped' | 'playing' | 'paused';

export interface DeckEQ {
  /** Low-shelf gain in decibels (-24dB to +6dB, default 0dB) */
  low: number;
  /** Peaking mid-band gain in decibels (-24dB to +6dB, default 0dB) */
  mid: number;
  /** High-shelf gain in decibels (-24dB to +6dB, default 0dB) */
  high: number;
}

export type FilterType = 'bypass' | 'lowpass' | 'highpass';

export interface DeckFilter {
  /** Filter mode: bypass, lowpass (sweep left), highpass (sweep right) */
  type: FilterType;
  /** Cutoff frequency in Hz (20Hz - 20000Hz, default 20000) */
  frequency: number;
  /** Resonance / Q factor (default 1.0, range 0.1 - 18.0) */
  q: number;
}

export interface LoopState {
  enabled: boolean;
  start: number; // in seconds
  end: number; // in seconds
  lengthBeats: number; // e.g. 0.25, 0.5, 1, 2, 4, 8, 16, 32
}

export type DeckFXType = 'none' | 'filter' | 'echo' | 'reverb' | 'crush' | 'flanger';

export interface DeckFXState {
  type: DeckFXType;
  enabled: boolean;
  depth: number; // 0.0 to 1.0
  beatDivision: number; // 0.25, 0.5, 1, 2, 4
}

export type PitchRange = 0.06 | 0.10 | 0.16 | 1.00;

export interface DeckState {
  id: DeckId;
  isLoaded: boolean;
  trackName: string | null;
  duration: number;
  currentTime: number;
  transportState: TransportState;
  volume: number; // Channel fader (0.0 to 1.0)
  trim: number; // Channel gain trim (0.0 to 2.0, default 1.0)
  eq: DeckEQ;
  filter: DeckFilter;
  playbackRate: number; // default 1.0, range 0.5 to 2.0
  pitchRange: PitchRange; // 0.06, 0.10, 0.16, 1.00
  keyLock: boolean;
  cueTime: number; // Main CUE point in seconds
  hotCues: (number | null)[]; // 8 hot cues (indices 0 to 7)
  loop: LoopState;
  fx: DeckFXState;
  quantize: boolean;
  sync: boolean;
  isMasterDeck: boolean;
  slip: boolean;
  cueMonitor: boolean; // Headphone cue monitor (PFL)
}

export interface CrossfaderState {
  /** Crossfader position: -1.0 (full Deck A), 0.0 (center), +1.0 (full Deck B) */
  position: number;
  /** Equal-power calculated gain for Deck A (0.0 - 1.0) */
  gainA: number;
  /** Equal-power calculated gain for Deck B (0.0 - 1.0) */
  gainB: number;
  /** Crossfader curve profile */
  curve?: 'equal-power' | 'linear' | 'sharp';
}

export interface MasterState {
  /** Master output gain (0.0 to 1.0, default 0.85) */
  volume: number;
  /** Booth output gain (0.0 to 1.0, default 0.85) */
  boothVolume: number;
  /** Headphone output gain (0.0 to 1.0, default 0.80) */
  headphoneVolume: number;
  /** Headphone Cue / Master balance (0.0 = Cue only, 1.0 = Master only) */
  cueMasterMix: number;
}

export interface AudioDiagnostics {
  contextState: AudioContextState | 'uninitialized';
  isAudioLive: boolean;
  masterRms: number;
  masterPeak: number;
  deckARms: number;
  deckBRms: number;
  sampleRate: number;
}

export interface AudioEngineSnapshot {
  contextState: AudioContextState | 'uninitialized';
  isAudioLive: boolean;
  deckA: DeckState;
  deckB: DeckState;
  crossfader: CrossfaderState;
  master: MasterState;
  diagnostics?: AudioDiagnostics;
}

export type AudioEngineListener = (snapshot: AudioEngineSnapshot) => void;

export type AudioEngineErrorCode =
  | 'CONTEXT_NOT_INITIALIZED'
  | 'CONTEXT_SUSPENDED'
  | 'DECK_NOT_FOUND'
  | 'BUFFER_NOT_LOADED'
  | 'INVALID_PARAMETER'
  | 'DECODE_ERROR'
  | 'LOAD_ERROR';

export class AudioEngineError extends Error {
  constructor(message: string, public readonly code: AudioEngineErrorCode) {
    super(message);
    this.name = 'AudioEngineError';
  }
}

/**
 * Standard 3-Band Isolator EQ center frequencies (Hz)
 */
export const EQ_FREQUENCIES = Object.freeze({
  low: 250,
  mid: 1000,
  high: 3500,
});

/**
 * Default parameters for deck EQ stage
 */
export const DEFAULT_DECK_EQ: Readonly<DeckEQ> = Object.freeze({
  low: 0,
  mid: 0,
  high: 0,
});

/**
 * Default parameters for deck Filter stage
 */
export const DEFAULT_DECK_FILTER: Readonly<DeckFilter> = Object.freeze({
  type: 'bypass',
  frequency: 20000,
  q: 1.0,
});

export const DEFAULT_LOOP_STATE: Readonly<LoopState> = Object.freeze({
  enabled: false,
  start: 0,
  end: 0,
  lengthBeats: 4,
});

export const DEFAULT_DECK_FX: Readonly<DeckFXState> = Object.freeze({
  type: 'none',
  enabled: false,
  depth: 0.5,
  beatDivision: 1.0,
});

/**
 * Clamps a numeric value between a minimum and maximum threshold.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculates equal-power crossfade gains for Deck A and Deck B.
 * 
 * At position -1.0: gainA = 1.0, gainB = 0.0 (full Deck A)
 * At position  0.0: gainA = cos(π/4) ≈ 0.7071, gainB = sin(π/4) ≈ 0.7071 (equal acoustic power: gainA² + gainB² = 1.0)
 * At position +1.0: gainA = 0.0, gainB = 1.0 (full Deck B)
 */
export function calculateEqualPowerCrossfade(position: number): { gainA: number; gainB: number } {
  const clampedPos = clamp(position, -1.0, 1.0);
  const normalized = (clampedPos + 1.0) / 2.0; // 0.0 (Deck A) to 1.0 (Deck B)
  const angle = normalized * 0.5 * Math.PI;
  const gainA = Math.cos(angle);
  const gainB = Math.sin(angle);
  return { gainA, gainB };
}
