# SONORA Audio Intelligence & Analysis Architecture (Milestone 4)

**Status:** Complete & Authoritative Architecture Specification  
**Applies to:** Milestone 4 and subsequent milestones  
**Last Updated:** 2026-10-05  

---

## 1. Executive Summary

Milestone 4 introduces the **Audio Intelligence Layer** for SONORA. While earlier phases established sound generation, dual-deck mixing, and reactive visualization, the Audio Intelligence Layer enables SONORA to **understand the music it is playing**:
- Transforms raw PCM audio data into structured musical descriptors (waveform peaks, 3-band energy, spectral centroid & octaves, BPM, beat grid, musical key with Camelot wheel mapping, loudness dynamics, and structural sections).
- Provides this intelligence to the **Professional DJ Studio** (quantize, sync, beat jumping, harmonic matching beacon).
- Powers the **Intelligent Waveform** with dynamic energy envelopes, analyzed beat ticks, and phrase boundary flags.
- Manifests as an immersive **Living Audio Lab** ("music as matter"), avoiding generic SaaS cards in favor of a radial harmonic core, living spectral organ, and flowing waveform terrain.
- Strictly preserves the **Milestone 2 Rights Safety Model** (analysis never grants playback/licensing rights).

---

## 2. High-Level Architecture

The Audio Intelligence Layer is decoupled from both the DOM and the Web Audio real-time playback graph:

```text
                           Audio Buffer / Stream
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │     Analysis Service         │
                     │  (Main-Thread Orchestrator)  │
                     └──────────────┬───────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │ Cache Hit?                          │
                 ▼ (Yes)                               ▼ (No)
        ┌─────────────────┐                   ┌──────────────────┐
        │ Persistent      │                   │ Web Worker       │
        │ Analysis Cache  │                   │ (analysisWorker) │
        │ (IndexedDB /    │                   └────────┬─────────┘
        │  Memory fallback│                            │
        └─────────────────┘                            ▼
                 │                            ┌──────────────────┐
                 │                            │ Pure Analysis    │
                 │                            │ Engine (DSP)     │
                 │                            └────────┬─────────┘
                 │                                     │
                 └───────────────┬─────────────────────┘
                                 │
                                 ▼
                     Structured TrackAnalysis
                                 │
         ┌───────────────────────┼────────────────────────┐
         ▼                       ▼                        ▼
  Intelligent Waveform    Professional DJ Mixer     Living Audio Lab
  (Beat ticks, energy,   (Camelot beacon, sync,    (Harmonic core, spectral
   phrase flags)          quantize, beat jump)      organ, octave bands)
```

---

## 3. Analysis Domain Model

All analysis data is governed by strongly typed TypeScript definitions in `src/audio/analysisTypes.ts`:

```ts
export interface TrackAnalysis {
  trackId: string;
  duration: number;
  analyzedAt: string;
  analyzerVersion: string; // e.g. '1.0.0' for versioned cache invalidation

  waveform: WaveformAnalysis;
  energy: EnergyAnalysis;
  spectral: SpectralAnalysis;
  bpm: BPMAnalysis;
  beats: BeatAnalysis;
  key: KeyAnalysis;
  loudness: LoudnessAnalysis;
  sections: SectionAnalysis[];
  confidence: AnalysisConfidence;
}
```

### Subsystems Breakdown:
- **`WaveformAnalysis`**: Multi-resolution peak arrays, RMS value, global peak, and sample rate.
- **`EnergyAnalysis`**: Low-frequency (bass), mid-frequency, high-frequency (treble) normalized energies, average and peak energy, plus a 64-point temporal energy envelope.
- **`SpectralAnalysis`**: Spectral centroid (Hz), spectral rolloff (Hz), 8-band octave energy distribution (Sub-Bass, Bass, Low-Mid, Mid, High-Mid, Presence, Brilliance, Air).
- **`BPMAnalysis`**: BPM value (60–180 BPM), confidence score (0.0–1.0), and extraction source (`measured` | `estimated` | `metadata`).
- **`BeatAnalysis`**: High-precision timestamp arrays for beats, downbeats, and bar markers, plus beat duration.
- **`KeyAnalysis`**: Musical key (e.g. `Am`, `C`), root note, mode (`major` | `minor`), Camelot code (e.g. `8A`, `8B`), and confidence score.
- **`LoudnessAnalysis`**: RMS, peak, dynamic range proxy (dB), and integrated loudness proxy (dBFS).
- **`SectionAnalysis`**: Structural phrase segments (Intro, Build, Drop, Breakdown, Verse, Outro) with timing, energy, and confidence.
- **`AnalysisConfidence`**: Explicit reliability rating preventing false claims of certainty.

