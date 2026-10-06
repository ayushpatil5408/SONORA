# SONORA — DJ Environment System Architecture (Milestone 3)

**Status:** Authoritative Architectural Specification  
**Applies to:** Milestone 3 and subsequent milestones  
**Last Updated:** 2026-10-03  

---

## 1. Executive Summary

Milestone 3 transforms SONORA's DJ Studio from a single workspace view into a selectable multi-environment visual instrument. The user can inhabit three distinct audiovisual environments:

1. **ORGANIC ORBITAL** (`"orbital"`)
2. **LIQUID INSTRUMENT** (`"liquid"`)
3. **ACOUSTIC ORGANISM** (`"organism"`)

### The Core Architectural Invariant

> **The user selects a visual environment, NOT a different mixer implementation.**

All three environments consume the exact same underlying audio engine, dual decks, 3-band EQ, resonant filters, pitch faders, transport, and equal-power crossfader. The environment layer strictly controls geometry, visual hierarchy, animation, interaction presentation, and styling.

```
                          Shared DJ Workspace (DJWorkspace.tsx)
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            ▼                                                           ▼
     AudioEngine Singleton                                    Shared Presentation State
   (AudioContext, Decks, Mixer,                              (Waveforms, Tracks, Controls,
   Crossfader, DSP Filters, EQ)                               Environment Selector, Canvas)
                                                                        │
                   ┌────────────────────────────────────────────────────┤
                   ▼                                                    ▼
       AudioReactiveCanvas (60fps rAF)                      Active Environment Viewport
     (Decoupled Canvas 2D Spectrum Tap)                   (400–800ms Morph Transition)
                                                                        │
                                       ┌────────────────────────────────┼────────────────────────────────┐
                                       ▼                                ▼                                ▼
                                Organic Orbital                  Liquid Instrument               Acoustic Organism
                            (Celestial / Gravity)             (Viscous Fluid Membrane)         (Bio-Acoustic Filaments)
```

---

## 2. Strongly Typed Environment Definition

The environment identifier is centralized and strongly typed:

```typescript
// src/components/dj/types.ts
export type DJEnvironment = 'orbital' | 'liquid' | 'organism';

export interface DJEnvironmentMeta {
  id: DJEnvironment;
  name: string;
  subtitle: string;
  tagline: string;
  accentColor: string;
  glyph: string;
  description: string;
}
```

Arbitrary string matching is strictly forbidden across the codebase.

---

## 3. The Three Worlds

### 3.1 Organic Orbital (`"orbital"`)
* **Aesthetic:** Cosmic, gravitational, technical, precise, alive.
* **Deck A Anchor:** Electric Cyan (`#00E5FF`), circular celestial plinth, concentric orbital rings, revolving celestial satellite orb, spinning vinyl grooves.
* **Deck B Anchor:** Solar Amber (`#FFB300`), circular solar plinth, solar orbital rings, revolving solar orb, independent energy field.
* **Central Mixer:** Celestial gravitational core orb with swirling nebula singularity and orbital SVG rings, flanking telemetry meters, tactile dials.
* **Orbital Crossfader:** Gravitational bridge where cyan energy dominates toward Deck A, amber dominates toward Deck B, and central white/violet plasma flare intensifies at center.

### 3.2 Liquid Instrument (`"liquid"`)
* **Aesthetic:** Fluid, experimental, tactile, expressive, organic.
* **Deck A Anchor:** Viscous fluid droplet membrane in cyan (`#00E5FF`) with a flowing tendril reaching toward the central mixer, mercury ripple disc.
* **Deck B Anchor:** Molten amber liquid membrane (`#FFB300`) with dipping molten tendril, concentric fluid ripple disc.
* **Central Mixer:** Vertical organic liquid chamber with an undulating bioluminescent fluid droplet core, liquid column level meters.
* **Liquid Crossfader:** Viscous capillary fluid stream where visual energy physically travels between cyan and amber as the crossfader slides, merging into an iridescent droplet thumb at center.

