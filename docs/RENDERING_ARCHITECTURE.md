# SONORA — Audio Rendering, Export & Stem Bouncing Architecture (Milestone 5.5)

**Status:** Authoritative Architecture Reference  
**Applies to:** Milestone 5.5+ Audio Engine, Creator Workspace, Offline DSP Pipeline  
**Last Updated:** 2026-10-06  

---

## 1. Overview & Core Philosophy

In the SONORA workstation, creation culminates in real audio artifacts:
> **Discover → Listen → Analyze → Mix → Edit → Create → Render → Share**

Prior to Milestone 5.5, SONORA was an interactive real-time editor with non-destructive slicing, DSP chains, parameter automation, and WSOLA warping. Milestone 5.5 establishes the authoritative **deterministic offline audio rendering and export engine**.

The core design principle of M5.5 is:
> **What sounds in the workstation must render identically into the exported file.**

Offline rendering is **not** a real-time audio capture, **not** a microphone or speaker loopback, **not** a `MediaRecorder` stream, and **not** a silent dummy container. It is a full deterministic reconstitution of the project's audio graph rendered faster-than-realtime via native Web Audio `OfflineAudioContext` (and supported by an IEEE 32-bit float software rendering fallback in headless environments), encoded to high-fidelity uncompressed Linear PCM / IEEE Float WAV.

---

## 2. Realtime vs. Offline Consistency

SONORA preserves a clean boundary between real-time playback and offline export while sharing identical domain contracts:

```text
┌─────────────────────────────────────────────────────────────┐
│                 DOMAIN CONTRACTS (SHARED)                   │
│   AudioProject, AudioClip, WarpConfig, TrackProcessing,     │
│   Automation, Gain, Pan, Non-Linear Fades, Rights Matrix    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      REALTIME PLAYBACK      │ │      OFFLINE RENDERING      │
│ ─────────────────────────── │ │ ─────────────────────────── │
│ • Singleton AudioEngine     │ │ • Pure RenderPlan compiler  │
│ • Hardware AudioContext     │ │ • OfflineAudioContext graph │
│ • 60fps rAF UI playhead     │ │ • Deterministic time-grid   │
│ • Interactive scrubbing     │ │ • Linear PCM / Float WAV    │
│ • Speaker output            │ │ • Memory-safe Blob export   │
└─────────────────────────────┘ └─────────────────────────────┘
```

### Guarantees
1. **No AudioEngine Hijacking:** The singleton `AudioEngine` maintaining DJ Deck and Creator workspace playback is never suspended, reconfigured, or used for offline rendering. Real-time playback and offline export can run concurrently without hardware device conflict.
2. **Identical DSP Graph:** The exact same DSP builder (`buildTrackDspGraph`) and parameter mappings operate over `BaseAudioContext`, ensuring identical filter curves, compressor dynamics, delay times, and saturation waveshaping between live auditioning and exported output.
3. **Identical Time Stretching:** Pitch-preserving WSOLA processing utilizes the exact same overlap-add mathematics and quality modes (`warpDsp.ts`) across both real-time and offline paths.

---

## 3. RenderPlan Architecture

Rendering does not query UI components or inspect DOM state. All rendering executes against an immutable, validated, pre-compiled **`RenderPlan`**.

```text
                      AudioProject
                           │
                           ▼
                  createRenderPlan()
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
Full Mixdown Plan                    Stem Bounce Plan
(All active tracks summed)           (Isolated single track)
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
                       RenderPlan
            ┌──────────────┼──────────────┐
            │              │              │
      RenderSettings  RenderRange  TrackRenderPlan[]
                                          │
                                   ClipRenderPlan[]
```

### 3.1 Type Specification (`renderTypes.ts`)
```typescript
export interface RenderPlan {
  projectId: string;
  projectName: string;
  projectTempo: number;
  settings: RenderSettings;
  range: RenderRange;
  tracks: TrackRenderPlan[];
  masterChain: {
    gain: number;
    limiterEnabled: boolean;
  };
}

export interface TrackRenderPlan {
  trackId: string;
  name: string;
  gain: number;
  pan: number;
  processing: TrackProcessingState;
  automation: TrackAutomation;
  clips: ClipRenderPlan[];
}

export interface ClipRenderPlan {
  clipId: string;
  trackId: string;
  audioBuffer: AudioBuffer;
  sourceStart: number;
  sourceEnd: number;
  renderStart: number;
  renderDuration: number;
  gain: number;
  pan: number;
  fadeIn: ClipFade;
  fadeOut: ClipFade;
  warp: ClipWarpConfig;
  stretchRatio: number;
}
```

