/**
 * SONORA Phase 0.3 Verification Script
 * Validates pure waveform peak extraction, downmixing, target resolution,
 * amplitude boundaries, and window mapping.
 */

// Implementation under test (matching src/audio/waveformAnalysis.ts)
function calculateWaveformPeaks(samples, targetPointCount, duration, sampleRate) {
  if (!samples) {
    throw new Error('No PCM sample data provided for waveform extraction');
  }

  const sampleCount = samples.length;
  if (sampleCount === 0) {
    return {
      duration: Math.max(0, duration),
      sampleRate: Math.max(0, sampleRate),
      length: 0,
      minPeaks: new Float32Array(0),
      maxPeaks: new Float32Array(0),
      rmsPeaks: new Float32Array(0),
    };
  }

  const resolvedPointCount = Math.max(1, Math.min(Math.floor(targetPointCount), sampleCount));

  const minPeaks = new Float32Array(resolvedPointCount);
  const maxPeaks = new Float32Array(resolvedPointCount);
  const rmsPeaks = new Float32Array(resolvedPointCount);

  const windowSize = sampleCount / resolvedPointCount;

  for (let i = 0; i < resolvedPointCount; i++) {
    const startIdx = Math.floor(i * windowSize);
    const endIdx = i === resolvedPointCount - 1
      ? sampleCount
      : Math.min(Math.floor((i + 1) * windowSize), sampleCount);

    let min = 0.0;
    let max = 0.0;
    let sumSquares = 0.0;
    const windowLength = Math.max(1, endIdx - startIdx);

    for (let j = startIdx; j < endIdx; j++) {
      const val = samples[j];
      if (val < min) min = val;
      if (val > max) max = val;
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / windowLength);

    minPeaks[i] = Math.max(-1.0, Math.min(0.0, min));
    maxPeaks[i] = Math.max(0.0, Math.min(1.0, max));
    rmsPeaks[i] = Math.max(0.0, Math.min(1.0, rms));
  }

  return {
    duration: Math.max(0, duration),
    sampleRate: Math.max(0, sampleRate),
    length: resolvedPointCount,
    minPeaks,
    maxPeaks,
    rmsPeaks,
  };
}

