# PRODUCT_ARCHITECTURE.md — SONORA System & Software Architecture

**Status:** Authoritative Architectural Blueprint  
**Version:** 1.0  
**Last Updated:** 2026-09-27  

---

## 1. Architectural Philosophy

SONORA is designed as an integrated audiovisual platform where music flows seamlessly from discovery to creation.

The architecture enforces strict decoupling between **Presentation (UI)**, **Acoustics (Web Audio Engine)**, **Visual Rendering (Canvas/WebGL)**, and **Domain State (Entities & Playlists)**. Audio processing must never be subordinate to component rendering lifecycles.

---

## 2. Product Functional Layers

SONORA is organized across seven vertical functional layers:

```
+-------------------------------------------------------------------------+
| PRODUCT FUNCTIONAL LAYERS                                               |
|                                                                         |
| Layer 7: SOCIAL & COMMUNITY (Future)                                    |
|          - Creator profiles, shared sets, collaborative rooms           |
|                                                                         |
| Layer 6: INTELLIGENCE & RECOMMENDATION (Progressive)                    |
|          - Harmonic matching (Camelot wheel), BPM compatibility, AI DJ  |
|                                                                         |
| Layer 5: CREATION & REMIX (Future)                                      |
|          - Sample extraction, non-destructive editing, stem arrangement |
|                                                                         |
| Layer 4: PERFORMANCE & DJ (MVP / Phase 1)                               |
|          - Dual-deck mixing, 3-band EQ, filter sweep, crossfading, sync |
|                                                                         |
| Layer 3: ACOUSTIC ANALYSIS (Core)                                       |
|          - Waveform peak generation, onset/beat detection, key analysis |
|                                                                         |
| Layer 2: PLAYBACK & AUDIO ENGINE (Core)                                 |
|          - Hardware clock scheduling, low-latency audio graph, limiter  |
|                                                                         |
| Layer 1: MUSIC DOMAIN & CATALOG (Foundation)                            |
|          - Unified Track entity, metadata, playlists, local file I/O    |
+-------------------------------------------------------------------------+
```

---

## 3. The Unified Shared Track Model

In SONORA, a `Track` is not a localized UI prop; it is the universal domain currency.

A single `Track` instance seamlessly traverses functional boundaries without data fragmentation:
* **In Library:** A searchable catalog item with artist, album, duration, and key metadata.
* **In Player Environment:** An active playback stream driving environmental lighting and queue progression.
* **In Analysis Engine:** A decoded audio buffer mapped to downsampled RMS peak arrays and transient beatgrids.
* **In DJ Studio:** An active source loaded into Deck A or Deck B with dedicated pitch offsets, cue points, and loop brackets.
* **In Audio Lab:** An editable timeline clip supporting non-destructive gain, trim, and slicing operations.
* **In Recommendation Engine:** A harmonic vector evaluated against compatible keys and energy profiles.

---

## 4. Separation of Concerns & System Boundaries

The application enforces strict isolation across seven software subsystems:

```
+-------------------------------------------------------------------------+
| SYSTEM SUBSYSTEM BOUNDARIES                                             |
|                                                                         |
|  [ Presentation / UI Layer ]                                            |
|       - React Components, DOM Shell, Keyboard Event Dispatchers         |
|       - Subscribes to UI state; sends typed commands to Audio Facade    |
|                                                                         |
|  [ Visualization Engine ]                                               |
|       - Canvas 2D / WebGL Shaders, rAF Loop                             |
|       - Reads directly from AnalyserNode Float32Array; bypasses React   |
|                                                                         |
|  [ Web Audio Engine ]                                                   |
|       - AudioContext, BiquadFilters, GainNodes, Crossfader, Limiter     |
|       - Hardware-clock precision; completely headless and UI-agnostic   |
|                                                                         |
|  [ Analysis Worker Engine ]                                             |
|       - Dedicated Web Worker for off-thread peak extraction & decoding  |
|                                                                         |
|  [ Domain & State Management ]                                          |
|       - Track catalog, active playlist, queue, persistent preferences   |
|                                                                         |
|  [ Persistence Layer ]                                                  |
|       - IndexedDB for cached waveform peaks & local track metadata      |
|       - localStorage for session layout and user settings               |
+-------------------------------------------------------------------------+
```

### 4.1 Audio Engine Isolation
The Audio Engine is completely headless. It exposes a clean, typed API (e.g., `loadTrack(deck, buffer)`, `setCrossfader(value)`, `setFilterCutoff(deck, freq)`). No React hooks or component state exist inside the audio graph.

### 4.2 Visualization Engine Isolation
The visualization engine runs in a decoupled `requestAnimationFrame` loop. It samples the `AnalyserNode` directly using typed arrays (`getFloatFrequencyData`), rendering at hardware refresh rates (60/120Hz) without triggering React re-renders.

### 4.3 Background Worker Architecture
Raw audio decoding and waveform peak generation for a 50MB file can take 200–800ms of intensive CPU computation. This work is delegated entirely to a dedicated Web Worker, preventing any stutter in the UI or audio playback.

---

## 5. Architectural Guardrails

1. **No High-Frequency State Pollution:** Analyser frame data must never touch React component state.
2. **Authoritative Audio Clock:** Never use `setTimeout` or `setInterval` for beat timing or cue triggering; always schedule events against `AudioContext.currentTime`.
3. **Graceful Degradation:** If advanced WebAssembly or WebGL capabilities are unavailable, the system cleanly falls back to standard 2D canvas waveforms and native audio nodes.
4. **Independent AI Layer:** AI and recommendation systems must operate as asynchronous advisors. The core music player and DJ mixer must function perfectly offline without requiring an external LLM or backend connection.
5. **Future-Proof Extensibility:** The audio graph and track model are architected to support multitrack editing, stem separation, and collaborative networking in future phases without rewriting the foundational player engine.
