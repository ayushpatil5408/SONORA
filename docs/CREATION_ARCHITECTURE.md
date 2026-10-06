# SONORA Creation Architecture (Milestones 5.0 + 5.1)

**Status:** Authoritative Creation Specification  
**Applies to:** Milestones 5.0, 5.1, and future creation roadmap (M5.2+)  
**Last Updated:** 2026-10-05  

---

## 1. Executive Summary

Milestone 5.0 and 5.1 establish the **Creator Workspace Foundation** and **Timeline / Clip Engine** for SONORA:
- Transitions SONORA from `Discover → Listen → Analyze → Mix` into `CREATE`.
- Strictly adheres to the **"Music as Matter"** visual language: spatial sonic lanes, tactile clip ribbons, flowing waveforms, and iridescent transport beacons. Avoids generic DAW spreadsheets or admin dashboards.
- Implements a **Non-Destructive Editing Engine**: clips reference intervals (`[sourceStart, sourceEnd]`) within source audio; original audio buffers are never modified.
- Provides **Beat-Aware Timeline Snapping** (Free, Beat, Bar) derived from project tempo and time signature.
- Includes a complete **Undo / Redo Command History Stack** supporting keyboard shortcuts (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- Integrates with the **Milestone 2 Rights Safety Model**: only tracks with `canUseTrack(track, 'edit') === true` can be staged; listen-only tracks are strictly barred from arrangement.
- Implements an independent **Playback Scheduler** connected cleanly to the authoritative Web Audio context via `AudioEngine`.

---

## 2. Creation Domain Model

All models are strongly typed in `src/creation/types.ts`:

### 2.1 AudioProject
```ts
export interface AudioProject {
  id: string;
  name: string;
  tempo: number;               // BPM (e.g. 120, 124, 128)
  timeSignature: {
    numerator: number;         // e.g. 4
    denominator: number;       // e.g. 4
  };
  duration: number;            // Total duration in seconds (dynamic based on clips)
  tracks: AudioProjectTrack[];
  markers: ProjectMarker[];
  metadata?: AudioProjectMetadata;
  version: string;             // '1.0.0'
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 AudioProjectTrack
```ts
export interface AudioProjectTrack {
  id: string;
  name: string;
  clips: AudioClip[];
  volume: number;              // 0.0 to 1.0 (default 0.85)
  pan: number;                 // -1.0 to 1.0 (default 0.0)
  muted: boolean;
  solo: boolean;
  armed?: boolean;
  colorToken?: string;
}
```

### 2.3 AudioClip (Non-Destructive)
```ts
export interface AudioClip {
  id: string;
  sourceTrackId: string;
  timelineStart: number;       // Position on timeline (seconds)
  sourceStart: number;         // Start offset in source audio (seconds)
  sourceEnd: number;           // End offset in source audio (seconds)
  duration: number;            // Active length (seconds) = sourceEnd - sourceStart
  gain: number;                // 0.0 to 2.0 (default 1.0)
  pan: number;                 // -1.0 to 1.0 (default 0.0)
  fadeIn: number;              // Ramp duration (seconds)
  fadeOut: number;             // Ramp duration (seconds)
  muted?: boolean;
  metadata?: {
    sourceId?: string;
    sourceType?: 'demo' | 'local' | 'creator' | 'jamendo';
    title?: string;
    artist?: string;
    bpm?: number;
    key?: string;
    colorToken?: string;
  };
}
```

---

## 3. Non-Destructive Editing Invariant

When editing clips (trimming start or end, splitting, moving, or deleting):
```text
Original Source Audio Buffer
[================================================================] 0.0s to 16.0s

Trimmed Clip Representation
              [==============================]
              ↑                              ↑
         sourceStart (3.0s)             sourceEnd (9.0s)
              ↓
         timelineStart (1.5s)           duration = 6.0s
```

* **No Destructive Overwrite:** Source PCM samples are never sliced, mutated, or overwritten in memory.
* **Split Operation:** Splits one clip into two distinct clip entities sharing the same underlying source audio with contiguous `sourceStart` and `sourceEnd` intervals.
* **Delete Operation:** Removes the clip descriptor from the track; the underlying audio source buffer remains untouched.

---

## 4. Timeline Math & Musical Snapping

Managed by `src/creation/timelineMath.ts`:
- **Beat Duration:** `60 / tempo` seconds.
- **Bar Duration:** `(60 / tempo) * timeSignature.numerator` seconds.
- **Snapping Modes:**
  - `'off'`: Free placement down to milliseconds.
  - `'beat'`: Snaps to the nearest beat boundary (`Math.round(time / beatSec) * beatSec`).
  - `'bar'`: Snaps to the nearest bar boundary (`Math.round(time / barSec) * barSec`).
- **Musical Clock:** Provides `formatMusicalTime` (e.g. `Bar.Beat.Tick`) and `formatTimelineTime` (`MM:SS.ms`).

---

## 5. Command History & Undo/Redo

Managed by `src/creation/historyModel.ts`:
- Immutable state transitions. Every project mutation creates a new `AudioProject` object and pushes the previous state onto `past`.
- **Undo (`undo`):** Pops latest state from `past`, sets it as `present`, and pushes current to `future`.
- **Redo (`redo`):** Pops latest state from `future`, sets it as `present`, and pushes current to `past`.
- Capped at 50 steps to ensure lightweight memory overhead without memory leaks.
- Supports keyboard shortcuts: `Cmd/Ctrl+Z` (Undo), `Cmd/Ctrl+Shift+Z` (Redo).

---

## 6. Project Persistence

Managed by `src/creation/projectStore.ts`:
- **Primary:** IndexedDB database `sonora_creation_projects`, object store `projects`.
- **Fallback:** High-speed in-memory store + `localStorage` (`sonora_project_<id>`).
- **Copyright Safety:** Only arrangement metadata and source IDs are persisted. Raw copyrighted audio is **never** dumped into browser databases.
- **Missing Source Handling:** If a project references a source that is absent upon reload, the clip renders in a safe, non-crashing state with a `SOURCE UNAVAILABLE` indicator.

---

## 7. Rights Integration

Rights checks are authoritative via `canUseTrack(track, 'edit')`:
- Tracks with `canEdit === true` (e.g. Demo tracks, Creator Originals with full rights) can be staged directly into timeline lanes.
- Tracks with `canEdit === false` (e.g. Listen-only Jamendo or streaming tracks) display:
  `LISTEN ONLY — Editing unavailable for this source`
  and their stage button is permanently disabled.
- Invariant: Playback rights do not imply editing rights.

---

## 8. Playback Scheduling Engine

Managed by `src/creation/playbackScheduler.ts`:
```text
Project Tracks & Clips
        │
        ▼
PlaybackScheduler
 ├── Register Source Buffers
 ├── Calculate Active Clips & Offsets
 └── Schedule AudioBufferSourceNodes (start with offset & duration)
        │
        ▼
   Clip Gains & Track Volumes
        │
        ▼
Project Master GainNode
        │
        ▼
AudioEngine Master Routing / Destination
```

- **One-Shot Source Node Management:** Web Audio `AudioBufferSourceNode`s are instantiated per clip playback session, scheduled with `start(scheduleAudioTime, sourceOffset, playDuration)`.
- **Fade Ramping:** Employs `linearRampToValueAtTime` for clip fade-ins and fade-outs.
- **Clean Teardown:** `pause()`, `stop()`, and `seek()` immediately stop and disconnect all scheduled nodes to prevent overlapping or audio artifacts.
- **Performance:** Playhead position is updated via `requestAnimationFrame` without polluting React state at 60fps.

---

---

## 9. Milestone 5.2 — Non-Destructive Editing & Processing Architecture

Milestone 5.2 elevates SONORA from an arranger into a capable non-destructive audio creation environment:

### 9.1 Advanced Clip Editing & Slip Editing
- **Edge Trim Handles:** Tactile left/right handles supporting direct mouse drag, arrow key nudges, and snap-to-grid alignment. Trimming adjusts `timelineStart`, `sourceStart`, `sourceEnd`, and `duration` without mutating original audio buffers.
- **Slip Editing:** The user can shift the internal source window `[sourceStart, sourceEnd]` through `slipClip(project, clipId, deltaSec)`. The timeline position `timelineStart` and playback length `duration` remain strictly invariant.
- **Dynamic Gain Reactivity:** Waveform peak bars dynamically reflect clip gain in amplitude and color glow, without re-rendering or regenerating PCM buffers.
- **Tempo Disparity Indication:** If `clip.metadata.bpm` differs from `project.tempo`, an alert badge displays the discrepancy without attempting premature or lossy time stretching.

### 9.2 Non-Linear Fade Curves
Stored explicitly in project state on each clip (`fadeInCurve`, `fadeOutCurve`):
- `linear`: Standard diagonal amplitude ramp.
- `ease-in`: Quadratic / progressive ramp ($p^2$) starting gently and steepening.
- `ease-out`: Inverted quadratic / logarithmic curve starting briskly and settling smoothly.
- `equal-power`: Sine / cosine curve ($\sin(p \cdot \frac{\pi}{2})$) preserving perceived acoustic energy.
- **Web Audio Implementation:** Scheduled in `playbackScheduler.ts` using `setValueCurveAtTime` across pre-calculated curve float arrays.
- **Visual Ramps:** SVG overlays dynamically visualize the exact curve contour directly on the clip ribbon.

### 9.3 Overlapping Clip Crossfades
- **Overlap Detection:** `detectTrackCrossfades(project, trackId)` identifies all overlapping clip pairs on a track.
- **Crossfade Model:** `ClipCrossfade` stores `id`, `fromClipId`, `toClipId`, `startTime`, `duration`, and `curve`.
- **Energy Preservation:** The default `equal-power` crossfade guarantees $gainA^2 + gainB^2 = 1.0$ at every progress point, avoiding volume dips or unnatural peaks.
- **Visual Bridge:** Timeline tracks render interactive hatched crossfade bridges indicating overlap duration and curve type.

### 9.4 Track Processing Architecture & Real Web Audio DSP
Each audio track contains an extensible `TrackProcessingChain` housing 7 real Web Audio DSP processors:
```text
Clip Source
    │
    ▼
Clip Gain & Pan
    │
    ▼
Track Processing Chain (TrackDspNodeGraph)
    ├── EQ (3-Band BiquadFilter: Low Shelf, Mid Peaking, High Shelf)
    ├── Filter (BiquadFilter: Lowpass, Highpass, Bandpass with Cutoff & Q)
    ├── Compressor (DynamicsCompressorNode: Threshold, Ratio, Attack, Release, Knee)
    ├── Saturation (WaveShaperNode with Sigmoid Non-Linear Transfer Curve)
    ├── Delay (DelayNode with Feedback Gain Loop & Wet/Dry Blend)
    ├── Reverb (ConvolverNode with Algorithmic Synthetic Impulse Response)
    └── Limiter (Fast Lookahead / Soft-Knee Dynamics Compressor Ceiling Guard)
    │
    ▼
Track Volume & Pan
    │
    ▼
Project Master GainNode ➔ AudioEngine Master Output
```
- **Zero-Latency Live Bypass:** Every processor provides a `bypassed` toggle. Bypassing an effect routes audio cleanly through a dry bypass path without deleting or corrupting parameter state.
- **Signal Flow Ordering:** Processors maintain a strict order along the **Acoustic Transformation Spine** and can be reordered at will.

### 9.5 Living Automation Foundation
- **Model:** `AutomationLane` and `AutomationPoint` define timestamped control nodes.
- **Filament Rendering:** Rendered directly over or beneath sonic tracks as a living, glowing SVG filament connecting points with linear interpolation (`getInterpolatedAutomationValue`).
- **Interaction:** Click anywhere on the lane to drop a bead; drag to adjust time and parameter value; double-click or delete to remove.
- **Real-Time Modulation:** Audio playback reads automation values for volume and pan, smoothly modulating nodes during playback.

### 9.6 Beat-Aware Snapping (Phrase Snapping)
- Expanded `SnapMode` to include `'phrase'` alongside `'off'`, `'beat'`, and `'bar'`.
- Snaps timeline operations to 8-bar musical phrase boundaries ($phraseSec = barSec \times 8$).

### 9.7 Rights Guardrails & Persistence
- Creation editing strictly respects `canUseTrack(track, 'edit')`. Streaming/listen-only sources cannot be staged or manipulated.
- All M5.2 state (fade curves, crossfades, processing chains, bypass states, parameters, automation lanes, and points) persists seamlessly to IndexedDB and LocalStorage via `projectStore.ts`.

---

## 10. Roadmap Beyond M5.2

- **M5.3:** Beat-Aware Arrangement & Section Management
- **M5.4:** Advanced Sound Design Horizons & Modular Synth Routing
- **M5.5:** Dedicated Creator Environment Horizons
- **M5.6:** Offline Render & Mixdown Export (WAV / MP3)

