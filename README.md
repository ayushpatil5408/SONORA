# SONORA — Audiovisual Music Workstation

<p align="center">
  <img src="https://img.shields.io/badge/Status-Milestones%200.1--5.5%20Complete-brightgreen?style=for-the-badge&logo=soundcharts&logoColor=white" alt="Status" />
  <img src="https://img.shields.io/badge/Architecture-Web%20Audio%20%2B%20Workers-7c4dff?style=for-the-badge" alt="Architecture" />
  <img src="https://img.shields.io/badge/UI%20Style-Chromatic%20Holographic%20Aurora-00e5ff?style=for-the-badge" alt="UI" />
  <img src="https://img.shields.io/badge/Tests-16%2F16%20Suites%20Passing-emerald?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/License-Proprietary%20%2F%20MIT-amber?style=for-the-badge" alt="License" />
</p>

> **One continuous music workspace from listening to creation.**  
> *Discover → Listen → Analyze → Mix → Edit → Create → Share*

SONORA is an integrated, living audiovisual music platform built around one continuous workflow. Rather than a conventional rectangular SaaS dashboard or music player clone, SONORA treats musical entities as spatial matter (living orbs, ribbons, fields, constellations, and tactile dials) operating across a unified, immersive soundstage.

---

## Highlights & Capabilities

* **Chromatic / Holographic + Aurora Gradient Visual Language:**  
  Deep obsidian-indigo cosmic foundations (`#020205`), living multi-layered drifting aurora fields, frosted holographic glass surfaces (`backdrop-filter: blur(32px)`), prismatic edge refractions, and glowing audio-reactive conduits.
* **Hardware-Clock Web Audio Engine (`src/audio/AudioEngine.ts`):**  
  Sub-millisecond audio scheduling, equal-power crossfade curves, 3-band isolator EQ (+6dB boost to complete kill at -∞dB), resonant sound-color filters, and vinyl scrub simulation.
* **Two-Deck DJ Performance Workspace (`src/components/dj/`):**  
  Tactile vinyl jog wheels with realistic concentric diffraction textures, BPM pitch faders, hot cues, loop encoders, and three morphable acoustic environments (*Organic Orbital*, *Liquid Instrument*, *Acoustic Organism*).
* **Audio Intelligence & Harmonic Analysis (`src/audio/intelligence/`):**  
  Camelot Wheel harmonic compatibility matrix, dynamic key detection, beat/downbeat extraction, phrase segmentation, and continuous arrangement energy profiling.
* **Non-Destructive Creator Timeline (`src/creation/`):**  
  Multitrack timeline with clip edge trimming, slip editing, non-linear fades (linear, ease-in, ease-out, equal-power), crossfades, and interactive automation filaments.
* **Advanced Audio Warping & Pitch-Preserving Time Stretching (`src/creation/warpEngine.ts`):**  
  WSOLA time-stretching DSP preserving pitch across extreme tempo adjustments (0.5× to 2.0×), transient warp markers, and project tempo synchronization.
* **Offline Audio Rendering & Stem Bouncing (`src/creation/rendering/`):**  
  Non-destructive mixdown engine, multi-track gain and stereo panning matrix, stem bouncing, and uncompressed WAV RIFF binary encoding (16-bit, 24-bit, 32-bit Float).
* **Rights-Aware Music Supply & Integration (`src/catalog/`):**  
  Multi-tier licensing guardrails, Jamendo open catalog integration, local file ingestion, and track attribution protection.

---

## Architecture Overview

```
                                      SONORA SOUNDSTAGE
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 APP SHELL & ATMOSPHERE                                 │
│                   Living Aurora Ambient Drift (Three Layered Meshes)                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌─────────────────────────┐  ┌───────────────────────────┐  │
│  │   DISCOVER & SEARCH  │  │    DJ STUDIO (DECKS)    │  │    CREATOR WORKSPACE      │  │
│  │  - Spatial Universe  │  │  - Deck A & Deck B      │  │  - Multitrack Timeline    │  │
│  │  - Flow River        │  │  - 3-Band Isolator EQ   │  │  - Non-destructive Cliping│  │
│  │  - Jamendo / Local   │  │  - Concentric Jogwheels │  │  - WSOLA Audio Warping    │  │
│  │  - Rights Guardrails │  │  - Acoustic Conduits    │  │  - Stem & Mixdown Bouncer │  │
│  └──────────────────────┘  └─────────────────────────┘  └───────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                               PERSISTENT CAPSULE DOCK                                  │
│             Mini-Disc Vinyl Turntable • Multi-Spectral Scrub • Meter Telemetry          │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                    Typed Facade API & Command Bus (Main Thread)
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌──────────────────────────────────┐                       ┌──────────────────────────────────┐
│         WEB AUDIO ENGINE         │                       │      OFF-THREAD WEB WORKERS      │
│  - Hardware AudioContext Clock   │                       │  - Peak Downsampling             │
│  - Equal-Power Crossfade Curves  │                       │  - Waveform Vectorization        │
│  - OfflineAudioContext Renderer  │                       │  - Beat & Phrase Analysis        │
└──────────────────────────────────┘                       └──────────────────────────────────┘
```

