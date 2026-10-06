# SONORA — Product Requirements Document

**Document:** PRD.md  
**Status:** Product foundation / implementation source of truth  
**Working codename:** SONORA  
**Primary development environment:** Antigravity  
**Version:** 0.1  
**Last updated:** 2026-09-26

---

# 1. Executive Summary

SONORA is an integrated music platform designed around one continuous workflow:

> **Discover → Listen → Analyze → Mix → Edit → Create → Share**

The product combines capabilities normally fragmented across multiple applications:

- Music streaming and discovery
- Personal music library and playlists
- Intelligent music recommendations
- Professional two-deck DJ mixing
- Waveform and beat-aware interaction
- Audio editing and processing
- Samples and remix creation
- AI-assisted DJ transitions and music workflows
- Creator-oriented publishing
- Future collaborative DJ sessions and social discovery

SONORA is **not** intended to be a superficial Spotify clone. Its central product thesis is that users should not have to leave their music application when they move from consuming music to experimenting with, mixing, editing, or creating music.

The first release should establish a polished streaming/listening foundation and a browser-based audio/DJ architecture that can grow into the complete platform.

---

# 2. Product Vision

## Vision Statement

Build a unified digital music workspace where listening and music creation are part of the same experience.

A user should be able to discover a song, listen to it, inspect its musical properties, move it into a DJ session, edit a section, create a sample or remix, save the result, and eventually share it — without needing to move between unrelated applications.

## Long-Term Vision

SONORA should evolve from a music player into a **personal music operating environment**.

The platform should understand:

- What the user listens to
- What the user likes
- What they are currently doing
- BPM and musical key
- Energy and musical characteristics
- How tracks can transition
- What the user creates
- Which sounds/samples they reuse
- How listening and creation are connected

---

# 3. Problem Statement

Modern music workflows are fragmented.

A typical user may need:

1. A streaming service for discovery and listening
2. A separate DJ application for mixing
3. A DAW/audio editor for editing
4. Separate tools for sample extraction
5. Separate storage for exported creations
6. Separate platforms for sharing

This creates unnecessary context switching.

SONORA aims to reduce this fragmentation by connecting the workflows into one product.

## Core Problem

> Users can easily consume music, but moving from consumption to experimentation and creation often requires switching applications, exporting files, learning disconnected interfaces, and rebuilding context.

## Product Opportunity

Create a platform where the user's listening library becomes the foundation of their creative workspace.

---

# 4. Product Thesis

SONORA should be differentiated by **workflow integration**, not by attempting to outcompete every individual feature of Spotify, Serato, Rekordbox, Ableton, or Audacity.

The product's strongest differentiator is:

> **The same music library powers listening, discovery, DJing, editing, sampling, and creation.**

---

# 5. Target Users

## 5.1 Casual Listener

Needs:

- Simple playback
- Search
- Playlists
- Discovery
- Recommendations
- Favorites
- History

## 5.2 Music Enthusiast

Needs:

- Better discovery
- Mood/activity listening
- Metadata
- Track analysis
- Personal collections
- Experimentation

## 5.3 Beginner DJ

Needs:

- Easy two-deck mixing
- Waveforms
- BPM
- Key
- Beat synchronization
- Cue points
- Loops
- Effects
- Guided transitions

## 5.4 Advanced Hobbyist / Creator

Needs:

- Audio editing
- Samples
- Remix workflow
- Recording
- Non-destructive edits
- Version history
- Export

## 5.5 Future Creator

Needs:

- Creator profile
- Publishing
- Remix sharing
- Collaboration
- Audience discovery
- Analytics

---

# 6. Product Goals

## Primary Goals

1. Create a polished music listening experience.
2. Build a unified personal music library.
3. Provide intelligent discovery.
4. Provide an accessible but powerful DJ Studio.
5. Provide browser-based audio editing.
6. Connect listening directly to creation.
7. Establish a scalable audio-processing architecture.
8. Provide a foundation for AI-assisted music workflows.
9. Maintain a high-quality, modern, immersive interface.
10. Build the project as a serious full-stack engineering portfolio project.

## Secondary Goals

- Creator ecosystem
- Collaborative DJ sessions
- Social discovery
- Personalized music intelligence
- Advanced audio analysis

---

# 7. Non-Goals

The initial product must NOT attempt to:

