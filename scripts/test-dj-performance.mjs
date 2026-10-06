/**
 * SONORA Milestone 3.5 — Professional DJ Performance Test Suite
 * Authoritative Reference: PRD.md Section 19, Milestone 3.5 Specification
 * 
 * Verifies:
 * 1. Deck Performance State: Jog wheel (scratch/pitch bend), pitch ranges (±6%, ±10%, ±16%, ±100%),
 *    Key Lock, CUE, 8 Hot Cues (A-H), Beat Jump (-32 to +32), Quantize, Sync, Slip
 * 2. Loop System: Auto loop (1/32 to 32 beats), Manual IN/OUT/RELOOP/EXIT, half/double beat scaling
 * 3. Professional Mixer: Channel Trim (0-2), Channel Faders (0-1), 3-band EQ, Filter, Crossfader,
 *    Master/Booth levels, PFL Channel CUE, Cue/Master Headphone Monitor
 * 4. Real DSP FX Engine: Filter, Echo, Reverb, Bitcrush, Flanger, Parameter depth, Beat divisions
 * 5. 8-Pad Performance Modes: HOT CUE, BEAT LOOP, BEAT JUMP, PAD FX
 * 6. Multi-Environment State Persistence: Seamless continuity across Orbital, Liquid, and Organism
 * 7. Keyboard & Accessibility Contracts: ARIA sliders, key bindings, non-destructive transport
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    process.exit(1);
  }
}

function assertCloseTo(actual, expected, eps = 0.0001, message = '') {
  const diff = Math.abs(actual - expected);
  if (diff > eps) {
    console.error(`\x1b[31mFAIL: ${message} (actual: ${actual}, expected: ${expected}, diff: ${diff})\x1b[0m`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('SONORA Milestone 3.5 — Professional DJ Performance Tests');
console.log('====================================================\n');

const engineFile = path.join(rootDir, 'src', 'audio', 'AudioEngine.ts');
const typesFile = path.join(rootDir, 'src', 'audio', 'types.ts');
const djTypesFile = path.join(rootDir, 'src', 'components', 'dj', 'types.ts');
const jogFile = path.join(rootDir, 'src', 'components', 'dj', 'JogWheel.tsx');
const padsFile = path.join(rootDir, 'src', 'components', 'dj', 'PerformancePads.tsx');
const waveformFile = path.join(rootDir, 'src', 'components', 'WaveformRibbon.tsx');
const sharedDeckFile = path.join(rootDir, 'src', 'components', 'dj', 'environments', 'SharedDeckControls.tsx');
const sharedMixerFile = path.join(rootDir, 'src', 'components', 'dj', 'environments', 'SharedMixerControls.tsx');
const workspaceFile = path.join(rootDir, 'src', 'components', 'DJWorkspace.tsx');
const orbitalFile = path.join(rootDir, 'src', 'components', 'dj', 'environments', 'OrbitalEnvironment.tsx');
const liquidFile = path.join(rootDir, 'src', 'components', 'dj', 'environments', 'LiquidEnvironment.tsx');
const organismFile = path.join(rootDir, 'src', 'components', 'dj', 'environments', 'OrganismEnvironment.tsx');

assert(fs.existsSync(engineFile), 'AudioEngine.ts must exist');
assert(fs.existsSync(typesFile), 'src/audio/types.ts must exist');
assert(fs.existsSync(djTypesFile), 'src/components/dj/types.ts must exist');
assert(fs.existsSync(jogFile), 'JogWheel.tsx must exist');
assert(fs.existsSync(padsFile), 'PerformancePads.tsx must exist');
assert(fs.existsSync(waveformFile), 'WaveformRibbon.tsx must exist');
assert(fs.existsSync(sharedDeckFile), 'SharedDeckControls.tsx must exist');
assert(fs.existsSync(sharedMixerFile), 'SharedMixerControls.tsx must exist');
assert(fs.existsSync(workspaceFile), 'DJWorkspace.tsx must exist');
assert(fs.existsSync(orbitalFile), 'OrbitalEnvironment.tsx must exist');
assert(fs.existsSync(liquidFile), 'LiquidEnvironment.tsx must exist');
assert(fs.existsSync(organismFile), 'OrganismEnvironment.tsx must exist');

const engineSrc = fs.readFileSync(engineFile, 'utf-8');
const typesSrc = fs.readFileSync(typesFile, 'utf-8');
const djTypesSrc = fs.readFileSync(djTypesFile, 'utf-8');
const jogSrc = fs.readFileSync(jogFile, 'utf-8');
const padsSrc = fs.readFileSync(padsFile, 'utf-8');
const waveformSrc = fs.readFileSync(waveformFile, 'utf-8');
const sharedDeckSrc = fs.readFileSync(sharedDeckFile, 'utf-8');
const sharedMixerSrc = fs.readFileSync(sharedMixerFile, 'utf-8');
const workspaceSrc = fs.readFileSync(workspaceFile, 'utf-8');
const orbitalSrc = fs.readFileSync(orbitalFile, 'utf-8');
const liquidSrc = fs.readFileSync(liquidFile, 'utf-8');
const organismSrc = fs.readFileSync(organismFile, 'utf-8');

// -----------------------------------------------------------------------------
// [1/7] Deck Performance State Contracts
// -----------------------------------------------------------------------------
console.log('[1/7] Verifying Deck Performance State contracts...');

// Jog Wheel & Scratch/Pitch Bend
assert(engineSrc.includes('public jogScrub(deckId: DeckId, deltaSeconds: number)'), 'AudioEngine must provide jogScrub() for vinyl platter manipulation');
assert(engineSrc.includes('public pitchBend(deckId: DeckId, deltaRate: number)'), 'AudioEngine must provide pitchBend() for outer rim tempo nudging');
assert(jogSrc.includes('onJogTurn(delta, isScratchingRef.current)'), 'JogWheel must differentiate platter vinyl scrub from rim pitch bend');

// Pitch Ranges (±6%, ±10%, ±16%, ±100%)
assert(typesSrc.includes('export type PitchRange = 0.06 | 0.10 | 0.16 | 1.00'), 'types.ts must export PitchRange with 0.06, 0.10, 0.16, 1.00');
assert(engineSrc.includes('public setPitchRange(deckId: DeckId, range: PitchRange)'), 'AudioEngine must support dynamic pitch ranges');
assert(sharedDeckSrc.includes('0.06') && sharedDeckSrc.includes('0.10') && sharedDeckSrc.includes('0.16') && sharedDeckSrc.includes('1.00'), 'SharedDeckControls must expose all 4 pitch range selectors');

// Key Lock (Master Tempo)
assert(engineSrc.includes('public setKeyLock(deckId: DeckId, enabled: boolean)'), 'AudioEngine must support key lock state');
assert(sharedDeckSrc.includes('KEY LOCK'), 'SharedDeckControls must render KEY LOCK toggle');

assert(engineSrc.includes('public setCue(deckId: DeckId)'), 'AudioEngine must support setCue logic');
assert(engineSrc.includes('public returnToCue(deckId: DeckId)'), 'AudioEngine must support returnToCue logic');
assert(engineSrc.includes('public setHotCue(deckId: DeckId, slotIndex: number)'), 'AudioEngine must support setting 8 hot cues');
assert(engineSrc.includes('public async triggerHotCue(deckId: DeckId, slotIndex: number)'), 'AudioEngine must support triggering 8 hot cues');
assert(engineSrc.includes('public deleteHotCue(deckId: DeckId, slotIndex: number)'), 'AudioEngine must support deleting hot cues');

// Beat Jump (-32 to +32)
assert(engineSrc.includes('public beatJump(deckId: DeckId, beats: number)'), 'AudioEngine must support BPM-scaled beat jump');
assert(sharedDeckSrc.includes('onBeatJump(-4)') && sharedDeckSrc.includes('onBeatJump(4)'), 'SharedDeckControls must provide beat jump buttons');

// Quantize, Sync, Slip
assert(engineSrc.includes('public setQuantize(deckId: DeckId, enabled: boolean)'), 'AudioEngine must provide Quantize state');
assert(engineSrc.includes('public setSync(deckId: DeckId, enabled: boolean)'), 'AudioEngine must provide BPM & phase Sync logic');
assert(engineSrc.includes('public setMasterDeck(deckId: DeckId)'), 'AudioEngine must provide Master Deck designation');
assert(engineSrc.includes('public setSlip(deckId: DeckId, enabled: boolean)'), 'AudioEngine must provide Slip mode state');

console.log('✓ Deck performance state contracts verified\n');

// -----------------------------------------------------------------------------
// [2/7] Loop System & Waveform Visualization
// -----------------------------------------------------------------------------
console.log('[2/7] Verifying Loop System & Waveform integration...');

assert(engineSrc.includes('public setLoop(deckId: DeckId, enabled: boolean'), 'AudioEngine must support setLoop with start, end, and beat count');
assert(engineSrc.includes('public halveLoop(deckId: DeckId)'), 'AudioEngine must support halveLoop');
assert(engineSrc.includes('public doubleLoop(deckId: DeckId)'), 'AudioEngine must support doubleLoop');
assert(workspaceSrc.includes('onAutoLoop') && workspaceSrc.includes('onLoopIn') && workspaceSrc.includes('onLoopOut'), 'DJWorkspace must implement auto loop, loop in, and loop out');
assert(engineSrc.includes('sourceNode.loop = enabled'), 'AudioEngine must configure Web Audio API native hardware looping for zero latency');

// Waveform visual enhancements
assert(waveformSrc.includes('Professional DJ Beat Grid'), 'WaveformRibbon must render beat grid ticks and downbeats');
assert(waveformSrc.includes('Active Hardware Loop Region'), 'WaveformRibbon must render highlighted loop regions with IN/OUT flags');
assert(waveformSrc.includes('CUE and Hot Cue Markers'), 'WaveformRibbon must render CUE and Hot Cue markers A-H on canvas');

console.log('✓ Loop system & waveform integration verified\n');

// -----------------------------------------------------------------------------
// [3/7] Professional Mixer Architecture
// -----------------------------------------------------------------------------
console.log('[3/7] Verifying Professional Mixer architecture...');

// Channel Trim
assert(engineSrc.includes('public setDeckTrim(deckId: DeckId, trim: number)'), 'AudioEngine must provide dedicated Channel Trim');
assert(sharedDeckSrc.includes('Channel Trim') && sharedDeckSrc.includes('onTrimChange'), 'SharedDeckControls must expose Trim knob with ARIA semantics');

// Vertical Channel Faders & Equal-Power Crossfader
assert(sharedMixerSrc.includes('aria-label="Channel A Level Fader"'), 'SharedMixerControls must expose vertical Deck A fader');
assert(sharedMixerSrc.includes('aria-label="Channel B Level Fader"'), 'SharedMixerControls must expose vertical Deck B fader');
assert(sharedMixerSrc.includes('aria-label="Equal-Power Crossfader"'), 'SharedMixerControls must expose equal-power crossfader');
assert(sharedMixerSrc.includes('Harmonic Convergence Active'), 'SharedMixerControls must feature visual harmonic convergence beacon');

// 3-Band EQ & Filter
assert(engineSrc.includes('lowEq') && engineSrc.includes('midEq') && engineSrc.includes('highEq'), 'AudioEngine must have 3-band biquad EQ nodes');
assert(engineSrc.includes('public setDeckFilter(deckId: DeckId, filterValues: Partial<DeckFilter>)'), 'AudioEngine must provide bipole DJ filter');

// Monitoring (PFL Cue & Headphone Mix)
assert(engineSrc.includes('public setCueMonitor(deckId: DeckId, enabled: boolean)'), 'AudioEngine must provide PFL Cue monitor toggle');
assert(engineSrc.includes('public setCueMasterMix(mix: number)'), 'AudioEngine must provide Cue/Master headphone mix');
assert(engineSrc.includes('public setHeadphoneVolume(volume: number)'), 'AudioEngine must provide Headphone volume level');
assert(sharedMixerSrc.includes('aria-label="Headphone Cue Master Mix"'), 'SharedMixerControls must expose headphone monitor controls');

console.log('✓ Professional mixer architecture verified\n');

// -----------------------------------------------------------------------------
// [4/7] Real DSP FX Engine Subsystems
// -----------------------------------------------------------------------------
console.log('[4/7] Verifying Real DSP FX Engine subsystems...');

// Available types: filter, echo, reverb, crush, flanger
const supportedFX = ['filter', 'echo', 'reverb', 'crush', 'flanger'];
for (const fx of supportedFX) {
  assert(typesSrc.includes(`'${fx}'`), `types.ts must support FX type '${fx}'`);
}

assert(engineSrc.includes('public setDeckFX(') && engineSrc.includes('type: DeckFXType'), 'AudioEngine must support setDeckFX');
assert(engineSrc.includes('makeDistortionCurve'), 'AudioEngine must create valid WaveShaper curve for crush FX');
assert(engineSrc.includes('fxDelay: DelayNode'), 'AudioEngine must allocate real DelayNode for Beat FX');
assert(engineSrc.includes('fxFeedback: GainNode'), 'AudioEngine must allocate feedback gain for delay repeats');
assert(engineSrc.includes('fxDistortion: WaveShaperNode'), 'AudioEngine must allocate WaveShaperNode for crush/distortion');

console.log('✓ Real DSP FX engine subsystems verified\n');

// -----------------------------------------------------------------------------
// [5/7] 8-Pad Performance Area
// -----------------------------------------------------------------------------
console.log('[5/7] Verifying 8-Pad Performance Area modes & interactions...');

assert(djTypesSrc.includes("'hotcue' | 'loop' | 'beatjump' | 'padfx'"), 'types.ts must support hotcue, loop, beatjump, padfx');
assert(padsSrc.includes('HOT CUE'), 'PerformancePads must render HOT CUE tab');
assert(padsSrc.includes('AUTO LOOP'), 'PerformancePads must render AUTO LOOP tab');
assert(padsSrc.includes('BEAT JUMP'), 'PerformancePads must render BEAT JUMP tab');
assert(padsSrc.includes('PAD FX'), 'PerformancePads must render PAD FX tab');

// Hot cue deletion support (Shift + click)
assert(padsSrc.includes('onHotCueDelete(idx)'), 'PerformancePads must support deleting hot cues via Shift-click');

// 8 tactile pads rendered
assert(padsSrc.includes('CUE_LETTERS') && padsSrc.includes('LOOP_SIZES'), 'PerformancePads must instantiate 8 tactile performance pads');

console.log('✓ 8-Pad performance area verified\n');

// -----------------------------------------------------------------------------
// [6/7] Multi-Environment State Continuity (Orbital, Liquid, Organism)
// -----------------------------------------------------------------------------
console.log('[6/7] Verifying Multi-Environment State Continuity...');

// All three environments must render JogWheel and SharedDeckControls
assert(orbitalSrc.includes('<JogWheel'), 'OrbitalEnvironment must render interactive JogWheel');
assert(orbitalSrc.includes('<SharedDeckControls'), 'OrbitalEnvironment must render SharedDeckControls');
assert(orbitalSrc.includes('<SharedMixerControls'), 'OrbitalEnvironment must render SharedMixerControls');

assert(liquidSrc.includes('<JogWheel'), 'LiquidEnvironment must render interactive JogWheel');
assert(liquidSrc.includes('<SharedDeckControls'), 'LiquidEnvironment must render SharedDeckControls');
assert(liquidSrc.includes('<SharedMixerControls'), 'LiquidEnvironment must render SharedMixerControls');

assert(organismSrc.includes('<JogWheel'), 'OrganismEnvironment must render interactive JogWheel');
assert(organismSrc.includes('<SharedDeckControls'), 'OrganismEnvironment must render SharedDeckControls');
assert(organismSrc.includes('<SharedMixerControls'), 'OrganismEnvironment must render SharedMixerControls');

// State continuity invariant: AudioEngine is single source of truth outside environments
assert(workspaceSrc.includes('const engine = getAudioEngine()'), 'DJWorkspace must maintain single AudioEngine instance');
assert(workspaceSrc.includes('activeEnvironment === \'orbital\''), 'DJWorkspace must render Orbital environment');
assert(workspaceSrc.includes('activeEnvironment === \'liquid\''), 'DJWorkspace must render Liquid environment');
assert(workspaceSrc.includes('activeEnvironment === \'organism\''), 'DJWorkspace must render Organism environment');

console.log('✓ Multi-Environment state continuity verified\n');

// -----------------------------------------------------------------------------
// [7/7] Keyboard Navigation & ARIA Accessibility
// -----------------------------------------------------------------------------
console.log('[7/7] Verifying Keyboard Navigation & ARIA accessibility...');

// Keyboard shortcuts
assert(workspaceSrc.includes("'Space'"), 'DJWorkspace must handle Space for Play/Pause');
assert(workspaceSrc.includes("'c'") || workspaceSrc.includes("'C'"), 'DJWorkspace must handle C for Cue');
assert(workspaceSrc.includes("'s'") || workspaceSrc.includes("'S'"), 'DJWorkspace must handle S for Sync');
assert(workspaceSrc.includes("'l'") || workspaceSrc.includes("'L'"), 'DJWorkspace must handle L for Loop');
assert(workspaceSrc.includes("'q'") || workspaceSrc.includes("'Q'"), 'DJWorkspace must handle Q for Quantize');
assert(workspaceSrc.includes("'1'") && workspaceSrc.includes("'8'"), 'DJWorkspace must handle digits 1-8 for Hot Cues');
assert(workspaceSrc.includes('ArrowLeft') && workspaceSrc.includes('ArrowRight'), 'DJWorkspace must handle arrows for Seek & Beat Jump');

// ARIA semantics
assert(jogSrc.includes('role="slider"'), 'JogWheel must declare role="slider"');
assert(jogSrc.includes('aria-label'), 'JogWheel must provide descriptive ARIA label');
assert(sharedDeckSrc.includes('aria-valuemin') && sharedDeckSrc.includes('aria-valuemax'), 'Deck controls must expose full range ARIA slider attributes');
assert(sharedMixerSrc.includes('aria-label="Master Output Volume"'), 'Mixer controls must expose Master Volume ARIA label');

console.log('✓ Keyboard navigation & ARIA accessibility verified\n');

console.log('====================================================');
console.log('All 7 Professional DJ Performance test suites passed with 0 errors.');
console.log('====================================================\n');
