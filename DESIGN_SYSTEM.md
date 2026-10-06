# DESIGN_SYSTEM.md — SONORA Design System Specification

**Status:** Authoritative Design Foundation  
**Version:** 1.0  
**Last Updated:** 2026-09-27  

---

## 1. Design Character

The SONORA design system embodies seven foundational attributes:
* **Cinematic:** Epic scale, purposeful contrast, deep environmental voids, and theatrical focus.
* **Immersive:** Surfaces and atmospheres respond dynamically to the frequency, tempo, and mood of active sound.
* **Musical:** Geometry, transitions, and pacing reflect harmonic rhythm, transient velocity, and acoustic physics.
* **Spatial:** Elements exist in a continuous, breathable coordinate field rather than nested grid cells.
* **Tactile:** Hardware-inspired dials, weighted faders, and spring-damped triggers with haptic precision.
* **Premium:** Restrained, editorial-grade typography, flawless dark-void contrast, and minimal visual noise.
* **Experimental:** Unconventional spatial representations that transform music from static data into tangible matter.

---

## 2. Core Design Principles

1. **Music First:** The active soundscape and user task always dictate visual hierarchy. Interface chrome recedes into the void when listening; precision controls surface when manipulating.
2. **Spatial Over Boxed:** Resist the instinct to frame every element in a rounded rectangle. Grouping is achieved through proximity, alignment, illumination, and depth layers.
3. **Motion With Meaning:** Motion is physical feedback, not decorative animation. Every movement maps to acoustic energy or tactile intent.
4. **Progressive Disclosure:** Simple, clean surfaces for casual listening that smoothly expand into dense, high-precision mixing controls on demand.
5. **Direct Manipulation:** Waveforms are scrubbed, filters are swept, and loops are pinched directly on the audio terrain rather than controlled via detached generic inputs.
6. **Depth Without Excess:** Depth serves to clarify hierarchical z-index relationships, never to display gratuitous faux-3D novelty.

---

## 3. Dimensionality Strategy

SONORA balances performance, legibility, and immersion across three distinct spatial planes:

```
+-------------------------------------------------------------------------+
| DIMENSIONALITY TIERS                                                    |
|                                                                         |
| [2D Plane]   Flat, High-Density Precision Controls                      |
|              - Settings, numerical readouts, forms, meters, tooltips    |
|              - Strict accessibility, high contrast, zero perspective    |
|                                                                         |
| [2.5D Plane] Layered Viewport & Spatial Soundstage                      |
|              - Player environments, discovery fields, deck surfaces     |
|              - Parallax layering, luminous elevations, dynamic focus     |
|                                                                         |
| [3D Plane]   Selective Acoustic Landscapes                              |
|              - Frequency spectrograms, reactive orbital particle clouds |
|              - High-value immersive visualizers; never default UI      |
+-------------------------------------------------------------------------+
```

* **2D:** Used for dense parameters, transport buttons, form fields, and accessibility readouts where speed and readability are non-negotiable.
* **2.5D:** Used for discovery fields, queue streams, and deck placement. Elements float over a deep stage with subtle light emissions.
* **3D (Selective):** Reserved exclusively for specialized audiovisual visualizers and high-impact discovery modes. 3D is never applied to standard controls or data displays.

---

## 4. Semantic Shape Language

Visual objects in SONORA represent musical matter. The geometry directly communicates acoustic meaning:

| Musical Entity | Visual Metaphor | Semantic Role & Behavior |
|:---|:---|:---|
| **Current Track** | **Living Orb** | Luminous core pulsating with RMS energy and color-shifting with key/harmonic profile. |
| **Artist** | **Organic Cluster** | Gravitational node gathering related releases in harmonic proximity. |
| **Album** | **Resonant Disc / Sphere** | High-density coherent musical unit with tactile physical rotation on scrub. |
| **Playlist** | **Constellation** | Interconnected node network tracing a curated listening trajectory. |
| **Genre / Scene** | **Acoustic Field** | Expansive regional atmosphere defined by tonal density and tempo boundaries. |
| **Mood** | **Ambient Atmosphere** | Chromatic haze and particulate density enveloping the viewport. |
| **Recommendation** | **Orbiting Particle** | Gravitationally bound node drawn toward the user's active listening center. |
| **DJ Deck** | **Turntable Ring** | High-precision radial control station with tactile angular velocity. |
| **Audio Sample** | **Floating Shard** | Angular, precise clip segment extracted from the parent waveform ribbon. |
| **Audio Effect** | **Force Field** | Modulated boundary warping the geometry of signals passing through it. |
| **Waveform** | **Acoustic Ribbon** | Continuous topographical terrain detailing transient peaks and spectral energy. |
| **Queue** | **Flowing Stream** | Horizontal conveyor of upcoming musical nodes progressing smoothly toward the playhead. |
| **AI Assistant** | **Ambient Intelligence Layer** | Non-intrusive harmonic guide providing unobtrusive transition cues. |
| **User Identity** | **Central Anchor Node** | Core origin point anchoring the user's collection, history, and workspace. |