- Recreate every feature of Spotify.
- Recreate every feature of professional DAWs.
- Replace professional studio software in the first release.
- Build a global music licensing business.
- Scrape copyrighted music from unauthorized websites.
- Circumvent DRM.
- Host or redistribute copyrighted recordings without authorization.
- Build every social feature before the core audio experience is stable.
- Add AI features merely for marketing value.

---

# 8. Legal and Content Principles

SONORA must be designed around lawful content sources.

Supported content models may include:

- Licensed/authorized streaming catalogs
- User-owned local audio files
- Original creator uploads
- Public-domain recordings
- Properly licensed Creative Commons content
- Other explicitly authorized sources

The application must not:

- Scrape unauthorized music catalogs.
- Download copyrighted tracks from third-party services without permission.
- Circumvent DRM.
- Present unauthorized recordings as platform-owned content.
- Build features specifically intended to bypass licensing restrictions.

For development, synthetic/sample/demo audio and legally usable test tracks should be used.

---

# 9. Product Principles

## 9.1 Music First

The interface should always prioritize the music and the user's current task.

## 9.2 Progressive Complexity

Beginners should see a simple experience.

Advanced controls should become available without overwhelming the user.

## 9.3 One Continuous Workflow

Moving from listening to mixing or editing should feel natural.

## 9.4 Non-Destructive by Default

Original audio should remain untouched whenever possible.

## 9.5 Fast Feedback

Audio controls should respond immediately.

## 9.6 Visual Clarity

Waveforms, meters, controls and timelines should communicate state clearly.

## 9.7 AI as Assistance

AI should recommend, explain and accelerate workflows rather than hide important controls.

## 9.8 Performance Is a Feature

Audio playback and interaction must remain responsive.

---

# 10. Product Information Architecture

Primary navigation:

```text
Home
Search
Library
DJ Studio
Audio Lab
Creator
```

Secondary navigation:

```text
Liked Music
Playlists
Recently Played
Downloads / Local Files
Samples
My Mixes
My Edits
My Creations
Settings
```

Persistent global player:

```text
Current Track
Artwork
Title / Artist
Play / Pause
Previous / Next
Progress
Volume
Queue
Like
Open in DJ Studio
Open in Audio Lab
```

---

# 11. Home

## Requirements

Home should provide:

- Personalized greeting
- Recently played
- Continue listening
- Recommended playlists
- Recommended tracks
- Mood collections
- Activity collections
- New discoveries
- User-created mixes
- Quick access to DJ Studio
- Quick access to Audio Lab

## Example Sections

```text
Good evening

Continue Listening

Made For You

Based on Your Listening

Mood

Activity

Recently Played

Your Mixes

Explore
```

The content should eventually be personalized.

For MVP, deterministic/mock recommendation logic is acceptable.

---

# 12. Search

Search must support:

- Tracks
- Artists
- Albums
- Playlists
- Creators
- User creations
- Samples
- Local files

Future search capabilities:

- Natural-language search
- Mood search
- BPM search
- Key search
- Energy search

Examples:

```text
"energetic electronic around 128 BPM"

"late night chill music"

"tracks similar to this"

"tracks in compatible keys"
```

---

# 13. Music Player

## Core Controls

- Play
- Pause
- Previous
- Next
- Seek
- Volume
- Mute
- Repeat
- Shuffle
- Queue
- Like

## Advanced

- Playback speed where appropriate
- Output device selection
- Audio visualization
- Track information
- Open in DJ Studio
- Open in Audio Lab
- Add to playlist
- Add to queue

---

# 14. Queue

Requirements:

- View current queue
- Add tracks
- Remove tracks
- Reorder tracks
- Clear queue
- Save queue as playlist
- Play next
- Add to end

Future:

- AI-generated queue
- Smart queue transitions
- Queue mood control

---

# 15. Library

Library should organize:

```text
Liked Music
Playlists
Albums
Artists
Recently Played
Local Audio
My Mixes
My Edits
Samples
Creations
```

Users must be able to search/filter their library.

---

# 16. Playlists

Users can:

- Create playlist
- Rename playlist
- Add/remove tracks
- Reorder tracks
- Add description
- Add artwork
- Like/favorite playlist
- Duplicate playlist
- Delete playlist

Future:

- Collaborative playlists
- AI playlist generation
- Smart playlists
- Dynamic playlists

---

# 17. Discovery Engine

Discovery should eventually use multiple signals:

- Listening history
- Likes
- Skips
- Replays
- Playlist additions
- Artist affinity
- Genre affinity
- BPM
- Energy
- Mood
- Time of day
- Activity
- Session context

## Contextual Discovery

Users can select:

