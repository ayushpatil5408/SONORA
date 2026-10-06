# SONORA — Beat-Aware Arrangement & Musical Intelligence Architecture

**Status:** Authoritative Architectural Specification  
**Applies to:** Milestone 5.3 and Subsequent Milestones  
**Document Reference:** `docs/ARRANGEMENT_INTELLIGENCE_ARCHITECTURE.md`  
**Last Updated:** 2026-10-05  

---

## 1. Executive Summary & Core Principle

SONORA's creation workflow is defined as:
> **Listen → Understand → Perform → Create → Arrange → Remix → Share**

In conventional digital audio workstations, the timeline is treated as arbitrary seconds with an artificial spreadsheet-like grid overlaid on top. Milestone 5.3 transforms the SONORA Creator Workspace into a **living, beat-aware musical arrangement environment** where:

> **Music is not placed onto a timeline. The timeline understands the music.**

The arrangement workspace bridges Milestone 4's algorithmic Audio Intelligence (BPM, beats, downbeats, bars, phrases, keys, Camelot wheel mapping, and energy analysis) with the non-destructive editing and DSP processing foundations established in Milestones 5.0–5.2.

---

## 2. Musical Grid & Hierarchy

The musical grid operates simultaneously in **Absolute Time** (seconds with millisecond precision) and **Musical Time** (`Bar.Beat.Tick` with phrase and section awareness).

### 2.1 Hierarchy Levels

1. **Tick**: 480 PPQ (pulses per quarter note) internal resolution within each beat.
2. **Beat**: Quarter note division calculated as `60.0 / tempo` seconds.
3. **Downbeat**: Structural onset of Bar 1 (`time = 0.0s`) and the first beat of each subsequent bar.
4. **Bar**: Group of beats determined by the project time signature (default 4/4 = 4 beats).
5. **Phrase**: An 8-bar structural musical unit (`duration = 8 × barSec`), representing the macro cadence of rhythmic music.
6. **Section**: Atmospheric and structural territory (Intro, Verse, Build, Drop, Break, Chorus, Outro, Custom) spanning one or multiple phrases.

### 2.2 Zoom-Aware Grid Density

To prevent layout thrashing and DOM node explosion:
- **High Zoom (≥ 25 px/sec)**: Renders individual beats, downbeats, and phrases.
- **Medium Zoom (8–24 px/sec)**: Renders downbeat bars and phrase boundaries.
- **Wide Zoom (< 8 px/sec)**: Renders structural phrase membranes and section regions.

Lines are styled with spatial hierarchy:
- **Normal Beat**: Light acoustic tick (`rgba(255, 255, 255, 0.06)`).
- **Downbeat**: Structural vertical line (`rgba(255, 255, 255, 0.18)`).
- **Phrase Boundary**: Structural luminous membrane (`rgba(100, 210, 255, 0.35)` with subtle glow).

---

## 3. Intelligent Snapping Invariants

Snapping operates across four non-destructive quantization modes:

| Mode | Snapping Unit | Description | Invariant |
| :--- | :--- | :--- | :--- |
| **`off`** | Continuous floating seconds | Free micro-editing down to sub-millisecond precision. | Original placement preserved without quantization. |
| **`beat`** | 1 Beat duration (`60 / BPM`) | Snaps clip start to nearest musical quarter note. | Buffer offsets untouched. |
| **`bar`** | 1 Bar duration (`barSec`) | Snaps clip start to nearest bar downbeat. | Buffer offsets untouched. |
| **`phrase`**| 8 Bars duration (`phraseSec`) | Snaps clip start to nearest structural phrase boundary. | Buffer offsets untouched. |

**Non-Destructive Invariant**: Snapping alters only `timelineStart`. Audio buffers are never resampled, time-stretched, or pitch-shifted during snapping.

---

## 4. Quantized Duplication & Region Repetition

Duplication respects the detected musical grid and active snap mode:

