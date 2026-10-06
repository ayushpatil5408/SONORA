/**
 * SONORA Creator Workspace Component
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0, 5.1, 5.2 & 5.3 Specification
 * 
 * Implements the living Creation Workspace & Musical Intelligence:
 * - "Music as matter" spatial timeline horizon & tactile clip ribbons
 * - Non-destructive editing (trim start/end, slip edit, split, duplicate, delete)
 * - Non-linear fade curves (linear, ease-in, ease-out, equal-power)
 * - Energy-preserving overlapping clip crossfades
 * - Real Web Audio DSP Track Processing Spine (EQ, Filter, Comp, Sat, Delay, Reverb, Limiter)
 * - Living Automation Filament & interactive parameter beads
 * - Musical Ruler with Phrase boundaries (8-bar), Downbeats, and zoom-aware ticks
 * - Arrangement Section Horizon (Intro, Verse, Build, Drop, Outro) with interactive selection
 * - Luminous Energy Terrain Layer visualizing arrangement momentum & arcs
 * - Harmonic Transition Bridges between adjacent clips using 24-key Camelot wheel
 * - Deterministic Tempo Compatibility & Time-Stretch readiness indicators
 * - Floating Arrangement Intelligence Surface with quantized duplication (1-bar, 2-bars, phrase)
 * - Beat-aware timeline snapping (off, beat, bar, phrase)
 * - Full Undo / Redo command stack
 * - Independent playback scheduler connected to authoritative Web Audio context
 * - Rights-aware staging drawer enforcing licensing boundaries
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  ArrangementSectionType,
} from '../../creation/types';
import {
  AudioProject,
  AudioClip,
  SnapMode,
  ProjectHistoryState,
  FadeCurve,
  TrackProcessorType,
} from '../../creation/types';
import {
  createDefaultProject,
  saveProject,
} from '../../creation/projectStore';
import {
  createInitialHistory,
  pushHistoryState,
  undo,
  redo,
  canUndo,
  canRedo,
} from '../../creation/historyModel';
import {
  addClip,
  trimClipStart,
  trimClipEnd,
  slipClip,
  setClipFadeCurves,
  setClipGain,
  splitClip,
  duplicateClip,
  deleteClip,
  addTrack,
  removeTrack,
  addMarker,
  deleteMarker,
  setProjectTempo,
  setProjectKey,
  createSection,
  renameSection,
  deleteSection,
  quantizedDuplicateClip,
  duplicatePhrase,
  repeatRegion,
  detectTrackCrossfades,
  setTrackCrossfade,
  removeTrackCrossfade,
  addTrackProcessor,
  updateTrackProcessorParams,
  bypassTrackProcessor,
  reorderTrackProcessors,
  removeTrackProcessor,
  addAutomationPoint,
  deleteAutomationPoint,
  setClipWarpMode,
  setClipWarpQuality,
  toggleClipPitchLock,
  setClipManualBpm,
  addClipWarpMarker,
  deleteClipWarpMarker,
  resetClipWarp,
} from '../../creation/clipOperations';
import {
  getBeatDuration,
  getBarDuration,
  getPhraseDuration,
  formatTimelineTime,
  formatMusicalTime,
  secondsToMusicalPosition,
  getMusicalGrid,
} from '../../creation/timelineMath';
import {
  evaluateTempoCompatibility,
  evaluateHarmonicTransition,
  calculateArrangementEnergyProfile,
  findIntersectingClips,
} from '../../creation/arrangementIntelligence';
import { WarpMode, WarpQuality } from '../../creation/warpTypes';
import { RenderSettings, RenderProgress, RenderResult } from '../../creation/renderTypes';
import { createRenderPlan } from '../../creation/renderPlan';
import { renderAudioProject } from '../../creation/offlineRenderer';
import { playbackScheduler } from '../../creation/playbackScheduler';
import { getAudioEngine } from '../../audio/AudioEngine';
import { createSyntheticDemoBuffer } from '../../audio/audioLoader';
import { canUseTrack } from '../../catalog/types';
import { SEED_TRACKS } from '../../catalog/seedCatalog';
import { CAMELOT_MAP } from '../../audio/analysisTypes';
import './CreatorWorkspace.css';

const PIXELS_PER_SECOND = 40; // Zoom level

const STANDARD_KEYS = [
  'C', 'Am', 'G', 'Em', 'D', 'Bm', 'A', 'F#m', 'E', 'C#m', 'B', 'G#m',
  'F', 'Dm', 'Bb', 'Gm', 'Eb', 'Cm', 'Ab', 'Fm', 'Db', 'Bbm', 'Gb', 'Ebm'
];

export const CreatorWorkspace: React.FC = () => {
  // History & Project State
  const [history, setHistory] = useState<ProjectHistoryState>(() => {
    const initial = createDefaultProject('Ethereal Horizon', 124);
    return createInitialHistory(initial);
  });
  const project = history.present;

  // Timeline UI State
  const [playheadTime, setPlayheadTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [snapMode, setSnapMode] = useState<SnapMode>('beat');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(project.tracks[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isStagingOpen, setIsStagingOpen] = useState<boolean>(false);
  const [isAutomationActive, setIsAutomationActive] = useState<boolean>(false);
  const [activeAutomationParam, setActiveAutomationParam] = useState<'volume' | 'pan'>('volume');
  const [isArrangementIntelOpen, setIsArrangementIntelOpen] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // M5.5 Audio Rendering, Export & Stem Bouncing State
  const [isRenderDialogOpen, setIsRenderDialogOpen] = useState<boolean>(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>({
    format: 'wav',
    sampleRate: 44100,
    bitDepth: 16,
    range: 'project',
    mode: 'mixdown',
  });
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderAbortControllerRef = useRef<AbortController | null>(null);

  // Dragging interaction state
  const [activeDragState, setActiveDragState] = useState<{
    clipId: string;
    type: 'trim-start' | 'trim-end' | 'slip';
    startX: number;
    initialTimelineStart: number;
    initialDuration: number;
    initialSourceStart: number;
    initialSourceEnd: number;
  } | null>(null);

  // DOM Refs
  const timelineRulerRef = useRef<HTMLDivElement>(null);
  const playheadBeaconRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize playback scheduler listeners
  useEffect(() => {
    const unsubTime = playbackScheduler.onTimeUpdate((time) => {
      setPlayheadTime(time);
      if (playheadBeaconRef.current) {
        const x = time * PIXELS_PER_SECOND;
        playheadBeaconRef.current.style.transform = `translateX(${x}px)`;
      }
    });

    const unsubState = playbackScheduler.onStateChange((playing) => {
      setIsPlaying(playing);
    });

    return () => {
      unsubTime();
      unsubState();
    };
  }, []);

  // Update selectedTrackId fallback
  useEffect(() => {
    if (!project.tracks.some((t) => t.id === selectedTrackId)) {
      setSelectedTrackId(project.tracks[0]?.id || '');
    }
  }, [project.tracks, selectedTrackId]);

  // Push new project mutation through history stack
  const updateProject = useCallback((nextProject: AudioProject) => {
    setHistory((prev) => pushHistoryState(prev, nextProject));
    setSaveStatus('dirty');
  }, []);

  // Auto-save project periodically or on mutation
  useEffect(() => {
    if (saveStatus === 'dirty') {
      const timer = setTimeout(async () => {
        setSaveStatus('saving');
        await saveProject(project);
        setSaveStatus('saved');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [project, saveStatus]);

  // Preload demo audio buffers into playbackScheduler
  useEffect(() => {
    const prepareAudio = async () => {
      try {
        const audioEngine = getAudioEngine();
        const ctx = await audioEngine.ensureContext();
        if (ctx) {
          const bufA = createSyntheticDemoBuffer(ctx, 'deckA', 16);
          const bufB = createSyntheticDemoBuffer(ctx, 'deckB', 16);
          playbackScheduler.registerSourceBuffer('demo-deckA', bufA);
          playbackScheduler.registerSourceBuffer('demo-deckB', bufB);
          playbackScheduler.registerSourceBuffer('track-01', bufA);
          playbackScheduler.registerSourceBuffer('track-02', bufB);
        }
      } catch {
        // AudioContext not unlocked yet
      }
    };
    prepareAudio();
  }, []);

  // Window drag listeners for trim and slip operations
  useEffect(() => {
    if (!activeDragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - activeDragState.startX;
      const deltaSec = deltaX / PIXELS_PER_SECOND;

      if (activeDragState.type === 'trim-start') {
        const newStart = Math.max(0, activeDragState.initialTimelineStart + deltaSec);
        updateProject(trimClipStart(project, activeDragState.clipId, newStart, snapMode));
      } else if (activeDragState.type === 'trim-end') {
        const newDuration = Math.max(0.2, activeDragState.initialDuration + deltaSec);
        updateProject(trimClipEnd(project, activeDragState.clipId, newDuration, snapMode));
      } else if (activeDragState.type === 'slip') {
        updateProject(slipClip(project, activeDragState.clipId, deltaSec));
      }
    };

    const handleMouseUp = () => {
      setActiveDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragState, project, snapMode, updateProject]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          playbackScheduler.pause();
        } else {
          playbackScheduler.play(project, playheadTime);
        }
      } else if (e.code === 'Home') {
        e.preventDefault();
        playbackScheduler.seek(project, 0);
      } else if (e.code === 'End') {
        e.preventDefault();
        playbackScheduler.seek(project, project.duration);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const stepSec = e.shiftKey
          ? getBarDuration(project.tempo, project.timeSignature)
          : getBeatDuration(project.tempo);
        playbackScheduler.seek(project, Math.max(0, playheadTime - stepSec));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const stepSec = e.shiftKey
          ? getBarDuration(project.tempo, project.timeSignature)
          : getBeatDuration(project.tempo);
        playbackScheduler.seek(project, Math.min(project.duration, playheadTime + stepSec));
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          updateProject(deleteClip(project, selectedClipId));
          setSelectedClipId(null);
        } else if (selectedSectionId) {
          e.preventDefault();
          updateProject(deleteSection(project, selectedSectionId));
          setSelectedSectionId(null);
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedClipId) {
          e.preventDefault();
          updateProject(splitClip(project, selectedClipId, playheadTime));
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (selectedClipId) {
          e.preventDefault();
          updateProject(duplicateClip(project, selectedClipId));
        }
      } else if (e.key === 'p' || e.key === 'P') {
        // Quantized duplicate or duplicate phrase
        if (selectedClipId) {
          e.preventDefault();
          updateProject(quantizedDuplicateClip(project, selectedClipId, 'phrase', snapMode));
        }
      } else if (e.key === 'w' || e.key === 'W') {
        if (selectedClipId && selectedClip) {
          e.preventDefault();
          if (e.shiftKey) {
            updateProject(toggleClipPitchLock(project, selectedClipId));
          } else {
            const currentMode = selectedClip.clip.warp?.mode || 'free';
            const nextMode: WarpMode =
              currentMode === 'free'
                ? 'beat_locked'
                : currentMode === 'beat_locked'
                ? 'project_locked'
                : 'free';
            updateProject(setClipWarpMode(project, selectedClipId, nextMode));
          }
        }
      } else if (e.key === 'm' || e.key === 'M') {
        // Drop section marker at playhead
        e.preventDefault();
        const musicalPos = formatMusicalTime(playheadTime, project.tempo, project.timeSignature);
        updateProject(addMarker(project, playheadTime, `Marker (${musicalPos})`, 'section'));
      } else if (e.key === '[') {
        // Jump to previous marker
        e.preventDefault();
        const prevMarkers = project.markers.filter((m) => m.time < playheadTime - 0.05);
        if (prevMarkers.length > 0) {
          playbackScheduler.seek(project, prevMarkers[prevMarkers.length - 1].time);
        } else {
          playbackScheduler.seek(project, 0);
        }
      } else if (e.key === ']') {
        // Jump to next marker
        e.preventDefault();
        const nextMarker = project.markers.find((m) => m.time > playheadTime + 0.05);
        if (nextMarker) {
          playbackScheduler.seek(project, nextMarker.time);
        }
      } else if (e.key === '1') {
        setSnapMode('off');
      } else if (e.key === '2') {
        setSnapMode('beat');
      } else if (e.key === '3') {
        setSnapMode('bar');
      } else if (e.key === '4') {
        setSnapMode('phrase');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setIsAutomationActive((prev) => !prev);
      } else if (e.key === 'x' || e.key === 'X') {
        if (selectedTrackId) {
          e.preventDefault();
          updateProject(detectTrackCrossfades(project, selectedTrackId));
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.shiftKey) {
          e.preventDefault();
          setIsRenderDialogOpen((prev) => !prev);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo(history)) {
            setHistory((prev) => redo(prev));
          }
        } else {
          if (canUndo(history)) {
            setHistory((prev) => undo(prev));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    playheadTime,
    project,
    selectedClipId,
    selectedTrackId,
    selectedSectionId,
    snapMode,
    history,
    updateProject,
  ]);

  // Transport actions
  const handlePlayPause = async () => {
    if (isPlaying) {
      playbackScheduler.pause();
    } else {
      await playbackScheduler.play(project, playheadTime);
    }
  };

  const handleStop = () => {
    playbackScheduler.stop();
  };

  const handleSeek = (time: number) => {
    playbackScheduler.seek(project, time);
  };

  // M5.5 Start Offline Audio Rendering
  const handleStartRender = async () => {
    setRenderError(null);
    setRenderResult(null);

    const controller = new AbortController();
    renderAbortControllerRef.current = controller;

    try {
      // Rights validator hook enforcing licensing safety
      const rightsValidator = (sourceId: string, metadata?: AudioClip['metadata']) => {
        // If from seed catalog, check canUseTrack(t, 'edit')
        const seedMatch = SEED_TRACKS.find((t) => t.id === sourceId);
        if (seedMatch) {
          return canUseTrack(seedMatch, 'edit');
        }
        if (metadata?.sourceType === 'jamendo' || metadata?.sourceType === 'creator' || metadata?.sourceType === 'local') {
          return true;
        }
        return true;
      };

      const plan = createRenderPlan(project, renderSettings, rightsValidator);

      const audioEngine = getAudioEngine();
      const ctx = await audioEngine.ensureContext();

      const bufferResolver = (sourceId: string): AudioBuffer | undefined => {
        const registered = playbackScheduler.getSourceBuffer(sourceId);
        if (registered) return registered;
        return createSyntheticDemoBuffer(ctx, sourceId.includes('2') || sourceId.includes('B') ? 'deckB' : 'deckA', 16);
      };

      const result = await renderAudioProject(
        plan,
        bufferResolver,
        (progress) => setRenderProgress(progress),
        controller.signal
      );

      setRenderResult(result);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setRenderProgress(null);
        return;
      }
      setRenderError(err instanceof Error ? err.message : String(err));
    } finally {
      renderAbortControllerRef.current = null;
    }
  };

  const handleCancelRender = () => {
    if (renderAbortControllerRef.current) {
      renderAbortControllerRef.current.abort();
      renderAbortControllerRef.current = null;
    }
    setRenderProgress(null);
    setRenderError('Render cancelled by user.');
  };

  // Timeline Ruler Click
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRulerRef.current) return;
    const rect = timelineRulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSeconds = Math.max(0, clickX / PIXELS_PER_SECOND);
    handleSeek(targetSeconds);
  };

  // Stage a source track into the project
  const handleStageTrack = (track: typeof SEED_TRACKS[0]) => {
    if (!canUseTrack(track, 'edit')) {
      return;
    }

    const targetTrackId = selectedTrackId || project.tracks[0]?.id;
    if (!targetTrackId) return;

    // Use analyzed tempo and key if available
    const trackBpm = track.bpm || 120;
    const duration = track.duration ? Math.min(16, track.duration) : 8;
    const trackKey = track.key || 'Am';
    const trackCamelot = CAMELOT_MAP[trackKey] || '8A';

    const newClipData = {
      timelineStart: playheadTime,
      sourceStart: 0,
      sourceEnd: duration,
      duration,
      gain: 1.0,
      pan: 0.0,
      fadeIn: 0.25,
      fadeOut: 0.25,
      fadeInCurve: 'equal-power' as FadeCurve,
      fadeOutCurve: 'equal-power' as FadeCurve,
      metadata: {
        sourceId: track.id,
        sourceType: track.source as 'demo' | 'local' | 'creator' | 'jamendo',
        title: track.title,
        artist: track.creatorName || track.artistId,
        bpm: trackBpm,
        key: trackKey,
        camelot: trackCamelot,
        energy: 0.65,
        colorToken: track.id.endsWith('1') ? 'var(--color-accent-iris)' : 'var(--color-accent-cyan)',
        confidence: {
          overall: 0.9,
          bpm: 0.95,
          key: 0.85,
        },
      },
    };

    updateProject(addClip(project, targetTrackId, newClipData));
    setIsStagingOpen(false);
  };

  // Arrangement Energy Profile (calculated across timeline)
  const energyProfile = useMemo(() => {
    return calculateArrangementEnergyProfile(project);
  }, [project]);

  // Current Musical Coordinate
  const currentMusicalPos = useMemo(() => {
    return secondsToMusicalPosition(playheadTime, project.tempo, project.timeSignature);
  }, [playheadTime, project.tempo, project.timeSignature]);

  // Active section at current playhead
  const currentSection = useMemo(() => {
    if (!project.sections) return null;
    return project.sections.find((s) => playheadTime >= s.start && playheadTime < s.end) || null;
  }, [project.sections, playheadTime]);

  // Zoom-aware musical grid ticks
  const musicalGridTicks = useMemo(() => {
    return getMusicalGrid(project.tempo, project.timeSignature, project.duration, PIXELS_PER_SECOND);
  }, [project.tempo, project.timeSignature, project.duration]);

  const timelineWidth = Math.max(900, project.duration * PIXELS_PER_SECOND + 200);

  // Selected clip object helper
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of project.tracks) {
      const c = track.clips.find((item) => item.id === selectedClipId);
      if (c) return { clip: c, track };
    }
    return null;
  }, [project.tracks, selectedClipId]);

  // Selected track object helper
  const selectedTrack = useMemo(() => {
    return project.tracks.find((t) => t.id === selectedTrackId) || project.tracks[0];
  }, [project.tracks, selectedTrackId]);

  // Selected section object helper
  const selectedSection = useMemo(() => {
    if (!selectedSectionId || !project.sections) return null;
    return project.sections.find((s) => s.id === selectedSectionId) || null;
  }, [project.sections, selectedSectionId]);

  return (
    <div className="creator-workspace" ref={containerRef} aria-label="SONORA Creator Workspace">
      {/* 1. Header & Identity Zone */}
      <header className="creator-header">
        <div className="creator-header-left">
          <span className="creator-project-badge">Arrangement Space</span>
          <input
            type="text"
            className="creator-project-title-input"
            value={project.name}
            onChange={(e) => updateProject({ ...project, name: e.target.value })}
            aria-label="Project Title"
          />
        </div>

        <div className="creator-header-center">
          <button
            type="button"
            className="creator-transport-btn"
            onClick={() => handleSeek(0)}
            title="Seek to Start (Home)"
            aria-label="Seek to start"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 19V5l-9 7 9 7zm1-14v14l9-7-9-7z" />
            </svg>
          </button>

          <button
            type="button"
            className={`creator-transport-btn ${isPlaying ? 'is-playing' : ''}`}
            onClick={handlePlayPause}
            title="Play / Pause (Space)"
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="creator-transport-btn"
            onClick={handleStop}
            title="Stop Timeline"
            aria-label="Stop playback"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          </button>

          <div className="creator-time-readout" aria-live="off">
            {formatTimelineTime(playheadTime)}
          </div>

          <div className="creator-meta-chip" title="Musical Bar.Beat.Tick (Phrase)">
            <span>BAR {currentMusicalPos.bar}.{currentMusicalPos.beat}.{currentMusicalPos.tick.toString().padStart(2, '0')}</span>
            <span style={{ color: 'var(--color-accent-cyan)', fontSize: '10px' }}>
              (P{currentMusicalPos.phrase})
            </span>
          </div>

          {currentSection && (
            <div className="creator-meta-chip" style={{ borderLeft: '2px solid var(--color-accent-iris)' }}>
              <span>SEC: <strong>{currentSection.name.toUpperCase()}</strong></span>
            </div>
          )}
        </div>

        <div className="creator-header-right">
          {/* Project Tempo Input */}
          <div className="creator-meta-chip">
            <span>BPM:</span>
            <input
              type="number"
              className="creator-tempo-input"
              value={project.tempo}
              onChange={(e) => updateProject(setProjectTempo(project, Number(e.target.value)))}
              min={40}
              max={240}
              aria-label="Project Tempo"
            />
          </div>

          {/* Project Harmonic Key Selector */}
          <div className="creator-meta-chip">
            <span>KEY:</span>
            <select
              className="creator-automation-param-select"
              value={project.key || 'Am'}
              onChange={(e) => updateProject(setProjectKey(project, e.target.value))}
              aria-label="Project Key"
            >
              {STANDARD_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k} ({CAMELOT_MAP[k] || '?'})
                </option>
              ))}
            </select>
          </div>

          {/* Snapping Modes (Free, Beat, Bar, Phrase) */}
          <div className="creator-snap-group" role="group" aria-label="Timeline Snapping">
            {(['off', 'beat', 'bar', 'phrase'] as SnapMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`creator-snap-btn ${snapMode === mode ? 'is-active' : ''}`}
                onClick={() => setSnapMode(mode)}
                title={`Snap mode: ${mode.toUpperCase()} (Key ${mode === 'off' ? '1' : mode === 'beat' ? '2' : mode === 'bar' ? '3' : '4'})`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`creator-action-btn ${isArrangementIntelOpen ? 'is-primary' : ''}`}
            onClick={() => setIsArrangementIntelOpen(!isArrangementIntelOpen)}
            title="Toggle Musical Intelligence Panel"
          >
            ✦ Intelligence
          </button>

          <button
            type="button"
            className={`creator-action-btn ${isAutomationActive ? 'is-primary' : ''}`}
            onClick={() => setIsAutomationActive(!isAutomationActive)}
            title="Toggle Automation Lanes (A)"
          >
            ∿ Automation
          </button>

          <button
            type="button"
            className="creator-action-btn"
            onClick={() => setHistory((prev) => undo(prev))}
            disabled={!canUndo(history)}
            title="Undo (Cmd+Z)"
            aria-label="Undo"
          >
            ↶ Undo
          </button>

          <button
            type="button"
            className="creator-action-btn"
            onClick={() => setHistory((prev) => redo(prev))}
            disabled={!canRedo(history)}
            title="Redo (Cmd+Shift+Z)"
            aria-label="Redo"
          >
            ↷ Redo
          </button>

          <button
            type="button"
            className="creator-action-btn is-primary"
            onClick={() => setIsRenderDialogOpen(true)}
            title="Render and Export WAV Mixdown or Stems (Shift+R)"
            aria-label="Render and Export WAV"
          >
            ⏏ Render
          </button>

          <span className="creator-meta-chip" style={{ fontSize: '10px' }}>
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'saving' && '● Saving...'}
            {saveStatus === 'dirty' && '○ Edited'}
          </span>
        </div>
      </header>

      {/* 2. Timeline Horizon & Musical Ruler */}
      <div className="creator-timeline-stage" aria-label="Creation Timeline">
        <div style={{ width: `${timelineWidth}px`, position: 'relative' }}>
          {/* Musical Ruler & Sections Horizon */}
          <div
            className="creator-timeline-ruler"
            ref={timelineRulerRef}
            onClick={handleRulerClick}
            aria-label="Musical Timeline Ruler"
            style={{ height: '48px', paddingTop: '20px' }}
          >
            {/* Section Strip across top */}
            <div className="creator-section-strip">
              {project.sections &&
                project.sections.map((section) => {
                  const leftPx = section.start * PIXELS_PER_SECOND;
                  const widthPx = Math.max(30, (section.end - section.start) * PIXELS_PER_SECOND);
                  const isSecSelected = selectedSectionId === section.id;

                  return (
                    <div
                      key={section.id}
                      className={`creator-section-block ${isSecSelected ? 'is-active' : ''}`}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        borderLeftColor: section.color || 'var(--color-accent-iris)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSectionId(isSecSelected ? null : section.id);
                        handleSeek(section.start);
                      }}
                      title={`Section: ${section.name} (${formatTimelineTime(section.start)} - ${formatTimelineTime(section.end)}) • Click to select`}
                    >
                      <span>{section.name}</span>
                      <span className="creator-section-type-badge">{section.type}</span>
                    </div>
                  );
                })}
            </div>

            {/* Luminous Energy Terrain SVG along Ruler Horizon */}
            <svg
              className="creator-energy-terrain-canvas"
              style={{ width: `${timelineWidth}px` }}
              viewBox={`0 0 ${timelineWidth} 28`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="energy-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.4)" />
                  <stop offset="100%" stopColor="rgba(245, 158, 11, 0.0)" />
                </linearGradient>
              </defs>
              {energyProfile.points.length > 1 && (
                <path
                  d={
                    `M 0 28 ` +
                    energyProfile.points
                      .map((pt) => `L ${pt.time * PIXELS_PER_SECOND} ${28 - pt.energy * 24}`)
                      .join(' ') +
                    ` L ${timelineWidth} 28 Z`
                  }
                  className="creator-energy-path"
                />
              )}
            </svg>

            {/* Zoom-aware musical grid ticks */}
            {musicalGridTicks.map((tick, i) => (
              <div
                key={`grid-tick-${i}-${tick.time}`}
                className={`creator-ruler-tick ${
                  tick.type === 'phrase'
                    ? 'is-phrase'
                    : tick.type === 'downbeat'
                    ? 'is-downbeat'
                    : ''
                }`}
                style={{ left: `${tick.time * PIXELS_PER_SECOND}px` }}
              >
                {tick.label && <span>{tick.label}</span>}
              </div>
            ))}

            {/* Project Arrangement Markers */}
            {project.markers.map((marker) => (
              <div
                key={marker.id}
                className="creator-marker-flag"
                style={{
                  left: `${marker.time * PIXELS_PER_SECOND}px`,
                  background:
                    marker.type === 'section'
                      ? 'var(--color-accent-iris, #a78bfa)'
                      : 'var(--color-accent-amber, #f59e0b)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(marker.time);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  updateProject(deleteMarker(project, marker.id));
                }}
                title={`Marker: ${marker.label} (${formatTimelineTime(marker.time)}) [${marker.musicalTime || ''}] - Click to jump, right click to delete`}
              >
                {marker.label}
              </div>
            ))}
          </div>

          {/* Playhead Beacon */}
          <div
            className="creator-playhead-beacon"
            ref={playheadBeaconRef}
            style={{
              left: 0,
              transform: `translateX(${playheadTime * PIXELS_PER_SECOND}px)`,
            }}
          >
            <div className="creator-playhead-cap" />
          </div>

          {/* Sonic Lanes (Tracks) */}
          <div className="creator-tracks-container">
            {project.tracks.map((track) => {
              // Sort clips for harmonic bridge analysis
              const sortedClips = [...track.clips].sort((a, b) => a.timelineStart - b.timelineStart);

              return (
                <div
                  key={track.id}
                  className="creator-track-row"
                  style={{
                    outline: selectedTrackId === track.id ? '1px solid rgba(138, 92, 246, 0.4)' : 'none',
                  }}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  {/* Track Lane Controls Header */}
                  <div className="creator-track-header">
                    <div className="creator-track-title-row">
                      <span className="creator-track-name" style={{ color: track.colorToken }}>
                        {track.name}
                      </span>
                      <button
                        type="button"
                        className="creator-track-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProject(removeTrack(project, track.id));
                        }}
                        title="Remove Track Lane"
                        disabled={project.tracks.length <= 1}
                        aria-label="Remove track"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="creator-track-controls-row">
                      <button
                        type="button"
                        className={`creator-track-btn ${track.muted ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = {
                            ...project,
                            tracks: project.tracks.map((t) =>
                              t.id === track.id ? { ...t, muted: !t.muted } : t
                            ),
                          };
                          updateProject(next);
                        }}
                        title="Mute Track"
                      >
                        M
                      </button>

                      <button
                        type="button"
                        className={`creator-track-btn ${track.solo ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = {
                            ...project,
                            tracks: project.tracks.map((t) =>
                              t.id === track.id ? { ...t, solo: !t.solo } : t
                            ),
                          };
                          updateProject(next);
                        }}
                        title="Solo Track"
                      >
                        S
                      </button>

                      <input
                        type="range"
                        className="creator-track-fader"
                        min="0"
                        max="1"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => {
                          const vol = parseFloat(e.target.value);
                          const next = {
                            ...project,
                            tracks: project.tracks.map((t) =>
                              t.id === track.id ? { ...t, volume: vol } : t
                            ),
                          };
                          updateProject(next);
                        }}
                        title={`Volume: ${Math.round(track.volume * 100)}%`}
                        aria-label="Track volume"
                      />

                      <button
                        type="button"
                        className="creator-track-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProject(detectTrackCrossfades(project, track.id));
                        }}
                        title="Detect & Apply Crossfades (X)"
                      >
                        ⋈
                      </button>
                    </div>
                  </div>

                  {/* Track Lane Body (Clips Horizon) */}
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="creator-track-lane">
                      {/* Overlapping Crossfade Bridges */}
                      {track.crossfades &&
                        track.crossfades.map((xf) => {
                          const leftPx = xf.startTime * PIXELS_PER_SECOND;
                          const widthPx = Math.max(20, xf.duration * PIXELS_PER_SECOND);

                          return (
                            <div
                              key={xf.id}
                              className="creator-crossfade-bridge"
                              style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextCurve =
                                  xf.curve === 'equal-power' ? 'linear' : 'equal-power';
                                updateProject(
                                  setTrackCrossfade(
                                    project,
                                    track.id,
                                    xf.fromClipId,
                                    xf.toClipId,
                                    xf.duration,
                                    nextCurve
                                  )
                                );
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                updateProject(removeTrackCrossfade(project, track.id, xf.id));
                              }}
                              title={`Crossfade: ${xf.duration.toFixed(1)}s (${xf.curve}) - Click to switch curve, Right-click to remove`}
                            >
                              <span className="creator-crossfade-badge">
                                ⋈ {xf.curve === 'equal-power' ? 'EQ-PWR' : 'LIN'}
                              </span>
                            </div>
                          );
                        })}

                      {/* Harmonic Transition Bridges between adjacent clips */}
                      {sortedClips.map((clipA, idx) => {
                        if (idx >= sortedClips.length - 1) return null;
                        const clipB = sortedClips[idx + 1];
                        const gapSec = clipB.timelineStart - (clipA.timelineStart + clipA.duration);
                        // Show harmonic link if clips are adjacent or close (gap < 4 bars)
                        if (gapSec > getBarDuration(project.tempo, project.timeSignature) * 4) return null;

                        const harmonic = evaluateHarmonicTransition(clipA, clipB);
                        if (harmonic.relation === 'unknown') return null;

                        const bridgeLeftPx = (clipA.timelineStart + clipA.duration + clipB.timelineStart) / 2 * PIXELS_PER_SECOND;
                        const isComp = harmonic.compatible;
                        const isRel = harmonic.relation === 'relative';
                        const isTens = harmonic.relation === 'incompatible';

                        return (
                          <div
                            key={`harm-${clipA.id}-${clipB.id}`}
                            className={`creator-harmonic-bridge ${
                              isRel ? 'is-relative' : isComp ? 'is-compatible' : isTens ? 'is-tension' : ''
                            }`}
                            style={{ left: `${bridgeLeftPx}px` }}
                            title={`${harmonic.label}: ${harmonic.description}`}
                          >
                            <span>
                              {harmonic.fromCamelot} ➔ {harmonic.toCamelot}
                            </span>
                            <span style={{ fontSize: '8px', opacity: 0.85 }}>
                              {harmonic.relation === 'perfect'
                                ? 'Match'
                                : harmonic.relation === 'dominant'
                                ? '+1 Boost'
                                : harmonic.relation === 'subdominant'
                                ? '-1 Warmth'
                                : harmonic.relation === 'relative'
                                ? 'Rel'
                                : isComp
                                ? 'Comp'
                                : 'Tension'}
                            </span>
                          </div>
                        );
                      })}

                      {/* Clip Ribbons */}
                      {track.clips.map((clip) => {
                        const isSelected = clip.id === selectedClipId;
                        const leftPx = clip.timelineStart * PIXELS_PER_SECOND;
                        const widthPx = Math.max(36, clip.duration * PIXELS_PER_SECOND);

                        // Tempo compatibility evaluation
                        const tempoStatus = evaluateTempoCompatibility(
                          clip.metadata?.bpm,
                          project.tempo,
                          clip.metadata?.confidence?.bpm
                        );

                        // Visual fade widths
                        const fadeInWidth = Math.min(widthPx * 0.45, (clip.fadeIn || 0) * PIXELS_PER_SECOND);
                        const fadeOutWidth = Math.min(widthPx * 0.45, (clip.fadeOut || 0) * PIXELS_PER_SECOND);

                        return (
                          <div
                            key={clip.id}
                            className={`creator-clip-ribbon ${isSelected ? 'is-selected' : ''}`}
                            style={{
                              left: `${leftPx}px`,
                              width: `${widthPx}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClipId(clip.id);
                              setSelectedTrackId(track.id);
                            }}
                            role="region"
                            aria-label={`Clip: ${clip.metadata?.title || 'Audio Clip'}`}
                          >
                            {/* Fade In Ramp SVG */}
                            {clip.fadeIn > 0 && fadeInWidth > 4 && (
                              <svg
                                className="creator-fade-ramp in"
                                style={{ width: `${fadeInWidth}px` }}
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                              >
                                <path
                                  d={
                                    clip.fadeInCurve === 'ease-in'
                                      ? 'M 0 0 Q 70 5 100 100 L 0 100 Z'
                                      : clip.fadeInCurve === 'ease-out'
                                      ? 'M 0 0 Q 30 95 100 100 L 0 100 Z'
                                      : 'M 0 0 L 100 100 L 0 100 Z'
                                  }
                                  className="creator-fade-path"
                                />
                              </svg>
                            )}

                            {/* Fade Out Ramp SVG */}
                            {clip.fadeOut > 0 && fadeOutWidth > 4 && (
                              <svg
                                className="creator-fade-ramp out"
                                style={{ width: `${fadeOutWidth}px` }}
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                              >
                                <path
                                  d={
                                    clip.fadeOutCurve === 'ease-in'
                                      ? 'M 0 100 Q 30 5 100 0 L 100 100 Z'
                                      : clip.fadeOutCurve === 'ease-out'
                                      ? 'M 0 100 Q 70 95 100 0 L 100 100 Z'
                                      : 'M 0 100 L 100 0 L 100 100 Z'
                                  }
                                  className="creator-fade-path"
                                />
                              </svg>
                            )}

                            {/* Trim Handle: Start */}
                            <div
                              className={`creator-trim-handle start ${
                                activeDragState?.clipId === clip.id &&
                                activeDragState.type === 'trim-start'
                                  ? 'is-active'
                                  : ''
                              }`}
                              title="Drag to trim start (Arrow keys to nudge)"
                              tabIndex={0}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveDragState({
                                  clipId: clip.id,
                                  type: 'trim-start',
                                  startX: e.clientX,
                                  initialTimelineStart: clip.timelineStart,
                                  initialDuration: clip.duration,
                                  initialSourceStart: clip.sourceStart,
                                  initialSourceEnd: clip.sourceEnd,
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowRight') {
                                  e.stopPropagation();
                                  updateProject(
                                    trimClipStart(project, clip.id, clip.timelineStart + 0.25, snapMode)
                                  );
                                } else if (e.key === 'ArrowLeft') {
                                  e.stopPropagation();
                                  updateProject(
                                    trimClipStart(
                                      project,
                                      clip.id,
                                      Math.max(0, clip.timelineStart - 0.25),
                                      snapMode
                                    )
                                  );
                                }
                              }}
                            />

                            {/* Clip Header */}
                            <div className="creator-clip-header">
                              <span className="creator-clip-title">
                                {clip.metadata?.title || 'Sonic Shard'}
                                {clip.metadata?.key && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      color: 'var(--color-accent-iris)',
                                      marginLeft: '4px',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    [{clip.metadata.key} • {clip.metadata.camelot || '?'}]
                                  </span>
                                )}
                              </span>

                              {/* Tempo Status Chip */}
                              {tempoStatus.state !== 'unknown' && (
                                <span
                                  className={`creator-tempo-chip ${tempoStatus.state}`}
                                  title={`${tempoStatus.label}: ${tempoStatus.description}`}
                                >
                                  {tempoStatus.state === 'match' && '✓'}
                                  {tempoStatus.state === 'near' && '~'}
                                  {tempoStatus.state === 'mismatch' && '≠'}
                                  <span>{clip.metadata?.bpm} BPM</span>
                                </span>
                              )}

                              {/* Warp Mode Badge */}
                              {clip.warp && (
                                <span
                                  className={`creator-clip-warp-badge ${clip.warp.mode}`}
                                  title={`Warp Mode: ${clip.warp.mode.toUpperCase()} (${clip.warp.quality} quality, ${clip.warp.pitchLocked ? 'pitch locked' : 'varispeed'}) - Click to cycle`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextMode: WarpMode =
                                      clip.warp?.mode === 'project_locked'
                                        ? 'free'
                                        : clip.warp?.mode === 'free'
                                        ? 'beat_locked'
                                        : 'project_locked';
                                    updateProject(setClipWarpMode(project, clip.id, nextMode));
                                  }}
                                >
                                  {clip.warp.mode === 'project_locked'
                                    ? 'WARP: PROJ'
                                    : clip.warp.mode === 'beat_locked'
                                    ? 'WARP: BEAT'
                                    : 'WARP: OFF'}
                                  {clip.warp.mode === 'project_locked' && (
                                    <span style={{ opacity: 0.8, marginLeft: '3px' }}>
                                      {(clip.warp.stretchRatio * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </span>
                              )}

                              <span className="creator-clip-duration">
                                {clip.duration.toFixed(1)}s
                              </span>
                            </div>

                            {/* Slip Edit Control Bar */}
                            <div
                              className="creator-clip-slip-zone"
                              title="Drag or click arrows to Slip Audio (Source window shifts non-destructively)"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveDragState({
                                  clipId: clip.id,
                                  type: 'slip',
                                  startX: e.clientX,
                                  initialTimelineStart: clip.timelineStart,
                                  initialDuration: clip.duration,
                                  initialSourceStart: clip.sourceStart,
                                  initialSourceEnd: clip.sourceEnd,
                                });
                              }}
                            >
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProject(slipClip(project, clip.id, -0.25));
                                }}
                                style={{ cursor: 'pointer', padding: '0 2px' }}
                                title="Nudge Slip Earlier"
                              >
                                ◂
                              </span>
                              <span>SLIP {clip.sourceStart.toFixed(1)}s</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProject(slipClip(project, clip.id, 0.25));
                                }}
                                style={{ cursor: 'pointer', padding: '0 2px' }}
                                title="Nudge Slip Later"
                              >
                                ▸
                              </span>
                            </div>

                            {/* Waveform Peak Ribbon with Dynamic Gain Reactivity & Warp Markers */}
                            <div
                              className="creator-clip-waveform"
                              style={{
                                filter: clip.gain > 1.0 ? 'drop-shadow(0 0 4px rgba(138, 92, 246, 0.6))' : 'none',
                                position: 'relative',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const pct = Math.max(0, Math.min(1, clickX / rect.width));
                                const sourceTime = clip.sourceStart + pct * (clip.sourceEnd - clip.sourceStart);
                                updateProject(addClipWarpMarker(project, clip.id, sourceTime));
                              }}
                              title="Double-click waveform to drop a manual Warp Marker"
                            >
                              {Array.from({ length: Math.min(32, Math.floor(widthPx / 6)) }).map((_, i) => {
                                const baseHeight = Math.sin(i * 0.45) * 80 + 20;
                                const scaledHeight = Math.min(100, Math.max(10, baseHeight * clip.gain));
                                return (
                                  <div
                                    key={i}
                                    className="creator-clip-bar"
                                    style={{
                                      height: `${scaledHeight}%`,
                                      background:
                                        clip.gain > 1.2
                                          ? 'var(--color-accent-iris, #a78bfa)'
                                          : 'rgba(255, 255, 255, 0.75)',
                                    }}
                                  />
                                );
                              })}

                              {/* Render Warp Markers */}
                              {clip.warp && clip.warp.markers.map((marker) => {
                                const sourceSpan = clip.sourceEnd - clip.sourceStart;
                                if (sourceSpan <= 0) return null;
                                const pct = ((marker.sourceTime - clip.sourceStart) / sourceSpan) * 100;
                                if (pct < 0 || pct > 100) return null;

                                const isAnchor = marker.type === 'anchor';
                                const isDownbeat = marker.type === 'detected-downbeat';

                                return (
                                  <div
                                    key={marker.id}
                                    className={`creator-warp-marker-pin ${isAnchor ? 'is-anchor' : ''} ${isDownbeat ? 'is-downbeat' : ''}`}
                                    style={{ left: `${pct}%` }}
                                    title={`Warp Marker: ${marker.type} @ source ${marker.sourceTime.toFixed(2)}s (Beat ${marker.musicalBeat}) • Double-click to remove`}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      updateProject(deleteClipWarpMarker(project, clip.id, marker.id));
                                    }}
                                  >
                                    <div className="creator-warp-marker-head" />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Clip Footer */}
                            <div className="creator-clip-footer">
                              <span>
                                {clip.sourceStart.toFixed(1)}s - {clip.sourceEnd.toFixed(1)}s
                              </span>
                              <span>Vol: {Math.round(clip.gain * 100)}%</span>
                            </div>

                            {/* Trim Handle: End */}
                            <div
                              className={`creator-trim-handle end ${
                                activeDragState?.clipId === clip.id &&
                                activeDragState.type === 'trim-end'
                                  ? 'is-active'
                                  : ''
                              }`}
                              title="Drag to trim end (Arrow keys to nudge)"
                              tabIndex={0}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveDragState({
                                  clipId: clip.id,
                                  type: 'trim-end',
                                  startX: e.clientX,
                                  initialTimelineStart: clip.timelineStart,
                                  initialDuration: clip.duration,
                                  initialSourceStart: clip.sourceStart,
                                  initialSourceEnd: clip.sourceEnd,
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowRight') {
                                  e.stopPropagation();
                                  updateProject(
                                    trimClipEnd(project, clip.id, clip.duration + 0.25, snapMode)
                                  );
                                } else if (e.key === 'ArrowLeft') {
                                  e.stopPropagation();
                                  updateProject(
                                    trimClipEnd(
                                      project,
                                      clip.id,
                                      Math.max(0.2, clip.duration - 0.25),
                                      snapMode
                                    )
                                  );
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Automation Lane (Overlay / Sub-lane) */}
                    {isAutomationActive && (
                      <div
                        className="creator-automation-lane-container"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const clickY = e.clientY - rect.top;
                          const time = Math.max(0, clickX / PIXELS_PER_SECOND);
                          const normalizedY = 1 - Math.max(0, Math.min(1, clickY / rect.height));
                          const val =
                            activeAutomationParam === 'pan'
                              ? normalizedY * 2 - 1
                              : normalizedY;

                          updateProject(
                            addAutomationPoint(project, track.id, activeAutomationParam, time, val)
                          );
                        }}
                        title="Click anywhere to add an automation point"
                      >
                        <div className="creator-automation-header-bar">
                          <span>PARAMETER FILAMENT: {activeAutomationParam.toUpperCase()}</span>
                          <select
                            className="creator-automation-param-select"
                            value={activeAutomationParam}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setActiveAutomationParam(e.target.value as 'volume' | 'pan')
                            }
                          >
                            <option value="volume">Volume (0.0 to 1.0)</option>
                            <option value="pan">Pan (-1.0 to 1.0)</option>
                          </select>
                        </div>

                        {/* Living Filament SVG Line */}
                        {(() => {
                          const lane = track.automationLanes?.find(
                            (l) => l.parameter === activeAutomationParam
                          );
                          const points = lane?.points || [
                            { id: 'def', time: 0, value: activeAutomationParam === 'pan' ? 0 : 0.85 },
                          ];
                          const sortedPoints = [...points].sort((a, b) => a.time - b.time);

                          const laneHeight = 36;
                          const svgPoints = sortedPoints.map((pt) => {
                            const x = pt.time * PIXELS_PER_SECOND;
                            const normVal =
                              activeAutomationParam === 'pan'
                                ? (pt.value + 1) / 2
                                : pt.value;
                            const y = (1 - Math.max(0, Math.min(1, normVal))) * (laneHeight - 8) + 4;
                            return { x, y, pt };
                          });

                          const pathD =
                            svgPoints.length > 0
                              ? `M 0 ${svgPoints[0].y} ` +
                                svgPoints.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                                ` L ${timelineWidth} ${svgPoints[svgPoints.length - 1].y}`
                              : `M 0 ${laneHeight / 2} L ${timelineWidth} ${laneHeight / 2}`;

                          return (
                            <>
                              <svg
                                className="creator-automation-svg"
                                style={{ width: `${timelineWidth}px` }}
                              >
                                <path d={pathD} className="creator-automation-filament" />
                              </svg>

                              {svgPoints.map(({ x, y, pt }) => (
                                <div
                                  key={pt.id}
                                  className="creator-automation-point-handle"
                                  style={{ left: `${x}px`, top: `${y + 12}px` }}
                                  title={`Point: ${pt.time.toFixed(1)}s, ${pt.value.toFixed(2)} (Double-click to delete)`}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    updateProject(
                                      deleteAutomationPoint(
                                        project,
                                        track.id,
                                        activeAutomationParam,
                                        pt.id
                                      )
                                    );
                                  }}
                                />
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Milestone 5.3 Arrangement Intelligence Floating Surface */}
      {isArrangementIntelOpen && (
        <section
          className="creator-arrangement-surface"
          aria-label="SONORA Arrangement Intelligence Surface"
        >
          <div className="creator-intel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="creator-project-badge">Arrangement Intelligence</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {project.name} • {project.tempo} BPM • {project.key || 'Am'} ({CAMELOT_MAP[project.key || 'Am'] || '8A'})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Quick Musical Duplication Actions */}
              {selectedClip && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() =>
                      updateProject(quantizedDuplicateClip(project, selectedClip.clip.id, '1-bar', snapMode))
                    }
                    title="Duplicate by 1 Bar"
                  >
                    ⧉ 1 Bar
                  </button>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() =>
                      updateProject(quantizedDuplicateClip(project, selectedClip.clip.id, '2-bars', snapMode))
                    }
                    title="Duplicate by 2 Bars"
                  >
                    ⧉ 2 Bars
                  </button>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() =>
                      updateProject(quantizedDuplicateClip(project, selectedClip.clip.id, '4-bars', snapMode))
                    }
                    title="Duplicate by 4 Bars"
                  >
                    ⧉ 4 Bars
                  </button>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() =>
                      updateProject(quantizedDuplicateClip(project, selectedClip.clip.id, 'phrase', snapMode))
                    }
                    title="Duplicate by 8-Bar Phrase (P key)"
                  >
                    ⧉ Phrase (8 Bars)
                  </button>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() => {
                      const phraseDur = getPhraseDuration(project.tempo, project.timeSignature, 8);
                      updateProject(
                        duplicatePhrase(
                          project,
                          selectedClip.track.id,
                          selectedClip.clip.timelineStart,
                          phraseDur
                        )
                      );
                    }}
                    title="Duplicate all clips in this phrase across the lane"
                  >
                    ⧉ Phrase Lane
                  </button>
                </div>
              )}

              {/* Add Section Action */}
              <button
                type="button"
                className="creator-action-btn"
                onClick={() => {
                  const phraseSec = getPhraseDuration(project.tempo, project.timeSignature, 8);
                  const newStart = playheadTime;
                  const newEnd = playheadTime + phraseSec;
                  const count = (project.sections?.length || 0) + 1;
                  updateProject(
                    createSection(project, {
                      name: `Section ${count}`,
                      type: 'custom',
                      start: newStart,
                      end: newEnd,
                      energy: 0.7,
                      confidence: 1.0,
                    })
                  );
                }}
                title="Create a new arrangement section at playhead"
              >
                ＋ Add Section
              </button>
            </div>
          </div>

          {/* Selected Section Editor & Regional Controls */}
          {selectedSection && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                marginBottom: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--color-accent-cyan)', fontWeight: 600 }}>
                Selected Section:
              </span>
              <input
                type="text"
                className="creator-project-title-input"
                style={{ fontSize: '11px', padding: '3px 8px', width: '130px' }}
                value={selectedSection.name}
                onChange={(e) => updateProject(renameSection(project, selectedSection.id, e.target.value))}
                aria-label="Section Name"
              />
              <select
                className="creator-automation-param-select"
                value={selectedSection.type}
                onChange={(e) => {
                  const nextType = e.target.value as ArrangementSectionType;
                  const updated = (project.sections || []).map((s) =>
                    s.id === selectedSection.id ? { ...s, type: nextType } : s
                  );
                  updateProject({ ...project, sections: updated });
                }}
                aria-label="Section Type"
              >
                {(
                  ['intro', 'verse', 'build', 'drop', 'break', 'chorus', 'outro', 'custom'] as ArrangementSectionType[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="creator-action-btn"
                onClick={() =>
                  updateProject(
                    repeatRegion(
                      project,
                      selectedSection.start,
                      selectedSection.end - selectedSection.start,
                      1
                    )
                  )
                }
                title="Repeat this entire arrangement section across lanes"
              >
                ⧉ Repeat Section (1x)
              </button>
              <button
                type="button"
                className="creator-action-btn"
                onClick={() => {
                  const clipIds = findIntersectingClips(
                    project,
                    selectedSection.start,
                    selectedSection.end
                  );
                  if (clipIds.length > 0) {
                    setSelectedClipId(clipIds[0]);
                  }
                }}
                title="Focus clips within this section"
              >
                Focus Section Clips ({findIntersectingClips(project, selectedSection.start, selectedSection.end).length})
              </button>
              <button
                type="button"
                className="creator-action-btn"
                style={{ color: 'var(--color-accent-rose)' }}
                onClick={() => {
                  updateProject(deleteSection(project, selectedSection.id));
                  setSelectedSectionId(null);
                }}
                title="Delete Section"
              >
                ✕ Remove Section
              </button>
            </div>
          )}

          <div className="creator-intel-grid">
            {/* Metric 1: Active Section Context */}
            <div className="creator-intel-card">
              <span className="creator-intel-label">Active Section</span>
              <div className="creator-intel-value">
                <span>{currentSection ? currentSection.name : 'Unassigned'}</span>
                {currentSection && (
                  <span className="creator-section-type-badge">{currentSection.type}</span>
                )}
              </div>
              <span className="creator-intel-desc">
                {currentSection
                  ? `${formatTimelineTime(currentSection.start)} ➔ ${formatTimelineTime(
                      currentSection.end
                    )} (${((currentSection.end - currentSection.start) / getBarDuration(project.tempo, project.timeSignature)).toFixed(0)} bars)`
                  : 'Playhead is in an unassigned arrangement territory.'}
              </span>
            </div>

            {/* Metric 2: Energy Profile & Journey Arc */}
            <div className="creator-intel-card">
              <span className="creator-intel-label">Arrangement Energy Arc</span>
              <div className="creator-intel-value">
                <span style={{ color: 'var(--color-accent-amber)' }}>
                  {energyProfile.arcType === 'low-build-peak-release'
                    ? 'Low ➔ Build ➔ Peak ➔ Release'
                    : energyProfile.arcType === 'dynamic-wave'
                    ? 'Dynamic Wave'
                    : energyProfile.arcType === 'flat'
                    ? 'Steady Ambient'
                    : 'Balanced Progression'}
                </span>
              </div>
              <span className="creator-intel-desc">
                Average energy: {Math.round(energyProfile.overallAverage * 100)}% • Peak:{' '}
                {Math.round(energyProfile.peak * 100)}% across {energyProfile.points.length} sample nodes.
              </span>
            </div>

            {/* Metric 3: Harmonic Compatibility Analysis */}
            <div className="creator-intel-card">
              <span className="creator-intel-label">Harmonic Transition Context</span>
              <div className="creator-intel-value">
                {selectedClip ? (
                  <span>
                    Clip: {selectedClip.clip.metadata?.key || 'Unknown'} (
                    {selectedClip.clip.metadata?.camelot || '?'})
                  </span>
                ) : (
                  <span>Project Root: {project.key || 'Am'}</span>
                )}
              </div>
              <span className="creator-intel-desc">
                {selectedClip?.clip.metadata?.key
                  ? `Analyzed root key with ${Math.round(
                      (selectedClip.clip.metadata.confidence?.key ?? 0.85) * 100
                    )}% confidence.`
                  : 'Select an audio clip to inspect harmonic compatibility.'}
              </span>
            </div>

            {/* Metric 4: Tempo Alignment & Time-Stretch / Warp Readiness */}
            <div className="creator-intel-card">
              <span className="creator-intel-label">Tempo & Warp State</span>
              {selectedClip ? (
                (() => {
                  const tempoEval = evaluateTempoCompatibility(
                    selectedClip.clip.metadata?.bpm,
                    project.tempo,
                    selectedClip.clip.metadata?.confidence?.bpm
                  );
                  const warp = selectedClip.clip.warp;
                  return (
                    <>
                      <div className="creator-intel-value">
                        <span
                          style={{
                            color:
                              tempoEval.state === 'match'
                                ? 'var(--color-accent-emerald)'
                                : tempoEval.state === 'near'
                                ? 'var(--color-accent-amber)'
                                : 'var(--color-accent-rose)',
                          }}
                        >
                          {warp?.mode.toUpperCase().replace('_', ' ') || tempoEval.label}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                          ({warp ? (warp.stretchRatio * 100).toFixed(1) + '%' : tempoEval.ratio + 'x'})
                        </span>
                      </div>
                      <span className="creator-intel-desc">
                        {warp
                          ? `${warp.mode === 'project_locked' ? 'Locked to project clock' : warp.mode === 'beat_locked' ? 'Locked to beat grid' : 'Free source time'} • ${warp.quality} quality • ${warp.pitchLocked ? 'Pitch locked' : 'Varispeed'}`
                          : tempoEval.description}
                      </span>
                    </>
                  );
                })()
              ) : (
                <>
                  <div className="creator-intel-value">Project Clock: {project.tempo} BPM</div>
                  <span className="creator-intel-desc">
                    Grid synchronized across 4/4 musical divisions.
                  </span>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Contextual Acoustic Transformation Spine (Processing Dock from M5.2) */}
      {selectedTrack && (
        <section
          className="creator-processing-dock"
          aria-label={`Processing spine for ${selectedTrack.name}`}
        >
          <div className="creator-spine-header">
            <div className="creator-spine-title-group">
              <span className="creator-project-badge" style={{ color: selectedTrack.colorToken }}>
                {selectedTrack.name}
              </span>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                Acoustic Transformation Spine
              </h4>
            </div>

            <div className="creator-spine-flow-diagram">
              <span>SIGNAL PATH: </span>
              <strong>SOURCE</strong> ➔ <strong>EQ</strong> ➔ <strong>FILTER</strong> ➔{' '}
              <strong>COMP</strong> ➔ <strong>SAT</strong> ➔ <strong>DELAY</strong> ➔{' '}
              <strong>REVERB</strong> ➔ <strong>LIMIT</strong> ➔ <strong>MASTER</strong>
            </div>

            <button
              type="button"
              className="creator-action-btn"
              onClick={() => {
                const procs = selectedTrack.processingChain?.processors || [];
                const types: TrackProcessorType[] = [
                  'eq',
                  'filter',
                  'compressor',
                  'saturation',
                  'delay',
                  'reverb',
                  'limiter',
                ];
                const nextType = types.find((t) => !procs.some((p) => p.type === t)) || 'eq';
                updateProject(addTrackProcessor(project, selectedTrack.id, nextType));
              }}
              title="Add a new acoustic transformation processor"
            >
              ＋ Add Processor
            </button>
          </div>

          <div className="creator-spine-chain">
            {(selectedTrack.processingChain?.processors || []).map((proc, index) => {
              const isBypassed = !!proc.bypassed;

              return (
                <div
                  key={proc.id}
                  className={`creator-processor-node ${isBypassed ? 'is-bypassed' : ''}`}
                >
                  <div className="creator-node-header">
                    <span className="creator-node-title">{proc.name || proc.type}</span>
                    <button
                      type="button"
                      className={`creator-node-power-btn ${!isBypassed ? 'is-active' : ''}`}
                      onClick={() =>
                        updateProject(
                          bypassTrackProcessor(project, selectedTrack.id, proc.id, !isBypassed)
                        )
                      }
                      title={isBypassed ? 'Engage Processor' : 'Bypass Processor'}
                      aria-label={`${proc.name} bypass toggle`}
                    >
                      ⏻
                    </button>
                  </div>

                  {/* Processor Parameter Sliders */}
                  <div className="creator-node-params">
                    {proc.type === 'eq' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Low Shelf</span>
                            <span>{Number(proc.params.lowGain || 0).toFixed(0)} dB</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={Number(proc.params.lowGain || 0)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  lowGain: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Mid Peak</span>
                            <span>{Number(proc.params.midGain || 0).toFixed(0)} dB</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={Number(proc.params.midGain || 0)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  midGain: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>High Shelf</span>
                            <span>{Number(proc.params.highGain || 0).toFixed(0)} dB</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={Number(proc.params.highGain || 0)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  highGain: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {proc.type === 'filter' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Cutoff</span>
                            <span>{Math.round(Number(proc.params.cutoff || 2000))} Hz</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="100"
                            max="12000"
                            step="50"
                            value={Number(proc.params.cutoff || 2000)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  cutoff: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Resonance (Q)</span>
                            <span>{Number(proc.params.resonance || 1).toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0.5"
                            max="10"
                            step="0.1"
                            value={Number(proc.params.resonance || 1)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  resonance: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {proc.type === 'compressor' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Threshold</span>
                            <span>{Number(proc.params.threshold || -18).toFixed(0)} dB</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="-40"
                            max="0"
                            step="1"
                            value={Number(proc.params.threshold || -18)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  threshold: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Ratio</span>
                            <span>{Number(proc.params.ratio || 4).toFixed(0)}:1</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="1"
                            max="20"
                            step="0.5"
                            value={Number(proc.params.ratio || 4)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  ratio: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {proc.type === 'saturation' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Drive</span>
                            <span>{Math.round(Number(proc.params.drive || 0.3) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0"
                            max="1"
                            step="0.02"
                            value={Number(proc.params.drive || 0.3)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  drive: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Mix</span>
                            <span>{Math.round(Number(proc.params.mix || 0.5) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0"
                            max="1"
                            step="0.02"
                            value={Number(proc.params.mix || 0.5)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  mix: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {proc.type === 'delay' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Time</span>
                            <span>{Math.round(Number(proc.params.time || 0.3) * 1000)} ms</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0.05"
                            max="1"
                            step="0.02"
                            value={Number(proc.params.time || 0.3)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  time: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Feedback</span>
                            <span>{Math.round(Number(proc.params.feedback || 0.4) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0"
                            max="0.85"
                            step="0.02"
                            value={Number(proc.params.feedback || 0.4)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  feedback: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {proc.type === 'reverb' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Decay</span>
                            <span>{Number(proc.params.decay || 2).toFixed(1)} s</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={Number(proc.params.decay || 2)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  decay: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Mix</span>
                            <span>{Math.round(Number(proc.params.mix || 0.35) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="0"
                            max="1"
                            step="0.02"
                            value={Number(proc.params.mix || 0.35)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  mix: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    {proc.type === 'limiter' && (
                      <>
                        <div className="creator-param-row">
                          <div className="creator-param-label-row">
                            <span>Ceiling</span>
                            <span>{Number(proc.params.ceiling || -0.5).toFixed(1)} dB</span>
                          </div>
                          <input
                            type="range"
                            className="creator-param-slider"
                            min="-6"
                            max="0"
                            step="0.1"
                            value={Number(proc.params.ceiling || -0.5)}
                            onChange={(e) =>
                              updateProject(
                                updateTrackProcessorParams(project, selectedTrack.id, proc.id, {
                                  ceiling: parseFloat(e.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="creator-node-footer">
                    <button
                      type="button"
                      className="creator-node-order-btn"
                      disabled={index === 0}
                      onClick={() => {
                        const procs = [...(selectedTrack.processingChain?.processors || [])];
                        const [moved] = procs.splice(index, 1);
                        procs.splice(index - 1, 0, moved);
                        updateProject(
                          reorderTrackProcessors(project, selectedTrack.id, procs.map((p) => p.id))
                        );
                      }}
                      title="Move Processor Earlier"
                    >
                      ◂
                    </button>
                    <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      className="creator-node-order-btn"
                      disabled={
                        index === (selectedTrack.processingChain?.processors.length || 1) - 1
                      }
                      onClick={() => {
                        const procs = [...(selectedTrack.processingChain?.processors || [])];
                        const [moved] = procs.splice(index, 1);
                        procs.splice(index + 1, 0, moved);
                        updateProject(
                          reorderTrackProcessors(project, selectedTrack.id, procs.map((p) => p.id))
                        );
                      }}
                      title="Move Processor Later"
                    >
                      ▸
                    </button>
                    <button
                      type="button"
                      className="creator-node-order-btn"
                      style={{ color: 'var(--color-accent-rose)' }}
                      onClick={() =>
                        updateProject(removeTrackProcessor(project, selectedTrack.id, proc.id))
                      }
                      title="Remove Processor"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Contextual Warp Inspector (when clip selected) */}
      {selectedClip && selectedClip.clip.warp && (
        <section
          className="creator-warp-inspector"
          style={{ margin: '0 24px 8px 24px' }}
          aria-label={`Warp Inspector for ${selectedClip.clip.metadata?.title || 'Selected Clip'}`}
        >
          <div className="creator-warp-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="creator-project-badge" style={{ background: 'rgba(138, 92, 246, 0.25)', color: 'var(--color-accent-iris)' }}>
                WARP INSPECTOR
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {selectedClip.clip.metadata?.title || 'Clip'} • Source: {selectedClip.clip.warp.sourceBpm} BPM ➔ Project: {project.tempo} BPM
              </span>
              {selectedClip.clip.warp.mode === 'project_locked' && (
                <span className="creator-warp-meta-pill" style={{ color: 'var(--color-accent-cyan)' }}>
                  Stretch: {(selectedClip.clip.warp.stretchRatio * 100).toFixed(1)}% (
                  {(1 / selectedClip.clip.warp.stretchRatio).toFixed(2)}x duration)
                </span>
              )}
              {selectedClip.clip.warp.mode === 'project_locked' &&
                (selectedClip.clip.warp.stretchRatio < 0.6 || selectedClip.clip.warp.stretchRatio > 1.6) && (
                  <span className="creator-warp-extreme-badge">
                    ⚠ EXTREME STRETCH
                  </span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="creator-warp-meta-pill">
                Markers: {selectedClip.clip.warp.markers.length} ({selectedClip.clip.warp.sourceBpmConfidence && selectedClip.clip.warp.sourceBpmConfidence < 0.5 ? 'LOW CONF' : 'HIGH CONF'})
              </span>
              <button
                type="button"
                className="creator-action-btn"
                onClick={() => updateProject(resetClipWarp(project, selectedClip.clip.id))}
                title="Reset Warp Markers to initial detected analysis"
              >
                ↺ Reset Warp
              </button>
            </div>
          </div>

          <div className="creator-warp-controls-row">
            {/* Mode Selectors */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginRight: '4px' }}>MODE:</span>
              {(['free', 'beat_locked', 'project_locked'] as WarpMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`creator-warp-mode-btn ${selectedClip.clip.warp?.mode === mode ? 'is-active' : ''}`}
                  onClick={() => updateProject(setClipWarpMode(project, selectedClip.clip.id, mode))}
                >
                  {mode.toUpperCase().replace('_', ' ')}
                </button>
              ))}
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            {/* Pitch Lock Toggle */}
            <button
              type="button"
              className={`creator-warp-mode-btn ${selectedClip.clip.warp.pitchLocked ? 'is-active' : ''}`}
              onClick={() => updateProject(toggleClipPitchLock(project, selectedClip.clip.id))}
              title="When enabled, pitch is preserved during time-stretching (Shift+W)"
            >
              {selectedClip.clip.warp.pitchLocked ? '🔒 PITCH LOCKED' : '⚡ VARISPEED'}
            </button>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            {/* Quality Picker */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginRight: '4px' }}>DSP QUALITY:</span>
              {(['draft', 'balanced', 'quality'] as WarpQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`creator-warp-mode-btn ${selectedClip.clip.warp?.quality === q ? 'is-active' : ''}`}
                  onClick={() => updateProject(setClipWarpQuality(project, selectedClip.clip.id, q))}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            {/* Manual Source BPM Input */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>MANUAL BPM:</span>
              <input
                type="number"
                min="40"
                max="240"
                step="1"
                className="creator-project-tempo-input"
                style={{ width: '56px', fontSize: '11px', padding: '2px 4px' }}
                value={selectedClip.clip.warp.manualBpm ?? selectedClip.clip.warp.sourceBpm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 30 && val <= 300) {
                    updateProject(setClipManualBpm(project, selectedClip.clip.id, val));
                  }
                }}
                title="Override detected source BPM for musical warping"
              />
            </div>
          </div>
        </section>
      )}

      {/* 6. Action Toolbar & Contextual Selected Clip Controls */}
      <footer className="creator-bottom-bar">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="creator-action-btn is-primary"
            onClick={() => setIsStagingOpen(!isStagingOpen)}
          >
            {isStagingOpen ? '✕ Close Ingestion' : '＋ Ingest Sonic Matter'}
          </button>

          <button
            type="button"
            className="creator-action-btn"
            onClick={() => updateProject(addTrack(project))}
          >
            ＋ Add Audio Lane
          </button>

          <button
            type="button"
            className="creator-action-btn"
            onClick={() =>
              updateProject(
                addMarker(
                  project,
                  playheadTime,
                  `Section ${project.markers.length + 1}`,
                  'section'
                )
              )
            }
          >
            ⚐ Drop Marker (M)
          </button>
        </div>

        {selectedClip && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-accent-iris)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Clip: {selectedClip.clip.metadata?.title || 'Selected'}
            </span>

            {/* Fade In Curve Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Fade In:</span>
              <select
                className="creator-automation-param-select"
                value={selectedClip.clip.fadeInCurve || 'equal-power'}
                onChange={(e) =>
                  updateProject(
                    setClipFadeCurves(
                      project,
                      selectedClip.clip.id,
                      e.target.value as FadeCurve,
                      selectedClip.clip.fadeOutCurve
                    )
                  )
                }
              >
                <option value="equal-power">EQ-Power In</option>
                <option value="linear">Linear In</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
              </select>
            </div>

            {/* Fade Out Curve Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Fade Out:</span>
              <select
                className="creator-automation-param-select"
                value={selectedClip.clip.fadeOutCurve || 'equal-power'}
                onChange={(e) =>
                  updateProject(
                    setClipFadeCurves(
                      project,
                      selectedClip.clip.id,
                      selectedClip.clip.fadeInCurve,
                      e.target.value as FadeCurve
                    )
                  )
                }
              >
                <option value="equal-power">EQ-Power Out</option>
                <option value="linear">Linear Out</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
              </select>
            </div>

            {/* Gain Adjustment */}
            <button
              type="button"
              className="creator-action-btn"
              onClick={() => {
                const nextGain = selectedClip.clip.gain >= 1.5 ? 0.5 : selectedClip.clip.gain + 0.25;
                updateProject(setClipGain(project, selectedClip.clip.id, nextGain));
              }}
              title="Cycle Gain"
            >
              Gain: {Math.round(selectedClip.clip.gain * 100)}%
            </button>

            {/* Slip Nudges */}
            <button
              type="button"
              className="creator-action-btn"
              onClick={() => updateProject(slipClip(project, selectedClip.clip.id, -0.5))}
              title="Slip audio source earlier"
            >
              ◂ Slip -0.5s
            </button>
            <button
              type="button"
              className="creator-action-btn"
              onClick={() => updateProject(slipClip(project, selectedClip.clip.id, 0.5))}
              title="Slip audio source later"
            >
              Slip +0.5s ▸
            </button>

            <button
              type="button"
              className="creator-action-btn"
              onClick={() => updateProject(splitClip(project, selectedClip.clip.id, playheadTime))}
              title="Split at playhead (S key)"
            >
              ✂ Split
            </button>

            <button
              type="button"
              className="creator-action-btn"
              onClick={() =>
                updateProject(
                  quantizedDuplicateClip(project, selectedClip.clip.id, '1-bar', snapMode)
                )
              }
              title="Duplicate by 1 bar (D key)"
            >
              ⧉ Duplicate
            </button>

            <button
              type="button"
              className="creator-action-btn"
              style={{ color: 'var(--color-accent-rose)' }}
              onClick={() => {
                updateProject(deleteClip(project, selectedClip.clip.id));
                setSelectedClipId(null);
              }}
              title="Delete Clip (Delete / Backspace)"
            >
              🗑 Delete
            </button>
          </div>
        )}
      </footer>

      {/* 6. Rights-Aware Source Ingestion Staging Drawer */}
      {isStagingOpen && (
        <section className="creator-staging-drawer" aria-label="Acoustic Matter Ingestion Drawer">
          <div className="creator-staging-header">
            <h3 className="creator-staging-title">Acoustic Matter Ingestion (Rights-Guarded)</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Target Lane: <strong>{selectedTrack?.name || 'Default Lane'}</strong>
            </span>
          </div>

          <div className="creator-staging-grid">
            {SEED_TRACKS.slice(0, 8).map((track) => {
              const canEdit = canUseTrack(track, 'edit');

              return (
                <div
                  key={track.id}
                  className={`creator-source-card ${!canEdit ? 'is-listen-only' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="creator-source-title">{track.title}</div>
                      <div className="creator-source-artist">{track.creatorName || track.artistId}</div>
                    </div>
                    <span className={`creator-source-rights-badge ${canEdit ? 'editable' : 'listen-only'}`}>
                      {canEdit ? 'EDITABLE' : 'LISTEN ONLY'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                    <span>{track.bpm || 120} BPM</span>
                    <span>Key: {track.key || 'Am'}</span>
                    <span>Source: {track.source}</span>
                  </div>

                  <p className="creator-source-rights-desc">
                    {canEdit
                      ? '✓ Authorized for non-destructive arrangement & derivative performance.'
                      : '⚠ Editing unavailable for this source — Rights restricted to streaming.'}
                  </p>

                  <button
                    type="button"
                    className="creator-action-btn is-primary"
                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                    onClick={() => handleStageTrack(track)}
                    disabled={!canEdit}
                  >
                    {canEdit ? '＋ Stage into Timeline' : 'Editing Unavailable'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. M5.5 Audio Rendering, Export & Stem Bouncing Surface */}
      {isRenderDialogOpen && (
        <div
          className="creator-render-backdrop"
          onClick={() => {
            if (!renderProgress || renderProgress.stage === 'complete' || renderProgress.stage === 'error') {
              setIsRenderDialogOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="SONORA Audio Rendering & Export Horizon"
        >
          <div className="creator-render-modal" onClick={(e) => e.stopPropagation()}>
            <div className="creator-render-modal-header">
              <div className="creator-render-modal-title">
                <span className="creator-project-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--color-accent-cyan)' }}>
                  OFFLINE RENDER
                </span>
                <span>Export & Stem Bouncing</span>
              </div>
              <button
                type="button"
                className="creator-action-btn"
                onClick={() => {
                  if (renderProgress && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error') {
                    handleCancelRender();
                  }
                  setIsRenderDialogOpen(false);
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="creator-render-modal-body">
              {/* Error Box */}
              {renderError && (
                <div className="creator-render-error-box" role="alert">
                  <strong>Render Error:</strong> {renderError}
                </div>
              )}

              {/* Mode Selection: Mixdown vs Stem */}
              <div className="creator-render-group">
                <span className="creator-render-group-label">Render Target</span>
                <div className="creator-render-btn-group">
                  <button
                    type="button"
                    className={`creator-render-option-btn ${renderSettings.mode === 'mixdown' ? 'is-active' : ''}`}
                    onClick={() => setRenderSettings({ ...renderSettings, mode: 'mixdown' })}
                    disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                  >
                    <span>Full Mixdown (Stereo Master)</span>
                  </button>
                  <button
                    type="button"
                    className={`creator-render-option-btn ${renderSettings.mode === 'stem' ? 'is-active' : ''}`}
                    onClick={() =>
                      setRenderSettings({
                        ...renderSettings,
                        mode: 'stem',
                        trackId: renderSettings.trackId || project.tracks[0]?.id,
                      })
                    }
                    disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                  >
                    <span>Stem Bounce (Isolated Track)</span>
                  </button>
                </div>
              </div>

              {/* Target Track for Stem Mode */}
              {renderSettings.mode === 'stem' && (
                <div className="creator-render-group">
                  <span className="creator-render-group-label">Target Stem Track</span>
                  <select
                    className="creator-automation-param-select"
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                    value={renderSettings.trackId || project.tracks[0]?.id}
                    onChange={(e) => setRenderSettings({ ...renderSettings, trackId: e.target.value })}
                    disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                  >
                    {project.tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.clips.length} clips)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Range Selection: Project vs Selection */}
              <div className="creator-render-group">
                <span className="creator-render-group-label">Timeline Boundary</span>
                <div className="creator-render-btn-group">
                  <button
                    type="button"
                    className={`creator-render-option-btn ${renderSettings.range === 'project' ? 'is-active' : ''}`}
                    onClick={() => setRenderSettings({ ...renderSettings, range: 'project' })}
                    disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                  >
                    Entire Project (0.0s ➔ {project.duration.toFixed(1)}s)
                  </button>
                  <button
                    type="button"
                    className={`creator-render-option-btn ${renderSettings.range === 'selection' ? 'is-active' : ''}`}
                    onClick={() =>
                      setRenderSettings({
                        ...renderSettings,
                        range: 'selection',
                        customRange: renderSettings.customRange || {
                          startProjectTime: 0,
                          endProjectTime: Math.min(project.duration, 16),
                        },
                      })
                    }
                    disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                  >
                    Custom Range
                  </button>
                </div>

                {renderSettings.range === 'selection' && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Start (s):</span>
                      <input
                        type="number"
                        min="0"
                        max={project.duration}
                        step="0.5"
                        className="creator-project-tempo-input"
                        style={{ width: '64px', fontSize: '12px' }}
                        value={renderSettings.customRange?.startProjectTime ?? 0}
                        onChange={(e) =>
                          setRenderSettings({
                            ...renderSettings,
                            customRange: {
                              startProjectTime: Math.max(0, Number(e.target.value)),
                              endProjectTime: renderSettings.customRange?.endProjectTime ?? 16,
                            },
                          })
                        }
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>End (s):</span>
                      <input
                        type="number"
                        min="0.5"
                        max={project.duration}
                        step="0.5"
                        className="creator-project-tempo-input"
                        style={{ width: '64px', fontSize: '12px' }}
                        value={renderSettings.customRange?.endProjectTime ?? Math.min(16, project.duration)}
                        onChange={(e) =>
                          setRenderSettings({
                            ...renderSettings,
                            customRange: {
                              startProjectTime: renderSettings.customRange?.startProjectTime ?? 0,
                              endProjectTime: Math.max(0.5, Number(e.target.value)),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quality & Format: Sample Rate & Bit Depth */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="creator-render-group">
                  <span className="creator-render-group-label">Sample Rate</span>
                  <div className="creator-render-btn-group">
                    {([44100, 48000] as const).map((sr) => (
                      <button
                        key={sr}
                        type="button"
                        className={`creator-render-option-btn ${renderSettings.sampleRate === sr ? 'is-active' : ''}`}
                        onClick={() => setRenderSettings({ ...renderSettings, sampleRate: sr })}
                        disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                      >
                        {sr === 44100 ? '44.1 kHz' : '48.0 kHz'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="creator-render-group">
                  <span className="creator-render-group-label">Bit Depth (WAV)</span>
                  <div className="creator-render-btn-group">
                    {([16, 24, 32] as const).map((bd) => (
                      <button
                        key={bd}
                        type="button"
                        className={`creator-render-option-btn ${renderSettings.bitDepth === bd ? 'is-active' : ''}`}
                        onClick={() => setRenderSettings({ ...renderSettings, bitDepth: bd })}
                        disabled={renderProgress !== null && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error'}
                      >
                        {bd === 16 ? '16-bit' : bd === 24 ? '24-bit' : '32-bit Float'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Horizon */}
              {renderProgress && (
                <div className="creator-render-progress-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                      {renderProgress.message}
                    </span>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent-cyan)' }}>
                      {Math.round(renderProgress.progress * 100)}%
                    </span>
                  </div>
                  <div className="creator-render-progress-bar-bg">
                    <div
                      className="creator-render-progress-bar-fill"
                      style={{ width: `${renderProgress.progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Render Result Meta Pills */}
              {renderResult && (
                <div className="creator-render-group">
                  <span className="creator-render-group-label" style={{ color: 'var(--color-accent-emerald)' }}>
                    ✓ Render Output Ready
                  </span>
                  <div className="creator-render-meta-grid">
                    <div className="creator-render-meta-card">
                      <span className="creator-render-meta-title">Duration</span>
                      <span className="creator-render-meta-val">{renderResult.duration.toFixed(2)}s</span>
                    </div>
                    <div className="creator-render-meta-card">
                      <span className="creator-render-meta-title">File Size</span>
                      <span className="creator-render-meta-val">
                        {(renderResult.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="creator-render-meta-card">
                      <span className="creator-render-meta-title">Format</span>
                      <span className="creator-render-meta-val">
                        WAV {renderResult.bitDepth}-bit / {(renderResult.sampleRate / 1000).toFixed(1)}kHz
                      </span>
                    </div>
                    <div className="creator-render-meta-card">
                      <span className="creator-render-meta-title">Channels</span>
                      <span className="creator-render-meta-val">Stereo (2 Ch)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="creator-render-modal-footer">
              {renderProgress && renderProgress.stage !== 'complete' && renderProgress.stage !== 'error' ? (
                <button
                  type="button"
                  className="creator-action-btn"
                  style={{ color: 'var(--color-accent-rose)' }}
                  onClick={handleCancelRender}
                >
                  Cancel Render
                </button>
              ) : renderResult ? (
                <>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() => {
                      setRenderResult(null);
                      setRenderProgress(null);
                    }}
                  >
                    ↺ Reset
                  </button>
                  <a
                    href={renderResult.url}
                    download={renderResult.filename}
                    className="creator-action-btn is-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    ⬇ Download WAV ({renderResult.filename})
                  </a>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="creator-action-btn"
                    onClick={() => setIsRenderDialogOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="creator-action-btn is-primary"
                    onClick={handleStartRender}
                  >
                    ▶ Render Offline Audio
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