```text
Activity:
Coding
Studying
Workout
Driving
Relaxing
Party
Creating
DJing

Mood:
Calm
Focused
Energetic
Emotional
Confident
Late Night
```

The recommendation system should combine these signals.

---

# 18. Track Analysis

Tracks should eventually have metadata such as:

```text
BPM
Key
Duration
Energy
Loudness
Genre
Mood
Beat positions
Waveform data
Sections
```

Analysis should be asynchronous.

Example:

```text
UPLOAD
  ↓
ANALYSIS JOB
  ↓
BPM
KEY
LOUDNESS
WAVEFORM
BEAT GRID
  ↓
STORE METADATA
```

---

# 19. DJ STUDIO

DJ Studio is one of the core differentiators.

## Primary Interface

Two decks:

```text
DECK A                  DECK B

Artwork                 Artwork
Track                   Track
BPM                     BPM
Key                     Key

Waveform                Waveform

Play                    Play
Cue                     Cue
Loop                    Loop
```

Central mixer:

```text
Channel A
LOW
MID
HIGH
FILTER
VOLUME

CROSS FADER

Channel B
LOW
MID
HIGH
FILTER
VOLUME
```

---

# 20. DJ Deck Requirements

Each deck must support:

- Track loading
- Play/pause
- Cue
- Seek
- Pitch
- Tempo
- BPM display
- Key display
- Loop
- Cue points
- Waveform
- Beat markers
- Volume
- EQ
- Filter

Future:

- Slip mode
- Beat jump
- Hot cues
- Beat loop
- Quantization
- Vinyl mode
- Scratch simulation

---

# 21. Waveform System

The waveform component must support:

- Zoom
- Pan
- Current playback indicator
- Beat markers
- Cue points
- Loop regions
- Selection
- Track overview
- Accurate time mapping

The waveform should be rendered efficiently.

Large audio files must not cause excessive UI re-rendering.

---

# 22. Beat Grid

Beat grid requirements:

- BPM
- Beat positions
- Downbeats
- Grid visualization
- Grid offset adjustment

Future:

- Automatic beat-grid correction
- Variable BPM detection

---

# 23. Sync

Sync should be available as an optional assistance feature.

It should be transparent to the user.

Example:

```text
Deck A: 124 BPM
Deck B: 128 BPM

SYNC

→ Deck B adjusted to 124 BPM
```

The system should not silently alter user intent.

---

# 24. EQ and Mixer

Each deck:

- Low
- Mid
- High
- Gain
- Filter
- Channel volume

Master:

- Master volume
- Limiter/protection
- Optional recording level

---

# 25. Effects

Initial effects:

- Filter
- Echo
- Reverb
- Delay

Future:

- Flanger
- Phaser
- Bitcrusher
- Distortion
- Auto-pan
- Beat repeat

Effects should be modular.

---

# 26. Loops

Supported loop lengths:

```text
1 beat
2 beats
4 beats
8 beats
16 beats
32 beats
```

Requirements:

- Enable/disable
- Resize
- Move
- Quantized loop
- Visual loop region

---

# 27. Cue Points

Users can create named cue points.

Example:

```text
INTRO
DROP
VOCAL
BREAK
OUTRO
```

Cue points should persist per user/session.

---

# 28. DJ Recording

Users should eventually be able to record a DJ session.

Requirements:

- Start recording
- Stop recording
- Recording timer
- Audio level visualization
- Save recording
- Name recording
- Add metadata
- Open recording in Audio Lab
- Export

Browser limitations must be respected.

---

# 29. Intelligent DJ Assistant

The AI DJ assistant is a later-stage differentiator.

It may analyze:

- BPM compatibility
- Key compatibility
- Energy
- Genre
- Track structure
- Intro/outro length
- Current session context

Example recommendation:

```text
CURRENT TRACK
124 BPM
A minor
Energy 0.62

SUGGESTED NEXT TRACK

126 BPM
A minor
Energy 0.74

Suggested transition:
16-beat blend
```

The AI must explain recommendations when useful.

---

# 30. Audio Lab

Audio Lab is a non-destructive editing workspace.

## Core Editing

- Trim
- Cut
- Split
- Delete selection
- Copy
- Paste
- Fade in
- Fade out
- Gain
- Normalize
- Reverse

## Processing

- EQ
- Compressor
- Limiter
- Reverb
- Delay
- Filter
- Distortion

## Time/Pitch

- Pitch shift
- Time stretch

Implementation quality and browser performance must be validated before adding expensive processing.

---