### 3.3 Acoustic Organism (`"organism"`)
* **Aesthetic:** Biological, sonic, living, sculptural, distinctive.
* **Deck A Anchor:** Bio-acoustic shell composed of radiating acoustic filaments and cilia in electric cyan (`#00E5FF`).
* **Deck B Anchor:** Bio-acoustic shell with radiating golden-amber filaments (`#FFB300`).
* **Central Mixer:** Resonant living acoustic body and ribcage with a vertical luminous nerve cord and breathing horizontal rib bars that dynamically expand and contract with audio harmonics.
* **Organism Crossfader:** Sinusoidal wave-based crossfader path connecting Deck A to Deck B with an iridescent glowing acoustic bead slider.

---

## 4. Local Persistence & Fallback Invariant

Selected environments persist across reloads via browser `localStorage` using key `sonora_dj_environment`:

* Read helper: `getStoredDJEnvironment(): DJEnvironment`
* Write helper: `setStoredDJEnvironment(env: DJEnvironment): void`

### Safe Fallback Rule
If `localStorage` is unavailable or contains a corrupted/unknown string (e.g. `"cyberpunk"`, `"admin"`, `""`, or `null`), the system safely defaults to `'orbital'` without throwing or breaking the interface.

---

## 5. Non-Destructive Environment Morphing

When switching environments:
* **Audio playback is NEVER interrupted.**
* **AudioContext is NEVER recreated or suspended.**
* **Tracks are NEVER unloaded.**
* **Waveforms and positions are NEVER reset.**
* **Crossfader, volume, EQ, filters, and pitch rates are 100% preserved.**

### Morph Transition
A CSS class `.is-morphing` applies a 500ms (within the 400–800ms target) visual morph with cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`), gradually deforming circular structures into fluid membranes, or fluid membranes into acoustic filaments.

---

## 6. Audio-Reactive Visualization System

A high-performance `<AudioReactiveCanvas />` operates as a decoupled background canvas:
* Operates an independent 60fps `requestAnimationFrame` loop.
* Samples `AudioEngine.getAnalyserNode()` directly via `getByteFrequencyData()` and `getByteTimeDomainData()`.
* **Zero React state updates at 60fps:** Audio FFT frames never pollute component tree state or trigger React reconciliations.
* Distinct physical geometry is rendered per environment:
  - **Orbital:** Concentric orbital gravity rings, central singularity bloom, celestial and solar orbital particles.
  - **Liquid:** Capillary surface tension waves, viscous tendril curves, liquid plinth bloom.
  - **Organism:** Central living acoustic spine ribs, radial acoustic filaments (cilia), bio-acoustic signal tendrils.

---

## 7. Accessibility & Reduced-Motion Contracts

All environments strictly respect user preferences and WCAG standards:
* **`prefers-reduced-motion`:**
  - Spinning turntable disc animations are disabled.
  - Particle velocity and orbital rotation are scaled down or frozen.
  - Liquid undulation and breathing rib oscillations are silenced.
  - Functional audio telemetry (meters, waveforms, position indicators) remains fully operational.
* **Keyboard Navigation & ARIA:**
  - All transport buttons (`Play`, `Pause`, `Stop`, `Cue`) are accessible via standard keyboard (`Tab`, `Space`, `Enter`).
  - All sliders (`Volume`, `EQ`, `Filter Cutoff`, `Filter Q`, `Pitch`, `Crossfader`, `Master Volume`) expose proper `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext`.
  - Environment selector exposes `role="radiogroup"` with `aria-checked` states and arrow-key navigation.

---

## 8. Rights & Staging Integrity

The Milestone 2B/2C rights system is strictly preserved:
* Environment switching cannot bypass `canUseTrack(track, 'dj')`.
* Tracks with listen-only licenses (such as third-party CC NC-ND or streaming-only tracks) remain blocked from DJ staging across Orbital, Liquid, and Organism identically.