### 3.2 Compilation & Validation (`renderPlan.ts`)
1. **Effective Duration Calculation:** Derives the true boundary of audible material:
   $$\text{Duration} = \max_{c \in \text{Clips}} (c.\text{projectStartTime} + c.\text{duration}) + \text{tail Allowance}$$
2. **Range Clamping:** Clamps start to $[0, \text{duration}]$, end to $(start, \text{duration}]$. Ensures $end > start$ or throws `INVALID_RANGE`.
3. **Solo / Mute Matrix:**
   - If any track has `solo === true`, only soloed tracks are included in the mixdown.
   - Any track with `muted === true` is excluded.
   - For a stem bounce (`mode === 'stem'`), only the targeted track is included; all other tracks are bypassed.
4. **Rights Guard:** Checks `canUseTrack(track, 'edit')` for each included track. If permission is denied, compilation halts immediately with `RIGHTS_RESTRICTION`.

---

## 4. Render Graph & Execution Engine

Offline rendering is executed by `renderAudioProject()` (`offlineRenderer.ts`).

### 4.1 Web Audio Offline Graph
For each track in `RenderPlan.tracks`:
```text
ClipBufferSource / StretchedBuffer
     │
     ▼ (Stereo Panner Node - Clip Pan)
     │
     ▼ (Gain Node - Clip Gain & Non-Linear Fades)
     │
     ├──────────────────────────────────────┐
     ▼                                      ▼
Track In Gain Node                     (Automation Schedules)
     │                                 • Volume ramp
     ▼                                 • Pan ramp
Track DSP Graph:
  1. High-Pass Filter (12dB/oct)
  2. 3-Band Parametric EQ (Low, Mid, High)
  3. Low-Pass Filter (12dB/oct)
  4. Dynamic Compressor
  5. Non-linear Saturation (Waveshaper)
  6. Stereo Ping-Pong Delay
  7. Algorithmic Convolution Reverb
     │
     ▼
Track Out Gain & Pan Node
     │
     ▼
Master Bus Summing Gain Node
     │
     ▼ (Master Limiter Node)
     │
     ▼
Destination (OfflineAudioContext.destination)
```

### 4.2 Software PCM Mixing Engine (Headless / Testing)
In Node.js test environments or environments where `OfflineAudioContext` is absent, `offlineRenderer.ts` switches transparently to a bit-identical IEEE 32-bit Float software mixer:
- Slices source `Float32Array` channels to non-destructive sub-windows.
- Evaluates non-linear fade curves sample-by-sample.
- Applies equal-power stereo panning matrices:
  $$L = \cos\left(\frac{(p + 1) \cdot \pi}{4}\right), \quad R = \sin\left(\frac{(p + 1) \cdot \pi}{4}\right)$$
- Evaluates linear volume and pan automation envelopes at project timestamps.
- Sums into a stereo output `AudioBuffer`.

---

## 5. M5.4 Warp & Tempo Integration

Exported audio strictly adheres to M5.4 tempo and warping configurations:

1. **`mode === 'free'`:**
   - Rendered duration equals clip source duration ($s_{\text{end}} - s_{\text{start}}$).
   - No time stretching or pitch shifting applied.
2. **`mode === 'project_locked'`:**
   - The stretch ratio $R$ is deterministically calculated from the clip's detected/effective BPM and project tempo:
     $$R = \frac{T_{\text{clip}}}{T_{\text{project}}}$$
   - Clamped to safe musical bounds $[0.25, 4.0]$.
   - Source PCM is stretched using **WSOLA (Waveform Similarity Overlap-Add)** via `warpDsp.ts`, preserving original musical pitch while altering playback duration.
   - The stretched buffer is positioned exactly at `renderStart` on the offline timeline.