# 31. Audio Timeline

The Audio Lab timeline should support:

- Waveform
- Time ruler
- Playhead
- Selection
- Zoom
- Pan
- Markers
- Regions
- Multiple editable tracks where architecture permits

MVP may use a single-track editor.

---

# 32. Non-Destructive Editing

Original audio must remain preserved.

Edits should be represented as operations where practical:

```text
Original
  ↓
Trim
  ↓
EQ
  ↓
Gain
  ↓
Fade
  ↓
Export
```

Undo/redo should operate on the editing state.

---

# 33. Version History

Users should be able to create versions:

```text
Original
Edit 01
Edit 02
Final
```

Future:

- Branching versions
- Compare versions
- Restore version
- Version notes

---

# 34. Export

Potential formats:

- WAV
- MP3 where licensing/technical constraints permit
- Other browser/server-supported formats

Export settings:

- Format
- Sample rate
- Bit depth
- Quality/bitrate
- Filename

Exports must clearly identify whether the source content is eligible for export.

---

# 35. Creator Workspace

Creator workspace should eventually contain:

```text
My Projects
My Samples
My Edits
My Remixes
My DJ Sets
My Creations
Drafts
Published
```

A project may contain:

- Source audio references
- Edits
- Samples
- Metadata
- Versions
- Exported files

---

# 36. Sample System

Users should be able to create samples from authorized/user-owned audio.

Sample metadata:

```text
Name
Duration
BPM
Key
Category
Tags
Source
Created At
```

Categories:

- Vocal
- Drum
- Bass
- Synth
- FX
- Instrument
- Other

---

# 37. Remix/Mashup Workflow

Example:

```text
Track A
   ↓
Select section
   ↓
Create sample
   ↓
Open Creator
   ↓
Add Track B
   ↓
Align BPM
   ↓
Apply effects
   ↓
Record
   ↓
Save version
   ↓
Export/share if authorized
```

This workflow is central to the product vision.

---

# 38. AI Music Assistance

AI capabilities should be introduced progressively.

Potential features:

- Track recommendations
- Transition recommendations
- Playlist generation
- Mood generation
- DJ set planning
- Track tagging
- Audio metadata assistance
- Sample classification
- Creative workflow suggestions

AI should never silently modify a user's project.

---

# 39. Social / Creator Layer

Post-MVP.

Creators may publish:

- DJ sets
- Original tracks
- Authorized remixes
- Samples
- Playlists
- Edits
- Creator projects

Users may:

- Follow creators
- Like creations
- Save creations
- Share creations
- Comment where appropriate

Copyright status must be enforced by the content model.

---

# 40. Collaboration

Future collaborative DJ room:

```text
USER A
Deck A
   \
    \
     LIVE SESSION
    /
   /
USER B
Deck B
```

Possible capabilities:

- Shared queue
- Shared mixer
- Chat
- Reactions
- Voting
- Co-recording

Real-time synchronization must be designed carefully before implementation.

---

# 41. Authentication

MVP:

- Sign up
- Sign in
- Sign out
- Password reset
- Session management

Future:

- OAuth
- Passkeys
- Social login

User roles:

```text
Listener
Creator
Admin
```

---

# 42. User Settings

Settings should include:

- Profile
- Playback
- Audio
- Notifications
- Privacy
- Appearance
- Keyboard shortcuts
- Local audio permissions
- Data/export controls

---

# 43. Keyboard Shortcuts

Future DJ shortcuts should include:

```text
Space = Play/Pause
C = Cue
L = Loop
S = Sync
1 = Deck A
2 = Deck B
```

Shortcuts must be configurable later.

---

# 44. Frontend Architecture

Recommended initial stack:

- React
- TypeScript
- Vite or Next.js depending on routing/SSR requirements
- Tailwind CSS
- Component library built in-project
- Web Audio API
- Web Workers for CPU-heavy browser tasks
- Canvas/WebGL where waveform/visualization performance requires it

The UI should be componentized around domains.

Suggested domains:

```text
player
library
search
discovery
dj
audio-editor
creator
settings
auth
```

---

# 45. Backend Architecture

Recommended:

- FastAPI or Node.js API
- PostgreSQL
- Redis where required
- WebSocket support for real-time functionality
- Background worker system
- Object storage for authorized audio/artwork
- FFmpeg for server-side audio operations where legally and technically appropriate

Backend responsibilities:

- Authentication
- User management
- Music metadata
- Library
- Playlists
- Projects
- Audio analysis jobs
- File metadata
- Recommendations
- Creator content
- Permissions
- Export jobs

