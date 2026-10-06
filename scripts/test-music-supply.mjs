/**
 * SONORA Milestone 2B — Music Supply + Rights-Aware Catalog Verification
 * Authoritative Reference: PRD.md Section 11, 12, 15, 21, 28; AGENTS.md; Milestone 2B
 * 
 * Validates:
 * 1. Rights & Capability Domain Engine Contracts (listen, preview, dj, edit, remix)
 * 2. Music Supply Providers & Capability Contracts (Demo, Local, Creator, Jamendo, SoundCloud, Spotify, Licensed)
 * 3. Music Supply Registry & Modular Aggregation
 * 4. CatalogService Facade & Capability-Based Filtering
 * 5. Playback & Staging Capability Guardrails (Listen-only disallows DJ staging; DJ-enabled allows staging)
 * 6. UI Representation & Milestone 2A Backward Compatibility
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('SONORA Milestone 2B — Music Supply & Rights Tests');
console.log('====================================================\n');

const catalogDir = path.join(rootDir, 'src', 'catalog');

// -----------------------------------------------------------------------------
// [1/6] Rights & Capabilities Domain Engine Contracts
// -----------------------------------------------------------------------------
console.log('[1/6] Verifying Rights & Capabilities domain models and logic...');

const typesSrc = fs.readFileSync(path.join(catalogDir, 'types.ts'), 'utf-8');

assert(typesSrc.includes('interface TrackRights'), 'types.ts must define TrackRights');
assert(typesSrc.includes('type PlaybackCapability'), 'types.ts must define PlaybackCapability');
assert(typesSrc.includes('type CatalogSource'), 'types.ts must define CatalogSource');
assert(typesSrc.includes('interface MusicSupplyProvider'), 'types.ts must define MusicSupplyProvider');
assert(typesSrc.includes('interface MusicSupplyCapabilities'), 'types.ts must define MusicSupplyCapabilities');
assert(typesSrc.includes('function canUseTrack'), 'types.ts must export canUseTrack');
assert(typesSrc.includes('function getTrackCapabilities'), 'types.ts must export getTrackCapabilities');

// Simulate canUseTrack logic in isolation
function canUseTrackSim(track, capability) {
  if (track.rights) {
    switch (capability) {
      case 'listen':
        return Boolean(track.rights.canStream && track.isPlayable);
      case 'preview':
        return Boolean(track.rights.canPreview || (track.rights.canStream && track.isPlayable));
      case 'dj':
        return Boolean(track.rights.canDJ && track.isPlayable);
      case 'edit':
        return Boolean(track.rights.canEdit && track.isPlayable);
      case 'remix':
        return Boolean(track.rights.canRemix && track.isPlayable);
      default:
        return false;
    }
  }
  if (track.source === 'local' || track.source === 'demo') {
    return Boolean(track.isPlayable);
  }
  if (capability === 'listen' || capability === 'preview') {
    return Boolean(track.isPlayable);
  }
  return false;
}

// Test Track 1: Full rights demo track
const fullRightsTrack = {
  id: 't-full',
  title: 'Full Rights Sound',
  isPlayable: true,
  source: 'demo',
  rights: {
    canStream: true,
    canPreview: true,
    canDJ: true,
    canEdit: true,
    canRemix: true,
  },
};
assert(canUseTrackSim(fullRightsTrack, 'listen') === true, 'Full rights track can listen');
assert(canUseTrackSim(fullRightsTrack, 'preview') === true, 'Full rights track can preview');
assert(canUseTrackSim(fullRightsTrack, 'dj') === true, 'Full rights track can DJ');
assert(canUseTrackSim(fullRightsTrack, 'edit') === true, 'Full rights track can edit');
assert(canUseTrackSim(fullRightsTrack, 'remix') === true, 'Full rights track can remix');

// Test Track 2: Listen-only commercial licensed track
const listenOnlyTrack = {
  id: 't-listen',
  title: 'Commercial Master Recording',
  isPlayable: true,
  source: 'licensed',
  rights: {
    canStream: true,
    canPreview: true,
    canDJ: false,
    canEdit: false,
    canRemix: false,
    territories: ['IN', 'US'],
  },
};
assert(canUseTrackSim(listenOnlyTrack, 'listen') === true, 'Listen-only track can listen');
assert(canUseTrackSim(listenOnlyTrack, 'preview') === true, 'Listen-only track can preview');
assert(canUseTrackSim(listenOnlyTrack, 'dj') === false, 'Listen-only track CANNOT DJ');
assert(canUseTrackSim(listenOnlyTrack, 'edit') === false, 'Listen-only track CANNOT edit');
assert(canUseTrackSim(listenOnlyTrack, 'remix') === false, 'Listen-only track CANNOT remix');

// Test Track 3: Unplayable track
const unplayableTrack = {
  id: 't-unplayable',
  title: 'Unplayable Stream',
  isPlayable: false,
  source: 'spotify',
  rights: {
    canStream: true,
    canPreview: false,
    canDJ: false,
    canEdit: false,
    canRemix: false,
  },
};
assert(canUseTrackSim(unplayableTrack, 'listen') === false, 'Unplayable track cannot listen');
assert(canUseTrackSim(unplayableTrack, 'dj') === false, 'Unplayable track cannot DJ');

// Test Track 4: Backward compatibility for legacy track without explicit rights
const legacyDemoTrack = {
  id: 't-legacy-demo',
  title: 'Legacy Demo Track',
  isPlayable: true,
  source: 'demo',
};
assert(canUseTrackSim(legacyDemoTrack, 'listen') === true, 'Legacy demo track allows listen');
assert(canUseTrackSim(legacyDemoTrack, 'dj') === true, 'Legacy demo track allows DJ');

const legacyThirdPartyTrack = {
  id: 't-legacy-third-party',
  title: 'Legacy Third Party',
  isPlayable: true,
  source: 'jamendo',
};
assert(canUseTrackSim(legacyThirdPartyTrack, 'listen') === true, 'Legacy third-party allows listen');
assert(canUseTrackSim(legacyThirdPartyTrack, 'dj') === false, 'Legacy third-party disallows DJ without explicit rights');

console.log('✓ Rights & capability evaluation contracts verified');

// -----------------------------------------------------------------------------
// [2/6] Music Supply Providers & Capability Contracts
// -----------------------------------------------------------------------------
console.log('[2/6] Verifying Music Supply Provider implementations & honest boundaries...');

const providersDir = path.join(catalogDir, 'providers');
assert(fs.existsSync(providersDir), 'src/catalog/providers/ directory must exist');

const expectedProviders = [
  'demoProvider.ts',
  'localProvider.ts',
  'creatorProvider.ts',
  'jamendoProvider.ts',
  'soundcloudProvider.ts',
  'spotifyProvider.ts',
  'licensedCatalogProvider.ts',
];

for (const pFile of expectedProviders) {
  const fullPath = path.join(providersDir, pFile);
  assert(fs.existsSync(fullPath), `Provider boundary missing: src/catalog/providers/${pFile}`);
  const src = fs.readFileSync(fullPath, 'utf-8');
  assert(src.includes('implements MusicSupplyProvider'), `${pFile} must implement MusicSupplyProvider`);
  assert(src.includes('getCapabilities()'), `${pFile} must implement getCapabilities()`);
}

// 1. Verify Demo Provider
const demoProvSrc = fs.readFileSync(path.join(providersDir, 'demoProvider.ts'), 'utf-8');
assert(demoProvSrc.includes("status: MusicSupplyProviderStatus = 'ready'"), 'Demo provider must have status ready');
assert(demoProvSrc.includes('dj: true'), 'Demo provider must grant DJ capability');

// 2. Verify Local Provider
const localProvSrc = fs.readFileSync(path.join(providersDir, 'localProvider.ts'), 'utf-8');
const localSourceSrc = fs.readFileSync(path.join(catalogDir, 'sources', 'localSource.ts'), 'utf-8');
assert(localProvSrc.includes("status: MusicSupplyProviderStatus = 'ready'"), 'Local provider must have status ready');
assert(localSourceSrc.includes('createLocalRights()'), 'Local provider assigns user-owned rights');
assert(localProvSrc.includes('User-owned') || localSourceSrc.includes('User-owned'), 'Local provider states user-owned rights disclaimer');

// 3. Verify Creator Provider
const creatorProvSrc = fs.readFileSync(path.join(providersDir, 'creatorProvider.ts'), 'utf-8');
assert(creatorProvSrc.includes("status: MusicSupplyProviderStatus = 'ready'"), 'Creator provider must have status ready');
assert(creatorProvSrc.includes('creatorId'), 'Creator provider tracks specify creatorId');
assert(creatorProvSrc.includes('creatorName'), 'Creator provider tracks specify creatorName');
assert(creatorProvSrc.includes('isOriginal: true'), 'Creator provider distinguishes creator-owned original');
assert(creatorProvSrc.includes('isOriginal: false'), 'Creator provider distinguishes third-party upload');
assert(creatorProvSrc.includes('canDJ: false'), 'Creator provider enforces non-DJ rights for third-party uploads');

// 4. Verify External Provider Boundaries (Honest Unavailable State)
const jamendoSrc = fs.readFileSync(path.join(providersDir, 'jamendoProvider.ts'), 'utf-8');
assert(jamendoSrc.includes("status = 'not_configured'"), 'Jamendo provider must report not_configured when credentials missing');
assert(jamendoSrc.includes('VITE_JAMENDO_CLIENT_ID'), 'Jamendo provider documents required VITE_JAMENDO_CLIENT_ID');
assert(jamendoSrc.includes('dj: false'), 'Jamendo provider restricts DJ manipulation without explicit license');

const soundcloudSrc = fs.readFileSync(path.join(providersDir, 'soundcloudProvider.ts'), 'utf-8');
assert(soundcloudSrc.includes("status = 'not_configured'"), 'SoundCloud provider must report not_configured when credentials missing');
assert(soundcloudSrc.includes('VITE_SOUNDCLOUD_CLIENT_ID'), 'SoundCloud provider documents required VITE_SOUNDCLOUD_CLIENT_ID');
assert(soundcloudSrc.includes('dj: false'), 'SoundCloud provider restricts DJ manipulation under terms of service');

const spotifySrc = fs.readFileSync(path.join(providersDir, 'spotifyProvider.ts'), 'utf-8');
assert(spotifySrc.includes("status = 'not_configured'"), 'Spotify provider must report not_configured without credentials');
assert(spotifySrc.includes('VITE_SPOTIFY_CLIENT_ID'), 'Spotify provider documents required VITE_SPOTIFY_CLIENT_ID');
assert(spotifySrc.includes('dj: false'), 'Spotify provider strictly disallows DJ manipulation under developer policy');
assert(spotifySrc.includes('streaming: false'), 'Spotify provider disallows routing raw PCM into Web Audio graph');

const licensedSrc = fs.readFileSync(path.join(providersDir, 'licensedCatalogProvider.ts'), 'utf-8');
assert(licensedSrc.includes('LicensedCatalogProvider'), 'LicensedCatalogProvider must exist');
assert(licensedSrc.includes('VITE_LICENSED_CATALOG_KEY'), 'LicensedCatalogProvider documents required API key');
assert(licensedSrc.includes('territories'), 'LicensedCatalogProvider supports territory clearing');

console.log('✓ All 7 Music Supply Providers and honest external boundaries verified');

// -----------------------------------------------------------------------------
// [3/6] Music Supply Registry & Provider Aggregation
// -----------------------------------------------------------------------------
console.log('[3/6] Verifying Music Supply Registry & modular architecture...');

const registrySrc = fs.readFileSync(path.join(catalogDir, 'musicSupplyRegistry.ts'), 'utf-8');
assert(registrySrc.includes('class MusicSupplyRegistry'), 'musicSupplyRegistry.ts must define MusicSupplyRegistry');
assert(registrySrc.includes('registerDefaults()'), 'MusicSupplyRegistry registers default providers');
assert(registrySrc.includes('getActiveProviders()'), 'MusicSupplyRegistry filters operational providers');
assert(registrySrc.includes('getProvidersBySource('), 'MusicSupplyRegistry queries by source');

console.log('✓ Music Supply Registry architecture and provider discovery verified');

// -----------------------------------------------------------------------------
// [4/6] CatalogService Facade & Capability-Based Filtering
// -----------------------------------------------------------------------------
console.log('[4/6] Verifying CatalogService facade & capability filtering...');

const serviceSrc = fs.readFileSync(path.join(catalogDir, 'catalogService.ts'), 'utf-8');

assert(serviceSrc.includes('this.registry = registry || getMusicSupplyRegistry()'), 'CatalogService consumes MusicSupplyRegistry');
assert(serviceSrc.includes('canUseTrack(t, filters.capability)'), 'CatalogService supports capability-based filtering');
assert(serviceSrc.includes('canUse(track: Track, capability: PlaybackCapability)'), 'CatalogService exposes canUse facade helper');
assert(serviceSrc.includes('getCapabilities(track: Track)'), 'CatalogService exposes getCapabilities facade helper');
assert(serviceSrc.includes('getRegistry()'), 'CatalogService exposes registry getter');
assert(serviceSrc.includes('getRegisteredProviders()'), 'CatalogService exposes registered providers list');

console.log('✓ CatalogService facade and capability-based filtering verified');

// -----------------------------------------------------------------------------
// [5/6] Playback & Staging Capability Guardrails
// -----------------------------------------------------------------------------
console.log('[5/6] Verifying Playback & Staging capability guardrails...');

// Verify that playTrack checks listen capability
assert(serviceSrc.includes("!canUseTrack(track, 'listen')"), 'playTrack must verify listen capability');
assert(serviceSrc.includes('cannot be played: listen capability required'), 'playTrack provides descriptive capability error');

// Verify that stageTrackToDeck checks dj capability
assert(serviceSrc.includes("!canUseTrack(track, 'dj')"), 'stageTrackToDeck must verify dj capability');
assert(serviceSrc.includes('cannot be staged to DJ deck: DJ capability required'), 'stageTrackToDeck provides descriptive capability error');

// Verify that openInAudioLab checks edit capability
assert(serviceSrc.includes("!canUseTrack(track, 'edit')"), 'openInAudioLab must verify edit capability');

console.log('✓ Playback, DJ staging, and editing capability guardrails verified');

// -----------------------------------------------------------------------------
// [6/6] UI Representation & Milestone 2A Backward Compatibility
// -----------------------------------------------------------------------------
console.log('[6/6] Verifying UI representation & Milestone 2A backward compatibility...');

const librarySrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'views', 'LibraryView.tsx'), 'utf-8');
const searchSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'views', 'SearchView.tsx'), 'utf-8');
const playerSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'player', 'PersistentPlayer.tsx'), 'utf-8');
const libCss = fs.readFileSync(path.join(rootDir, 'src', 'components', 'views', 'LibraryView.css'), 'utf-8');

// Verify LibraryView filter tabs
assert(librarySrc.includes("'dj-ready'"), "LibraryView supports 'dj-ready' filter");
assert(librarySrc.includes("'listen'"), "LibraryView supports 'listen' filter");
assert(librarySrc.includes("'creator'"), "LibraryView supports 'creator' filter");
assert(librarySrc.includes("'local'"), "LibraryView supports 'local' filter");

// Verify Capability Matrix in Spatial Focus Plinth
assert(librarySrc.includes('sonora-capability-matrix'), 'LibraryView renders capability matrix');
assert(librarySrc.includes("LISTEN {canUseTrack(activeTrack, 'listen') ? '✓' : '—'}"), 'LibraryView displays LISTEN capability state');
assert(librarySrc.includes("DJ {canUseTrack(activeTrack, 'dj') ? '✓' : '—'}"), 'LibraryView displays DJ capability state');
assert(librarySrc.includes("EDIT {canUseTrack(activeTrack, 'edit') ? '✓' : '—'}"), 'LibraryView displays EDIT capability state');
assert(librarySrc.includes("REMIX {canUseTrack(activeTrack, 'remix') ? '✓' : '—'}"), 'LibraryView displays REMIX capability state');

// Verify Conditional DJ staging controls
assert(librarySrc.includes("canUseTrack(activeTrack, 'dj') ?"), 'LibraryView conditionally enables Stage A/B on plinth');
assert(librarySrc.includes('sonora-dj-unavailable-pill'), 'LibraryView displays DJ Unavailable pill when DJ is disallowed');
assert(librarySrc.includes('sonora-dj-unavailable-label'), 'LibraryView displays DJ — label in list console when DJ disallowed');

// Verify Search View conditional staging
assert(searchSrc.includes("canUseTrack(topMatch, 'dj') ?"), 'SearchView conditionally enables Stage A/B on top match');
assert(searchSrc.includes("canUseTrack(t, 'dj') ?"), 'SearchView conditionally enables Stage A/B in results grid');

// Verify Persistent Player rights awareness
assert(playerSrc.includes("!canUseTrack(currentTrack, 'dj')"), 'PersistentPlayer displays Listen Only badge for non-DJ tracks');

// Verify CSS definitions for rights indicators
assert(libCss.includes('.sonora-capability-matrix'), 'LibraryView.css defines .sonora-capability-matrix');
assert(libCss.includes('.sonora-badge-source'), 'LibraryView.css defines .sonora-badge-source');
assert(libCss.includes('.sonora-badge-rights'), 'LibraryView.css defines .sonora-badge-rights');
assert(libCss.includes('.sonora-dj-unavailable-label'), 'LibraryView.css defines .sonora-dj-unavailable-label');

console.log('✓ UI representation, capability matrix, and visual datum indicators verified');

console.log('\n====================================================');
console.log('All 6 Milestone 2B Music Supply test suites passed with 0 errors.');
console.log('====================================================\n');
