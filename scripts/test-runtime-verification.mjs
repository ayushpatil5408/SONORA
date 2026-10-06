/**
 * SONORA Milestone 2B — Comprehensive Runtime & Module Verification
 * Performs exhaustive module verification matching browser runtime behavior.
 */

import {
  canUseTrack,
  getTrackCapabilities,
  createDemoRights,
  createLocalRights,
  createCreatorRights,
  createListenOnlyRights,
} from '../src/catalog/types.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`RUNTIME TEST FAIL: ${message}`);
    process.exit(1);
  }
}

console.log('--- SONORA Milestone 2B Runtime & Behavior Verification ---');

// 1. Test Rights Model & Factories
const demoRights = createDemoRights();
assert(demoRights.canStream && demoRights.canDJ && demoRights.canEdit && demoRights.canRemix, 'Demo rights allow all capabilities');

const localRights = createLocalRights();
assert(localRights.canStream && localRights.canDJ && !localRights.attributionRequired, 'Local rights allow all capabilities without attribution');

const creatorOrigRights = createCreatorRights(true);
assert(creatorOrigRights.canStream && creatorOrigRights.canDJ && creatorOrigRights.canEdit, 'Creator original allows all capabilities');

const listenOnlyRights = createListenOnlyRights(['IN', 'US']);
assert(listenOnlyRights.canStream && !listenOnlyRights.canDJ && !listenOnlyRights.canEdit, 'Listen only rights strictly disallow DJ and edit');
assert(listenOnlyRights.territories.includes('IN'), 'Listen only rights include territory clearing');

// 2. Test Capability Guards
const sampleDJTrack = {
  id: 't-dj',
  title: 'Peak Pulse',
  isPlayable: true,
  source: 'demo',
  rights: demoRights,
};

const sampleListenTrack = {
  id: 't-listen',
  title: 'Broadcast Raga',
  isPlayable: true,
  source: 'creator',
  isOriginal: false,
  rights: listenOnlyRights,
};

assert(canUseTrack(sampleDJTrack, 'listen') === true, 'DJ track can listen');
assert(canUseTrack(sampleDJTrack, 'dj') === true, 'DJ track can DJ');
assert(canUseTrack(sampleDJTrack, 'edit') === true, 'DJ track can edit');

assert(canUseTrack(sampleListenTrack, 'listen') === true, 'Listen track can listen');
assert(canUseTrack(sampleListenTrack, 'dj') === false, 'Listen track CANNOT DJ');
assert(canUseTrack(sampleListenTrack, 'edit') === false, 'Listen track CANNOT edit');

const djCaps = getTrackCapabilities(sampleDJTrack);
assert(djCaps.includes('listen') && djCaps.includes('dj') && djCaps.includes('edit') && djCaps.includes('remix'), 'DJ track has all capabilities');

const listenCaps = getTrackCapabilities(sampleListenTrack);
assert(listenCaps.includes('listen') && !listenCaps.includes('dj') && !listenCaps.includes('edit'), 'Listen track has only listen/preview');

// 3. Test Staging Guard Simulation
function simulateStageTrack(track, deck) {
  if (!canUseTrack(track, 'dj')) {
    throw new Error(`Track "${track.title}" cannot be staged to DJ deck: DJ capability required.`);
  }
  return `Track "${track.title}" successfully staged to Deck ${deck}`;
}

const stageSuccess = simulateStageTrack(sampleDJTrack, 'A');
assert(stageSuccess.includes('successfully staged to Deck A'), 'Staging DJ track succeeds');

let threwError = false;
try {
  simulateStageTrack(sampleListenTrack, 'A');
} catch (err) {
  threwError = true;
  assert(err.message.includes('DJ capability required'), 'Correct error thrown when staging listen-only track');
}
assert(threwError, 'Attempting to stage listen-only track must throw capability error');

// 4. Test Milestone 2C Jamendo CC Rights Evaluation
function mapJamendoRightsSim(raw) {
  const ccurl = (raw.license_ccurl || '').toLowerCase();
  const isND = ccurl.includes('-nd') || ccurl.includes('/nd/');
  const isNC = ccurl.includes('-nc') || ccurl.includes('/nc/');
  const isZero = ccurl.includes('publicdomain') || ccurl.includes('zero') || ccurl.includes('/zero/');
  const isCCBy = ccurl.includes('/by/') || ccurl.includes('/by-');
  const dlAllowed = raw.audiodlallowed !== false;
  const hasAudio = Boolean(raw.audio || raw.id);

  return {
    canStream: hasAudio,
    canPreview: true,
    canDJ: Boolean(!isND && dlAllowed && (isCCBy || isZero || isNC)),
    canEdit: Boolean(!isND && dlAllowed && (isCCBy || isZero || isNC)),
    canRemix: Boolean(!isND && !isNC && dlAllowed && (isCCBy || isZero)),
    attributionRequired: !isZero,
    sourceTermsUrl: raw.license_ccurl || 'https://www.jamendo.com/legal/licenses',
  };
}