---

# 46. Audio Engine Architecture

The audio engine should be isolated from UI components.

Conceptual layers:

```text
Audio Engine
│
├── Audio Context
├── Track Loader
├── Playback Engine
├── Gain
├── EQ
├── Filter
├── Effects
├── Mixer
├── Deck
├── Recording
└── Metering
```

The UI communicates with the engine through a stable API.

Do not couple React state directly to every audio parameter.

---

# 47. Storage Architecture

Potential storage:

```text
PostgreSQL
    ↓
Metadata
Users
Playlists
Projects
Tracks
Analysis
Permissions

Object Storage
    ↓
Audio
Artwork
Exports
Samples
Recordings
```

Audio binaries should not be stored directly inside PostgreSQL.

---

# 48. Database Entities

Initial entity model:

```text
User
Artist
Album
Track
Playlist
PlaylistTrack
LibraryItem
PlaybackHistory
Like
Queue
AudioAsset
AudioAnalysis
DJSession
DJDeckState
CuePoint
Loop
AudioProject
AudioProjectVersion
AudioEdit
Sample
CreatorProfile
Creation
Follow
Notification
```

The actual schema should be normalized appropriately and documented before large-scale implementation.

---

# 49. API Domain Boundaries

Suggested API domains:

```text
/auth
/users
/tracks
/artists
/albums
/search
/library
/playlists
/queue
/history
/discovery
/audio
/analysis
/dj
/projects
/samples
/creators
/creations
/notifications
```

Avoid a single giant controller/service.

---

# 50. Background Jobs

Background processing should handle:

- Audio analysis
- Waveform generation
- BPM detection
- Key detection
- Loudness analysis
- Search indexing
- Recommendation computation
- Audio exports
- Artwork processing

Jobs should be idempotent where practical.

---

# 51. Realtime Architecture

WebSockets may eventually support:

- Live DJ sessions
- Collaborative rooms
- Playback synchronization
- Presence
- Real-time mixer state

Do not add WebSockets to MVP unless a real feature requires them.

---

# 52. Search Architecture

MVP can use PostgreSQL search.

As scale increases, evaluate:

- Meilisearch
- OpenSearch
- Elasticsearch

Do not introduce a search engine before the product actually needs it.

---

# 53. Recommendation Architecture

Start simple.

Phase 1:

```text
Rules + metadata + history
```

Phase 2:

```text
Content similarity
Collaborative signals
```

Phase 3:

```text
Hybrid recommendation model
```

Phase 4:

```text
Context-aware recommendation
```

Do not build a complex ML recommendation system before enough behavioral data exists.

---

# 54. Frontend UX Direction

Visual direction:

- Dark-first interface
- High-quality artwork
- Strong typography
- Subtle glass/depth effects where useful
- Smooth motion
- Responsive layouts
- High information density in DJ Studio
- Minimal distraction during listening
- Cinematic visualizations where appropriate

The interface must not become visually impressive at the expense of usability.

---

# 55. Responsive Design

Desktop is the primary environment for:

- DJ Studio
- Audio Lab
- Creator workspace

Mobile should prioritize:

- Listening
- Search
- Library
- Playlists
- Discovery

DJ Studio mobile should initially be limited rather than attempting to reproduce every desktop control.

---

# 56. Accessibility

Requirements:

- Keyboard navigation
- Visible focus states
- Semantic controls
- Screen-reader labels
- Sufficient contrast
- Reduced-motion support
- Non-color-only status indicators
- Accessible dialogs
- Accessible sliders

Audio visualization must not be the only way to understand important information.

---

# 57. Performance Requirements

Targets should include:

- Fast initial application load
- Audio playback without avoidable interruptions
- Smooth waveform interaction
- No excessive React re-rendering during playback
- Efficient audio buffer handling
- Lazy loading of heavy modules
- Code splitting
- Worker-based expensive calculations

DJ Studio and Audio Lab should be performance-tested separately.

---

# 58. Offline / Local Audio

Potential support:

- User-selected local files
- Browser playback
- Temporary local processing
- Local project data

Offline streaming of licensed catalog content is out of initial scope unless licensing and storage requirements are explicitly addressed.

---

# 59. Security

Requirements:

- Secure authentication
- Password hashing
- Secure sessions/tokens
- Authorization checks
- File upload validation
- MIME/type validation
- File-size limits
- Rate limiting
- Input validation
- Protection against path traversal
- Protection against malicious uploads
- Secure secret management

