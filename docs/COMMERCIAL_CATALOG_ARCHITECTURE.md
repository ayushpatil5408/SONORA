# COMMERCIAL_CATALOG_ARCHITECTURE.md — SONORA Rights & Music Supply Specification

**Status:** Authoritative Architectural Blueprint  
**Version:** 1.0  
**Applies to:** Milestone 2B and Beyond  
**Last Updated:** 2026-10-03  

---

## 1. Executive Summary

SONORA bridges the gap between passive music discovery and creative performance in one unified workflow:
> **Discover → Listen → Analyze → Mix → Edit → Create → Share**

In the modern music industry, **listening to a recording** and **manipulating, mixing, or editing a recording** are governed by entirely different legal, technical, and commercial rights frameworks.

A platform cannot treat all audio matter identically:
* A track authorized for personal on-demand streaming is **not** automatically authorized for live two-deck DJ performance, pitch manipulation, or looping.
* A track cleared for DJ mixing is **not** automatically cleared for destructive sample extraction, non-linear stem arrangement, or user redistribution.

Therefore, SONORA introduces a formal **Music Supply Layer** and a decoupled **Rights & Capability Layer**.

This architecture answers two distinct questions:
1. **Where did this music come from?** (`CatalogSource`)
2. **What is SONORA legally and technically permitted to do with it?** (`TrackRights` & `PlaybackCapability`)

---

## 2. The Core Legal & Technical Distinction

```
+-------------------------------------------------------------------------------+
|                      SONORA RIGHTS & CAPABILITY SPECTRUM                      |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ LISTEN / PREVIEW ]                                                         |
|    - Mechanical & digital performance streaming license                       |
|    - Protected stereo playback stream to listener                             |
|    - Governed by standard consumer streaming agreements                       |
|                                                                               |
|  [ DJ PERFORMANCE ]                                                           |
|    - Extended public/private performance and real-time DSP manipulation right  |
|    - Pitch shifting, BPM tempo stretching, EQ 3-band filtering, crossfading  |
|    - Requires explicit DJ mechanical clearance or public performance waiver   |
|                                                                               |
|  [ AUDIO LAB EDIT ]                                                           |
|    - Derivative work & non-destructive timeline slicing                      |
|    - Non-linear waveform cutting, transient quantization, loop extraction     |
|    - Requires synchronization (sync) or derivative work clearance             |
|                                                                               |
|  [ REMIX & SAMPLING ]                                                         |
|    - Stem isolation, re-harmonization, master sample reuse                    |
|    - Creation of new derivative intellectual property                         |
|    - Governed by explicit master and publishing remix agreements              |
+-------------------------------------------------------------------------------+
```

---

## 3. The Five Essential Rights Pillars for Commercial Music

To support full commercial catalogs (Bollywood, Hollywood, Classical, Global Pop, Regional Indian and international music), SONORA's architecture recognizes five legal pillars:

### 3.1 Master Recording Rights
Owned by record labels, distributors, or independent artists. Grants the legal right to reproduce and stream the specific sound recording (sound phonogram).

### 3.2 Publishing & Composition Rights
Owned by songwriters, lyricists, and music publishers (e.g., IPRS, PRS for Music, ASCAP, BMI, SACEM). Covers the underlying musical composition, melody, and harmony.

### 3.3 Territory Clearance & Geofencing
Rights are granted per geographic territory. A catalog partner may clear streaming in India (`IN`) or the United Kingdom (`GB`), but exclude North America (`US`).
SONORA models this via `TrackRights.territories?: string[]`.

### 3.4 Tiered Performance Clearances
* **Interactive Streaming Tier:** Allows user-initiated playback of the full recording.
* **DJ Performance Tier:** Allows loading into dual decks, tempo nudging, beatgrid alignment, and EQ filtering.
* **Creative Tier:** Allows sample extraction and Audio Lab remixing.

### 3.5 Attribution & Reporting
Contractual requirements dictate transparent metadata display, royalty logging, and performance telemetry without infringing consumer privacy.

---

## 4. Why Consumer Streaming APIs Cannot Power a DJ Engine

A frequent misconception in digital audio engineering is that an application can simply connect to consumer APIs (such as Spotify, Apple Music, or YouTube Music) and feed those streams directly into a two-deck DJ mixer.

This is technically and legally prohibited for multiple structural reasons:

### 4.1 Digital Rights Management (DRM) & Web Audio Graph Isolation
Consumer streaming services deliver audio encrypted via Widevine, FairPlay, or PlayReady CDM (Content Decryption Modules). The decrypted PCM audio samples are rendered directly to hardware audio outputs inside isolated sandbox processes. 
The browser's JavaScript environment and `AudioContext` have **no access** to the underlying raw `Float32Array` or `AudioBuffer`. Without raw PCM buffer access, real-time waveform peak generation, BPM transient detection, EQ filtering, and pitch shifting are impossible.

### 4.2 Developer Terms of Service Prohibitions
Major consumer streaming APIs explicitly forbid DJ and audio processing use:
* **Spotify Developer Policy Section 2.4:** Strictly prohibits modifying audio output, mixing multiple streams simultaneously, recording or capturing streams, or implementing DJ functionalities.
* **SoundCloud API Terms Section 4.2:** Prohibits downloading, caching, or downmixing streams into third-party multi-deck tools.
* **YouTube Terms of Service:** Forbids separating audio from video or running streams through external Web Audio analyzers.

### 4.3 SONORA's Architectural Rule
SONORA maintains strict integrity:
> **Never fabricate external API integrations or claim rights that SONORA does not legally possess.**

Third-party providers requiring commercial agreements are modeled as **honest integration boundaries** reporting `not_configured` status until legitimate business partnerships are formed.

---

## 5. The Music Supply Architecture

SONORA organizes music sources through the `MusicSupplyRegistry`:

```
                    MusicSupplyRegistry
                             │
       ┌──────────────┬──────┴───────┬──────────────┐
       │              │              │              │
    [Demo]         [Local]       [Creator]      [Licensed]
  Operational    Operational    Operational      Partner
 (Synthesized)  (User Owned)   (Originals &     Boundary
                                Clearances)
       │              │              │              │
       └──────────────┼──────────────┴──────────────┘
                             │
                             v
                      CatalogService
                 (Capability Guardrails)
                             │
               ┌─────────────┴─────────────┐
               v                           v
          canUseTrack()               canUseTrack()
        capability="listen"          capability="dj"
               │                           │
               v                           v
        [AudioEngine]                 [Deck A / B]
```

### 5.1 Provider Contract (`MusicSupplyProvider`)
Each provider implements:
```typescript
export interface MusicSupplyProvider extends CatalogProvider {
  readonly id: string;
  readonly name: string;
  readonly source: CatalogSource;
  readonly status: MusicSupplyProviderStatus;
  readonly statusReason?: string;
  getCapabilities(): MusicSupplyCapabilities;
  search(query: string, filters?: CatalogFilterOptions): Promise<Track[]>;
  getTrack(id: string): Promise<Track | null>;
  getTracks(): Promise<Track[]>;
}
```

### 5.2 Provider Operational Matrix

| Provider | ID | Source | Default Status | Permitted Capabilities | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Demo Catalog** | `demo` | `demo` | `ready` | Listen, Preview, DJ, Edit, Remix | 100% synthetic prototype catalog synthesized via Web Audio API. |
| **Local Audio** | `local` | `local` | `ready` | Listen, DJ, Edit, Remix | User-owned files (MP3, WAV, FLAC). SONORA asserts no copyright. |
| **Creator Space** | `creator` | `creator` | `ready` | Listen, Preview, DJ, Edit*, Remix* | Original uploads grant full DJ/remix; third-party uploads default to listen-only. |
| **Licensed Partner** | `licensed` | `licensed` | `not_configured` / `testbed` | Listen, Preview, Per-Track DJ | Commercial partner contract boundary with territory clearing. |
| **Jamendo Music** | `jamendo` | `jamendo` | `not_configured` | Metadata, Preview, CC Stream | Requires `VITE_JAMENDO_CLIENT_ID`. Creative Commons license terms. |
| **SoundCloud API** | `soundcloud` | `soundcloud` | `not_configured` | Metadata, Preview Stream | Requires `VITE_SOUNDCLOUD_CLIENT_ID`. Developer API agreement. |
| **Spotify Web API** | `spotify` | `spotify` | `not_configured` | Metadata, 30s Preview | Requires `VITE_SPOTIFY_CLIENT_ID`. Prohibits DJ mixing. |

---

## 6. The Track Rights Model

Every `Track` entity carries an explicit `rights` specification:

```typescript
export interface TrackRights {
  canStream: boolean;        // Interactive full playback
  canPreview: boolean;       // Short preview clip playback
  canDJ: boolean;            // Dual-deck loading, EQ, pitch warping
  canEdit: boolean;          // Non-destructive Audio Lab slicing
  canRemix: boolean;         // Stem separation & derivative creation
  attributionRequired?: boolean;
  territories?: string[];    // ISO 3166-1 alpha-2 territory codes (e.g. ["IN", "GB"])
  startsAt?: string;         // ISO date license inception
  expiresAt?: string;        // ISO date license expiration
  sourceTermsUrl?: string;   // Canonical license URL
}
```

