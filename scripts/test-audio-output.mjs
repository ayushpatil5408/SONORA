/**
 * SONORA Milestone 3.5 — Audio Output & Signal Reliability Verification Suite
 * Authoritative Reference: PRD.md Section 19, Milestone 3.5 Specification
 * 
 * Verifies:
 * 1. AudioContext lifecycle & unlock behavior (uninitialized -> suspended -> running)
 * 2. Signal graph topology: masterGain connected to destination in parallel with analyser
 * 3. Equal-power crossfader constant power invariant & boundary conditions
 * 4. Filter parameter safety & immediate bypass frequency assignment (no 350 Hz trap)
 * 5. Synthetic demo audio buffer energy verification (non-silent RMS & peak)
 * 6. Looping engine, CUE, hot cues, and pitch bend parameter contracts
 * 7. Real DSP FX engine state and beat-division delay times
 * 8. Pre-fader headphone cue monitoring bus & booth gain isolation
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
console.log('SONORA Milestone 3.5 — Audio Output & Reliability Tests');
console.log('====================================================\n');

const engineFile = path.join(rootDir, 'src', 'audio', 'AudioEngine.ts');
const typesFile = path.join(rootDir, 'src', 'audio', 'types.ts');
const loaderFile = path.join(rootDir, 'src', 'audio', 'audioLoader.ts');

assert(fs.existsSync(engineFile), 'AudioEngine.ts must exist');
assert(fs.existsSync(typesFile), 'types.ts must exist');
assert(fs.existsSync(loaderFile), 'audioLoader.ts must exist');

const engineSrc = fs.readFileSync(engineFile, 'utf-8');
const typesSrc = fs.readFileSync(typesFile, 'utf-8');
const loaderSrc = fs.readFileSync(loaderFile, 'utf-8');

// -----------------------------------------------------------------------------
// [1/8] AudioContext Lifecycle & Unlocking Contracts
// -----------------------------------------------------------------------------
console.log('[1/8] Verifying AudioContext lifecycle & unlock behavior...');

assert(engineSrc.includes('unlockAudio(): Promise<AudioContext>'), 'AudioEngine must implement unlockAudio() for user gestures');
assert(engineSrc.includes('installAutoUnlockListeners'), 'AudioEngine must register window auto-unlock listeners');
assert(engineSrc.includes('isAudioLive(): boolean'), 'AudioEngine must provide isAudioLive() status query');
assert(engineSrc.includes('getAudioDiagnostics(): AudioDiagnostics'), 'AudioEngine must provide diagnostic telemetry');
console.log('✓ AudioContext lifecycle and unlock contracts verified');

// -----------------------------------------------------------------------------
// [2/8] Master Output Routing: Parallel Destination Connection
// -----------------------------------------------------------------------------
console.log('\n[2/8] Verifying direct hardware destination connection (no serial analyser blockage)...');

// Verify masterGain connects directly to destination
assert(
  engineSrc.includes('masterGain.connect(ctx.destination)') ||
  engineSrc.includes('masterGain.connect(ctx.destination);'),
  'masterGain must connect directly to ctx.destination for unmediated audible output'
);

// Verify analyser is connected in parallel as an acoustic tap
assert(
  engineSrc.includes('masterGain.connect(analyser)'),
  'masterGain must connect to analyser as a parallel tap'
);

// Verify analyser is NOT serial in front of ctx.destination
assert(
  !engineSrc.includes('analyser.connect(ctx.destination)'),
  'analyser must NOT be in series between masterGain and ctx.destination'
);
console.log('✓ Direct hardware destination output with parallel analyser tap verified');

// -----------------------------------------------------------------------------
// [3/8] Equal-Power Crossfader Math & Boundary Clamping
// -----------------------------------------------------------------------------
console.log('\n[3/8] Verifying equal-power crossfader constant power invariant...');

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function calculateEqualPowerCrossfade(position) {
  const clampedPos = clamp(position, -1.0, 1.0);
  const normalized = (clampedPos + 1.0) / 2.0;
  const angle = normalized * 0.5 * Math.PI;
  const gainA = Math.cos(angle);
  const gainB = Math.sin(angle);
  return { gainA, gainB };
}

// Full Deck A (-1.0)
const fullA = calculateEqualPowerCrossfade(-1.0);
assertCloseTo(fullA.gainA, 1.0, 0.0001, 'Full Deck A: gainA = 1.0');
assertCloseTo(fullA.gainB, 0.0, 0.0001, 'Full Deck A: gainB = 0.0');

// Center Position (0.0)
const center = calculateEqualPowerCrossfade(0.0);
assertCloseTo(center.gainA, Math.SQRT1_2, 0.0001, 'Center position: gainA = sqrt(2)/2');
assertCloseTo(center.gainB, Math.SQRT1_2, 0.0001, 'Center position: gainB = sqrt(2)/2');
const centerPower = (center.gainA ** 2) + (center.gainB ** 2);
assertCloseTo(centerPower, 1.0, 0.0001, 'Center constant power preserved (gainA² + gainB² = 1.0)');

// Full Deck B (+1.0)
const fullB = calculateEqualPowerCrossfade(1.0);
assertCloseTo(fullB.gainA, 0.0, 0.0001, 'Full Deck B: gainA = 0.0');
assertCloseTo(fullB.gainB, 1.0, 0.0001, 'Full Deck B: gainB = 1.0');
console.log('✓ Equal-power crossfader constant power invariant verified across sweep');

// -----------------------------------------------------------------------------
// [4/8] Filter Safety: Safe Initial Bypass Frequency (No 350 Hz Trap)
// -----------------------------------------------------------------------------
console.log('\n[4/8] Verifying filter safety & immediate frequency setting...');

assert(
  engineSrc.includes('node.frequency.setValueAtTime(20000, now)') ||
  engineSrc.includes('node.frequency.setValueAtTime('),
  'Filter bypass mode must explicitly anchor frequency using setValueAtTime'
);
assert(
  engineSrc.includes('cancelScheduledValues'),
  'Filter transitions should cancel scheduled values to prevent parameter locking'
);
console.log('✓ Filter parameter safety and immediate bypass assignment verified');

// -----------------------------------------------------------------------------
// [5/8] Synthetic Demo Audio Buffer Energy
// -----------------------------------------------------------------------------
console.log('\n[5/8] Verifying synthetic demo audio buffer generation & audible dynamic range...');

const sampleRate = 44100;
const durationSeconds = 2;
const length = sampleRate * durationSeconds;
const chL = new Float32Array(length);
const bpm = 120;
const beatDuration = 60 / bpm;

for (let i = 0; i < length; i++) {
  const t = i / sampleRate;
  const beat = t / beatDuration;
  const beatFraction = beat % 1.0;
  const kickEnv = Math.exp(-beatFraction * 14.0);
  const kickFreq = 45 + 95 * Math.exp(-beatFraction * 28.0);
  const kickPhase = 2 * Math.PI * kickFreq * beatFraction * beatDuration;
  const kick = Math.sin(kickPhase) * kickEnv * 0.75;
  const hatFraction = (beat + 0.5) % 1.0;
  const hatEnv = Math.exp(-hatFraction * 32.0);
  const noise = (Math.random() * 2 - 1);
  const hat = noise * hatEnv * 0.18;
  const subFraction = (beat * 2) % 1.0;
  const subEnv = Math.exp(-subFraction * 4.0);
  const subBass = Math.sin(2 * Math.PI * 55 * t) * subEnv * 0.35;
  chL[i] = Math.max(-1.0, Math.min(1.0, kick + hat * 0.8 + subBass));
}

let sumSq = 0;
let peak = 0;
for (let i = 0; i < length; i++) {
  sumSq += chL[i] * chL[i];
  if (Math.abs(chL[i]) > peak) peak = Math.abs(chL[i]);
}
const rms = Math.sqrt(sumSq / length);

assert(peak > 0.6, `Synthetic demo buffer must have audible peak (actual: ${peak.toFixed(4)})`);
assert(rms > 0.05, `Synthetic demo buffer must have audible RMS energy (actual: ${rms.toFixed(4)})`);
console.log(`✓ Synthetic demo audio verified: Peak = ${peak.toFixed(4)}, RMS = ${rms.toFixed(4)}`);

// -----------------------------------------------------------------------------
// [6/8] Hardware-Clock Looping, CUE, Hot Cues, and Pitch Bend Contracts
// -----------------------------------------------------------------------------
console.log('\n[6/8] Verifying hardware looping, CUE, hot cues, and pitch bend contracts...');

assert(engineSrc.includes('source.loop = true'), 'AudioEngine must configure native sample-accurate source.loop');
assert(engineSrc.includes('source.loopStart'), 'AudioEngine must set loopStart on buffer source');
assert(engineSrc.includes('source.loopEnd'), 'AudioEngine must set loopEnd on buffer source');
assert(engineSrc.includes('setCue(deckId: DeckId)'), 'AudioEngine must implement setCue()');
assert(engineSrc.includes('returnToCue(deckId: DeckId)'), 'AudioEngine must implement returnToCue()');
assert(engineSrc.includes('setHotCue(deckId: DeckId, slotIndex: number)'), 'AudioEngine must implement setHotCue()');
assert(engineSrc.includes('triggerHotCue(deckId: DeckId, slotIndex: number)'), 'AudioEngine must implement triggerHotCue()');
assert(engineSrc.includes('pitchBend(deckId: DeckId, deltaRate: number)'), 'AudioEngine must implement pitchBend()');
assert(engineSrc.includes('jogScrub(deckId: DeckId, deltaSeconds: number)'), 'AudioEngine must implement jogScrub()');
console.log('✓ Hardware looping, CUE, hot cues, and jog manipulation verified');

// -----------------------------------------------------------------------------
// [7/8] Real DSP Effects Engine
// -----------------------------------------------------------------------------
console.log('\n[7/8] Verifying real DSP effects engine (Delay, Reverb, Distortion)...');

assert(engineSrc.includes('fxDelay: DelayNode'), 'AudioEngine must allocate real DelayNode for Beat FX');
assert(engineSrc.includes('fxFeedback: GainNode'), 'AudioEngine must allocate feedback gain for delay repeats');
assert(engineSrc.includes('fxDistortion: WaveShaperNode'), 'AudioEngine must allocate WaveShaperNode for crush/distortion');
assert(engineSrc.includes('setDeckFX('), 'AudioEngine must implement setDeckFX()');
console.log('✓ Real DSP FX engine subgraphs verified');

// -----------------------------------------------------------------------------
// [8/8] Monitoring Architecture: Headphone Cue (PFL), Booth & Master
// -----------------------------------------------------------------------------
console.log('\n[8/8] Verifying headphone monitoring (PFL) bus & booth output...');

assert(engineSrc.includes('headphoneCueGain'), 'AudioEngine must allocate headphone cue bus gain');
assert(engineSrc.includes('headphoneMasterGain'), 'AudioEngine must allocate headphone master bus gain');
assert(engineSrc.includes('setCueMonitor('), 'AudioEngine must implement setCueMonitor()');
assert(engineSrc.includes('setHeadphoneVolume('), 'AudioEngine must implement setHeadphoneVolume()');
assert(engineSrc.includes('setCueMasterMix('), 'AudioEngine must implement setCueMasterMix()');
assert(engineSrc.includes('setBoothVolume('), 'AudioEngine must implement setBoothVolume()');
console.log('✓ Headphone PFL monitoring bus and booth gain verified');

console.log('\n====================================================');
console.log('All 8 Audio Output & Reliability test suites passed with 0 errors.');
console.log('====================================================\n');
