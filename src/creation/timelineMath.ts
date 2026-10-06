/**
 * SONORA Creation Timeline Mathematics & Snapping Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0 & 5.1 Specification
 * 
 * Provides musical grid calculations, snapping (off, beat, bar),
 * and project duration calculations.
 */

import { SnapMode, TimeSignature, AudioProject, AudioClip, MusicalPosition } from './types';

/**
 * Returns duration of a single beat in seconds based on project tempo.
 */
export function getBeatDuration(tempo: number): number {
  const safeTempo = Math.max(20, Math.min(300, tempo || 120));
  return 60 / safeTempo;
}

/**
 * Returns duration of a single musical bar in seconds.
 */
export function getBarDuration(tempo: number, timeSignature: TimeSignature): number {
  const beatSec = getBeatDuration(tempo);
  const beatsPerBar = Math.max(1, timeSignature?.numerator || 4);
  return beatSec * beatsPerBar;
}

/**
 * Returns duration of a standard musical phrase (default 8 bars).
 */
export function getPhraseDuration(
  tempo: number,
  timeSignature: TimeSignature,
  barsPerPhrase = 8
): number {
  return getBarDuration(tempo, timeSignature) * Math.max(1, barsPerPhrase);
}

/**
 * Converts seconds to a structured musical coordinate (Bar.Beat.Tick.Phrase).
 */
export function secondsToMusicalPosition(
  seconds: number,
  tempo: number,
  timeSignature: TimeSignature,
  barsPerPhrase = 8
): MusicalPosition {
  const safeSec = Math.max(0, seconds);
  const beatSec = getBeatDuration(tempo);
  const barSec = getBarDuration(tempo, timeSignature);
  const phraseSec = barSec * barsPerPhrase;

  const bar = Math.floor(safeSec / barSec) + 1;
  const remBar = safeSec % barSec;
  const beat = Math.floor(remBar / beatSec) + 1;
  const tickSec = remBar % beatSec;
  const tick = Math.floor((tickSec / beatSec) * 100);
  const phrase = Math.floor(safeSec / phraseSec) + 1;
  const totalBeats = parseFloat((safeSec / beatSec).toFixed(3));

  return { bar, beat, tick, phrase, totalBeats };
}

/**
 * Converts a structured musical coordinate to absolute seconds.
 */
export function musicalPositionToSeconds(
  bar: number,
  beat: number,
  tick: number,
  tempo: number,
  timeSignature: TimeSignature
): number {
  const beatSec = getBeatDuration(tempo);
  const barSec = getBarDuration(tempo, timeSignature);

  const safeBar = Math.max(1, bar) - 1;
  const safeBeat = Math.max(1, beat) - 1;
  const safeTick = Math.max(0, Math.min(99, tick)) / 100;

  const totalSec = safeBar * barSec + (safeBeat + safeTick) * beatSec;
  return Math.max(0, parseFloat(totalSec.toFixed(4)));
}

/**
 * Returns an array of timestamps corresponding to downbeats (bar boundaries).
 */
export function getDownbeatTimes(
  tempo: number,
  timeSignature: TimeSignature,
  totalDuration: number
): number[] {
  const barSec = getBarDuration(tempo, timeSignature);
  const totalBars = Math.ceil(totalDuration / barSec) + 1;
  const times: number[] = [];
  for (let b = 0; b <= totalBars; b++) {
    times.push(parseFloat((b * barSec).toFixed(4)));
  }
  return times;
}

/**
 * Snaps a timeline timestamp to a specific musical quantization interval.
 */
export function quantizeTimeToGrid(
  time: number,
  gridUnit: '1-beat' | '1-bar' | '2-bars' | '4-bars' | '8-bars' | '16-bars' | '32-bars',
  tempo: number,
  timeSignature: TimeSignature
): number {
  const beatSec = getBeatDuration(tempo);
  const barSec = getBarDuration(tempo, timeSignature);

  let unitSec = barSec;
  switch (gridUnit) {
    case '1-beat':
      unitSec = beatSec;
      break;
    case '1-bar':
      unitSec = barSec;
      break;
    case '2-bars':
      unitSec = barSec * 2;
      break;
    case '4-bars':
      unitSec = barSec * 4;
      break;
    case '8-bars':
      unitSec = barSec * 8;
      break;
    case '16-bars':
      unitSec = barSec * 16;
      break;
    case '32-bars':
      unitSec = barSec * 32;
      break;
  }

  const index = Math.round(time / unitSec);
  return Math.max(0, parseFloat((index * unitSec).toFixed(4)));
}

/**
 * Snaps a timeline timestamp to the grid according to the active snap mode.
 */