---

## 5. Typography

Typography balances editorial luxury with engineering precision:

* **Display & Editorial:** Modern geometric grotesque (`Inter`, `Plus Jakarta Sans`) with optical size adjustments, tight tracking (`-0.03em`), and commanding scale contrast.
* **Interface UI:** Highly legible medium weights (`400`–`500`), optimized for dark backgrounds with elevated x-heights and relaxed leading.
* **Audio Metrics & DSP Readouts:** Fixed-pitch tabular Monospace (`JetBrains Mono`, `Fira Code`) is **mandatory** for BPM, millisecond timecodes, dB gain readouts, and frequency markers to eliminate tabular jitter.
* **Hierarchy:** Established through scale ratios, positional spacing, and luminance contrast rather than brute font weights.

---

## 6. Color Philosophy

Color in SONORA is dynamic, harmonic, and contextual:
* **True Void (`#000000`):** The primary canvas surface. Pure black eliminates screen boundaries and lets chromatic audio accents shine without gray-wash veil.
* **Acoustic Energy Mapping:** Accent hues represent frequency bands and harmonic tension:
  * *Sub / Lows:* Deep radiant violets and indigo (`#7c4dff`)
  * *Mids / Vocals:* Warm solar amber and gold (`#ffb300`)
  * *Highs / Transients:* Electric cyan and crisp white (`#00e5ff`)
  * *Critical Peaks / Clipping:* Crimson warning alert (`#ff1744`)
* **Contextual Palette:** Artwork extractors tint the environmental haze, aligning the visual space with the artist's aesthetic.
* **Prohibition:** Static, generic purple-to-pink "AI gradients" are forbidden. Color must directly signify audio state, track identity, or interactive focus.

---

## 7. Surfaces & Depth

* **Anti-Card Principle:** Cards are prohibited as default containers. Information groups breathe on the void canvas, delineated by spatial separation and subtle structural hairline borders (`rgba(255, 255, 255, 0.08)`).
* **Restrained Translucency:** Glassmorphism and blur filters are reserved strictly for floating transient overlays (e.g., active drop-down menus, parameter palettes). Core decks and waveforms remain solid and tactile.
* **Luminous Elevation:** Depth is communicated by elevation-based ambient glow rather than cast drop-shadows.

---

## 8. Semantic Component Primitives

The interface is architected around specialized audiovisual primitives:
* `TrackObject`: Monolithic, weightless track representation displaying harmonic key and routing handles.
* `AlbumObject`: Circular or disc-like collection node with rotational scrubbing.
* `ArtistCluster`: Dynamic grouping of related releases arranged by sonic affinity.
* `PlaylistConstellation`: Spatial path visualizer of sequenced tracks.
* `DiscoveryField`: Two-dimensional harmonic coordinate space mapping tracks by BPM and energy.
* `WaveformRibbon`: Multi-tier amplitude terrain with transient markers, cue flags, and loop brackets.
* `DJDeck`: Twin tactile mixing stations with pitch fader, cue return, and rotary pots.
* `EffectField`: Dual sweep filters and frequency isolator banks.
* `AudioTimeline`: Sample-accurate non-destructive slicing and arrangement canvas.
* `AIRecommendation`: Explanatory harmonic badges displaying transition compatibility.
* `QueueStream`: Low-profile continuous horizontal conveyor of scheduled tracks.

---

## 9. Accessibility & Inclusive Design

* **Full Keyboard Navigation:** Global hotkeys for transport, cue points, looping, and deck toggles.
* **Visible Focus:** High-contrast, non-obtrusive dual-ring focus indicators.
* **Non-Visual Alternatives:** Screen-reader accessible value announcements for all rotary dials and faders (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
* **Visual Peak Redundancy:** Visual warning indicators for audio clipping to accommodate hearing-impaired creators.
* **Reduced Motion:** Complete fallback support: animations convert to instantaneous state changes and particle fields freeze into static geometric layouts.

---

## 10. Anti-Patterns & Prohibitions

1. **No Generic Dashboards:** No 3-column metric cards, no analytics pie charts, no generic SaaS sidebars.
2. **No Excessive Cards & Pills:** Do not enclose every label or button in a pill container.
3. **No Decorative Blobs:** No randomized floating background shapes that serve no audio purpose.
4. **No Unjustified 3D:** Do not force 3D meshes where 2D precision is faster, clearer, and more accessible.
5. **No Visual Noise:** Maintain visual silence during playback; every pixel must earn its presence.