Never place private API keys in frontend source.

---

# 60. Privacy

The system should minimize unnecessary collection.

Users should be able to understand:

- What listening data is stored
- What recommendations use
- What creator data is public
- What uploaded files are stored
- How projects are stored

Future:

- Export user data
- Delete account
- Delete uploaded content
- Privacy controls

---

# 61. Observability

Backend should eventually provide:

- Structured logs
- Error tracking
- Request metrics
- Job metrics
- Audio processing metrics
- Performance measurements

Frontend should track errors without collecting unnecessary personal information.

---

# 62. Testing Strategy

## Unit Tests

Test:

- Audio utilities
- Data transformations
- Recommendation logic
- Playlist operations
- Queue logic
- Permission logic

## Integration Tests

Test:

- API/database
- Authentication
- Uploads
- Audio analysis jobs
- Project saving

## Frontend Tests

Test:

- Player
- Search
- Library
- Playlist
- DJ controls
- Audio editor

## End-to-End

Critical flows:

```text
Sign in
→ Search
→ Play track
→ Add to playlist
→ Open DJ Studio
→ Load decks
→ Mix
→ Save session
```

and:

```text
Open Audio Lab
→ Load authorized audio
→ Edit
→ Save version
→ Export
```

---

# 63. CI/CD

Every pull request should eventually run:

```text
Lint
Typecheck
Unit tests
Integration tests
Build
```

Main branch should remain deployable.

No direct untested large-scale changes to main.

---

# 64. Repository Structure

Recommended initial structure:

```text
sonora/
│
├── PRD.md
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── audio-engine/
│   ├── waveform/
│   ├── music-core/
│   └── shared/
│
├── services/
│   ├── audio-analysis/
│   ├── recommendations/
│   └── processing/
│
├── docs/
│   ├── architecture.md
│   ├── audio-engine.md
│   ├── api.md
│   ├── ux-system.md
│   └── roadmap.md
│
├── tests/
│
└── scripts/
```

The structure may be simplified during the first milestone if a monorepo would create unnecessary complexity.

---

# 65. MVP Definition

The MVP must prove the central product concept.

## MVP includes

### Account

- Sign up
- Sign in
- Sign out

### Listening

- Home
- Search
- Track playback
- Player
- Queue
- Library
- Likes
- Playlists
- History

### Audio

- Authorized demo/local audio
- Basic metadata
- Waveform generation/display

### DJ Studio

- Two decks
- Track loading
- Play/pause
- BPM display
- Waveforms
- Crossfader
- Volume
- Basic EQ
- Basic filter
- Cue
- Basic loop
- Session save

### Audio Lab

- Load authorized audio
- Waveform
- Trim
- Cut
- Split
- Gain
- Fade
- Undo/redo
- Save project
- Export

The MVP does NOT need:

- Social network
- Collaborative DJ sessions
- Advanced AI
- Complex recommendation ML
- Professional-grade DAW capabilities
- Large commercial music catalog

---

# 66. Phase Roadmap

## Phase 0 — Foundation

Deliver:

- Repository
- Architecture
- Tooling
- CI
- Base UI
- Database
- API skeleton
- Authentication foundation

## Phase 1 — Listening

Deliver:

- Home
- Search
- Library
- Player
- Queue
- Playlists
- Likes
- History

## Phase 2 — Audio Core

Deliver:

- Audio asset model
- Waveforms
- Track analysis
- Local/authorized audio
- Audio engine abstraction

## Phase 3 — DJ Studio

Deliver:

- Two decks
- Mixer
- Waveforms
- BPM
- Cue
- Loops
- EQ
- Filter
- Session saving

## Phase 4 — Audio Lab

Deliver:

- Timeline
- Editing
- Non-destructive operations
- Undo/redo
- Versions
- Export

## Phase 5 — Intelligent Music

Deliver:

- Discovery
- Contextual recommendations
- Track compatibility
- AI DJ suggestions

## Phase 6 — Creator Platform

Deliver:

- Projects
- Samples
- Remix workflow
- Creator profiles
- Publishing

## Phase 7 — Social and Collaboration

Deliver:

- Following
- Sharing
- Collaborative playlists
- Live DJ rooms
- Social discovery

---

# 67. First Implementation Milestone

The first implementation must NOT attempt to build the full application.

## Milestone 1: Product Foundation

### Deliverables

