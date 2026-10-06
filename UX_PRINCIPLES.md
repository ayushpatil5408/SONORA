# UX_PRINCIPLES.md — SONORA User Experience Principles

**Status:** Authoritative UX Foundation  
**Version:** 1.0  
**Last Updated:** 2026-09-27  

---

## 1. The Continuous Music Workflow

The core journey of SONORA is a single, uninterrupted creative loop:
> **Discover → Listen → Understand → Manipulate → Create → Share**

In conventional ecosystems, moving through these stages requires switching between five fragmented applications (streaming client, DJ software, audio editor, cloud storage, social platform). 

SONORA resolves this fragmentation: every track you discover is immediately playable, analyzable, mixable, editable, and remixable within one unified interface.

---

## 2. One Continuous Workspace

* **Zero Context Fragmentation:** The user never "leaves" the music player to open a separate DJ or editing silo.
* **Shared Identity:** The active soundscape, playback engine, master volume, and queue remain continuous whether browsing ambient playlists or beatmatching on dual decks.
* **Unified Workspace Shell:** All tools exist as specialized vantage points within the same living environment.

---

## 3. Progressive Complexity & Disclosure

* **Tier 1 (Casual Listening):** The interface defaults to an expansive, distraction-free soundstage emphasizing artwork, high-level playback, and atmospheric visualizations.
* **Tier 2 (Analytical Listening):** Scrubbing reveals transient markers, musical key notation (Camelot wheel), BPM metrics, and harmonic compatibility.
* **Tier 3 (DJ Studio & Mixing):** One click seamlessly unfurls high-precision dual decks, rotary 3-band EQs, sweep filters, and crossfader controls.
* **Tier 4 (Audio Lab & Creation):** Expands the waveform into a precision non-destructive editor with slicing grids, fades, and export controls.
* Beginners are never intimidated by an overwhelming wall of pro audio parameters, while experienced DJs and producers can access deep technical controls instantly.

---

## 4. Direct Manipulation & Physical Metaphors

* **Touch & Grab:** Interact directly with sound. Scrub the waveform directly under the playhead; drag cue markers into place on the terrain ribbon; sweep the filter by dragging across the acoustic field.
* **Weighted Controls:** Rotary knobs, pitch sliders, and crossfaders possess realistic virtual resistance and acceleration curves.
* **Immediate Acoustic Feedback:** Every interaction has instantaneous audio or visual verification.

---

## 5. Persistent Playback & State Continuity

* **Unbreakable Playback:** Audio playback must never drop, glitch, or pause when transitioning between views, opening menus, or loading secondary tracks.
* **Context Preservation:** Navigating from the Library into DJ Studio preserves:
  * The current audio playback position.
  * Active loop boundaries and cue points.
  * Deck allocations and channel gains.
  * The user's creative train of thought.

---

## 6. Precision Where It Counts

Expressive visuals must never come at the expense of professional accuracy:
* **BPM & Key:** Displayed in fixed-pitch monospace with decimal precision (e.g., `124.00 BPM`, `8A / A minor`).
* **Beat Grids & Snapping:** Precise millisecond and bar quantization for seamless loops and cue returns.
* **Audio Meters:** Accurate RMS and peak clipping warnings with calibrated decibel scales.

---

## 7. The Signature Interaction: Representation Transformation

The foundational UX gesture of SONORA is:
> **Representation Transformation**

A track maintains its fundamental identity while morphing between functional representations based on user task:
```
[Track Row in Search]
         |
         v (drag / load)
[Living Orb in Player Environment]
         |
         v (expand deck)
[Tactile Turntable in DJ Studio]
         |
         v (open editor)
[Slicing Ribbon in Audio Lab]
```
The track never resets; it simply transforms into the tool required for the current moment.

---

## 8. Feedback, Errors, and Empty States

### Tactile Feedback
* Every state change produces immediate visual confirmation (active glow, transient tick, or color transition).
* Critical audio operations (cue trigger, loop engage) have zero latency.

### Actionable & Honest Error UX
* When a local file cannot be decoded or an audio context fails, explain the exact technical reason in plain, human language.
* Never leave the user hanging in an indefinite loading spinner. Always provide a clear recovery path (e.g., "Re-import audio", "Reset audio graph").

### Educational Empty States
* Empty libraries, queues, or playlists are opportunities for discovery.
* Empty states feature interactive prompts and suggested actions: *"Drop an audio file here or explore the demo soundstage to start mixing."*

---

## 9. Comprehensive Accessibility

SONORA treats accessibility as an architectural requirement:
* **Keyboard Mastery:** Full operational parity via keyboard shortcuts (Transport, Deck A/B Cue, Loops, Fader steps).
* **Screen Reader Semantics:** Proper ARIA roles and live regions for dynamic audio metrics (`aria-live="polite"` for track changes).
* **Visual Fallbacks:** Clear visual clipping alerts alongside audio monitoring.
* **Reduced Motion:** Fully tested non-animated mode respecting user system preferences without degrading audio features.
