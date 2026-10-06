/**
 * SONORA DJWorkspace Component
 * Authoritative Reference: PRD.md Section 19, DESIGN_SYSTEM.md, PRODUCT_ARCHITECTURE.md, Milestone 3.5
 * 
 * Orchestrator of the Professional Multi-Environment DJ System:
 * - Single source of truth: AudioEngine + Shared React State
 * - Three selectable visual instrument environments:
 *   1. ORGANIC ORBITAL — Celestial circular plinths, gravity core, orbital crossfader
 *   2. LIQUID INSTRUMENT — Viscous fluid membranes, liquid columns, capillary stream crossfader
 *   3. ACOUSTIC ORGANISM — Bio-acoustic filaments, breathing resonant spine, wave crossfader
 * - Zero interruption on environment morph: audio, timecode, EQ, filter, volume, pitch preserved
 * - Decoupled 60fps AudioReactiveCanvas without React state polling
 * - Professional DJ Performance Capabilities:
 *   - Interactive Jog Wheel (Vinyl scratch & CDJ pitch-bend modes)
 *   - Performance Pads (Hot Cue, Auto Loop, Beat Jump, Pad FX)
 *   - Beat System (Beat grid, Downbeats, Quantize, Master/Follower Sync, Slip Mode)
 *   - Hardware Sample-Accurate Looping (1/32 to 32 beats, Manual In/Out/Reloop)
 *   - Channel Trim, Vertical Faders, and Headphone Cue (PFL) Bus
 *   - Master & Booth Output, Headphone Level, Cue/Master mix
 *   - Real DSP FX (Delay with beat divisions, Space Reverb, Crush Drive, Filter Sweep)
 *   - Full Keyboard Performance Shortcuts & Accessibility
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAudioEngine } from '../audio/AudioEngine';
import { loadAudioFile, createSyntheticDemoBuffer } from '../audio/audioLoader';
import { waveformService } from '../audio/waveformService';
import { WaveformData } from '../audio/waveformTypes';
import { FilterType, DeckEQ, DeckFilter, PitchRange, LoopState, DeckFXState, DeckFXType } from '../audio/types';
import { analysisService } from '../audio/analysisService';
import { TrackAnalysis, getHarmonicCompatibility, HarmonicMatchResult } from '../audio/analysisTypes';
import {
  DJEnvironment,
  getStoredDJEnvironment,
  setStoredDJEnvironment,
  SharedDeckState,
  SharedMixerState,
  PadMode,
} from './dj/types';
import { DJEnvironmentSelector } from './dj/DJEnvironmentSelector';
import { AudioReactiveCanvas } from './dj/AudioReactiveCanvas';
import { OrbitalEnvironment } from './dj/environments/OrbitalEnvironment';
import { LiquidEnvironment } from './dj/environments/LiquidEnvironment';
import { OrganismEnvironment } from './dj/environments/OrganismEnvironment';
import './dj/DJEnvironment.css';
import './DJWorkspace.css';

export interface DJWorkspaceProps {
  className?: string;
}

export const DJWorkspace: React.FC<DJWorkspaceProps> = ({ className = '' }) => {
  // 1. Environment Selection & Transition Morph State
  const [activeEnvironment, setActiveEnvironment] = useState<DJEnvironment>(getStoredDJEnvironment);
  const [isMorphing, setIsMorphing] = useState<boolean>(false);
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2. Audio Engine Live Beacon State
  const [audioLive, setAudioLive] = useState<boolean>(false);
  const [audioState, setAudioState] = useState<'suspended' | 'running' | 'closed'>('suspended');

  // 3. Mixer State
  const [crossfaderPosition, setCrossfaderPosition] = useState<number>(0.0);
  const [gainA, setGainA] = useState<number>(Math.SQRT1_2);
  const [gainB, setGainB] = useState<number>(Math.SQRT1_2);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);
  const [boothVolume, setBoothVolume] = useState<number>(0.80);
  const [headphoneVolume, setHeadphoneVolume] = useState<number>(0.80);
  const [cueMasterMix, setCueMasterMix] = useState<number>(0.50);
  const [cueA, setCueA] = useState<boolean>(false);
  const [cueB, setCueB] = useState<boolean>(false);

  // 4. Deck A State
  const [trackNameA, setTrackNameA] = useState<string | null>(null);
  const [artistNameA, setArtistNameA] = useState<string | null>(null);
  const [bpmA, setBpmA] = useState<number | null>(128);
  const [keyA, setKeyA] = useState<string | null>('8A');
  const [waveformA, setWaveformA] = useState<WaveformData | null>(null);
  const [durationA, setDurationA] = useState<number>(0);
  const [currentTimeA, setCurrentTimeA] = useState<number>(0);
  const [isPlayingA, setIsPlayingA] = useState<boolean>(false);
  const [isPausedA, setIsPausedA] = useState<boolean>(false);
  const [isLoadingA, setIsLoadingA] = useState<boolean>(false);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [volumeA, setVolumeA] = useState<number>(1.0);
  const [trimA, setTrimA] = useState<number>(1.0);
  const [eqA, setEqA] = useState<DeckEQ>({ low: 0, mid: 0, high: 0 });
  const [filterA, setFilterA] = useState<DeckFilter>({ type: 'bypass', frequency: 20000, q: 1.0 });
  const [playbackRateA, setPlaybackRateA] = useState<number>(1.0);
  const [pitchRangeA, setPitchRangeA] = useState<PitchRange>(0.10);
  const [keyLockA, setKeyLockA] = useState<boolean>(false);
  const [cueTimeA, setCueTimeA] = useState<number>(0);
  const [hotCuesA, setHotCuesA] = useState<(number | null)[]>([null, null, null, null, null, null, null, null]);
  const [loopA, setLoopA] = useState<LoopState>({ enabled: false, start: 0, end: 0, lengthBeats: 4 });
  const [quantizeA, setQuantizeA] = useState<boolean>(true);
  const [syncA, setSyncA] = useState<boolean>(false);
  const [slipA, setSlipA] = useState<boolean>(false);
  const [vinylModeA, setVinylModeA] = useState<boolean>(true);
  const [activePadModeA, setActivePadModeA] = useState<PadMode>('hotcue');
  const [fxA, setFxA] = useState<DeckFXState>({
    type: 'none',
    enabled: false,
    depth: 0.5,
    beatDivision: 1,
  });

  // 5. Deck B State
  const [trackNameB, setTrackNameB] = useState<string | null>(null);
  const [artistNameB, setArtistNameB] = useState<string | null>(null);
  const [bpmB, setBpmB] = useState<number | null>(122);
  const [keyB, setKeyB] = useState<string | null>('1B');
  const [waveformB, setWaveformB] = useState<WaveformData | null>(null);
  const [durationB, setDurationB] = useState<number>(0);
  const [currentTimeB, setCurrentTimeB] = useState<number>(0);
  const [isPlayingB, setIsPlayingB] = useState<boolean>(false);
  const [isPausedB, setIsPausedB] = useState<boolean>(false);
  const [isLoadingB, setIsLoadingB] = useState<boolean>(false);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [volumeB, setVolumeB] = useState<number>(1.0);
  const [trimB, setTrimB] = useState<number>(1.0);
  const [eqB, setEqB] = useState<DeckEQ>({ low: 0, mid: 0, high: 0 });
  const [filterB, setFilterB] = useState<DeckFilter>({ type: 'bypass', frequency: 20000, q: 1.0 });
  const [playbackRateB, setPlaybackRateB] = useState<number>(1.0);
  const [pitchRangeB, setPitchRangeB] = useState<PitchRange>(0.10);
  const [keyLockB, setKeyLockB] = useState<boolean>(false);
  const [cueTimeB, setCueTimeB] = useState<number>(0);
  const [hotCuesB, setHotCuesB] = useState<(number | null)[]>([null, null, null, null, null, null, null, null]);
  const [loopB, setLoopB] = useState<LoopState>({ enabled: false, start: 0, end: 0, lengthBeats: 4 });
  const [quantizeB, setQuantizeB] = useState<boolean>(true);
  const [syncB, setSyncB] = useState<boolean>(false);
  const [slipB, setSlipB] = useState<boolean>(false);
  const [vinylModeB, setVinylModeB] = useState<boolean>(true);
  const [activePadModeB, setActivePadModeB] = useState<PadMode>('hotcue');
  const [fxB, setFxB] = useState<DeckFXState>({
    type: 'none',
    enabled: false,
    depth: 0.5,
    beatDivision: 1,
  });

  // Audio Intelligence & Analysis State (Milestone 4)
  const [analysisA, setAnalysisA] = useState<TrackAnalysis | null>(null);
  const [analysisB, setAnalysisB] = useState<TrackAnalysis | null>(null);

  const harmonicMatch = useMemo<HarmonicMatchResult>(() => {
    const rawKeyA = analysisA?.key?.key || (keyA ? keyA.split('/')[1]?.trim() || keyA.split('/')[0]?.trim() : 'Am');
    const rawKeyB = analysisB?.key?.key || (keyB ? keyB.split('/')[1]?.trim() || keyB.split('/')[0]?.trim() : 'C');
    return getHarmonicCompatibility(rawKeyA, rawKeyB);
  }, [analysisA, analysisB, keyA, keyB]);

  // Track Master Deck
  const masterDeckId = useMemo<'A' | 'B' | null>(() => {
    if (isPlayingA && !isPlayingB) return 'A';
    if (isPlayingB && !isPlayingA) return 'B';
    if (syncB && !syncA) return 'A';
    if (syncA && !syncB) return 'B';
    return 'A';
  }, [isPlayingA, isPlayingB, syncA, syncB]);

  // Audio Context Unlock helper
  const handleUnlockAudio = useCallback(async () => {
    const engine = getAudioEngine();
    await engine.unlockAudio();
    const live = engine.isAudioLive();
    setAudioLive(live);
    setAudioState(live ? 'running' : 'suspended');
  }, []);

  // Subscribe to AudioEngine authoritative state mutations
  useEffect(() => {
    const engine = getAudioEngine();
    const initial = engine.getState();

    // Check audio live state
    setAudioLive(engine.isAudioLive());
    setAudioState(engine.isAudioLive() ? 'running' : 'suspended');

    // Sync Mixer
    setCrossfaderPosition(initial.crossfader.position);
    setGainA(initial.crossfader.gainA);
    setGainB(initial.crossfader.gainB);
    setMasterVolume(initial.master.volume);
    setBoothVolume(initial.master.boothVolume);
    setHeadphoneVolume(initial.master.headphoneVolume);
    setCueMasterMix(initial.master.cueMasterMix);
    setCueA(initial.deckA.cueMonitor);
    setCueB(initial.deckB.cueMonitor);

    // Sync Deck A
    setVolumeA(initial.deckA.volume);
    setTrimA(initial.deckA.trim);
    setEqA({ ...initial.deckA.eq });
    setFilterA({ ...initial.deckA.filter });
    setPlaybackRateA(initial.deckA.playbackRate);
    setPitchRangeA(initial.deckA.pitchRange);
    setKeyLockA(initial.deckA.keyLock);
    setCueTimeA(initial.deckA.cueTime);
    setHotCuesA([...initial.deckA.hotCues]);
    setLoopA({ ...initial.deckA.loop });
    setQuantizeA(initial.deckA.quantize);
    setSyncA(initial.deckA.sync);
    setSlipA(initial.deckA.slip);
    setFxA({ ...initial.deckA.fx });
    setIsPlayingA(initial.deckA.transportState === 'playing');
    setIsPausedA(initial.deckA.transportState === 'paused');
    setCurrentTimeA(initial.deckA.currentTime);
    if (initial.deckA.trackName) {
      setTrackNameA(initial.deckA.trackName);
      setDurationA(initial.deckA.duration);
    }

    // Sync Deck B
    setVolumeB(initial.deckB.volume);
    setTrimB(initial.deckB.trim);
    setEqB({ ...initial.deckB.eq });
    setFilterB({ ...initial.deckB.filter });
    setPlaybackRateB(initial.deckB.playbackRate);
    setPitchRangeB(initial.deckB.pitchRange);
    setKeyLockB(initial.deckB.keyLock);
    setCueTimeB(initial.deckB.cueTime);
    setHotCuesB([...initial.deckB.hotCues]);
    setLoopB({ ...initial.deckB.loop });
    setQuantizeB(initial.deckB.quantize);
    setSyncB(initial.deckB.sync);
    setSlipB(initial.deckB.slip);
    setFxB({ ...initial.deckB.fx });
    setIsPlayingB(initial.deckB.transportState === 'playing');
    setIsPausedB(initial.deckB.transportState === 'paused');
    setCurrentTimeB(initial.deckB.currentTime);
    if (initial.deckB.trackName) {
      setTrackNameB(initial.deckB.trackName);
      setDurationB(initial.deckB.duration);
    }

    const unsub = engine.subscribe((snapshot) => {
      // Audio Live
      setAudioLive(engine.isAudioLive());
      setAudioState(engine.isAudioLive() ? 'running' : 'suspended');

      // Mixer
      setCrossfaderPosition(snapshot.crossfader.position);
      setGainA(snapshot.crossfader.gainA);
      setGainB(snapshot.crossfader.gainB);
      setMasterVolume(snapshot.master.volume);
      setBoothVolume(snapshot.master.boothVolume);
      setHeadphoneVolume(snapshot.master.headphoneVolume);
      setCueMasterMix(snapshot.master.cueMasterMix);
      setCueA(snapshot.deckA.cueMonitor);
      setCueB(snapshot.deckB.cueMonitor);

      // Deck A
      setVolumeA(snapshot.deckA.volume);
      setTrimA(snapshot.deckA.trim);
      setEqA({ ...snapshot.deckA.eq });
      setFilterA({ ...snapshot.deckA.filter });
      setPlaybackRateA(snapshot.deckA.playbackRate);
      setPitchRangeA(snapshot.deckA.pitchRange);
      setKeyLockA(snapshot.deckA.keyLock);
      setCueTimeA(snapshot.deckA.cueTime);
      setHotCuesA([...snapshot.deckA.hotCues]);
      setLoopA({ ...snapshot.deckA.loop });
      setQuantizeA(snapshot.deckA.quantize);
      setSyncA(snapshot.deckA.sync);
      setSlipA(snapshot.deckA.slip);
      setFxA({ ...snapshot.deckA.fx });
      setIsPlayingA(snapshot.deckA.transportState === 'playing');
      setIsPausedA(snapshot.deckA.transportState === 'paused');
      setCurrentTimeA(snapshot.deckA.transportState === 'stopped' ? 0 : snapshot.deckA.currentTime);
      if (snapshot.deckA.trackName && snapshot.deckA.trackName !== trackNameA) {
        setTrackNameA(snapshot.deckA.trackName);
        setDurationA(snapshot.deckA.duration);
      }

      // Deck B
      setVolumeB(snapshot.deckB.volume);
      setTrimB(snapshot.deckB.trim);
      setEqB({ ...snapshot.deckB.eq });
      setFilterB({ ...snapshot.deckB.filter });
      setPlaybackRateB(snapshot.deckB.playbackRate);
      setPitchRangeB(snapshot.deckB.pitchRange);
      setKeyLockB(snapshot.deckB.keyLock);
      setCueTimeB(snapshot.deckB.cueTime);
      setHotCuesB([...snapshot.deckB.hotCues]);
      setLoopB({ ...snapshot.deckB.loop });
      setQuantizeB(snapshot.deckB.quantize);
      setSyncB(snapshot.deckB.sync);
      setSlipB(snapshot.deckB.slip);
      setFxB({ ...snapshot.deckB.fx });
      setIsPlayingB(snapshot.deckB.transportState === 'playing');
      setIsPausedB(snapshot.deckB.transportState === 'paused');
      setCurrentTimeB(snapshot.deckB.transportState === 'stopped' ? 0 : snapshot.deckB.currentTime);
      if (snapshot.deckB.trackName && snapshot.deckB.trackName !== trackNameB) {
        setTrackNameB(snapshot.deckB.trackName);
        setDurationB(snapshot.deckB.duration);
      }
    });

    return () => {
      unsub();
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
    };
  }, [trackNameA, trackNameB]);

  // Environment Switch Handler with 500ms Non-destructive Morph
  const handleSelectEnvironment = (env: DJEnvironment) => {
    if (env === activeEnvironment) return;
    setStoredDJEnvironment(env);
    setIsMorphing(true);
    setActiveEnvironment(env);

    if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
    morphTimerRef.current = setTimeout(() => {
      setIsMorphing(false);
    }, 500);
  };

  // Deck Ingestion Helpers
  const handleIngestFile = async (deckId: 'A' | 'B', file: File) => {
    const isA = deckId === 'A';
    const setLoading = isA ? setIsLoadingA : setIsLoadingB;
    const setError = isA ? setErrorA : setErrorB;
    const setWf = isA ? setWaveformA : setWaveformB;
    const setName = isA ? setTrackNameA : setTrackNameB;
    const setDur = isA ? setDurationA : setDurationB;
    const setCur = isA ? setCurrentTimeA : setCurrentTimeB;
    const setPlaying = isA ? setIsPlayingA : setIsPlayingB;
    const setPaused = isA ? setIsPausedA : setIsPausedB;

    try {
      setLoading(true);
      setError(null);
      const engine = getAudioEngine();
      const ctx = await engine.initialize();
      const audioBuffer = await loadAudioFile(file, ctx);
      await engine.loadDeck(deckId, audioBuffer, file.name);

      const wf = await waveformService.analyzeAudioBuffer(audioBuffer, 1000);
      setWf(wf);
      setName(file.name);
      setDur(audioBuffer.duration);
      setCur(0);
      setPlaying(false);
      setPaused(false);

      // Asynchronous non-blocking audio intelligence analysis
      analysisService.analyzeBuffer(`file-${file.name}-${audioBuffer.duration}`, audioBuffer)
        .then((analysis) => {
          if (isA) {
            setAnalysisA(analysis);
            if (analysis.bpm?.bpm) setBpmA(analysis.bpm.bpm);
            if (analysis.key?.key) setKeyA(`${analysis.key.camelot} / ${analysis.key.key}`);
          } else {
            setAnalysisB(analysis);
            if (analysis.bpm?.bpm) setBpmB(analysis.bpm.bpm);
            if (analysis.key?.key) setKeyB(`${analysis.key.camelot} / ${analysis.key.key}`);
          }
        })
        .catch(console.warn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDemo = async (deckId: 'A' | 'B') => {
    const isA = deckId === 'A';
    const setLoading = isA ? setIsLoadingA : setIsLoadingB;
    const setError = isA ? setErrorA : setErrorB;
    const setWf = isA ? setWaveformA : setWaveformB;
    const setName = isA ? setTrackNameA : setTrackNameB;
    const setDur = isA ? setDurationA : setDurationB;
    const setCur = isA ? setCurrentTimeA : setCurrentTimeB;
    const setPlaying = isA ? setIsPlayingA : setIsPlayingB;
    const setPaused = isA ? setIsPausedA : setIsPausedB;
    const setBpm = isA ? setBpmA : setBpmB;
    const setKey = isA ? setKeyA : setKeyB;
    const setArtist = isA ? setArtistNameA : setArtistNameB;

    try {
      setLoading(true);
      setError(null);
      const engine = getAudioEngine();
      const ctx = await engine.initialize();
      const demoBuffer = createSyntheticDemoBuffer(ctx, isA ? 'deckA' : 'deckB', 16);
      const name = isA ? 'SONORA Pulse' : 'SONORA Aurora';
      await engine.loadDeck(deckId, demoBuffer, name);

      const wf = await waveformService.analyzeAudioBuffer(demoBuffer, 1000);
      setWf(wf);
      setName(name);
      setArtist(isA ? 'Sonora Acoustic Core' : 'Solar Resonance');
      const demoKey = isA ? 'Am' : 'C';
      const demoBpm = isA ? 120 : 124;
      setBpm(demoBpm);
      setKey(isA ? '8A / Am' : '8B / C');
      setDur(demoBuffer.duration);
      setCur(0);
      setPlaying(false);
      setPaused(false);

      // Asynchronous non-blocking audio intelligence analysis
      analysisService.analyzeBuffer(
        `demo-${isA ? 'deckA' : 'deckB'}-${demoBuffer.duration}`,
        demoBuffer,
        { knownBpm: demoBpm, knownKey: demoKey }
      ).then((analysis) => {
        if (isA) {
          setAnalysisA(analysis);
          if (analysis.bpm?.bpm) setBpmA(analysis.bpm.bpm);
          if (analysis.key?.key) setKeyA(`${analysis.key.camelot} / ${analysis.key.key}`);
        } else {
          setAnalysisB(analysis);
          if (analysis.bpm?.bpm) setBpmB(analysis.bpm.bpm);
          if (analysis.key?.key) setKeyB(`${analysis.key.camelot} / ${analysis.key.key}`);
        }
      }).catch(console.warn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Shortcuts Handler (Space, C, Arrow keys, 1-8, L, S, Q)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const activeDeck = isPlayingB && !isPlayingA ? 'B' : 'A';
      const engine = getAudioEngine();

      if (e.code === 'Space') {
        e.preventDefault();
        if (activeDeck === 'A') {
          if (isPlayingA) engine.pause('A');
          else engine.play('A');
        } else {
          if (isPlayingB) engine.pause('B');
          else engine.play('B');
        }
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        engine.returnToCue(activeDeck);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.beatJump(activeDeck, -4);
        } else {
          const cur = activeDeck === 'A' ? currentTimeA : currentTimeB;
          engine.seek(activeDeck, Math.max(0, cur - 2));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.beatJump(activeDeck, 4);
        } else {
          const cur = activeDeck === 'A' ? currentTimeA : currentTimeB;
          const dur = activeDeck === 'A' ? durationA : durationB;
          engine.seek(activeDeck, Math.min(dur, cur + 2));
        }
      } else if (e.key >= '1' && e.key <= '8') {
        const slotIdx = parseInt(e.key, 10) - 1;
        const cues = activeDeck === 'A' ? hotCuesA : hotCuesB;
        if (cues[slotIdx] !== null) {
          engine.triggerHotCue(activeDeck, slotIdx);
        } else {
          engine.setHotCue(activeDeck, slotIdx);
        }
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const lp = activeDeck === 'A' ? loopA : loopB;
        engine.setLoop(activeDeck, !lp.enabled, lp.start, lp.end, lp.lengthBeats);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (activeDeck === 'A') {
          const next = !syncA;
          setSyncA(next);
          engine.setSync('A', next);
          if (next) engine.setMasterDeck('B');
        } else {
          const next = !syncB;
          setSyncB(next);
          engine.setSync('B', next);
          if (next) engine.setMasterDeck('A');
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        const currentQ = activeDeck === 'A' ? quantizeA : quantizeB;
        engine.setQuantize(activeDeck, !currentQ);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isPlayingA,
    isPlayingB,
    currentTimeA,
    currentTimeB,
    durationA,
    durationB,
    bpmA,
    bpmB,
    hotCuesA,
    hotCuesB,
    quantizeA,
    quantizeB,
  ]);

  // Build Shared Deck A Contract
  const deckAState: SharedDeckState = useMemo(() => ({
    deckId: 'A',
    trackName: trackNameA,
    artistName: artistNameA,
    bpm: bpmA,
    key: keyA,
    waveform: waveformA,
    duration: durationA,
    currentTime: currentTimeA,
    isPlaying: isPlayingA,
    isPaused: isPausedA,
    isLoaded: trackNameA !== null,
    isLoading: isLoadingA,
    error: errorA,
    volume: volumeA,
    trim: trimA,
    eq: eqA,
    filter: filterA,
    playbackRate: playbackRateA,
    pitchRange: pitchRangeA,
    keyLock: keyLockA,
    cueTime: cueTimeA,
    hotCues: hotCuesA,
    loop: loopA,
    quantize: quantizeA,
    sync: syncA,
    isMasterDeck: masterDeckId === 'A',
    slip: slipA,
    vinylMode: vinylModeA,
    fx: fxA,
    activePadMode: activePadModeA,
    cueMonitor: cueA,
    analysis: analysisA,
    onPlay: async () => {
      const engine = getAudioEngine();
      await engine.play('A');
    },
    onPause: () => {
      const engine = getAudioEngine();
      engine.pause('A');
    },
    onStop: () => {
      const engine = getAudioEngine();
      engine.stop('A');
      setCurrentTimeA(0);
    },
    onCue: () => {
      const engine = getAudioEngine();
      if (!isPlayingA) {
        engine.setCue('A');
      } else {
        engine.returnToCue('A');
      }
    },
    onSeek: (seconds: number) => {
      const engine = getAudioEngine();
      engine.seek('A', seconds);
      setCurrentTimeA(seconds);
    },
    onVolumeChange: (vol: number) => {
      setVolumeA(vol);
      getAudioEngine().setDeckVolume('A', vol);
    },
    onTrimChange: (val: number) => {
      setTrimA(val);
      getAudioEngine().setDeckTrim('A', val);
    },
    onEqChange: (band: 'low' | 'mid' | 'high', val: number) => {
      const updated = { ...eqA, [band]: val };
      setEqA(updated);
      getAudioEngine().setDeckEQ('A', updated);
    },
    onFilterChange: (type: FilterType, freq: number, q: number) => {
      const updated: DeckFilter = { type, frequency: freq, q };
      setFilterA(updated);
      getAudioEngine().setDeckFilter('A', updated);
    },
    onPlaybackRateChange: (rate: number) => {
      setPlaybackRateA(rate);
      getAudioEngine().setPlaybackRate('A', rate);
    },
    onPitchRangeChange: (rng: PitchRange) => {
      setPitchRangeA(rng);
      getAudioEngine().setPitchRange('A', rng);
    },
    onTempoReset: () => {
      setPlaybackRateA(1.0);
      getAudioEngine().setPlaybackRate('A', 1.0);
    },
    onKeyLockToggle: () => {
      const updated = !keyLockA;
      setKeyLockA(updated);
      getAudioEngine().setKeyLock('A', updated);
    },
    onJogTurn: (deltaDeg: number, isScratch?: boolean) => {
      const engine = getAudioEngine();
      if (deltaDeg === 0) {
        // Release nudge
        engine.pitchBend('A', 1.0);
        return;
      }
      if (isScratch) {
        // Vinyl scratch scrub
        engine.jogScrub('A', deltaDeg * 0.005);
      } else {
        // Pitch bend nudge
        const bend = 1.0 + Math.max(-0.25, Math.min(0.25, deltaDeg * 0.002));
        engine.pitchBend('A', bend);
      }
    },
    onHotCueTrigger: (index: number) => {
      getAudioEngine().triggerHotCue('A', index);
    },
    onHotCueSet: (index: number) => {
      getAudioEngine().setHotCue('A', index);
    },
    onHotCueDelete: (index: number) => {
      getAudioEngine().deleteHotCue('A', index);
    },
    onAutoLoop: (beats: number) => {
      const engine = getAudioEngine();
      const cur = engine.getCurrentTime('A');
      const beatLen = analysisA?.beats?.beatDuration || (60 / (bpmA || 120));
      const dur = beatLen * beats;
      engine.setLoop('A', true, cur, cur + dur, beats);
    },
    onLoopIn: () => {
      const engine = getAudioEngine();
      const cur = engine.getCurrentTime('A');
      engine.setLoop('A', true, cur, Math.max(cur + 1, loopA.end), loopA.lengthBeats);
    },
    onLoopOut: () => {
      const engine = getAudioEngine();
      const cur = engine.getCurrentTime('A');
      engine.setLoop('A', true, Math.min(loopA.start, cur - 0.5), cur, loopA.lengthBeats);
    },
    onLoopToggle: () => {
      const engine = getAudioEngine();
      engine.setLoop('A', !loopA.enabled, loopA.start, loopA.end, loopA.lengthBeats);
    },
    onBeatJump: (beats: number) => {
      const beatLen = analysisA?.beats?.beatDuration || (60 / (bpmA || 120));
      const cur = getAudioEngine().getCurrentTime('A');
      getAudioEngine().seek('A', Math.max(0, cur + (beats * beatLen)));
    },
    onQuantizeToggle: () => {
      const updated = !quantizeA;
      setQuantizeA(updated);
      getAudioEngine().setQuantize('A', updated);
    },
    onSyncToggle: () => {
      const updated = !syncA;
      setSyncA(updated);
      const engine = getAudioEngine();
      engine.setSync('A', updated);
      if (updated) {
        engine.setMasterDeck('B');
        const targetBpm = analysisB?.bpm?.bpm || bpmB;
        const sourceBpm = analysisA?.bpm?.bpm || bpmA;
        if (targetBpm && sourceBpm && sourceBpm > 0) {
          const syncRate = targetBpm / sourceBpm;
          setPlaybackRateA(syncRate);
          engine.setPlaybackRate('A', syncRate);
        }
      }
    },
    onSlipToggle: () => {
      const updated = !slipA;
      setSlipA(updated);
      getAudioEngine().setSlip('A', updated);
    },
    onVinylModeToggle: () => {
      setVinylModeA((prev) => !prev);
    },
    onPadModeChange: (mode: PadMode) => {
      setActivePadModeA(mode);
    },
    onFXToggle: (fxType: DeckFXType) => {
      const isCur = fxA.type === fxType && fxA.enabled;
      getAudioEngine().setDeckFX('A', fxType, !isCur, fxA.depth, fxA.beatDivision);
    },
    onFXParamChange: (fxType: DeckFXType, param: string, val: number) => {
      if (param === 'depth') {
        getAudioEngine().setDeckFX('A', fxType, fxA.enabled, val, fxA.beatDivision);
      }
    },
    onFXDivisionChange: (div: number) => {
      getAudioEngine().setDeckFX('A', fxA.type, fxA.enabled, fxA.depth, div);
    },
    onCueMonitorToggle: () => {
      const updated = !cueA;
      setCueA(updated);
      getAudioEngine().setCueMonitor('A', updated);
    },
    onIngestFile: async (file: File) => handleIngestFile('A', file),
    onGenerateDemo: async () => handleGenerateDemo('A'),
  }), [
    trackNameA, artistNameA, bpmA, keyA, waveformA, durationA, currentTimeA,
    isPlayingA, isPausedA, isLoadingA, errorA, volumeA, trimA, eqA, filterA,
    playbackRateA, pitchRangeA, keyLockA, cueTimeA, hotCuesA, loopA, quantizeA,
    syncA, masterDeckId, slipA, vinylModeA, fxA, activePadModeA, cueA, handleIngestFile, handleGenerateDemo
  ]);

  // Build Shared Deck B Contract
  const deckBState: SharedDeckState = useMemo(() => ({
    deckId: 'B',
    trackName: trackNameB,
    artistName: artistNameB,
    bpm: bpmB,
    key: keyB,
    waveform: waveformB,
    duration: durationB,
    currentTime: currentTimeB,
    isPlaying: isPlayingB,
    isPaused: isPausedB,
    isLoaded: trackNameB !== null,
    isLoading: isLoadingB,
    error: errorB,
    volume: volumeB,
    trim: trimB,
    eq: eqB,
    filter: filterB,
    playbackRate: playbackRateB,
    pitchRange: pitchRangeB,
    keyLock: keyLockB,
    cueTime: cueTimeB,
    hotCues: hotCuesB,
    loop: loopB,
    quantize: quantizeB,
    sync: syncB,
    isMasterDeck: masterDeckId === 'B',
    slip: slipB,
    vinylMode: vinylModeB,
    fx: fxB,
    activePadMode: activePadModeB,
    cueMonitor: cueB,
    analysis: analysisB,
    onPlay: async () => {
      const engine = getAudioEngine();
      await engine.play('B');
    },
    onPause: () => {
      const engine = getAudioEngine();
      engine.pause('B');
    },
    onStop: () => {
      const engine = getAudioEngine();
      engine.stop('B');
      setCurrentTimeB(0);
    },
    onCue: () => {
      const engine = getAudioEngine();
      if (!isPlayingB) {
        engine.setCue('B');
      } else {
        engine.returnToCue('B');
      }
    },
    onSeek: (seconds: number) => {
      const engine = getAudioEngine();
      engine.seek('B', seconds);
      setCurrentTimeB(seconds);
    },
    onVolumeChange: (vol: number) => {
      setVolumeB(vol);
      getAudioEngine().setDeckVolume('B', vol);
    },
    onTrimChange: (val: number) => {
      setTrimB(val);
      getAudioEngine().setDeckTrim('B', val);
    },
    onEqChange: (band: 'low' | 'mid' | 'high', val: number) => {
      const updated = { ...eqB, [band]: val };
      setEqB(updated);
      getAudioEngine().setDeckEQ('B', updated);
    },
    onFilterChange: (type: FilterType, freq: number, q: number) => {
      const updated: DeckFilter = { type, frequency: freq, q };
      setFilterB(updated);
      getAudioEngine().setDeckFilter('B', updated);
    },
    onPlaybackRateChange: (rate: number) => {
      setPlaybackRateB(rate);
      getAudioEngine().setPlaybackRate('B', rate);
    },
    onPitchRangeChange: (rng: PitchRange) => {
      setPitchRangeB(rng);
      getAudioEngine().setPitchRange('B', rng);
    },
    onTempoReset: () => {
      setPlaybackRateB(1.0);
      getAudioEngine().setPlaybackRate('B', 1.0);
    },
    onKeyLockToggle: () => {
      const updated = !keyLockB;
      setKeyLockB(updated);
      getAudioEngine().setKeyLock('B', updated);
    },
    onJogTurn: (deltaDeg: number, isScratch?: boolean) => {
      const engine = getAudioEngine();
      if (deltaDeg === 0) {
        engine.pitchBend('B', 1.0);
        return;
      }
      if (isScratch) {
        engine.jogScrub('B', deltaDeg * 0.005);
      } else {
        const bend = 1.0 + Math.max(-0.25, Math.min(0.25, deltaDeg * 0.002));
        engine.pitchBend('B', bend);
      }
    },
    onHotCueTrigger: (index: number) => {
      getAudioEngine().triggerHotCue('B', index);
    },
    onHotCueSet: (index: number) => {
      getAudioEngine().setHotCue('B', index);
    },
    onHotCueDelete: (index: number) => {
      getAudioEngine().deleteHotCue('B', index);
    },
    onAutoLoop: (beats: number) => {
      const engine = getAudioEngine();
      const cur = engine.getCurrentTime('B');
      const beatLen = analysisB?.beats?.beatDuration || (60 / (bpmB || 120));
      const dur = beatLen * beats;
      engine.setLoop('B', true, cur, cur + dur, beats);
    },
    onLoopIn: () => {
      const engine = getAudioEngine();
      const cur = engine.getCurrentTime('B');
      engine.setLoop('B', true, cur, Math.max(cur + 1, loopB.end), loopB.lengthBeats);
    },
    onLoopOut: () => {
      const engine = getAudioEngine();
      const cur = engine.getCurrentTime('B');
      engine.setLoop('B', true, Math.min(loopB.start, cur - 0.5), cur, loopB.lengthBeats);
    },
    onLoopToggle: () => {
      const engine = getAudioEngine();
      engine.setLoop('B', !loopB.enabled, loopB.start, loopB.end, loopB.lengthBeats);
    },
    onBeatJump: (beats: number) => {
      const beatLen = analysisB?.beats?.beatDuration || (60 / (bpmB || 120));
      const cur = getAudioEngine().getCurrentTime('B');
      getAudioEngine().seek('B', Math.max(0, cur + (beats * beatLen)));
    },
    onQuantizeToggle: () => {
      const updated = !quantizeB;
      setQuantizeB(updated);
      getAudioEngine().setQuantize('B', updated);
    },
    onSyncToggle: () => {
      const updated = !syncB;
      setSyncB(updated);
      const engine = getAudioEngine();
      engine.setSync('B', updated);
      if (updated) {
        engine.setMasterDeck('A');
        const targetBpm = analysisA?.bpm?.bpm || bpmA;
        const sourceBpm = analysisB?.bpm?.bpm || bpmB;
        if (targetBpm && sourceBpm && sourceBpm > 0) {
          const syncRate = targetBpm / sourceBpm;
          setPlaybackRateB(syncRate);
          engine.setPlaybackRate('B', syncRate);
        }
      }
    },
    onSlipToggle: () => {
      const updated = !slipB;
      setSlipB(updated);
      getAudioEngine().setSlip('B', updated);
    },
    onVinylModeToggle: () => {
      setVinylModeB((prev) => !prev);
    },
    onPadModeChange: (mode: PadMode) => {
      setActivePadModeB(mode);
    },
    onFXToggle: (fxType: DeckFXType) => {
      const isCur = fxB.type === fxType && fxB.enabled;
      getAudioEngine().setDeckFX('B', fxType, !isCur, fxB.depth, fxB.beatDivision);
    },
    onFXParamChange: (fxType: DeckFXType, param: string, val: number) => {
      if (param === 'depth') {
        getAudioEngine().setDeckFX('B', fxType, fxB.enabled, val, fxB.beatDivision);
      }
    },
    onFXDivisionChange: (div: number) => {
      getAudioEngine().setDeckFX('B', fxB.type, fxB.enabled, fxB.depth, div);
    },
    onCueMonitorToggle: () => {
      const updated = !cueB;
      setCueB(updated);
      getAudioEngine().setCueMonitor('B', updated);
    },
    onIngestFile: async (file: File) => handleIngestFile('B', file),
    onGenerateDemo: async () => handleGenerateDemo('B'),
  }), [
    trackNameB, artistNameB, bpmB, keyB, waveformB, durationB, currentTimeB,
    isPlayingB, isPausedB, isLoadingB, errorB, volumeB, trimB, eqB, filterB,
    playbackRateB, pitchRangeB, keyLockB, cueTimeB, hotCuesB, loopB, quantizeB,
    syncB, masterDeckId, slipB, vinylModeB, fxB, activePadModeB, cueB, handleIngestFile, handleGenerateDemo
  ]);

  // Build Shared Mixer Contract
  const mixerState: SharedMixerState = useMemo(() => ({
    crossfaderPosition,
    gainA,
    gainB,
    masterVolume,
    boothVolume,
    headphoneVolume,
    cueMasterMix,
    deckAVolume: volumeA,
    deckBVolume: volumeB,
    trimA,
    trimB,
    cueA,
    cueB,
    deckAIsPlaying: isPlayingA,
    deckBIsPlaying: isPlayingB,
    audioLive,
    audioState,
    harmonicMatch,
    onCrossfaderChange: (pos: number) => {
      setCrossfaderPosition(pos);
      getAudioEngine().setCrossfader(pos);
    },
    onMasterVolumeChange: (vol: number) => {
      setMasterVolume(vol);
      getAudioEngine().setMasterVolume(vol);
    },
    onBoothVolumeChange: (vol: number) => {
      setBoothVolume(vol);
      getAudioEngine().setBoothVolume(vol);
    },
    onHeadphoneVolumeChange: (vol: number) => {
      setHeadphoneVolume(vol);
      getAudioEngine().setHeadphoneVolume(vol);
    },
    onCueMasterMixChange: (mix: number) => {
      setCueMasterMix(mix);
      getAudioEngine().setCueMasterMix(mix);
    },
    onChannelFaderAChange: (vol: number) => {
      setVolumeA(vol);
      getAudioEngine().setDeckVolume('A', vol);
    },
    onChannelFaderBChange: (vol: number) => {
      setVolumeB(vol);
      getAudioEngine().setDeckVolume('B', vol);
    },
    onTrimAChange: (val: number) => {
      setTrimA(val);
      getAudioEngine().setDeckTrim('A', val);
    },
    onTrimBChange: (val: number) => {
      setTrimB(val);
      getAudioEngine().setDeckTrim('B', val);
    },
    onCueAChange: (active: boolean) => {
      setCueA(active);
      getAudioEngine().setCueMonitor('A', active);
    },
    onCueBChange: (active: boolean) => {
      setCueB(active);
      getAudioEngine().setCueMonitor('B', active);
    },
    onUnlockAudio: handleUnlockAudio,
  }), [
    crossfaderPosition, gainA, gainB, masterVolume, boothVolume, headphoneVolume, cueMasterMix,
    volumeA, volumeB, trimA, trimB, cueA, cueB, isPlayingA, isPlayingB, audioLive, audioState, harmonicMatch, handleUnlockAudio
  ]);

  return (
    <section
      className={`sonora-dj-workspace sonora-dj-workspace-container ${className}`}
      aria-label="Two-Deck DJ Multi-Environment Performance Stage"
    >
      {/* 1. Visually Integrated Tactile Environment Selector */}
      <DJEnvironmentSelector
        currentEnvironment={activeEnvironment}
        onSelectEnvironment={handleSelectEnvironment}
      />

      {/* 2. Decoupled 60fps Audio-Reactive Background Canvas */}
      <AudioReactiveCanvas
        activeEnvironment={activeEnvironment}
        crossfaderPosition={crossfaderPosition}
        deckAIsPlaying={isPlayingA}
        deckBIsPlaying={isPlayingB}
        deckAVolume={volumeA}
        deckBVolume={volumeB}
      />

      {/* 3. Active Environmental Viewport with 400-800ms Morph Transition */}
      <div
        className={`sonora-environment-viewport ${isMorphing ? 'is-morphing' : ''}`}
        aria-live="polite"
      >
        {activeEnvironment === 'orbital' && (
          <OrbitalEnvironment
            deckA={deckAState}
            deckB={deckBState}
            mixer={mixerState}
            activeEnvironment="orbital"
          />
        )}

        {activeEnvironment === 'liquid' && (
          <LiquidEnvironment
            deckA={deckAState}
            deckB={deckBState}
            mixer={mixerState}
            activeEnvironment="liquid"
          />
        )}

        {activeEnvironment === 'organism' && (
          <OrganismEnvironment
            deckA={deckAState}
            deckB={deckBState}
            mixer={mixerState}
            activeEnvironment="organism"
          />
        )}
      </div>
    </section>
  );
};
