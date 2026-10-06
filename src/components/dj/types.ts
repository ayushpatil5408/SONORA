/**
 * SONORA DJ Environment Domain Types
 * Authoritative Reference: PRD.md, DESIGN_SYSTEM.md, MILESTONE 3
 * 
 * Formal definitions for the three selectable DJ environments:
 * 1. ORGANIC ORBITAL — Celestial, gravitational, orbital waveforms & central plasma core.
 * 2. LIQUID INSTRUMENT — Viscous fluid membranes, flowing tendrils, capillary crossfade.
 * 3. ACOUSTIC ORGANISM — Resonant biological filaments, acoustic ribs, living breathing spine.
 * 
 * All environments share identical underlying audio state and controls.
 */

import { DeckEQ, DeckFilter, FilterType, LoopState, DeckFXState, PitchRange, DeckFXType } from '../../audio/types';
import { TrackAnalysis, HarmonicMatchResult } from '../../audio/analysisTypes';
import { WaveformData } from '../../audio/waveformTypes';

export type DJEnvironment = 'orbital' | 'liquid' | 'organism';

export type PadMode = 'hotcue' | 'loop' | 'beatjump' | 'padfx';

export interface DJEnvironmentMeta {
  id: DJEnvironment;
  name: string;
  subtitle: string;
  tagline: string;
  accentColor: string;
  glyph: string;
  description: string;
}

export const DJ_ENVIRONMENTS: DJEnvironmentMeta[] = [
  {
    id: 'orbital',
    name: 'Organic Orbital',
    subtitle: 'Two celestial decks. One gravitational mix.',
    tagline: 'Cosmic • Gravitational • Precise',
    accentColor: '#00E5FF',
    glyph: '◉',
    description:
      'Inspired by planets, orbits and natural cycles. Each deck is a living orbital form with independent motion, while the central mixer acts as a gravitational core.',
  },
  {
    id: 'liquid',
    name: 'Liquid Instrument',
    subtitle: 'Flowing shapes. Natural control.',
    tagline: 'Fluid • Viscous • Expressive',
    accentColor: '#38BDF8',
    glyph: '◎',
    description:
      'A fluid, organic design inspired by liquid motion and natural forms. The mixer feels like a living instrument with flowing geometry and responsive liquid energy.',
  },
  {
    id: 'organism',
    name: 'Acoustic Organism',
    subtitle: 'Sound takes form.',
    tagline: 'Biological • Sculptural • Living',
    accentColor: '#C084FC',
    glyph: '◈',
    description:
      'Inspired by sound waves, nature structures and living organisms. The mixer becomes a responsive acoustic body with flowing lines, pulsing energy and living motion.',
  },
];

const ENVIRONMENT_STORAGE_KEY = 'sonora_dj_environment';

/**
 * Retrieves the stored DJ environment from localStorage with safe fallback to 'orbital'.
 */
export function getStoredDJEnvironment(): DJEnvironment {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'orbital';
  }
  try {
    const raw = window.localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    if (raw === 'orbital' || raw === 'liquid' || raw === 'organism') {
      return raw;
    }
  } catch (err) {
    console.warn('Failed to read DJ environment from localStorage:', err);
  }
  return 'orbital';
}

/**
 * Persists the selected DJ environment to localStorage.
 */
export function setStoredDJEnvironment(env: DJEnvironment): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (env === 'orbital' || env === 'liquid' || env === 'organism') {
      window.localStorage.setItem(ENVIRONMENT_STORAGE_KEY, env);
    }
  } catch (err) {
    console.warn('Failed to save DJ environment to localStorage:', err);
  }
}

/**
 * Shared Deck State Contract consumed identically by all 3 environment renderers.
 */
export interface SharedDeckState {
  deckId: 'A' | 'B';
  trackName: string | null;
  artistName?: string | null;
  bpm?: number | null;
  key?: string | null;
  waveform: WaveformData | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;
  trim: number;
  eq: DeckEQ;
  filter: DeckFilter;
  playbackRate: number;
  pitchRange: PitchRange;
  keyLock: boolean;
  cueTime: number;
  hotCues: (number | null)[];
  loop: LoopState;
  quantize: boolean;
  sync: boolean;
  isMasterDeck: boolean;
  slip: boolean;
  vinylMode: boolean;
  fx: DeckFXState;
  activePadMode: PadMode;
  cueMonitor: boolean;
  analysis?: TrackAnalysis | null;

  // Deck Control Actions
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onCue: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onTrimChange: (val: number) => void;
  onEqChange: (band: 'low' | 'mid' | 'high', val: number) => void;
  onFilterChange: (type: FilterType, freq: number, q: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onPitchRangeChange: (range: PitchRange) => void;
  onTempoReset: () => void;
  onKeyLockToggle: () => void;
  onJogTurn: (deltaDeg: number, isScratch?: boolean) => void;
  onHotCueTrigger: (index: number) => void;
  onHotCueSet: (index: number) => void;
  onHotCueDelete: (index: number) => void;
  onAutoLoop: (beats: number) => void;
  onLoopIn: () => void;
  onLoopOut: () => void;
  onLoopToggle: () => void;
  onBeatJump: (beats: number) => void;
  onQuantizeToggle: () => void;
  onSyncToggle: () => void;
  onSlipToggle: () => void;
  onVinylModeToggle: () => void;
  onPadModeChange: (mode: PadMode) => void;
  onFXToggle: (fx: DeckFXType) => void;
  onFXParamChange: (fx: DeckFXType, param: string, val: number) => void;
  onFXDivisionChange: (div: number) => void;
  onCueMonitorToggle: () => void;
  onIngestFile: (file: File) => Promise<void>;
  onGenerateDemo: () => Promise<void>;
}

/**
 * Shared Central Mixer State Contract consumed identically by all 3 environment renderers.
 */
export interface SharedMixerState {
  crossfaderPosition: number; // -1.0 to +1.0
  gainA: number; // 0.0 to 1.0
  gainB: number; // 0.0 to 1.0
  masterVolume: number; // 0.0 to 1.0
  boothVolume: number; // 0.0 to 1.0
  headphoneVolume: number; // 0.0 to 1.0
  cueMasterMix: number; // 0.0 (Cue) to 1.0 (Master)
  deckAVolume: number; // 0.0 to 1.0
  deckBVolume: number; // 0.0 to 1.0
  trimA: number;
  trimB: number;
  cueA: boolean;
  cueB: boolean;
  deckAIsPlaying: boolean;
  deckBIsPlaying: boolean;
  audioLive: boolean;
  audioState: 'suspended' | 'running' | 'closed';
  harmonicMatch?: HarmonicMatchResult | null;

  onCrossfaderChange: (pos: number) => void;
  onMasterVolumeChange: (vol: number) => void;
  onBoothVolumeChange: (vol: number) => void;
  onHeadphoneVolumeChange: (vol: number) => void;
  onCueMasterMixChange: (mix: number) => void;
  onChannelFaderAChange: (val: number) => void;
  onChannelFaderBChange: (val: number) => void;
  onTrimAChange: (val: number) => void;
  onTrimBChange: (val: number) => void;
  onCueAChange: (active: boolean) => void;
  onCueBChange: (active: boolean) => void;
  onUnlockAudio: () => Promise<void>;
}

/**
 * Shared Environment Props passed to Orbital, Liquid, and Organism components.
 */
export interface DJEnvironmentProps {
  deckA: SharedDeckState;
  deckB: SharedDeckState;
  mixer: SharedMixerState;
  activeEnvironment: DJEnvironment;
}