1. Initialize repository.
2. Create frontend application.
3. Create backend application.
4. Configure TypeScript/linting/formatting.
5. Establish environment configuration.
6. Create base design system.
7. Create application shell.
8. Create navigation.
9. Create persistent player shell.
10. Create placeholder routes for:
   - Home
   - Search
   - Library
   - DJ Studio
   - Audio Lab
   - Creator
11. Establish audio-engine package/interface.
12. Establish backend API health endpoint.
13. Establish database connection.
14. Add initial schema migration.
15. Add test infrastructure.
16. Document architecture decisions.

### Acceptance Criteria

The application must:

- Start locally with documented commands.
- Display the complete navigation.
- Navigate between major sections.
- Show the persistent player UI.
- Have a functioning backend health endpoint.
- Connect to the development database.
- Pass lint/typecheck/tests/build.
- Contain no fake claims that unfinished features are functional.
- Have clear placeholders for future modules.

---

# 68. Milestone 2 Preview

Only after Milestone 1 is stable:

- Authentication
- Track model
- Audio asset model
- Demo music dataset
- Real player
- Library
- Playlists

---

# 69. Definition of Done

A feature is complete only when:

- Implementation exists.
- UI is integrated.
- Relevant tests exist.
- Error states are handled.
- Loading states are handled.
- Empty states are handled.
- Accessibility has been considered.
- TypeScript/type checks pass.
- Lint passes.
- Build passes.
- Documentation is updated where necessary.
- No known critical console errors remain.
- Feature works with realistic data.
- Existing functionality remains intact.

---

# 70. Error and Empty States

Every major feature must account for:

### Loading

Show meaningful loading UI.

### Empty

Explain what the user can do next.

### Error

Explain the problem and provide recovery.

### Offline/network failure

Do not leave the interface in an indefinite loading state.

---

# 71. Data and State Management

Separate:

```text
Server State
UI State
Audio Engine State
Persistent User State
```

Do not put every state value into one global store.

Playback time and audio engine values should not cause unnecessary application-wide renders.

---

# 72. Audio Engineering Guardrails

The audio engine must:

- Use precise audio timing where possible.
- Avoid UI timers as the authoritative playback clock.
- Separate audio scheduling from React rendering.
- Avoid unnecessary audio graph reconstruction.
- Handle cleanup of AudioNodes.
- Handle suspended AudioContext states.
- Provide safe volume limits.
- Avoid clipping where possible.
- Provide clear master output handling.

---

# 73. AI Engineering Guardrails

AI features must:

- Have deterministic fallbacks.
- Never block basic playback.
- Fail gracefully.
- Avoid inventing track metadata.
- Explain recommendations where useful.
- Keep user control.
- Avoid sending unnecessary private data to external models.

---

# 74. Agent Execution Rules

The project will be developed with an AI coding agent.

The agent MUST:

1. Read `PRD.md` before major implementation.
2. Inspect the existing repository before creating files.
3. Understand existing architecture before modifying it.
4. Work incrementally.
5. Implement one milestone at a time.
6. Run tests after meaningful changes.
7. Run build/typecheck/lint before declaring completion.
8. Update documentation when architecture changes.
9. Avoid unnecessary dependencies.
10. Avoid duplicating existing functionality.
11. Preserve working code.
12. Explain architectural decisions.
13. Keep commits focused.
14. Never silently change product requirements.

---

# 75. Agent Do-Not-Overbuild Rules

The agent must NOT:

- Implement future phases prematurely.
- Build social functionality during the MVP foundation.
- Add AI merely because the product mentions AI.
- Add complex ML without data or a clear requirement.
- Introduce microservices without a concrete reason.
- Add WebSockets before real-time requirements exist.
- Introduce multiple databases unnecessarily.
- Add a heavy audio framework without evaluating browser-native capabilities.
- Replace working architecture without justification.
- Generate hundreds of files for simple features.
- Create mock functionality that looks production-ready without clearly labeling it.

---

# 76. Decision-Making Rule

When requirements are ambiguous:

1. Prefer the simplest architecture compatible with the PRD.
2. Preserve future extensibility.
3. Avoid premature abstraction.
4. Document important assumptions.
5. Ask for clarification when the ambiguity could materially change architecture or product behavior.

Do not invent major product requirements.

---

# 77. Git Workflow

Recommended:

```text
main
│
├── feature/auth
├── feature/player
├── feature/dj-studio
├── feature/audio-lab
└── feature/discovery
```

Each feature should be:

- Focused
- Tested
- Reviewable
- Independently understandable

Avoid giant commits containing unrelated work.

---

