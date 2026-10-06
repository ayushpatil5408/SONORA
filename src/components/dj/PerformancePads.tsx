/**
 * SONORA Performance Pads Component
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, Milestone 3.5
 * 
 * 8 Multipurpose Tactile Performance Pads:
 * - Modes:
 *   1. HOT CUE (Slots A - H, create/trigger/clear)
 *   2. AUTO LOOP (1/8, 1/4, 1/2, 1, 2, 4, 8, 16 beats)
 *   3. BEAT JUMP (-8, -4, -2, -1, +1, +2, +4, +8 beats)
 *   4. PAD FX (Momentary or latching DSP performance effects)
 * - Environment styling alignment across Orbital, Liquid, and Organism
 * - Zero decorative fake buttons — 100% connected to real audio operations
 */

import React from 'react';
import { PadMode, DJEnvironment } from './types';
import { LoopState, DeckFXState, DeckFXType } from '../../audio/types';

export interface PerformancePadsProps {
  deckId: 'A' | 'B';
  padMode: PadMode;
  hotCues: (number | null)[];
  loop: LoopState;
  fx: DeckFXState;
  variant: DJEnvironment;
  onPadModeChange: (mode: PadMode) => void;
  onHotCueTrigger: (index: number) => void;
  onHotCueSet: (index: number) => void;
  onHotCueDelete: (index: number) => void;
  onAutoLoop: (beats: number) => void;
  onBeatJump: (beats: number) => void;
  onFXToggle: (fx: DeckFXType) => void;
  className?: string;
}

const CUE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const LOOP_SIZES = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16];
const LOOP_LABELS = ['1/8', '1/4', '1/2', '1', '2', '4', '8', '16'];
const JUMP_SIZES = [-8, -4, -2, -1, 1, 2, 4, 8];
const JUMP_LABELS = ['-8', '-4', '-2', '-1', '+1', '+2', '+4', '+8'];

