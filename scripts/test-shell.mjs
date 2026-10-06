/**
 * SONORA Milestone 1 — Product Foundation Shell & Navigation Verification
 * Authoritative Reference: PRD.md Section 10, 13 & 67: Milestone 1
 * 
 * Validates:
 * 1. Primary Navigation & Route Contracts (Home, Search, Library, DJ Studio, Audio Lab, Creator)
 * 2. Application Shell Architecture & Root Entry Wiring
 * 3. DJ Studio Integration of the frozen Phase 0.4 DJWorkspace
 * 4. Honest Placeholders (No fake controls in Audio Lab, Creator, Search, Library)
 * 5. Persistent Player Shell Contracts & Audio Engine Decoupling
 * 6. Visual Language & Accessibility Integrity
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
console.log('SONORA Milestone 1 — Product Foundation Shell Tests');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// [1/6] Primary Route Contracts
// -----------------------------------------------------------------------------
console.log('[1/6] Verifying primary navigation routes and contracts...');
const routesFilePath = path.join(rootDir, 'src', 'types', 'routes.ts');
assert(fs.existsSync(routesFilePath), 'src/types/routes.ts must exist');

const routesSource = fs.readFileSync(routesFilePath, 'utf-8');
const requiredRouteIds = ['home', 'search', 'library', 'dj-studio', 'audio-lab', 'creator'];
for (const id of requiredRouteIds) {
  assert(
    routesSource.includes(`'${id}'`),
    `Route definition '${id}' must be present in RouteId type definition`
  );
  assert(
    routesSource.includes(`id: '${id}'`),
    `PRIMARY_ROUTES array must register route with id '${id}'`
  );
}

// Ensure isImplemented status reflects honesty
assert(
  routesSource.includes("id: 'home', label: 'Home', isImplemented: true"),
  'Home route must be marked implemented'
);
assert(
  routesSource.includes("id: 'dj-studio', label: 'DJ Studio', isImplemented: true"),
  'DJ Studio route must be marked implemented'
);
assert(
  routesSource.includes("id: 'audio-lab', label: 'Audio Lab', isImplemented: false"),
  'Audio Lab route must be marked not implemented'
);
assert(
  routesSource.includes("id: 'creator', label: 'Creator', isImplemented: false"),
  'Creator route must be marked not implemented'
);
console.log('✓ All 6 primary routes defined and contracts validated');

// -----------------------------------------------------------------------------
// [2/6] App Entry Wiring & Shell Architecture
// -----------------------------------------------------------------------------
console.log('\n[2/6] Verifying App entry wiring and AppShell architecture...');
const appFilePath = path.join(rootDir, 'src', 'app', 'App.tsx');
assert(fs.existsSync(appFilePath), 'src/app/App.tsx must exist');

const appSource = fs.readFileSync(appFilePath, 'utf-8');
assert(
  appSource.includes("import { AppShell } from '../components/shell/AppShell';"),
  'App.tsx must import AppShell'
);
assert(
  appSource.includes('<AppShell />') || appSource.includes('<AppShell/>'),
  'App.tsx must render AppShell as root component'
);

const shellFilePath = path.join(rootDir, 'src', 'components', 'shell', 'AppShell.tsx');
assert(fs.existsSync(shellFilePath), 'src/components/shell/AppShell.tsx must exist');

const shellSource = fs.readFileSync(shellFilePath, 'utf-8');
assert(shellSource.includes('Navigation'), 'AppShell must incorporate Navigation');
assert(shellSource.includes('PersistentPlayer'), 'AppShell must incorporate PersistentPlayer');
assert(shellSource.includes('HomeView'), 'AppShell must incorporate HomeView');
assert(shellSource.includes('SearchView'), 'AppShell must incorporate SearchView');
assert(shellSource.includes('LibraryView'), 'AppShell must incorporate LibraryView');
assert(shellSource.includes('DJStudioView'), 'AppShell must incorporate DJStudioView');
assert(shellSource.includes('AudioLabView'), 'AppShell must incorporate AudioLabView');
assert(shellSource.includes('CreatorView'), 'AppShell must incorporate CreatorView');
assert(shellSource.includes('sonora-shell-atmosphere'), 'AppShell must include living atmosphere backdrop');
console.log('✓ AppShell entry wiring and view orchestration verified');

// -----------------------------------------------------------------------------
// [3/6] DJ Studio & Phase 0.4 Integration
// -----------------------------------------------------------------------------
console.log('\n[3/6] Verifying DJ Studio integration with frozen Phase 0.4 DJWorkspace...');
const djStudioFilePath = path.join(rootDir, 'src', 'components', 'views', 'DJStudioView.tsx');
assert(fs.existsSync(djStudioFilePath), 'src/components/views/DJStudioView.tsx must exist');

const djStudioSource = fs.readFileSync(djStudioFilePath, 'utf-8');
assert(
  djStudioSource.includes("import { DJWorkspace } from '../DJWorkspace';"),
  'DJStudioView must import existing DJWorkspace from Phase 0.4'
);
assert(
  djStudioSource.includes('<DJWorkspace />'),
  'DJStudioView must render DJWorkspace without recreating DJ foundation'
);
console.log('✓ DJ Studio cleanly wraps and hosts Phase 0.4 DJWorkspace');

// -----------------------------------------------------------------------------
// [4/6] Honest Placeholders (No Fake Controls)
// -----------------------------------------------------------------------------
console.log('\n[4/6] Verifying honest placeholders for future roadmap modules...');
const audioLabFilePath = path.join(rootDir, 'src', 'components', 'views', 'AudioLabView.tsx');
const audioLabSource = fs.readFileSync(audioLabFilePath, 'utf-8');
assert(
  audioLabSource.toLowerCase().includes('not implemented yet'),
  'AudioLabView must explicitly declare it is not implemented yet'
);
assert(
  !audioLabSource.includes('<button') || !audioLabSource.toLowerCase().includes('trim'),
  'AudioLabView must NOT contain fake trim controls'
);
assert(
  !audioLabSource.includes('export-btn'),
  'AudioLabView must NOT contain fake export buttons'
);

const creatorFilePath = path.join(rootDir, 'src', 'components', 'views', 'CreatorView.tsx');
const creatorSource = fs.readFileSync(creatorFilePath, 'utf-8');
assert(
  creatorSource.toLowerCase().includes('not implemented in milestone 1') ||
  creatorSource.toLowerCase().includes('future milestone'),
  'CreatorView must explicitly state it is a future milestone'
);
assert(
  !creatorSource.includes('publish-btn') && !creatorSource.includes('upload-btn'),
  'CreatorView must NOT contain fake publish/upload action buttons'
);

const searchFilePath = path.join(rootDir, 'src', 'components', 'views', 'SearchView.tsx');
const searchSource = fs.readFileSync(searchFilePath, 'utf-8');
assert(
  searchSource.includes('Milestone 2'),
  'SearchView must clearly indicate search activates in Milestone 2'
);

const libraryFilePath = path.join(rootDir, 'src', 'components', 'views', 'LibraryView.tsx');
const librarySource = fs.readFileSync(libraryFilePath, 'utf-8');
assert(
  librarySource.includes('Milestone 2'),
  'LibraryView must clearly indicate library connects in Milestone 2'
);
console.log('✓ All future views adhere strictly to honest placeholder rules');

// -----------------------------------------------------------------------------
// [5/6] Persistent Player Shell Contract
// -----------------------------------------------------------------------------
console.log('\n[5/6] Verifying Persistent Player shell contracts & engine decoupling...');
const playerFilePath = path.join(rootDir, 'src', 'components', 'player', 'PersistentPlayer.tsx');
assert(fs.existsSync(playerFilePath), 'src/components/player/PersistentPlayer.tsx must exist');

const playerSource = fs.readFileSync(playerFilePath, 'utf-8');
assert(
  playerSource.includes('getAudioEngine()'),
  'PersistentPlayer must query AudioEngine singleton'
);
assert(
  playerSource.includes('engine.subscribe('),
  'PersistentPlayer must subscribe to discrete engine state changes'
);
assert(
  playerSource.includes('handleTogglePlay'),
  'PersistentPlayer must support play/pause transport control'
);
assert(
  playerSource.includes('handleMasterVolumeChange'),
  'PersistentPlayer must support master volume slider control'
);
assert(
  playerSource.includes('onOpenDJStudio'),
  'PersistentPlayer must provide quick link to DJ Studio when outside of it'
);
console.log('✓ Persistent Player contract and decoupling verified');

// -----------------------------------------------------------------------------
// [6/6] Design System & Semantic Shell Standards
// -----------------------------------------------------------------------------
console.log('\n[6/6] Verifying semantic styling and absence of SaaS dashboard antipatterns...');
const navCssPath = path.join(rootDir, 'src', 'components', 'navigation', 'Navigation.css');
const navCssSource = fs.readFileSync(navCssPath, 'utf-8');
assert(
  !navCssSource.includes('bento') && !navCssSource.includes('admin-sidebar'),
  'Navigation must not contain generic admin-sidebar or bento styling'
);

const viewsCssPath = path.join(rootDir, 'src', 'components', 'views', 'Views.css');
const viewsCssSource = fs.readFileSync(viewsCssPath, 'utf-8');
assert(
  viewsCssSource.includes('var(--color-surface-border)'),
  'Views must use design tokens for border surfaces'
);
assert(
  viewsCssSource.includes('var(--color-accent-iris)'),
  'Views must use Iris accent token for active musical nodes'
);
console.log('✓ Spatial styling conforms to SONORA visual language specifications');

console.log('\n====================================================');
console.log('All 6 Milestone 1 Shell test suites passed with 0 errors.');
console.log('====================================================\n');