# 78. Quality Gates

Before merging a feature:

```text
✓ Requirements satisfied
✓ UI works
✓ API works where applicable
✓ Tests pass
✓ Typecheck passes
✓ Lint passes
✓ Build passes
✓ No critical errors
✓ Documentation updated
✓ No secrets committed
```

---

# 79. Metrics

Eventually track product metrics such as:

### Listening

- Daily active listeners
- Sessions
- Completion rate
- Skip rate
- Playlist creation

### DJ

- DJ sessions
- Session duration
- Tracks mixed
- Mixes saved
- Recording usage

### Creation

- Projects created
- Samples created
- Exports
- Remixes

### Discovery

- Search success
- Recommendation engagement
- Saves
- Likes

Metrics must be designed with privacy in mind.

---

# 80. Risks

## Risk: Scope Explosion

Mitigation:

Build phases independently.

## Risk: Audio Performance

Mitigation:

Benchmark early.

## Risk: Browser Limitations

Mitigation:

Keep browser-native audio architecture modular and validate capabilities before committing to advanced features.

## Risk: Copyright/Licensing

Mitigation:

Use authorized content models and explicit content permissions.

## Risk: Complex UI

Mitigation:

Progressive disclosure and reusable components.

## Risk: AI Complexity

Mitigation:

Start with deterministic algorithms and add AI where it provides measurable value.

## Risk: Large Codebase

Mitigation:

Clear domain boundaries and documentation.

---

# 81. Open Product Questions

These should be resolved before their relevant implementation phase:

1. Which authorized music source/catalog will power production streaming?
2. Which storage provider will be used?
3. Which audio analysis technology will be used?
4. Which recommendation architecture will be used?
5. Which AI provider/model will power the AI DJ?
6. Which export formats will be supported?
7. What creator licensing model will be used?
8. Will collaborative DJ sessions be peer-to-peer or server-authoritative?
9. What moderation system is required for public uploads?
10. What commercial licensing requirements apply to production deployment?

These questions must not block initial local development.

---

# 82. Recommended Initial Technology Stack

## Frontend

- React
- TypeScript
- Vite initially
- Tailwind CSS
- Web Audio API
- Canvas/WebGL where necessary
- Vitest
- Playwright later

## Backend

- FastAPI
- Python
- Pydantic
- PostgreSQL
- SQLAlchemy or equivalent
- Redis only when required

## Audio

- Web Audio API
- AudioWorklet where required
- FFmpeg for server-side processing
- Dedicated analysis workers

## Infrastructure

Development:

```text
Docker Compose
PostgreSQL
Backend
Frontend
```

Production can be selected after MVP based on measured requirements.

---

# 83. Why Vite Initially

The application is primarily an interactive client-side music application.

Vite provides:

- Fast development
- Simple architecture
- Excellent React/TypeScript support
- Fast HMR
- Straightforward deployment

If SEO-heavy public creator pages or server rendering becomes important, the architecture can be reassessed.

---

# 84. Why FastAPI

FastAPI provides:

- Strong typing through Pydantic
- Excellent Python ecosystem
- Convenient API development
- Easy background processing integration
- Strong fit for future audio-analysis/ML services

---

# 85. UX States Required

Every major feature must define:

```text
Default
Loading
Empty
Error
Success
Disabled
Processing
Completed
```

For audio:

```text
Loading
Buffering
Playing
Paused
Seeking
Processing
Exporting
Error
```

---

# 86. Product North Star

The project should continually return to one question:

> **Does this feature make the transition between listening and creating music better?**

If not, it should not automatically become a priority.

---

# 87. Final Product Definition

SONORA is:

> **A unified music platform that combines streaming, intelligent discovery, DJ mixing, audio editing, and music creation into one continuous workflow.**

The platform should make it possible to:

```text
DISCOVER
   ↓
LISTEN
   ↓
UNDERSTAND
   ↓
MIX
   ↓
EDIT
   ↓
CREATE
   ↓
SAVE
   ↓
SHARE
```

The long-term objective is not to create a collection of unrelated tools.

The objective is to create **one coherent music workspace**.

---

# 88. Immediate Next Action

The coding agent must begin with:

> **Milestone 1 — Product Foundation**

It must first inspect the repository and environment, then propose the minimal implementation plan, then implement the foundation.

It must not start implementing DJ Studio, AI recommendations, social features, or advanced audio processing before the foundation is stable.

**PRD.md is the product source of truth.**

Any major change to scope or architecture must be documented and justified before implementation.