---

## Route Index & Features

| Route | ID | State | Description |
|:---|:---|:---|:---|
| **Home** | `home` | **Operational** | Continuous workflow gateway, central living SoundOrb, real-time telemetry, and direct launch into DJ Studio. |
| **Search** | `search` | **Operational** | Multi-provider discovery (Demo, Local File Ingest, Jamendo) with rights matrix and BPM/Key filters. |
| **Library** | `library` | **Operational** | Living library with Spatial Universe, Flow River, and Pro List Console modes. |
| **DJ Studio** | `dj-studio` | **Operational** | Two-deck professional DJ workspace with jog wheels, crossfader, hot cues, isolator EQs, and 3 spatial environments. |
| **Creator** | `creator` | **Operational** | Professional arrangement DAW: multitrack timeline, audio warping, clip fades, automation, and offline WAV export. |

---

## Technology Stack

| Layer | Technologies | Purpose |
|:---|:---|:---|
| **Frontend Framework** | React 18, TypeScript 5.7 | Predictable, type-safe reactive UI orchestration |
| **Styling & Aesthetics** | Pure Vanilla CSS (Tokens + HSL + Glassmorphism) | Zero runtime overhead, 60fps GPU-accelerated motion |
| **Build & Tooling** | Vite 6.0 | Sub-second HMR and optimized production bundling |
| **Acoustics & DSP** | Web Audio API (`AudioContext`, `OfflineAudioContext`) | Ultra-low latency playback, filtering, and offline rendering |
| **Time Stretching** | WSOLA (Waveform Similarity Overlap-Add) | Artifact-free pitch-preserving tempo sync |
| **Off-Thread Processing** | Web Workers | Downsampled peak extraction, waveform analysis |
| **Backend Service** | FastAPI (Python 3.10+), SQLAlchemy | Telemetry, catalog persistence, and API endpoints |
| **Database** | SQLite (`dev.db`) | Local persistence and migration tracking |

---

## Getting Started

### 1. Prerequisites
* **Node.js:** v18.0.0 or later (v20+ recommended)
* **Python (optional for backend):** v3.10 or later

### 2. Frontend Installation & Startup
```bash
# Clone the repository
git clone https://github.com/ayushpatil5408/SONORA.git
cd SONORA

# Install dependencies
npm install

# Launch Vite development server
npm run dev
```
Open `http://localhost:3000` or `http://localhost:5173` in any modern Chromium, Firefox, or Safari browser.

### 3. Backend Service (Optional)
```bash
# Install Python requirements
pip install -r backend/requirements.txt

# Run FastAPI telemetry server
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API endpoints are available at `http://127.0.0.1:8000/docs`.

---

## Verification & Automated Testing

SONORA includes an extensive automated test suite covering audio DSP, analysis, arrangement intelligence, warping, and offline rendering:

```bash
# Run all 16 test suites
npm test

# Run individual milestone suites
npm run test:audio          # Web Audio API engine & node math
npm run test:waveform       # Web Worker waveform peak extraction
npm run test:workspace      # DJ Deck coordination & crossfading
npm run test:shell          # App Shell navigation & persistent player
npm run test:catalog        # Living music library & filters
npm run test:music-supply   # Rights matrix & track protection
npm run test:jamendo        # Jamendo catalog integration
npm run test:dj-environments# Three spatial DJ environments
npm run test:dj-performance # Scratching & vinyl physics
npm run test:audio-output   # Audio routing & master output
npm run test:intelligence   # Key, BPM, Camelot wheel & energy
npm run test:creation       # Non-destructive multitrack project model
npm run test:creation-editing # Slip editing, fades & automation
npm run test:arrangement    # Musical snapping & arrangement markers
npm run test:warping        # WSOLA time-stretching & warp markers
npm run test:rendering      # Offline WAV mixdown & stem bouncing

# Type-check and production build
npm run typecheck
npm run build
```

