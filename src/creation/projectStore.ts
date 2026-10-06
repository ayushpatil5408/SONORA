/**
 * SONORA Persistent Project Store
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0 Specification
 * 
 * Persistent storage layer for creation projects:
 * - Primary storage: IndexedDB (`sonora_creation_projects`)
 * - Fallback storage: in-memory cache + localStorage (`sonora_project_<id>`)
 * - Caches ONLY project arrangement metadata and source references (never raw audio PCM)
 */

import { AudioProject } from './types';
import { calculateProjectDuration } from './timelineMath';
import { createTrackProcessor } from './trackProcessing';
import { createDefaultArrangementSections } from './arrangementIntelligence';

const DB_NAME = 'sonora_creation_projects';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const STORAGE_PREFIX = 'sonora_project_';

const memoryStore = new Map<string, AudioProject>();

function getIndexedDB(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  return null;
}

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase | null> {
  const idb = getIndexedDB();
  if (!idb) return null;
  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Creates a blank audio project with default tracks and tempo.
 */
export function createDefaultProject(
  name = 'Untitled Resonance',
  tempo = 124
): AudioProject {
  const now = new Date().toISOString();
  const id = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const baseProject: AudioProject = {
    id,
    name,
    tempo: Math.max(40, Math.min(240, tempo)),
    timeSignature: { numerator: 4, denominator: 4 },
    duration: 32, // Default minimum duration
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    tracks: [
      {
        id: `trk-1-${id}`,
        name: 'Harmonic Lead',
        clips: [],
        volume: 0.85,
        pan: 0.0,
        muted: false,
        solo: false,
        colorToken: 'var(--color-accent-iris)',
        processingChain: {
          enabled: true,
          processors: [
            createTrackProcessor('eq', 'Spectral Sculptor'),
            createTrackProcessor('filter', 'Harmonic Filter'),
            createTrackProcessor('compressor', 'Dynamic Field'),
            createTrackProcessor('saturation', 'Harmonic Warmth'),
            createTrackProcessor('delay', 'Temporal Echo'),
            createTrackProcessor('reverb', 'Spatial Aura'),
            createTrackProcessor('limiter', 'Ceiling Guard'),
          ],
        },
        crossfades: [],
        automationLanes: [
          { parameter: 'volume', enabled: true, points: [{ id: 'p1-1', time: 0, value: 0.85 }] },
          { parameter: 'pan', enabled: false, points: [{ id: 'p1-2', time: 0, value: 0 }] },
        ],
      },
      {
        id: `trk-2-${id}`,
        name: 'Rhythm Diaphragm',
        clips: [],
        volume: 0.85,
        pan: 0.0,
        muted: false,
        solo: false,
        colorToken: 'var(--color-accent-cyan)',
        processingChain: {
          enabled: true,
          processors: [
            createTrackProcessor('eq', 'Spectral Sculptor'),
            createTrackProcessor('filter', 'Harmonic Filter'),
            createTrackProcessor('compressor', 'Dynamic Field'),
            createTrackProcessor('saturation', 'Harmonic Warmth'),
            createTrackProcessor('delay', 'Temporal Echo'),
            createTrackProcessor('reverb', 'Spatial Aura'),
            createTrackProcessor('limiter', 'Ceiling Guard'),
          ],
        },
        crossfades: [],
        automationLanes: [
          { parameter: 'volume', enabled: true, points: [{ id: 'p2-1', time: 0, value: 0.85 }] },
          { parameter: 'pan', enabled: false, points: [{ id: 'p2-2', time: 0, value: 0 }] },
        ],
      },
    ],
    markers: [
      { id: `mkr-1-${id}`, time: 0, label: 'Intro', type: 'section', sectionType: 'intro', musicalTime: '1.1.00', energy: 0.35 },
      { id: `mkr-2-${id}`, time: 15.48, label: 'Drop', type: 'section', sectionType: 'drop', musicalTime: '9.1.00', energy: 0.95 },
    ],
    sections: createDefaultArrangementSections(tempo, { numerator: 4, denominator: 4 }, 32),
    key: 'Am',
    metadata: {
      description: 'Living creation project assembled in SONORA',
      sampleRate: 44100,
    },
  };

  return {
    ...baseProject,
    duration: calculateProjectDuration(baseProject),
  };
}

/**
 * Persists an audio project to IndexedDB, memory, and localStorage.
 */
export async function saveProject(project: AudioProject): Promise<void> {
  if (!project || !project.id) return;

  const toSave: AudioProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  // 1. Memory cache
  memoryStore.set(toSave.id, toSave);

  // 2. IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(toSave);
    } catch {
      // Ignore IDB write error
    }
  }

  // 3. Fallback localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${toSave.id}`, JSON.stringify(toSave));
    } catch {
      // Ignore quota exceeded
    }
  }
}

/**
 * Loads an audio project by ID.
 */
export async function loadProject(projectId: string): Promise<AudioProject | null> {
  if (!projectId) return null;

  // 1. Check memory cache
  const cached = memoryStore.get(projectId);
  if (cached) return cached;

  // 2. Check IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(projectId);

      const result = await new Promise<AudioProject | null>((resolve) => {
        req.onsuccess = () => resolve((req.result as AudioProject) || null);
        req.onerror = () => resolve(null);
      });

      if (result) {
        memoryStore.set(projectId, result);
        return result;
      }
    } catch {
      // Fallback
    }
  }

  // 3. Check localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as AudioProject;
        memoryStore.set(projectId, parsed);
        return parsed;
      }
    } catch {
      // Ignore parse error
    }
  }

  return null;
}

/**
 * Lists all stored audio projects.
 */
export async function listProjects(): Promise<AudioProject[]> {
  const projects: AudioProject[] = [];

  // Check IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      const results = await new Promise<AudioProject[]>((resolve) => {
        req.onsuccess = () => resolve((req.result as AudioProject[]) || []);
        req.onerror = () => resolve([]);
      });

      if (results.length > 0) {
        results.forEach((p) => memoryStore.set(p.id, p));
        return results;
      }
    } catch {
      // Fallback
    }
  }

  // Check memory store
  if (memoryStore.size > 0) {
    return Array.from(memoryStore.values());
  }

  // Fallback localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            projects.push(JSON.parse(raw) as AudioProject);
          }
        }
      }
    } catch {
      // Ignore error
    }
  }

  return projects;
}

/**
 * Deletes an audio project from storage.
 */
export async function deleteProject(projectId: string): Promise<void> {
  memoryStore.delete(projectId);

  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(projectId);
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
    } catch {
      // Ignore
    }
  }
}
