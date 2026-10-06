/**
 * SONORA Persistent Analysis Cache
 * Authoritative Reference: PRD.md Section 19, Milestone 4 Specification
 * 
 * Persistent storage layer for derived audio intelligence:
 * - Primary storage: IndexedDB (`sonora_audio_intelligence`)
 * - Fallback storage: in-memory / localStorage
 * - Validates analyzer version (`ANALYZER_VERSION`); invalidates stale entries
 * - Caches ONLY derived metadata (never raw audio PCM)
 */

import { TrackAnalysis, ANALYZER_VERSION } from './analysisTypes';

const DB_NAME = 'sonora_audio_intelligence';
const DB_VERSION = 1;
const STORE_NAME = 'analyses';
const STORAGE_KEY_PREFIX = 'sonora_analysis_';

// In-memory cache for ultra-low latency & Node test environment support
const memoryCache = new Map<string, TrackAnalysis>();

function getIndexedDB(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  return null;
}

function openDB(): Promise<IDBDatabase | null> {
  const idb = getIndexedDB();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'trackId' });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves a cached TrackAnalysis for a given trackId.
 * Returns null if not found or if the cached version is outdated.
 */
export async function getCachedAnalysis(trackId: string): Promise<TrackAnalysis | null> {
  // 1. Check memory cache
  const inMem = memoryCache.get(trackId);
  if (inMem) {
    if (inMem.analyzerVersion === ANALYZER_VERSION) {
      return inMem;
    }
    memoryCache.delete(trackId);
  }

  // 2. Check IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);

      const result = await new Promise<TrackAnalysis | null>((resolve) => {
        req.onsuccess = () => resolve((req.result as TrackAnalysis) || null);
        req.onerror = () => resolve(null);
      });

      if (result) {
        if (result.analyzerVersion === ANALYZER_VERSION) {
          memoryCache.set(trackId, result);
          return result;
        }
        // Outdated version: remove from IDB
        await deleteCachedAnalysis(trackId);
      }
    } catch {
      // Fallback to localStorage
    }
  }

  // 3. Fallback to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${trackId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as TrackAnalysis;
        if (parsed.analyzerVersion === ANALYZER_VERSION) {
          memoryCache.set(trackId, parsed);
          return parsed;
        }
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${trackId}`);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  return null;
}

/**
 * Persists derived TrackAnalysis to IndexedDB, memory, and localStorage.
 */
export async function saveCachedAnalysis(analysis: TrackAnalysis): Promise<void> {
  if (!analysis || !analysis.trackId) return;

  // 1. Memory cache
  memoryCache.set(analysis.trackId, analysis);

  // 2. IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(analysis);
    } catch {
      // Ignore IDB write error
    }
  }

  // 3. Fallback localStorage (lightweight metadata)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${analysis.trackId}`,
        JSON.stringify(analysis)
      );
    } catch {
      // Ignore quota exceeded
    }
  }
}

/**
 * Removes cached analysis for a specific track.
 */
export async function deleteCachedAnalysis(trackId: string): Promise<void> {
  memoryCache.delete(trackId);

  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(trackId);
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${trackId}`);
    } catch {
      // Ignore
    }
  }
}

/**
 * Clears all cached analyses across storage mechanisms.
 */
export async function clearAnalysisCache(): Promise<void> {
  memoryCache.clear();

  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