1. **Quantized Clip Duplication (`quantizedDuplicateClip`)**:
   - Supports musical intervals: `1-beat`, `1-bar`, `2-bars`, `4-bars`, `8-bars`, `phrase`.
   - Preserves source reference, trim window (`sourceStart`, `sourceEnd`), gain, pan, fade curves, crossfades, and licensing rights.
2. **Phrase Duplication (`duplicatePhrase`)**:
   - Identifies all clips within an 8-bar phrase window on a track.
   - Duplicates the entire phrase forward by `phraseDuration`.
3. **Region Repetition (`repeatRegion`)**:
   - Non-destructively replicates all clips across all lanes within an arbitrary musical time window by $N$ repetitions ($1 \le N \le 8$).
   - Completely reversible via the command history stack.

---

## 5. Arrangement Regions & Sections Model

### 5.1 Domain Types

```typescript
export type ArrangementSectionType =
  | 'intro'
  | 'verse'
  | 'build'
  | 'drop'
  | 'break'
  | 'chorus'
  | 'outro'
  | 'custom';

export interface ArrangementSection {
  id: string;
  name: string;
  type: ArrangementSectionType;
  start: number;       // Timeline seconds
  end: number;         // Timeline seconds
  energy?: number;     // 0.0 - 1.0 energy tier
  confidence?: number; // 0.0 - 1.0 confidence
  color?: string;      // Visual accent token
}
```

### 5.2 Section Horizon & Operations

Sections are rendered in the **Section Horizon Strip** directly above the waveform lanes:
- **Interactive Selection**: Clicking a section highlights its spatial bounds.
- **Section Actions**:
  - `createSection`: Appends a new section at playhead or musical position.
  - `renameSection`: Non-destructively updates label.
  - `resizeSection`: Adjusts start/end while guaranteeing `start < end`.
  - `deleteSection`: Removes section while preserving underlying clips.
  - `repeatRegion`: Extends the section across all lanes.
  - `findIntersectingClips`: Instantly selects and focuses all clips contained within the section.

---

## 6. Deterministic Tempo Compatibility & Time-Stretch Preparation

SONORA compares source clip BPM against the project tempo with explicit, deterministic thresholds:

| State | BPM Difference ($\Delta$) | UI Indicator | Action / Readiness |
| :--- | :--- | :--- | :--- |
| **`match`** | $\Delta \le 1.0\text{ BPM}$ | Emerald `TEMPO MATCHED` | 1.0000x ratio. No stretch required. |
| **`near`** | $1.0 < \Delta \le 6.0\text{ BPM}$ | Amber `NEAR MATCH` | Calculated ratio ($projectBpm / sourceBpm$). Stretch required indicator displayed. |
| **`mismatch`** | $\Delta > 6.0\text{ BPM}$ | Rose `TEMPO DISPARITY` | Large difference flagged. Stretch required indicator displayed. |
| **`unknown`** | Missing BPM or confidence $< 0.40$ | Muted `TEMPO UNKNOWN` | No certainty claimed. |

### Architectural Time-Stretch Readiness

The model explicitly prepares metadata for future phase vocoder processing:
- `sourceBpm`: Analyzed or tagged tempo.
- `projectBpm`: Master project tempo clock.
- `timeStretchRequired`: Boolean flag indicating disparity.
- `ratio`: Mathematical speed ratio ($projectBpm / sourceBpm$).
- `timeStretchMode`: Future algorithm mode (`'repitch' | 'granular' | 'spectral'`).

**Strict Invariant**: Milestone 5.3 does not alter playback rate or run real-time phase vocoders. Playback remains source-time accurate.

---

## 7. Harmonic Arrangement Intelligence & Camelot Wheel

Harmonic relationships between adjacent clips and between clips and the project root key are evaluated deterministically using Milestone 4's 24-key **Camelot Wheel** (`CAMELOT_MAP`):

### 7.1 Compatibility Matrix