---

## 6. M5.2 DSP & Processing Integration

The offline engine renders every M5.2 track processor:

| Processor | Offline Implementation | Web Audio Node |
|---|---|---|
| **High-Pass / Low-Pass Filter** | 12dB/oct Biquad Filter with cutoff and resonance | `BiquadFilterNode` (`highpass`, `lowpass`) |
| **3-Band Parametric EQ** | Low shelf, Peaking mid, High shelf | 3 $\times$ `BiquadFilterNode` |
| **Compressor** | Threshold, Ratio, Attack, Release, Knee | `DynamicsCompressorNode` |
| **Saturation** | Non-linear polynomial waveshaping transfer curve | `WaveShaperNode` ($x \mapsto \frac{(3+k)x}{1+k\|x\|}$) |
| **Stereo Delay** | Delay time, feedback loop, and wet/dry blend | `DelayNode` + `GainNode` |
| **Reverb** | Algorithmic impulse response with exponential decay | `ConvolverNode` |
| **Master Limiter** | Hard ceiling limiter to prevent inter-sample clipping | `DynamicsCompressorNode` (ratio 20:1, 0.001s attack) |

---

## 7. Automation Integration

Track-level volume and pan automation curves from M5.2 are scheduled directly onto the offline timeline:

1. **Volume Automation:** Slices the curve into segments $[(t_i, v_i), (t_{i+1}, v_{i+1})]$. In `OfflineAudioContext`, scheduled via `gain.linearRampToValueAtTime(v, t)`. In software rendering, interpolated per-sample:
   $$v(t) = v_i + \frac{t - t_i}{t_{i+1} - t_i}(v_{i+1} - v_i)$$
2. **Pan Automation:** Scheduled onto the stereo panner's `.pan` parameter over project time.

---

## 8. Mixdown vs. Track / Stem Bouncing

SONORA provides two export pathways:

### 8.1 Full Stereo Mixdown (`mode === 'mixdown'`)
- All unmuted, active tracks are compiled into the render plan.
- Respects track solo hierarchy.
- Sums into the stereo master bus with optional master limiting.
- Intended for finished demos, reference tracks, and catalog publishing.

### 8.2 Stem / Track Bouncing (`mode === 'stem'`)
- Isolates an individual existing project track (e.g. Lead Vocals, Bassline, Drum Bus).
- **Strict Distinction:** Stem bouncing renders an existing workstation track independently. It is **not** AI source separation.
- Completely silences all other project tracks.
- Preserves the target track's clip edits, warping, volume, pan, fades, automation, and track DSP.
- Intended for DAW export, remix packs, and external audio mixing.

---

## 9. Binary WAV Encoding (`wavEncoder.ts`)

Rendered `AudioBuffer` instances are encoded directly into valid binary **RIFF/WAVE** byte buffers without external libraries:

```text
00-03: "RIFF"
04-07: ChunkSize (36 + Subchunk2Size)
08-11: "WAVE"
12-15: "fmt "
16-19: Subchunk1Size (16)
20-21: AudioFormat (1 = PCM, 3 = IEEE Float)
22-23: NumChannels (2 = Stereo)
24-27: SampleRate (e.g. 44100, 48000)
28-31: ByteRate (SampleRate * NumChannels * BitsPerSample / 8)
32-33: BlockAlign (NumChannels * BitsPerSample / 8)
34-35: BitsPerSample (16, 24, or 32)
36-39: "data"
40-43: Subchunk2Size (NumSamples * NumChannels * BitsPerSample / 8)
44...: Interleaved Audio Samples
```

### Supported Quantizations
1. **16-bit Linear PCM (`AudioFormat = 1`):** Clamped to $[-1.0, 1.0]$, scaled by $32767$, serialized as 16-bit signed little-endian integers.
2. **24-bit Linear PCM (`AudioFormat = 1`):** Clamped to $[-1.0, 1.0]$, scaled by $8388607$, serialized as 3-byte signed little-endian integers.
3. **32-bit IEEE Float (`AudioFormat = 3`):** Clamped to $[-1.0, 1.0]$, serialized as IEEE 754 32-bit floating point numbers.