### Test Suite Status Matrix
```text
========================================================================
✓ Phase 0.2 Web Audio Engine                      (10/10 PASS)
✓ Phase 0.3 Waveform Analysis                     (10/10 PASS)
✓ Phase 0.4 Two-Deck Workspace                    (10/10 PASS)
✓ Milestone 1 Shell & Player                      (10/10 PASS)
✓ Milestone 2A Catalog                            (10/10 PASS)
✓ Milestone 2B Music Supply                       (10/10 PASS)
✓ Milestone 2C Jamendo Integration                (10/10 PASS)
✓ Milestone 3 DJ Environments                     (10/10 PASS)
✓ Audio Output Routing                            (10/10 PASS)
✓ Milestone 3.5 DJ Performance                    (10/10 PASS)
✓ Milestone 4 Audio Intelligence                  (10/10 PASS)
✓ Milestone 5.0 Creator Foundation                (10/10 PASS)
✓ Milestone 5.2 Non-Destructive Editing           (10/10 PASS)
✓ Milestone 5.3 Beat-Aware Arrangement            (12/12 PASS)
✓ Milestone 5.4 Audio Warping & Sync              (12/12 PASS)
✓ Milestone 5.5 Rendering & Stem Bouncing         (13/13 PASS)
========================================================================
16 of 16 test suites passing (100% verified)
========================================================================
```

---

## Project Structure

```
SONORA/
├── backend/                  # FastAPI backend service & SQLAlchemy models
│   ├── app/
│   │   ├── database.py       # SQLite connection & session management
│   │   ├── main.py           # FastAPI routes & lifecycle hooks
│   │   ├── migrations.py     # Schema migrations
│   │   └── models.py         # Track & project metadata entities
│   └── requirements.txt      # Python dependencies
├── docs/                     # Architectural specifications & design guides
│   ├── AGENTS.md             # Authoritative agent operating contract
│   ├── DESIGN_SYSTEM.md      # Core tokens, color palettes & typography
│   ├── MOTION_SYSTEM.md      # Three-layer motion hierarchy & accessibility
│   ├── PRD.md                # Comprehensive Product Requirements Document
│   ├── PRODUCT_ARCHITECTURE.md # Architectural boundaries & data flow
│   ├── UX_PRINCIPLES.md      # Direct manipulation & continuous workflow
│   └── VISUAL_LANGUAGE.md    # Spatial and tactile visual primitives
├── scripts/                  # Automated verification & testing testbeds (19 scripts)
├── src/
│   ├── audio/                # Web Audio API engine, DSP nodes & intelligence
│   │   ├── AudioEngine.ts    # Central audio engine facade
│   │   ├── intelligence/     # Camelot Wheel, key, BPM & energy analysis
│   │   └── types.ts          # Core audio contracts
│   ├── catalog/              # Music supply, Jamendo integration & rights
│   ├── components/           # React presentation components & styling
│   │   ├── creation/         # Creator Workspace, timeline & warp editors
│   │   ├── dj/               # Two-deck DJ plinths, crossfader & jogwheels
│   │   ├── navigation/       # Holographic frosted navigation bar
│   │   ├── player/           # Persistent capsule player dock
│   │   ├── shell/            # Application shell & living aurora atmosphere
│   │   ├── stage/            # Central living SoundOrb stage
│   │   └── views/            # Home, Search, Library & DJ Studio views
│   ├── creation/             # Creator DAW core logic & rendering engine
│   │   ├── clipOperations.ts # Non-destructive clip manipulation & slip editing
│   │   ├── fadeCurves.ts     # Linear, exponential & equal-power curves
│   │   ├── rendering/        # Offline AudioContext renderer & WAV encoder
│   │   ├── warpEngine.ts     # WSOLA time-stretching & warp marker mapping
│   │   └── types.ts          # Multitrack project contracts
│   ├── styles/               # Core design system tokens & base CSS
│   │   ├── base.css          # Base resets, holographic scrollbars & selection
│   │   └── tokens.css        # Chromatic gradients, aurora colors & elevation
│   ├── workers/              # Peak extraction & analysis Web Workers
│   ├── App.tsx               # Root application component & routing
│   └── main.tsx              # Application entry point
├── package.json              # Project dependencies & npm scripts
├── tsconfig.json             # TypeScript compiler configuration
└── vite.config.ts            # Vite configuration & worker build settings
```

---

## Design System Tokens & Color Palette

* **Obsidian Cosmic Void:** `--void-deep: #020205`, `--void-violet: #080612`
* **Living Aurora Palettes:**
  * `--aurora-cyan: #00e5ff`
  * `--aurora-sky: #38bdf8`
  * `--aurora-iris: #818cf8`
  * `--aurora-violet: #c084fc`
  * `--aurora-magenta: #f472b6`
  * `--aurora-amber: #ffb300`
* **Holographic Surfaces:** Translucent multi-stop glass layers with specular highlights (`--holo-surface`, `--holo-surface-elevated`) and chromatic optical borders (`--holo-border-chromatic`).

---

## License

Proprietary / All rights reserved. Developed with the **SONORA** Design & Architectural Specification Suite.