1. **Same Key (`same_key`)**:
   - Exact Camelot match (e.g., `8A` to `8A`).
   - Luminous cyan bridge, 100% harmonic compatibility.
2. **Relative Major / Minor (`relative`)**:
   - Same Camelot number, opposing letter (e.g., `8A` [Am] to `8B` [C]).
   - Fully compatible transition with emotional shift.
3. **Dominant / Subdominant Energy Shift (`dominant`)**:
   - $\pm 1$ step around the 12-hour wheel (e.g., `8A` to `9A` [+1 energy boost] or `8A` to `7A` [-1 energy release]).
   - Fully compatible acoustic transition.
4. **Dissonant (`dissonant`)**:
   - Key difference $> 1$ step or cross-letter jump (e.g., `8A` to `3B`).
   - Subtle rose filament indicating acoustic tension.
5. **Unknown (`unknown`)**:
   - Missing key or confidence $< 0.40$.
   - Displayed as `Harmonic Unknown` without false claims.

---

## 8. Energy-Aware Arrangement Terrain & Arc Profiling

Arrangement energy is calculated deterministically across clips and section metadata to generate an **Arrangement Energy Profile**:

### 8.1 Arc Classification

- **`low-build-peak-release`**: Intro energy $< 0.50$, mid peak $> 0.65$, outro release.
- **`dynamic-wave`**: Significant energy variance across sections ($\text{peak} - \text{valley} > 0.40$).
- **`flat`**: Ambient or steady progression with minimal variance ($< 0.15$).
- **`consistent`**: Uniform balanced dynamic level.

### 8.2 Luminous Energy Terrain Canvas

An SVG/Canvas energy terrain runs seamlessly beneath the musical ruler:
- Renders smooth cubic Bézier curves connecting arrangement energy nodes.
- Responsive gradient fills dynamically reflect energy intensity (cyan $\rightarrow$ iris $\rightarrow$ amber).
- Reduced-motion compliant: static SVG terrain rendered when `prefers-reduced-motion` is active.

---

## 9. History (Undo / Redo) Integration

All Milestone 5.3 operations participate in the project command history stack:
- `SET_PROJECT_KEY`
- `CREATE_SECTION`
- `RENAME_SECTION`
- `RESIZE_SECTION`
- `DELETE_SECTION`
- `DUPLICATE_PHRASE`
- `REPEAT_REGION`
- `MOVE_MARKER`
- `RENAME_MARKER`

Undo restores the exact prior immutable snapshot; Redo reapplies the mutation without side effects.

---

## 10. Rights & Licensing Guardrails

Arrangement intelligence strictly preserves rights boundaries:
- `canUseTrack(track, 'edit')` must be true for any track staged into lanes or duplicated.
- Streaming-only or non-derivative tracks are marked as `LISTEN ONLY` in the ingestion drawer and cannot be edited.
- Duplicating a clip preserves the original `sourceTrackId` and licensing constraints.

---

## 11. Performance & Rendering Strategy

- **Zero 60fps React State**: The Web Audio engine clock remains authoritative. Visual playheads utilize `requestAnimationFrame` and CSS transforms.
- **Zoom-Adapted Ruler**: Canvas/SVG elements calculate visible tick intervals based on viewport width and `zoom`, eliminating thousands of unnecessary DOM nodes.
- **Deterministic Math**: No heavy dependencies, phase vocoders, or generative LLMs on the main thread.

---

## 12. Explicitly Deferred Capabilities

The following features belong strictly to future milestone scopes:
- **Phase-Vocoder Time Stretching**: Deferred to M5.4 / M5.5.
- **AI Arrangement & Generative Composition**: Deferred to M6+.
- **Offline Rendering & Export (WAV/MP3)**: Deferred to M5.6.
- **Stem Isolation**: Deferred to future AI milestone.
- **Cloud Sync & Collaborative Multi-user**: Deferred to M7.