---

## 4. Algorithmic Methodology

### 4.1 Waveform & Multi-Resolution Peaks
- Extracted using linear time windowing across Float32Array PCM samples.
- Clamped within valid bounds `[-1.0, 1.0]` and normalized.
- Shared with the existing Phase 0.3 waveform worker pipeline to prevent duplicate work.

### 4.2 Multi-Band Energy
- Low energy is derived from low-frequency envelope accumulation (penalizing high-derivative sample differences).
- High energy is derived from first-order sample differences (`|s(t) - s(t-1)|`), acting as a temporal differentiator.
- Mid energy is derived from absolute magnitude minus extremes.
- Normalized with conservative scaling and soft clamping.

### 4.3 Spectral Descriptors (Centroid, Rolloff, Bands)
- Spectral centroid (perceived brightness) is estimated in Hz across 8 frequency bands:
  - Sub-Bass (20–60 Hz)
  - Bass (60–250 Hz)
  - Low-Mid (250–500 Hz)
  - Mid (500–2000 Hz)
  - High-Mid (2000–4000 Hz)
  - Presence (4000–6000 Hz)
  - Brilliance (6000–12000 Hz)
  - Air (12000–20000 Hz)
- Rolloff frequency estimates the cutoff below which 85% of spectral energy resides.

### 4.4 BPM & Beat Grid Estimation
- Calculates an **onset novelty curve** (spectral/energy flux across 20ms frames).
- Performs **autocorrelation** over the tempo lag range corresponding to 60–180 BPM.
- Generates a beat grid with downbeats (bar beginnings, every 4 beats in 4/4 time).
- Deterministic behavior for known/demo tracks; robust heuristic calculation for local/unlabeled audio.

### 4.5 Musical Key & Harmonic Camelot Engine
- Generates a 12-element chromatic pitch class vector (chromagram).
- Computes Pearson correlation against the **Krumhansl-Kessler** key profiles for all 12 Major and 12 Minor keys.
- Maps detected keys to the **Camelot Wheel** (`1A`–`12A` for Minor, `1B`–`12B` for Major).
- `getHarmonicCompatibility(keyA, keyB)` calculates:
  - **Perfect Match** (`1.0` score): Identical key (e.g., `8A` and `8A`).
  - **Relative Major/Minor** (`0.95` score): Same Camelot number, opposite mode (e.g., `8A` Am and `8B` C).
  - **Dominant / Energy Boost** (`0.85` score): +1 step on the wheel (e.g., `8A` Am and `9A` Em).
  - **Subdominant / Warmth** (`0.85` score): -1 step on the wheel (e.g., `8A` Am and `7A` Dm).
  - **Incompatible / Distant** (`<0.50` score): Distance > 1 step on the wheel.

---

## 5. Web Worker & Caching Architecture

### 5.1 Web Worker (`src/audio/analysisWorker.ts`)
- Offloads heavy processing from the UI thread to keep playback and user interaction completely glitch-free.
- Strongly typed message protocol:
  - **Incoming:** `{ type: 'ANALYZE', payload: AnalysisInput }`
  - **Outgoing:** `{ type: 'COMPLETE', payload: TrackAnalysis }` or `{ type: 'ERROR', payload: { trackId, error } }`
- Main thread service (`src/audio/analysisService.ts`) provides transparent fallback to in-process execution if Web Workers are unavailable in the browser environment.