function downmixChannelsToMono(channels) {
  const numChannels = channels.length;
  const length = channels[0].length;

  if (numChannels === 1) {
    const mono = new Float32Array(length);
    mono.set(channels[0]);
    return mono;
  }

  const mono = new Float32Array(length);
  const weight = 1.0 / numChannels;

  for (let c = 0; c < numChannels; c++) {
    const channelData = channels[c];
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] * weight;
    }
  }

  return mono;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function assertCloseTo(actual, expected, eps = 0.0001, msg = '') {
  const diff = Math.abs(actual - expected);
  if (diff > eps) {
    console.error(`FAIL: ${msg} (actual: ${actual}, expected: ${expected}, diff: ${diff})`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('SONORA Phase 0.3 — Waveform Analysis Foundation Tests');
console.log('====================================================');

// Test 1: Empty input
console.log('\n[1/7] Testing empty input handling...');
const emptyResult = calculateWaveformPeaks(new Float32Array(0), 100, 0, 44100);
assert(emptyResult.length === 0, 'Empty input returns length 0');
assert(emptyResult.minPeaks.length === 0, 'Empty minPeaks');
assert(emptyResult.maxPeaks.length === 0, 'Empty maxPeaks');
assert(emptyResult.rmsPeaks.length === 0, 'Empty rmsPeaks');
console.log('✓ Empty input handled cleanly');

// Test 2: Small sample input
console.log('\n[2/7] Testing small sample input...');
const smallSamples = new Float32Array([0.1, -0.4, 0.7]);
const smallResult = calculateWaveformPeaks(smallSamples, 50, 0.001, 44100);
assert(smallResult.length === 3, 'Resolution clamped to sample count when samples < requested points');
assertCloseTo(smallResult.maxPeaks[0], 0.1, 0.0001, 'Sample 0 peak');
assertCloseTo(smallResult.minPeaks[1], -0.4, 0.0001, 'Sample 1 peak');
assertCloseTo(smallResult.maxPeaks[2], 0.7, 0.0001, 'Sample 2 peak');
console.log('✓ Small sample input clamped to available samples');

// Test 3: Known amplitude input (DC offset & square wave)
console.log('\n[3/7] Testing known amplitude input...');
const dcSamples = new Float32Array(1000).fill(0.65);
const dcResult = calculateWaveformPeaks(dcSamples, 10, 1.0, 1000);
assert(dcResult.length === 10, 'DC length 10');
for (let i = 0; i < 10; i++) {
  assertCloseTo(dcResult.maxPeaks[i], 0.65, 0.0001, `DC maxPeak[${i}]`);
  assertCloseTo(dcResult.minPeaks[i], 0.0, 0.0001, `DC minPeak[${i}]`);
  assertCloseTo(dcResult.rmsPeaks[i], 0.65, 0.0001, `DC rmsPeak[${i}]`);
}

// Alternating square wave [-0.8, +0.8]
const sqSamples = new Float32Array(1000);
for (let i = 0; i < 1000; i++) {
  sqSamples[i] = i % 2 === 0 ? 0.8 : -0.8;
}
const sqResult = calculateWaveformPeaks(sqSamples, 10, 1.0, 1000);
for (let i = 0; i < 10; i++) {
  assertCloseTo(sqResult.maxPeaks[i], 0.8, 0.0001, `Square maxPeak[${i}]`);
  assertCloseTo(sqResult.minPeaks[i], -0.8, 0.0001, `Square minPeak[${i}]`);
  assertCloseTo(sqResult.rmsPeaks[i], 0.8, 0.0001, `Square rmsPeak[${i}]`);
}
console.log('✓ Known amplitude inputs (DC & square wave) accurately measured');

// Test 4: Mono downmixing
console.log('\n[4/7] Testing multi-channel mono downmixing...');
const leftChannel = new Float32Array([1.0, -0.6, 0.4]);
const rightChannel = new Float32Array([0.0, -0.2, 0.6]);
const mono = downmixChannelsToMono([leftChannel, rightChannel]);
assert(mono.length === 3, 'Mono length matches input length');
assertCloseTo(mono[0], 0.5, 0.0001, 'Mono downmix (1.0 + 0.0) / 2');
assertCloseTo(mono[1], -0.4, 0.0001, 'Mono downmix (-0.6 + -0.2) / 2');
assertCloseTo(mono[2], 0.5, 0.0001, 'Mono downmix (0.4 + 0.6) / 2');
console.log('✓ Stereo channels downmixed to mono with equal weighting');

// Test 5: Target resolution
console.log('\n[5/7] Testing target resolution scaling...');
const largeBuffer = new Float32Array(48000); // 1 sec at 48kHz
for (let i = 0; i < 48000; i++) {
  largeBuffer[i] = Math.sin((i / 48000) * Math.PI * 2 * 440) * 0.5; // 440Hz sine
}
const resOverview = calculateWaveformPeaks(largeBuffer, 400, 1.0, 48000);
assert(resOverview.length === 400, 'Overview resolution 400 points');
assert(resOverview.minPeaks.length === 400, 'minPeaks length 400');
assert(resOverview.maxPeaks.length === 400, 'maxPeaks length 400');

const resDetail = calculateWaveformPeaks(largeBuffer, 1200, 1.0, 48000);
assert(resDetail.length === 1200, 'Detailed resolution 1200 points');
console.log('✓ Target resolution flexibility (400 and 1200 points) verified');

// Test 6: Amplitude boundary clamping
console.log('\n[6/7] Testing amplitude boundary clamping...');
const clippedSamples = new Float32Array([3.5, -4.2, 0.2]);
const clippedResult = calculateWaveformPeaks(clippedSamples, 3, 0.001, 44100);
assert(clippedResult.maxPeaks[0] === 1.0, 'Positive overflow clamped to +1.0');
assert(clippedResult.minPeaks[1] === -1.0, 'Negative overflow clamped to -1.0');
console.log('✓ Amplitude boundary clamping [-1.0, 1.0] enforced');

// Test 7: Boundary windows coverage
console.log('\n[7/7] Testing boundary window sample coverage...');
const boundaryBuffer = new Float32Array(10000);
// Place sharp impulses at the exact first and last indices
boundaryBuffer[0] = 0.95;
boundaryBuffer[9999] = -0.92;
const boundaryResult = calculateWaveformPeaks(boundaryBuffer, 100, 1.0, 10000);
assertCloseTo(boundaryResult.maxPeaks[0], 0.95, 0.0001, 'First window captured leading impulse');
assertCloseTo(boundaryResult.minPeaks[99], -0.92, 0.0001, 'Last window captured trailing impulse');
console.log('✓ First and last boundary windows completely covered');

console.log('\n====================================================');
console.log('All 7 waveform test suites passed with 0 errors.');
console.log('====================================================\n');
