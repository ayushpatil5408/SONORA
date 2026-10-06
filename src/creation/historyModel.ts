/**
 * SONORA Creation History & Undo/Redo Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0 & 5.1 Specification
 * 
 * Provides an immutable command history stack for all project mutations.
 * Caps history length to prevent memory leakage while guaranteeing full undo/redo fidelity.
 */

import { AudioProject, ProjectHistoryState } from './types';

const MAX_HISTORY_STEPS = 50;

/**
 * Initializes a new history container for an audio project.
 */
export function createInitialHistory(project: AudioProject): ProjectHistoryState {
  return {
    past: [],
    present: project,
    future: [],
  };
}

/**
 * Pushes a new project state onto the history stack and clears future redos.
 */
export function pushHistoryState(
  history: ProjectHistoryState,
  nextProject: AudioProject
): ProjectHistoryState {
  // If no change occurred, retain existing history
  if (JSON.stringify(history.present) === JSON.stringify(nextProject)) {
    return history;
  }

  const updatedPast = [...history.past, history.present];
  if (updatedPast.length > MAX_HISTORY_STEPS) {
    updatedPast.shift();
  }

  return {
    past: updatedPast,
    present: nextProject,
    future: [],
  };
}

/**
 * Reverts to the previous project state in history.
 */
export function undo(history: ProjectHistoryState): ProjectHistoryState {
  if (history.past.length === 0) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);

  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

/**
 * Restores a previously undone project state.
 */
export function redo(history: ProjectHistoryState): ProjectHistoryState {
  if (history.future.length === 0) {
    return history;
  }

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

/**
 * Checks whether undo is available.
 */
export function canUndo(history: ProjectHistoryState): boolean {
  return history.past.length > 0;
}

/**
 * Checks whether redo is available.
 */
export function canRedo(history: ProjectHistoryState): boolean {
  return history.future.length > 0;
}