### 6.1 Capability Verification Function
The application evaluates capabilities uniformly via:
```typescript
canUseTrack(track: Track, capability: PlaybackCapability): boolean
```

React components **never** check `if (track.source === 'spotify')`. Authorization is determined strictly by declared technical and legal capability.

---

## 7. Operational Guardrails

1. **No Scraping:** SONORA never scrapes audio streams from unauthorized websites, third-party CDNs, or DRM-protected endpoints.
2. **Zero Fake URLs:** The catalog contains no mock streaming URLs pointing to unauthorized external servers.
3. **Graceful Degradation:** When a track lacks DJ capabilities (`rights.canDJ: false`), the UI clearly communicates this state:
   - Staging controls display `DJ —` or `DJ Unavailable`.
   - Attempts to call `catalogService.stageTrackToDeck()` reject with a typed capability error.
   - The user can still listen to the track seamlessly.
4. **Creator Protection:** Uploaded creator original music is distinguished from third-party uploads to protect intellectual property rights.

---

## 8. Roadmap for Future Commercial Catalog Onboarding

* **Future Commercial Partner Phase:**
  - Secure enterprise agreements with authorized master catalog partners (e.g., T-Series, Sony Music, Universal Music, Saregama, Warner).
  - Implement encrypted token exchange for territory-validated streaming.
  - Integrate certified DJ performance catalog tiers supporting raw PCM access for real-time Web Audio mixing.

---

## 9. Milestone 2C: Authorized External Catalog Integration (Jamendo API v3.0)

SONORA Milestone 2C completes the first authorized live external music catalog integration using the official Jamendo Developer API v3.0:

### 9.1 Technical Configuration & Environment Separation
- **Configuration Variable:** `VITE_JAMENDO_CLIENT_ID`
- **State A (Configured):** When a valid developer client ID is provided, the Jamendo provider transitions to `'ready'` status and activates live track querying, tags discovery, and streaming.
- **State B (Unconfigured):** When absent, the provider gracefully reports `'not_configured'`. SONORA does not crash, fabricate fake credentials, or simulate unauthorized playback.

### 9.2 Conservative Rights & Creative Commons Mapping
Jamendo tracks are licensed under various Creative Commons (CC) licenses. SONORA maps raw CC licensing metadata conservatively into `TrackRights`:

| License Type | `license_ccurl` Pattern | Streaming / Listen | Preview | DJ Performance (`canDJ`) | Audio Lab Edit (`canEdit`) | Derivative Remix (`canRemix`) | Attribution Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CC BY** | `/by/` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **CC BY-SA** | `/by-sa/` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **CC0 / Public Domain** | `zero`, `publicdomain` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **CC BY-NC** | `/by-nc/` | ✓ | ✓ | ✓ (Personal) | ✓ (Personal) | — (NC Restricted) | ✓ |
| **CC BY-NC-SA** | `/by-nc-sa/` | ✓ | ✓ | ✓ (Personal) | ✓ (Personal) | — (NC Restricted) | ✓ |
| **CC BY-NC-ND** | `/by-nc-nd/` | ✓ | ✓ | — (ND Prohibited) | — (ND Prohibited) | — (ND Prohibited) | ✓ |
| **CC BY-ND** | `/by-nd/` | ✓ | ✓ | — (ND Prohibited) | — (ND Prohibited) | — (ND Prohibited) | ✓ |
| **Audio Download Prohibited** | `audiodlallowed: false` | ✓ | ✓ | — | — | — | ✓ |

### 9.3 Streaming Architecture
- Authorized streaming URLs are resolved dynamically via Jamendo's official MP3-128kbps (`mp32`) storage endpoints.
- Audio is decoded dynamically into Web Audio `AudioBuffer` for the active listening session.
- **Strict Compliance:** SONORA never caches raw audio files, scrapes endpoints, creates local audio mirrors, or bypasses licensing limits. Audio remains 100% provider-controlled.

### 9.4 Caching & Failure Isolation
- **Lightweight Metadata Caching:** `ProviderMemoryCache` caches search results and normalized metadata in-memory with a 5-minute TTL. No audio files are ever cached.
- **Provider Failure Isolation:** All provider invocations in `CatalogService` are isolated within typed `try...catch` boundaries. If Jamendo is unreachable, rate-limited, or encounters network failure, Demo, Local, and Creator catalogs continue operating without interruption.