### 5.2 Persistent Versioned Cache (`src/audio/analysisCache.ts`)
- **Primary:** IndexedDB store `sonora_audio_intelligence` / object store `analyses`.
- **Fallbacks:** High-speed in-memory LRU map + `localStorage` (`sonora_analysis_<id>`).
- **Version Invalidation:** Every record stores `analyzerVersion: '1.0.0'`. If algorithms are updated in the future, stale records are automatically invalidated and deleted.
- **Copyright Safety:** Only derived mathematical metadata is cached. Raw audio PCM buffers are **never** stored in the database.

---

## 6. DJ System & UI Integration

### 6.1 Professional DJ Workspace Integration
- **Live BPM & Key Badges:** Deck headers display detected BPM with confidence indicator and Camelot harmonic key badge.
- **Beat Grid & Quantize:** Quantize snaps hot cue jumps, loop toggles, and transport triggers to the analyzed beat grid timestamps.
- **Harmonic Convergence Beacon:** Located on the master mixer between Deck A and Deck B. Displays real-time harmonic compatibility relationship, compatibility label (e.g. `• Relative Major/Minor`, `• Energy Boost (+1 Step)`), and resonance glow.
- **Analysis-Aware Sync:** Instantly syncs Deck B playback rate to Deck A's analyzed BPM.

### 6.2 Intelligent Waveform Ribbon (`src/components/WaveformRibbon.tsx`)
- Visualizes analyzed beat grid ticks along the ribbon.
- Distinct color-coded flags for detected structural phrases (Intro, Drop, Build, Outro).
- Semi-transparent audio-reactive energy envelope overlaying the waveform peaks.

### 6.3 Living Audio Lab (`src/components/views/AudioLabView.tsx`)
- Follows SONORA visual guidelines: **Music as Matter**.
- No generic SaaS cards or admin grids.
- Features:
  1. **Radial Harmonic Core:** Central Camelot wheel orbit showing key, mode, and confidence rating.
  2. **Living Spectral Organ:** Three animated energy columns (Bass, Mid, Treble) with live harmonic filament styling.
  3. **8-Band Octave Spectrum:** Detailed frequency breakdown with semantic Hz labels.
  4. **Waveform & Dynamic Metrics Terrain:** Peak-to-RMS dynamic ratio, loudness dBFS proxies, and structural phrase timeline.

---

## 7. Rights Safety Invariant

The Milestone 2 rights management architecture (`canUseTrack`, `TrackRights`, `PlaybackCapability`) remains authoritative:
- Track analysis **never** modifies track capabilities (`canStream`, `canDJ`, `canEdit`, `canRemix`).
- A track may be analyzed for metadata profiling even if it is listen-only or licensed for non-DJ playback.
- Sonic intelligence and licensing rights remain completely orthogonal.

---

## 8. Performance & Accessibility Standards

- **Zero 60fps React State Thrashing:** FFT canvas rendering and live audio reactivity use decoupled `requestAnimationFrame` loops. React state is updated only upon analysis completion or discrete user action.
- **Hardware Audio Output Decoupling:** AnalyserNodes remain connected in parallel. Master output directly feeds `AudioContext.destination` without serial analyser dependencies.
- **Accessibility:** Text alternatives (`Compatible`, `Energy Boost`, `Incompatible`) accompany all color indicators. ARIA labels and keyboard navigation are implemented throughout.
- **Reduced Motion:** All animated CSS transforms and canvas ripples honor `prefers-reduced-motion: reduce`.

---

## 9. Known Limitations & Upgrade Points

1. **Autocorrelation Tempo Range:** The current heuristic BPM estimator targets standard music tempos (60–180 BPM). Half-time or double-time genres (e.g. 85 BPM vs 170 BPM drum & bass) may require manual BPM half/double toggles in future iterations.
2. **Key Profile Heuristics:** The chromagram uses 12 chromatic energy bins and Krumhansl-Kessler correlation. Highly complex polyphonic or microtonal music may yield lower confidence (`Unknown` or `<0.6`).
3. **Loudness Compliance:** Loudness is currently reported via a dynamic range and RMS dBFS proxy rather than full ITU-R BS.1770-4 EBU R128 integrated LUFS metering.
4. **Future Upgrade Points:** Integration of compiled WebAssembly DSP kernels (e.g. Essentia.js or Aubio WASM) can be plugged directly into `analysisWorker.ts` without modifying UI or state contracts.
