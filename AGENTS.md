# AGENTS.md — SONORA Agent Operating Contract

**Status:** Authoritative Agent Contract  
**Applies to:** All AI and Human Contributors  
**Last Updated:** 2026-09-27  

---

## 1. Purpose

This document constitutes the binding operating contract for any AI agent or software engineer contributing to the **SONORA** codebase.

SONORA is an integrated, living audiovisual music platform built around one continuous workflow:
> **Discover → Listen → Analyze → Mix → Edit → Create → Share**

Because SONORA operates as an expressive, spatial, and tactile audiovisual environment rather than a conventional web application, contributors must adhere strictly to the design and architectural boundaries established across the specification suite (`PRD.md`, `DESIGN_SYSTEM.md`, `VISUAL_LANGUAGE.md`, `MOTION_SYSTEM.md`, `UX_PRINCIPLES.md`, `PRODUCT_ARCHITECTURE.md`, `REFERENCES.md`, and `INSPIRATION_RULES.md`).

---

## 2. The Golden Rule

> **Never make SONORA generic just because generic is easier to implement.**

Under no circumstances may an agent replace SONORA's spatial, semantic, and living visual language with off-the-shelf SaaS dashboard patterns, nested rectangular cards, generic purple/blue gradients, or uninspired copy-paste templates.

---

## 3. Core Operating Rules

### 3.1 Design Documents are Authoritative
The product specifications are the primary source of truth. Code must conform to design specifications, not vice-versa. Do not alter or discard established design principles for implementation shortcuts.

### 3.2 Do Not Copy Existing Products
SONORA is not a Spotify clone, an Ableton rip-off, or a standard web visualizer. While interaction principles and physical metaphors may be borrowed from reference domains (as documented in `REFERENCES.md` and `INSPIRATION_RULES.md`), all solutions must be synthesized through SONORA's distinct audiovisual identity.

### 3.3 Design Before Implementation
Before generating code or introducing components:
1. Identify the conceptual primitives involved.
2. Verify alignment with `VISUAL_LANGUAGE.md` and `DESIGN_SYSTEM.md`.
3. Validate audio and state boundaries per `PRODUCT_ARCHITECTURE.md`.
4. Ensure performance constraints and motion layers are respected per `MOTION_SYSTEM.md`.

### 3.4 Preserve SONORA’s Semantic and Spatial Visual Language
Interface elements represent musical matter: living orbs, ribbons, fields, constellations, and tactile dials. Never flatten these concepts into generic containers (`<div className="card">`). Use semantic visual primitives that communicate audio purpose.

### 3.5 Motion Must Have Meaning
Motion is part of the acoustic feedback system. Every animation must map to ambient state, audio reactivity, or direct user manipulation. Never add animation purely for decorative vanity.

### 3.6 Strict Separation of Audio Architecture and UI
Audio DSP, node scheduling, and hardware clocks belong exclusively to the Audio Engine. 
* React state must **never** be updated at 60fps from audio analyser frames.
* The UI interacts with the audio engine via a typed, stable façade API.
* The audio rendering graph must operate independently from UI lifecycles.

### 3.7 Separation of State and Presentation
Maintain explicit boundaries between:
* **Server/Domain State** (track entities, catalog, user libraries)
* **Audio Engine State** (active buffer, playback offsets, gain levels, filter cutoff)
* **UI/Interaction State** (active viewport, drag focus, modal layers)
* **High-Frequency Visual State** (canvas renders, animation loops, FFT vectors)

### 3.8 Mandatory Accessibility & Responsiveness
* Keyboard navigation must be first-class for all audio controls.
* Visual focus rings and high-contrast text must be preserved.
* A complete `prefers-reduced-motion` fallback must exist for all ambient and reactive animations.
* Audio visualization must never be the sole carrier of critical status information.
* Responsive layouts must adapt thoughtfully across desktop and mobile viewports.

### 3.9 Performance by Design
* Keep the browser main thread free of CPU-intensive audio decoding and waveform peak extraction; delegate heavy work to Web Workers.
* Render interactive waveforms and audio-reactive visuals via Canvas 2D or lightweight shaders.
* Prevent layout thrashing and avoid unthrottled state updates during playback.

### 3.10 Incremental Development & Dependency Discipline
* Follow the phased development roadmap outlined in `PRD.md`.
* Avoid premature complexity (e.g., no microservices, no multi-tenant cloud authentication, no WebSockets before collaborative milestones).
* Check and justify every external dependency before proposing it. Do not pull in heavy 3D or animation libraries when native Canvas and CSS hardware transforms suffice.

---

## 4. Definition of Done

A feature, module, or view in SONORA is complete only when all of the following criteria are verified:

1. **Specification Compliance:** Fully satisfies the relevant sections of `PRD.md` and `PRODUCT_ARCHITECTURE.md`.
2. **Design System & Visual Language Alignment:** Conforms to `DESIGN_SYSTEM.md` tokens and `VISUAL_LANGUAGE.md` spatial rules without resorting to generic card containers.
3. **Motion Compliance:** Adheres to the three motion layers and reduced-motion requirements in `MOTION_SYSTEM.md`.
4. **UX Principles:** Implements continuous workflow, progressive disclosure, direct manipulation, and context preservation per `UX_PRINCIPLES.md`.
5. **Architectural Integrity:** Audio logic is fully decoupled from DOM rendering; no high-frequency state pollution in UI components.
6. **State & Error Handling:** Explicit loading, empty, error, and recovery states are implemented and tested.
7. **Accessibility & Quality:** Keyboard navigable, ARIA-labeled, contrast compliant, and free of console errors or memory leaks.
