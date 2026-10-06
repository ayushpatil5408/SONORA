/**
 * SONORA Audio Intelligence & Analysis Domain Types
 * Authoritative Reference: PRD.md Section 19 & 30, Milestone 4 Specification
 * 
 * Formal definitions for musical audio intelligence:
 * - Waveform & amplitude envelopes
 * - Multi-band energy (low, mid, high)
 * - Spectral descriptors (centroid, roll-off, frequency distribution)
 * - BPM & sample-accurate beat grid (beats, downbeats, bars)
 * - Musical Key & Camelot harmonic compatibility (24 keys, modes)
 * - Dynamics & loudness proxies (RMS, peak, dynamic range)
 * - Structural phrase sections (Intro, Verse, Build, Drop, Outro)
 * - Calibrated confidence indicators
 * - Cache & versioning metadata
 */

export const ANALYZER_VERSION = '1.0.0';

export interface AnalysisConfidence {
  overall: number; // 0.0 to 1.0
  bpm: number;     // 0.0 to 1.0
  key: number;     // 0.0 to 1.0
  beats: number;   // 0.0 to 1.0
}

export interface WaveformAnalysis {
  peak: number;
  rms: number;
  points: number[];
  resolution: number;
  duration: number;
}

export interface EnergyAnalysis {
  average: number; // Normalized 0.0 - 1.0
  peak: number;    // Normalized 0.0 - 1.0
  low: number;     // Bass energy < 250 Hz (0.0 - 1.0)
  mid: number;     // Mid energy 250 - 4000 Hz (0.0 - 1.0)
  high: number;    // High energy > 4000 Hz (0.0 - 1.0)
  envelope: number[]; // Temporal smoothed energy curve (0.0 - 1.0)
}

export interface SpectralAnalysis {
  centroid: number; // Hz (perceived brightness / center of spectral mass)
  rolloff: number;  // Hz (frequency below which 85% of energy resides)
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  bands: number[];  // 8-band spectral distribution
}

export interface BPMAnalysis {
  bpm: number;
  confidence: number;
  source: 'measured' | 'estimated' | 'metadata';
}

export interface BeatAnalysis {
  beats: number[];      // Timestamps in seconds
  downbeats: number[];  // Downbeat timestamps (start of bar)
  bars: number[];       // Bar boundary timestamps
  beatDuration: number; // Average beat length in seconds
  confidence: number;
}

export type MusicalMode = 'major' | 'minor' | 'unknown';

export interface KeyAnalysis {
  key: string;          // e.g. "Am", "C", "F#m", "Unknown"
  root: string;         // e.g. "A", "C", "F#"
  mode: MusicalMode;    // 'major' | 'minor' | 'unknown'
  camelot: string;      // e.g. "8A", "8B", "11A"
  confidence: number;   // 0.0 to 1.0
}

export interface LoudnessAnalysis {
  rms: number;             // Linear RMS 0.0 - 1.0
  peak: number;            // Linear Peak 0.0 - 1.0
  dynamicRange: number;    // dB proxy (peak-to-average ratio)
  integratedLoudness: number; // Normalized -70 to 0 dBFS proxy
}

export type SectionType = 'intro' | 'verse' | 'chorus' | 'build' | 'drop' | 'breakdown' | 'outro' | 'segment';

export interface SectionAnalysis {
  id: string;
  start: number; // Seconds
  end: number;   // Seconds
  label: string;
  type: SectionType;
  energy: number; // 0.0 - 1.0
}

export interface TrackAnalysis {
  trackId: string;
  duration: number;
  waveform?: WaveformAnalysis;
  bpm?: BPMAnalysis;
  beats?: BeatAnalysis;
  key?: KeyAnalysis;
  energy?: EnergyAnalysis;
  loudness?: LoudnessAnalysis;
  spectral?: SpectralAnalysis;
  sections?: SectionAnalysis[];
  confidence: AnalysisConfidence;
  analyzedAt: string;
  analyzerVersion: string;
}

// -----------------------------------------------------------------------------
// Camelot Wheel & Harmonic Compatibility Definitions
// -----------------------------------------------------------------------------

export type HarmonicRelation = 
  | 'perfect'        // Same key (e.g., 8A <-> 8A)
  | 'relative'       // Relative Major/Minor (e.g., 8A Am <-> 8B C)
  | 'subdominant'    // -1 on wheel (e.g., 8A <-> 7A)
  | 'dominant'       // +1 on wheel (e.g., 8A <-> 9A, Energy Boost)
  | 'diagonal'       // +1/-1 + mode switch (e.g., 8A <-> 9B)
  | 'incompatible'   // Distant harmonic relation
  | 'unknown';       // Insufficient confidence / unknown key