### Verification (`validateWavHeader`)
Every encoded buffer is verified against the RIFF specification:
- Validates `"RIFF"` and `"WAVE"` magic identifiers.
- Checks header length ($\ge 44$ bytes).
- Validates channel counts, sample rate boundaries, bit depths, and block alignments.

---

## 10. Rights & Licensing Enforcement

SONORA enforces intellectual property rules at the compiler level:

1. When `createRenderPlan()` is called, each track's rights are inspected using `canUseTrack(track, 'edit')`.
2. **Listen-Only Tracks:** If a track's rights restrict editing/export (e.g., streaming-only or promotional listen-only licenses), the compiler immediately rejects rendering with an explicit error:
   ```text
   Export rejected: Track "<name>" has listen-only rights and cannot be exported.
   ```
3. **Demo & User Tracks:** Tracks with valid creator rights or local imports pass verification.
4. **Tamper Resistance:** No audio rendering or buffer export occurs if any included track fails rights verification.

---

## 11. Cooperative Cancellation & Memory Safety

Rendering long audio projects can consume substantial CPU and memory. SONORA implements strict resource safety:

1. **`AbortSignal` Support:** `renderAudioProject()` accepts an optional `AbortSignal`.
2. **Cooperative Interruption:** Between render preparation, graph setup, offline synthesis, and WAV encoding, the engine checks `signal.aborted`. If triggered:
   - Synthesis halts immediately.
   - Throws `RENDER_CANCELLED`.
   - Cleans up intermediate buffers.
3. **Object URL Management:** Browser downloads allocate a temporary Blob URL via `URL.createObjectURL()`. The UI automatically revokes this URL upon modal dismissal to prevent browser memory leaks.
4. **Non-Destructive Invariant:** Exporting a project or bouncing a stem never alters the source project, clip positions, automation points, or command history.

---

## 12. User Interface Integration

The export interface is integrated into the SONORA Creator Workspace:

- **Workstation Surface:** Accessible via the top toolbar button (`⏏ Render`) or the universal keyboard shortcut (`Shift + R`).
- **Tactile Configuration:**
  - **Render Mode:** Full Mixdown vs. Track Stem Bounce (with track selector dropdown).
  - **Render Range:** Entire Project Timeline vs. Active Selection.
  - **Sample Rate:** 44,100 Hz (CD Standard) vs. 48,000 Hz (Broadcast/Studio Standard).
  - **Bit Depth:** 16-bit PCM, 24-bit PCM, or 32-bit IEEE Float.
- **Stage Progress Feedback:** Non-blocking modal with live stage status (`Preparing...`, `Rendering audio (50%)...`, `Encoding WAV...`, `Export Complete`) and animated progress bar.
- **Result Card:** Displays exported duration, channel count, sample rate, bit depth, and calculated file size before triggering local browser file download.
- **Reduced-Motion Support:** Disables progress bar transitions when `prefers-reduced-motion: reduce` is active.

---

## 13. Known Limitations

1. **WSOLA in Offline Context:** When rendering project-locked clips offline, the WSOLA algorithm processes audio buffers in memory before feeding the stretched buffer into the offline audio graph. For extremely long continuous takes (>30 minutes per clip), this can cause temporary memory spikes in browser environments.
2. **Browser OfflineAudioContext Interruption:** WebKit and Chromium do not provide an immediate hardware-level abort for an in-flight `OfflineAudioContext.startRendering()` call. Cancellation is cooperatively checked before and after synthesis and encoding stages.
3. **Master Chain Complexity:** M5.5 renders master gain and master limiting. Multiband mastering or dynamic spectral matching is deferred to future mastering milestones.

---

## 14. Future Improvements (Post-M5.5)

1. **Web Worker WAV Encoding:** Move 24-bit and 32-bit byte packing to a dedicated background Web Worker for projects exceeding 15 minutes.
2. **Batch Stem Export (Zip Archive):** Add one-click "Export All Stems as Zip" to render all project tracks consecutively into a single compressed package.
3. **Broadcast Wave Format (BWF):** Support `bext` metadata chunks with embedded project originators, timestamps, and tempo markers.
