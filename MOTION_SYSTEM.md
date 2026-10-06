# MOTION_SYSTEM.md — SONORA Motion & Animation System

**Status:** Authoritative Motion Specification  
**Version:** 1.0  
**Last Updated:** 2026-09-27  

---

## 1. Motion Philosophy

In SONORA, motion is an acoustic feedback loop, not cosmetic window dressing.

Motion must always communicate:
* **Audio Physics:** Transients, frequency distribution, tempo, and RMS energy.
* **System State:** Buffering, playing, seeking, looping, filtering, and recording.
* **Spatial Continuity:** Seamless transition when tracks move from library into decks or timelines.
* **Tactile Response:** Weight, resistance, velocity, and haptic feedback during manipulation.

Animation that exists solely to look impressive is an anti-pattern. If a motion does not clarify state or amplify musical feel, it must be removed.

---

## 2. The Three Motion Layers

SONORA organizes all motion across three independent, coordinated layers:

```
+-------------------------------------------------------------------------+
| MOTION LAYERS                                                           |
|                                                                         |
| Layer 3: INTERACTIVE (Foreground)                                        |
|          - Tactile knob turns, fader tracking, cue-press snaps, scrubbing|
|          - Zero-latency, high-priority, direct manipulation physics     |
|                                                                         |
| Layer 2: REACTIVE (Midground)                                           |
|          - Waveform scrolling, FFT meter pulsing, radial beat glows     |
|          - Frequency-driven, real-time Web Audio Analyser sync          |
|                                                                         |
| Layer 1: AMBIENT (Background)                                           |
|          - Slow environmental breathing, orbital particle drift         |
|          - Calming, non-distracting atmospheric depth                   |
+-------------------------------------------------------------------------+
```

### Layer 1: Ambient Motion (Environmental)
* **Characteristics:** Sub-perceptual, organic, continuous cycles (12–24s duration).
* **Behaviors:** Breathing gradient fields, gently drifting constellation stars, subtle depth parallax.
* **Role:** Establishes life and depth in the `#000000` void without demanding cognitive focus.

### Layer 2: Reactive Motion (Audio-Driven)
* **Characteristics:** Direct physical response to live audio analysis frames.
* **Frequency Mapping:**
  * *Sub / Kick (20–120 Hz):* Radial expansion, brightness pulses, tactile deck vibration.
  * *Mids / Snare / Vocals (300–3000 Hz):* Waveform height expansion, ribbon amplitude.
  * *Highs / Cymbals (5000–16000 Hz):* Particle dispersion velocity, crisp light flickers.
* **Role:** Connects vision to hearing with sub-millisecond perceptual synchronization.

### Layer 3: Interactive Motion (Tactile)
* **Characteristics:** Instantaneous response to pointer and keyboard events.
* **Behaviors:** 
  * Pitch fader drag with zero latency and elastic spring-back.
  * Cue button instant press (0ms delay) with smooth luminous decay (120ms).
  * Smooth FLIP transitions when expanding decks or opening drawers.

---

## 3. Motion Vocabulary

The visual choreography of SONORA is governed by a precise physical vocabulary:

* **Breathing:** Smooth sinusoidal expansion/contraction reflecting tempo and resting energy.
* **Orbiting:** Circular planetary movement along gravitational paths around active hubs.
* **Attraction & Repulsion:** Magnetic pull toward harmonically compatible tracks; push away from incompatible keys.
* **Flow:** Continuous unidirectional transit along queue streams and waveform ribbons.
* **Pulse:** Instantaneous transient ignition followed by exponential mathematical decay.
* **Morph:** Topological transformation of an entity (e.g., track circle unfurling into an elongated timeline).
* **Expansion & Contraction:** Revealing dense DJ controls from minimal player states.
* **Momentum:** Natural deceleration curves preserving the weight of virtual vinyl and scrub wheels.

---

## 4. Motion Hierarchy & Attention Management

Not all elements move with equal velocity or amplitude:
1. **Primary Interaction (100% priority):** The control currently manipulated by the user has immediate priority and sharpest responsiveness.
2. **Active Deck / Waveform (70% priority):** Real-time audio-synchronized movement.
3. **Queue / Recommendations (30% priority):** Smooth, low-velocity drift.
4. **Background Atmosphere (10% priority):** Extremely subtle, recedes into peripheral vision during critical mixing.

---

## 5. Technical Implementation & Performance Guardrails

Audio-reactive motion must never compromise audio thread stability or cause UI frame drops:

### The React State Prohibition
* **Rule:** Never pipe audio analyser vectors or 60fps frame counters through React component state (`useState`, `setState`).
* **Implementation:** Audio-reactive visuals must bypass React reconciliation entirely:
  * Direct rendering to HTML5 `<canvas>` via dedicated `requestAnimationFrame` loops.
  * Offscreen canvas raster caching for waveform bitmaps (`drawImage` pixel shifts).
  * Direct mutation of CSS Custom Properties on the root DOM element (`document.documentElement.style.setProperty('--energy', val)`).

### Compositing and Hardware Acceleration
* Animate exclusively via GPU-composited CSS properties: `transform: translate3d()` and `opacity`.
* Never animate layout-triggering properties (`width`, `height`, `top`, `margin`, `padding`).

---

## 6. Representation Transformations (Morphing)

When a musical object changes mode, its visual identity must remain continuous:
* **Library to Deck:** A track row does not simply disappear and appear on a deck. Its artwork and title visually glide into the deck's central turntable hub.
* **Player to Audio Lab:** The horizontal waveform ribbon expands vertically, unfolding into a multitrack arrangement grid.
* Continuity of geometry reinforces that the user is manipulating the same physical piece of music across different tools.

---

## 7. Accessibility & Reduced Motion

SONORA treats `prefers-reduced-motion` as a first-class operational mode:
* Ambient particle drift is completely halted; background becomes a static, deep-stage gradient.
* Audio-reactive scaling and pulsing are disabled; replaced by static numerical decibel meters and non-moving color indicators.
* Spatial transitions switch from animated morphing to instant, accessible crossfades (≤ 50ms).
* Full audio mixing, playback, and editing functionality remains 100% operational.