export function snapTimeToGrid(
  time: number,
  snapMode: SnapMode,
  tempo: number,
  timeSignature: TimeSignature
): number {
  if (snapMode === 'off') {
    return Math.max(0, parseFloat(time.toFixed(3)));
  }

  const beatSec = getBeatDuration(tempo);
  const barSec = getBarDuration(tempo, timeSignature);

  if (snapMode === 'phrase') {
    const phraseSec = barSec * 8; // Standard 8-bar musical phrase
    const phraseIndex = Math.round(time / phraseSec);
    return Math.max(0, parseFloat((phraseIndex * phraseSec).toFixed(4)));
  }

  if (snapMode === 'bar') {
    const barIndex = Math.round(time / barSec);
    return Math.max(0, parseFloat((barIndex * barSec).toFixed(4)));
  }

  // snapMode === 'beat'
  const beatIndex = Math.round(time / beatSec);
  return Math.max(0, parseFloat((beatIndex * beatSec).toFixed(4)));
}

/**
 * Returns zoom-adapted musical grid markers to prevent excessive DOM generation.
 */
export function getMusicalGrid(
  tempo: number,
  timeSignature: TimeSignature,
  totalDuration: number,
  zoom: number,
  barsPerPhrase = 8
): {
  time: number;
  type: 'phrase' | 'downbeat' | 'beat';
  bar: number;
  beat: number;
  phrase: number;
  label?: string;
}[] {
  const barSec = getBarDuration(tempo, timeSignature);
  const beatSec = getBeatDuration(tempo);
  const totalBars = Math.ceil(totalDuration / barSec) + 2;
  const grid: {
    time: number;
    type: 'phrase' | 'downbeat' | 'beat';
    bar: number;
    beat: number;
    phrase: number;
    label?: string;
  }[] = [];

  // Determine density based on pixels per second (zoom)
  const showBeats = zoom >= 25;
  const showBars = zoom >= 8;

  for (let b = 0; b < totalBars; b++) {
    const barTime = b * barSec;
    const isPhrase = b % barsPerPhrase === 0;
    const phraseNum = Math.floor(b / barsPerPhrase) + 1;

    if (isPhrase) {
      grid.push({
        time: parseFloat(barTime.toFixed(4)),
        type: 'phrase',
        bar: b + 1,
        beat: 1,
        phrase: phraseNum,
        label: `Phrase ${phraseNum}`,
      });
    } else if (showBars) {
      grid.push({
        time: parseFloat(barTime.toFixed(4)),
        type: 'downbeat',
        bar: b + 1,
        beat: 1,
        phrase: phraseNum,
        label: `Bar ${b + 1}`,
      });
    }

    if (showBeats) {
      for (let beat = 1; beat < timeSignature.numerator; beat++) {
        const beatTime = barTime + beat * beatSec;
        grid.push({
          time: parseFloat(beatTime.toFixed(4)),
          type: 'beat',
          bar: b + 1,
          beat: beat + 1,
          phrase: phraseNum,
        });
      }
    }
  }

  return grid;
}

/**
 * Recalculates total project duration from the latest clip end positions.
 * Ensures project length is at least the duration of 8 bars.
 */
export function calculateProjectDuration(project: AudioProject): number {
  let maxEnd = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.timelineStart + clip.duration;
      if (clipEnd > maxEnd) {
        maxEnd = clipEnd;
      }
    }
  }

  // Also account for arrangement sections
  if (project.sections) {
    for (const section of project.sections) {
      if (section.end > maxEnd) {
        maxEnd = section.end;
      }
    }
  }

  const minDuration = getBarDuration(project.tempo, project.timeSignature) * 8; // At least 8 bars
  return Math.max(minDuration, Math.ceil(maxEnd));
}

/**
 * Formats time in seconds as MM:SS.ms
 */
export function formatTimelineTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

/**
 * Formats time as Bar.Beat.Tick (e.g. 1.1.00)
 */
export function formatMusicalTime(seconds: number, tempo: number, timeSignature: TimeSignature): string {
  const beatSec = getBeatDuration(tempo);
  const barSec = getBarDuration(tempo, timeSignature);
  const barNum = Math.floor(seconds / barSec) + 1;
  const remSec = seconds % barSec;
  const beatNum = Math.floor(remSec / beatSec) + 1;
  const tickSec = remSec % beatSec;
  const tickNum = Math.floor((tickSec / beatSec) * 100);

  return `${barNum}.${beatNum}.${tickNum.toString().padStart(2, '0')}`;
}

/**
 * Returns all clips active at the specified playhead timestamp.
 */
export function getActiveClipsAtTime(project: AudioProject, time: number): AudioClip[] {
  const active: AudioClip[] = [];
  for (const track of project.tracks) {
    if (track.muted) continue;
    for (const clip of track.clips) {
      if (clip.muted) continue;
      if (time >= clip.timelineStart && time < clip.timelineStart + clip.duration) {
        active.push(clip);
      }
    }
  }
  return active;
}