export interface HarmonicMatchResult {
  compatible: boolean;
  relation: HarmonicRelation;
  label: string;
  description: string;
  score: number; // 0.0 to 1.0
}

/**
 * Standard Camelot Wheel Key Map:
 * Key name to Camelot code (1A - 12A Minor, 1B - 12B Major)
 */
export const CAMELOT_MAP: Record<string, string> = {
  // Minor Keys (A)
  'Abm': '1A', 'G#m': '1A',
  'Ebm': '2A', 'D#m': '2A',
  'Bbm': '3A', 'A#m': '3A',
  'Fm': '4A',
  'Cm': '5A',
  'Gm': '6A',
  'Dm': '7A',
  'Am': '8A',
  'Em': '9A',
  'Bm': '10A',
  'F#m': '11A', 'Gbm': '11A',
  'C#m': '12A', 'Dbm': '12A',

  // Major Keys (B)
  'B': '1B',
  'F#': '2B', 'Gb': '2B',
  'Db': '3B', 'C#': '3B',
  'Ab': '4B', 'G#': '4B',
  'Eb': '5B', 'D#': '5B',
  'Bb': '6B', 'A#': '6B',
  'F': '7B',
  'C': '8B',
  'G': '9B',
  'D': '10B',
  'A': '11B',
  'E': '12B',
};

/**
 * Evaluates harmonic compatibility between two keys using the Camelot wheel.
 */
export function getHarmonicCompatibility(keyA?: string | null, keyB?: string | null): HarmonicMatchResult {
  if (!keyA || !keyB || keyA === 'Unknown' || keyB === 'Unknown') {
    return {
      compatible: false,
      relation: 'unknown',
      label: 'Harmonic Unknown',
      description: 'Key analysis incomplete or below confidence threshold.',
      score: 0.0,
    };
  }

  const codeA = CAMELOT_MAP[keyA.trim()];
  const codeB = CAMELOT_MAP[keyB.trim()];

  if (!codeA || !codeB) {
    return {
      compatible: false,
      relation: 'unknown',
      label: 'Unmapped Key',
      description: 'Key code outside standard 24-key Camelot wheel.',
      score: 0.0,
    };
  }

  const numA = parseInt(codeA.slice(0, -1), 10);
  const letterA = codeA.slice(-1);
  const numB = parseInt(codeB.slice(0, -1), 10);
  const letterB = codeB.slice(-1);

  // 1. Same exact key
  if (numA === numB && letterA === letterB) {
    return {
      compatible: true,
      relation: 'perfect',
      label: 'Perfect Harmonic Match',
      description: `Identical key (${keyA} • ${codeA}). Seamless transition.`,
      score: 1.0,
    };
  }

  // 2. Relative Major / Minor (same number, different letter: 8A <-> 8B)
  if (numA === numB && letterA !== letterB) {
    return {
      compatible: true,
      relation: 'relative',
      label: 'Relative Major/Minor',
      description: `Harmonic pair (${keyA} & ${keyB} • ${codeA}/${codeB}). Rich harmonic resonance.`,
      score: 0.95,
    };
  }

  // Circular distance on 12-hour Camelot wheel
  const diff = Math.abs(numA - numB);
  const circularDiff = Math.min(diff, 12 - diff);

  // 3. Adjacent keys on wheel (same mode, ±1 position: 8A <-> 7A or 9A)
  if (letterA === letterB && circularDiff === 1) {
    const isAscending = (numB === (numA % 12) + 1) || (numA === 12 && numB === 1);
    return {
      compatible: true,
      relation: isAscending ? 'dominant' : 'subdominant',
      label: isAscending ? 'Energy Boost (+1 Step)' : 'Subdominant Warmth (-1 Step)',
      description: `${isAscending ? 'Lifts energetic momentum' : 'Gently grounds sonic texture'} (${codeA} ➔ ${codeB}).`,
      score: 0.85,
    };
  }

  // 4. Diagonal mix (±1 position and opposite letter)
  if (letterA !== letterB && circularDiff === 1) {
    return {
      compatible: true,
      relation: 'diagonal',
      label: 'Diagonal Harmonic Shift',
      description: `Dynamic mood transformation (${codeA} ➔ ${codeB}).`,
      score: 0.70,
    };
  }

  // 5. Incompatible
  return {
    compatible: false,
    relation: 'incompatible',
    label: 'Harmonic Tension',
    description: `Distant keys (${codeA} & ${codeB}, distance ${circularDiff}). Recommended: EQ cut or transition mix.`,
    score: Math.max(0.1, 0.6 - circularDiff * 0.1),
  };
}