export const PerformancePads: React.FC<PerformancePadsProps> = ({
  deckId,
  padMode,
  hotCues,
  loop,
  fx,
  variant,
  onPadModeChange,
  onHotCueTrigger,
  onHotCueSet,
  onHotCueDelete,
  onAutoLoop,
  onBeatJump,
  onFXToggle,
  className = '',
}) => {
  const isDeckA = deckId === 'A';
  const accentColor = isDeckA ? 'var(--color-accent-cyan)' : 'var(--color-accent-amber)';

  return (
    <div className={`sonora-performance-pads-bank env-${variant} ${className}`}>
      {/* 1. Mode Selector Tabs */}
      <div className="sonora-pad-mode-tabs" role="tablist" aria-label={`Deck ${deckId} Performance Pad Mode`}>
        {(['hotcue', 'loop', 'beatjump', 'padfx'] as PadMode[]).map((mode) => {
          const labels: Record<PadMode, string> = {
            hotcue: 'HOT CUE',
            loop: 'AUTO LOOP',
            beatjump: 'BEAT JUMP',
            padfx: 'PAD FX',
          };
          const isActive = padMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`sonora-pad-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onPadModeChange(mode)}
            >
              {labels[mode]}
            </button>
          );
        })}
      </div>

      {/* 2. 8-Pad Performance Grid */}
      <div className="sonora-pads-grid" role="region" aria-label={`Deck ${deckId} Performance Pads`}>
        {/* HOT CUE MODE */}
        {padMode === 'hotcue' &&
          CUE_LETTERS.map((letter, idx) => {
            const cueTime = hotCues[idx];
            const isSet = cueTime !== null && cueTime !== undefined;
            return (
              <button
                key={letter}
                type="button"
                className={`sonora-perf-pad ${isSet ? 'is-set' : 'is-empty'}`}
                style={isSet ? { borderColor: accentColor, color: '#ffffff' } : undefined}
                onClick={(e) => {
                  if (e.shiftKey && isSet) {
                    onHotCueDelete(idx);
                  } else if (isSet) {
                    onHotCueTrigger(idx);
                  } else {
                    onHotCueSet(idx);
                  }
                }}
                title={
                  isSet
                    ? `Cue ${letter} (${cueTime?.toFixed(2)}s). Shift-click to clear.`
                    : `Cue ${letter} [Empty]. Click to set here.`
                }
                aria-label={`Hot Cue ${letter}: ${isSet ? `${cueTime?.toFixed(1)}s` : 'Empty'}`}
              >
                <span className="sonora-pad-letter">{letter}</span>
                <span className="sonora-pad-meta">
                  {isSet ? `${cueTime?.toFixed(1)}s` : 'SET'}
                </span>
              </button>
            );
          })}

        {/* AUTO LOOP MODE */}
        {padMode === 'loop' &&
          LOOP_SIZES.map((beats, idx) => {
            const label = LOOP_LABELS[idx];
            const isActive = loop.enabled && Math.abs(loop.lengthBeats - beats) < 0.05;
            return (
              <button
                key={label}
                type="button"
                className={`sonora-perf-pad ${isActive ? 'is-active-loop' : ''}`}
                style={isActive ? { borderColor: '#FFB300', background: 'rgba(255, 179, 0, 0.2)' } : undefined}
                onClick={() => onAutoLoop(beats)}
                aria-label={`Auto Loop ${label} beats`}
                title={`Engage ${label} beat loop`}
              >
                <span className="sonora-pad-letter">{label}</span>
                <span className="sonora-pad-meta">BEAT</span>
              </button>
            );
          })}

        {/* BEAT JUMP MODE */}
        {padMode === 'beatjump' &&
          JUMP_SIZES.map((beats, idx) => {
            const label = JUMP_LABELS[idx];
            return (
              <button
                key={label}
                type="button"
                className="sonora-perf-pad"
                onClick={() => onBeatJump(beats)}
                aria-label={`Beat Jump ${label} beats`}
                title={`Jump ${label} beats`}
              >
                <span className="sonora-pad-letter">{label}</span>
                <span className="sonora-pad-meta">JUMP</span>
              </button>
            );
          })}

        {/* PAD FX MODE */}
        {padMode === 'padfx' && (
          <>
            <button
              type="button"
              className={`sonora-perf-pad ${fx.type === 'echo' && fx.enabled ? 'is-fx-active' : ''}`}
              onClick={() => onFXToggle('echo')}
              aria-label="Toggle Echo / Delay FX"
              title="Toggle Delay Echo FX"
            >
              <span className="sonora-pad-letter">ECHO</span>
              <span className="sonora-pad-meta">1/2</span>
            </button>
            <button
              type="button"
              className={`sonora-perf-pad ${fx.type === 'reverb' && fx.enabled ? 'is-fx-active' : ''}`}
              onClick={() => onFXToggle('reverb')}
              aria-label="Toggle Space Reverb FX"
              title="Toggle Space Reverb FX"
            >
              <span className="sonora-pad-letter">SPACE</span>
              <span className="sonora-pad-meta">REV</span>
            </button>
            <button
              type="button"
              className={`sonora-perf-pad ${fx.type === 'crush' && fx.enabled ? 'is-fx-active' : ''}`}
              onClick={() => onFXToggle('crush')}
              aria-label="Toggle Bitcrush / Drive FX"
              title="Toggle Bitcrush / Drive FX"
            >
              <span className="sonora-pad-letter">CRUSH</span>
              <span className="sonora-pad-meta">DIST</span>
            </button>
            <button
              type="button"
              className={`sonora-perf-pad ${fx.type === 'filter' && fx.enabled ? 'is-fx-active' : ''}`}
              onClick={() => onFXToggle('filter')}
              aria-label="Toggle Filter Sweep FX"
              title="Toggle Filter Sweep FX"
            >
              <span className="sonora-pad-letter">SWEEP</span>
              <span className="sonora-pad-meta">FLTR</span>
            </button>
            <button
              type="button"
              className={`sonora-perf-pad ${fx.type === 'flanger' && fx.enabled ? 'is-fx-active' : ''}`}
              onClick={() => onFXToggle('flanger')}
              aria-label="Toggle Flanger Jet FX"
              title="Toggle Flanger Jet FX"
            >
              <span className="sonora-pad-letter">FLANGER</span>
              <span className="sonora-pad-meta">JET</span>
            </button>
            <button
              type="button"
              className="sonora-perf-pad"
              onClick={() => onAutoLoop(0.25)}
              aria-label="Roll 1/4 Beat"
              title="Roll 1/4 Beat"
            >
              <span className="sonora-pad-letter">ROLL</span>
              <span className="sonora-pad-meta">1/4</span>
            </button>
            <button
              type="button"
              className="sonora-perf-pad"
              onClick={() => onBeatJump(-1)}
              aria-label="Nudge -1"
              title="Nudge Backward -1 Beat"
            >
              <span className="sonora-pad-letter">NUDGE</span>
              <span className="sonora-pad-meta">-1</span>
            </button>
            <button
              type="button"
              className="sonora-perf-pad"
              onClick={() => onBeatJump(1)}
              aria-label="Nudge +1"
              title="Nudge Forward +1 Beat"
            >
              <span className="sonora-pad-letter">NUDGE</span>
              <span className="sonora-pad-meta">+1</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
