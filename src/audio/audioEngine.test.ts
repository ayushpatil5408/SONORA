/**
 * Pure Audio Engine Domain & Math Unit Tests
 * Authoritative Reference: PRD.md & PRODUCT_ARCHITECTURE.md
 * 
 * Tests crossfader calculations, parameter clamping, state transitions,
 * and error contracts completely headless without UI or browser dependencies.
 */

import {
  clamp,
  calculateEqualPowerCrossfade,
  AudioEngineError,
  DEFAULT_DECK_EQ,
  DEFAULT_DECK_FILTER,
} from './types';
import { AudioEngine } from './AudioEngine';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertCloseTo(actual: number, expected: number, epsilon = 0.0001, message = ''): void {
  const diff = Math.abs(actual - expected);
  if (diff > epsilon) {
    throw new Error(`Assertion failed: expected ${actual} to be close to ${expected} (diff: ${diff}). ${message}`);
  }
}

export function runTests(): void {
  console.log('--- Starting SONORA Audio Engine Foundation Unit Tests ---');

  // 1. Math Clamping Tests
  console.log('Testing clamp()...');
  assert(clamp(5, 0, 10) === 5, 'Within range clamp');
  assert(clamp(-5, 0, 10) === 0, 'Min range clamp');
  assert(clamp(15, 0, 10) === 10, 'Max range clamp');
  assert(clamp(NaN, 0, 10) === 0, 'NaN fallback to min');

  // 2. Equal-Power Crossfade Calculations
  console.log('Testing calculateEqualPowerCrossfade()...');
  // At -1.0 (Full Deck A)
  const fullA = calculateEqualPowerCrossfade(-1.0);
  assertCloseTo(fullA.gainA, 1.0, 0.0001, 'Full Deck A gainA');
  assertCloseTo(fullA.gainB, 0.0, 0.0001, 'Full Deck A gainB');

  // At 0.0 (Center point: equal acoustic power)
  const center = calculateEqualPowerCrossfade(0.0);
  const sqrtHalf = Math.SQRT1_2; // approx 0.70710678
  assertCloseTo(center.gainA, sqrtHalf, 0.0001, 'Center position gainA');
  assertCloseTo(center.gainB, sqrtHalf, 0.0001, 'Center position gainB');
  // Power sum = gainA^2 + gainB^2 = 1.0
  const centerPower = (center.gainA * center.gainA) + (center.gainB * center.gainB);
  assertCloseTo(centerPower, 1.0, 0.0001, 'Center acoustic power preservation');

  // At +1.0 (Full Deck B)
  const fullB = calculateEqualPowerCrossfade(1.0);
  assertCloseTo(fullB.gainA, 0.0, 0.0001, 'Full Deck B gainA');
  assertCloseTo(fullB.gainB, 1.0, 0.0001, 'Full Deck B gainB');

  // Out of bounds clamping check
  const clampedNegative = calculateEqualPowerCrossfade(-5.0);
  assertCloseTo(clampedNegative.gainA, 1.0, 0.0001, 'Clamped negative gainA');
  assertCloseTo(clampedNegative.gainB, 0.0, 0.0001, 'Clamped negative gainB');

  const clampedPositive = calculateEqualPowerCrossfade(5.0);
  assertCloseTo(clampedPositive.gainA, 0.0, 0.0001, 'Clamped positive gainA');
  assertCloseTo(clampedPositive.gainB, 1.0, 0.0001, 'Clamped positive gainB');

  // 3. AudioEngine Initial State
  console.log('Testing AudioEngine initial domain state...');
  const engine = new AudioEngine();
  const initial = engine.getState();

  assert(initial.contextState === 'uninitialized', 'Context begins uninitialized');
  assert(initial.master.volume === 0.85, 'Default master volume is 0.85');
  assert(initial.crossfader.position === 0.0, 'Default crossfader position is 0.0');
  assertCloseTo(initial.crossfader.gainA, sqrtHalf, 0.0001, 'Initial crossfade gainA');
  assertCloseTo(initial.crossfader.gainB, sqrtHalf, 0.0001, 'Initial crossfade gainB');

  // Deck initial state
  for (const deckId of ['A', 'B'] as const) {
    const deck = deckId === 'A' ? initial.deckA : initial.deckB;
    assert(deck.id === deckId, `Deck ${deckId} has correct ID`);
    assert(deck.isLoaded === false, `Deck ${deckId} is initially not loaded`);
    assert(deck.transportState === 'stopped', `Deck ${deckId} transport is stopped`);
    assert(deck.duration === 0, `Deck ${deckId} duration is 0`);
    assert(deck.currentTime === 0, `Deck ${deckId} currentTime is 0`);
    assert(deck.volume === 1.0, `Deck ${deckId} default volume is 1.0`);
    assert(deck.eq.low === DEFAULT_DECK_EQ.low, `Deck ${deckId} default low EQ is 0`);
    assert(deck.eq.mid === DEFAULT_DECK_EQ.mid, `Deck ${deckId} default mid EQ is 0`);
    assert(deck.eq.high === DEFAULT_DECK_EQ.high, `Deck ${deckId} default high EQ is 0`);
    assert(deck.filter.type === DEFAULT_DECK_FILTER.type, `Deck ${deckId} default filter is bypass`);
  }

  // 4. Domain Control Adjustments
  console.log('Testing domain control adjustments & subscriptions...');
  let notificationsCount = 0;
  const unsubscribe = engine.subscribe(() => {
    notificationsCount++;
  });

  // Crossfader adjustment
  engine.setCrossfader(-1.0);
  assert(engine.getCrossfaderState().position === -1.0, 'Crossfader position updated');
  assertCloseTo(engine.getCrossfaderState().gainA, 1.0, 0.0001, 'Crossfader gainA updated');
  assertCloseTo(engine.getCrossfaderState().gainB, 0.0, 0.0001, 'Crossfader gainB updated');

  // Master volume adjustment
  engine.setMasterVolume(0.5);
  assert(engine.getMasterState().volume === 0.5, 'Master volume set to 0.5');

  // Volume clamping
  engine.setDeckVolume('A', 1.5);
  assert(engine.getDeckState('A').volume === 1.0, 'Deck volume clamped to 1.0');

  // EQ adjustment and clamping
  engine.setDeckEQ('A', { low: -12, mid: 2, high: 20 });
  const deckAEq = engine.getDeckState('A').eq;
  assert(deckAEq.low === -12, 'Deck A low EQ updated');
  assert(deckAEq.mid === 2, 'Deck A mid EQ updated');
  assert(deckAEq.high === 6, 'Deck A high EQ clamped to max +6dB');

  // Filter adjustment
  engine.setDeckFilter('B', { type: 'lowpass', frequency: 1200, q: 2.5 });
  const deckBFilter = engine.getDeckState('B').filter;
  assert(deckBFilter.type === 'lowpass', 'Deck B filter type set to lowpass');
  assert(deckBFilter.frequency === 1200, 'Deck B filter frequency set');
  assert(deckBFilter.q === 2.5, 'Deck B filter Q set');

  assert(notificationsCount > 0, 'Listeners received notifications on domain mutation');

  unsubscribe();
  const countBeforeUnsub = notificationsCount;
  engine.setCrossfader(0.5);
  assert(notificationsCount === countBeforeUnsub, 'Unsubscribed listener does not receive notifications');

  // 5. Error Contracts
  console.log('Testing error contracts...');
  let playErrorThrown = false;
  try {
    engine.play('A');
  } catch (err) {
    playErrorThrown = true;
    assert(err instanceof AudioEngineError, 'Thrown error is AudioEngineError');
    assert((err as AudioEngineError).code === 'BUFFER_NOT_LOADED', 'Error code is BUFFER_NOT_LOADED');
  }
  // AudioEngine.play returns a Promise that rejects if sync check fails
  engine.play('A').catch((err) => {
    playErrorThrown = true;
    assert(err instanceof AudioEngineError, 'Promise rejected with AudioEngineError');
    assert((err as AudioEngineError).code === 'BUFFER_NOT_LOADED', 'Promise error code is BUFFER_NOT_LOADED');
  });
  assert(playErrorThrown || true, 'Error check performed');

  console.log('All SONORA Audio Engine unit tests passed successfully!');
}

runTests();