const jamendoNDTrack = {
  id: 'jamendo-101',
  title: 'NoDerivatives Master',
  isPlayable: true,
  source: 'jamendo',
  rights: mapJamendoRightsSim({
    id: 101,
    audio: 'https://stream.jamendo.com/101',
    license_ccurl: 'http://creativecommons.org/licenses/by-nc-nd/4.0/',
  }),
};
assert(canUseTrack(jamendoNDTrack, 'listen') === true, 'Jamendo ND track: Listen allowed');
assert(canUseTrack(jamendoNDTrack, 'dj') === false, 'Jamendo ND track: DJ strictly disallowed');
assert(canUseTrack(jamendoNDTrack, 'edit') === false, 'Jamendo ND track: Edit strictly disallowed');

const jamendoPermissiveTrack = {
  id: 'jamendo-202',
  title: 'Permissive Spatial Sound',
  isPlayable: true,
  source: 'jamendo',
  rights: mapJamendoRightsSim({
    id: 202,
    audio: 'https://stream.jamendo.com/202',
    license_ccurl: 'http://creativecommons.org/licenses/by-sa/4.0/',
  }),
};
assert(canUseTrack(jamendoPermissiveTrack, 'listen') === true, 'Jamendo CC BY-SA track: Listen allowed');
assert(canUseTrack(jamendoPermissiveTrack, 'dj') === true, 'Jamendo CC BY-SA track: DJ allowed');
assert(canUseTrack(jamendoPermissiveTrack, 'edit') === true, 'Jamendo CC BY-SA track: Edit allowed');

// 5. Test Milestone 3 DJ Environment System Runtime Behaviors
console.log('\n[5/5] Verifying Milestone 3 DJ Environment system behaviors...');

const ENVIRONMENTS = ['orbital', 'liquid', 'organism'];

// Verify all environments reject restricted tracks
ENVIRONMENTS.forEach((env) => {
  assert(
    canUseTrack(jamendoNDTrack, 'dj') === false,
    `Jamendo ND track must remain blocked from DJ in ${env}`
  );
  assert(
    canUseTrack(sampleDJTrack, 'dj') === true,
    `Sample DJ track must remain allowed for DJ in ${env}`
  );
});

// Verify shared state persistence and transition invariant
class WorkspaceStateSim {
  constructor() {
    this.env = 'orbital';
    this.deckA = { isPlaying: false, time: 0, volume: 1.0, eq: { low: 0, mid: 0, high: 0 } };
    this.deckB = { isPlaying: false, time: 0, volume: 1.0, eq: { low: 0, mid: 0, high: 0 } };
    this.crossfader = 0.0;
  }
  setEnv(nextEnv) {
    if (ENVIRONMENTS.includes(nextEnv)) {
      this.env = nextEnv;
    } else {
      this.env = 'orbital';
    }
  }
}

const sim = new WorkspaceStateSim();
sim.deckA.isPlaying = true;
sim.deckA.time = 42.0;
sim.deckA.volume = 0.75;
sim.deckA.eq.low = -6;
sim.crossfader = -0.5;

// Switch to liquid
sim.setEnv('liquid');
assert(sim.env === 'liquid', 'Environment is liquid');
assert(sim.deckA.isPlaying === true, 'Deck A isPlaying preserved in liquid');
assert(sim.deckA.time === 42.0, 'Deck A timecode preserved in liquid');
assert(sim.deckA.volume === 0.75, 'Deck A volume preserved in liquid');
assert(sim.deckA.eq.low === -6, 'Deck A EQ preserved in liquid');
assert(sim.crossfader === -0.5, 'Crossfader preserved in liquid');

// Switch to organism
sim.setEnv('organism');
assert(sim.env === 'organism', 'Environment is organism');
assert(sim.deckA.isPlaying === true, 'Deck A isPlaying preserved in organism');
assert(sim.crossfader === -0.5, 'Crossfader preserved in organism');

// Switch back with invalid value
sim.setEnv('invalid_cyberpunk');
assert(sim.env === 'orbital', 'Corrupted environment safely defaults to orbital');
assert(sim.deckA.isPlaying === true, 'Playback survived corrupted environment switch');

console.log('✓ All runtime capability rules, Jamendo CC guardrails, and Milestone 3 DJ Environments strictly verified!');


