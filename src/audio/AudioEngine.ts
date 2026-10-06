/**
 * SONORA Audio Engine Foundation — Professional DJ Performance System
 * Authoritative Reference: PRD.md, PRODUCT_ARCHITECTURE.md, Milestone 3.5
 * 
 * Headless Web Audio API Engine implementing dual-deck architecture,
 * 3-band EQ, resonant sound-color filter, trim gain, real DSP FX,
 * sample-accurate looping, hot cues, CUE monitoring, equal-power crossfader,
 * master stage, and high-resolution analyser tap.
 * 
 * Strict Isolation: React components must NOT control Web Audio nodes directly.
 * High-frequency visualization loops query the AnalyserNode independently.
 */

import {
  DeckId,
  DeckState,
  DeckEQ,
  DeckFilter,
  PitchRange,
  DeckFXType,
  DeckFXState,
  LoopState,
  CrossfaderState,
  MasterState,
  AudioEngineSnapshot,
  AudioEngineListener,
  AudioEngineError,
  AudioDiagnostics,
  DEFAULT_DECK_EQ,
  DEFAULT_DECK_FILTER,
  DEFAULT_LOOP_STATE,
  DEFAULT_DECK_FX,
  EQ_FREQUENCIES,
  clamp,
  calculateEqualPowerCrossfade,
} from './types';

interface DeckInternalNodes {
  sourceNode: AudioBufferSourceNode | null;
  lowEq: BiquadFilterNode;
  midEq: BiquadFilterNode;
  highEq: BiquadFilterNode;
  filter: BiquadFilterNode;
  trimGain: GainNode;
  channelGain: GainNode;
  crossfadeGain: GainNode;
  cueGain: GainNode;
  // Real DSP FX Nodes
  fxSend: GainNode;
  fxDelay: DelayNode;
  fxFeedback: GainNode;
  fxWet: GainNode;
  fxFilter: BiquadFilterNode;
  fxDistortion: WaveShaperNode;
  fxDry: GainNode;
}

interface DeckInternalState {
  id: DeckId;
  buffer: AudioBuffer | null;
  trackName: string | null;
  duration: number;
  currentTime: number;
  startedAt: number;
  transportState: 'stopped' | 'playing' | 'paused';
  volume: number; // 0.0 to 1.0 (channel fader)
  trim: number; // 0.0 to 2.0 (channel gain)
  eq: DeckEQ;
  filter: DeckFilter;
  playbackRate: number;
  basePlaybackRate: number; // Rate before momentary jog pitch bend
  pitchRange: PitchRange; // 0.06, 0.10, 0.16, 1.00
  keyLock: boolean;
  cueTime: number; // CUE point in seconds
  hotCues: (number | null)[]; // 8 hot cue slots
  loop: LoopState;
  fx: DeckFXState;
  quantize: boolean;
  sync: boolean;
  isMasterDeck: boolean;
  slip: boolean;
  cueMonitor: boolean; // PFL monitoring
  nodes: DeckInternalNodes | null;
}

function makeDistortionCurve(amount = 20): Float32Array<ArrayBuffer> {
  const n_samples = 44100;
  const buffer = new ArrayBuffer(n_samples * 4);
  const curve = new Float32Array(buffer);
  const deg = Math.PI / 180;
  const k = typeof amount === 'number' ? amount : 50;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private boothGain: GainNode | null = null;
  private headphoneCueGain: GainNode | null = null;
  private headphoneMasterGain: GainNode | null = null;
  private headphoneVolumeGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private crossfaderPosition = 0.0; // -1.0 to 1.0
  private masterVolume = 0.85;
  private boothVolume = 0.85;
  private headphoneVolume = 0.80;
  private cueMasterMix = 0.50; // 0.0 = 100% Cue, 1.0 = 100% Master

  private deckA: DeckInternalState;
  private deckB: DeckInternalState;

  private listeners: Set<AudioEngineListener> = new Set();
  private transportTimer: ReturnType<typeof setInterval> | null = null;
  private hasInstalledWindowUnlock = false;

  constructor() {
    this.deckA = this.createInitialDeckState('A');
    this.deckB = this.createInitialDeckState('B');
    this.installAutoUnlockListeners();
  }

  private installAutoUnlockListeners(): void {
    if (typeof window === 'undefined' || this.hasInstalledWindowUnlock) return;
    this.hasInstalledWindowUnlock = true;

    const unlock = () => {
      this.unlockAudio().catch((err) => {
        console.warn('Audio auto-unlock gesture received error:', err);
      });
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('pointerdown', unlock, true);
    };

    window.addEventListener('click', unlock, { capture: true, once: true });
    window.addEventListener('touchstart', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
  }

  private createInitialDeckState(id: DeckId): DeckInternalState {
    return {
      id,
      buffer: null,
      trackName: null,
      duration: 0,
      currentTime: 0,
      startedAt: 0,
      transportState: 'stopped',
      volume: 1.0,
      trim: 1.0,
      eq: { ...DEFAULT_DECK_EQ },
      filter: { ...DEFAULT_DECK_FILTER },
      playbackRate: 1.0,
      basePlaybackRate: 1.0,
      pitchRange: 0.10, // Default ±10%
      keyLock: false,
      cueTime: 0,
      hotCues: [null, null, null, null, null, null, null, null],
      loop: { ...DEFAULT_LOOP_STATE },
      fx: { ...DEFAULT_DECK_FX },
      quantize: true,
      sync: false,
      isMasterDeck: id === 'A',
      slip: false,
      cueMonitor: false,
      nodes: null,
    };
  }

  // =========================================================================
  // 1. LIFECYCLE & INITIALIZATION
  // =========================================================================

  /**
   * Lazily creates the AudioContext and establishes the audio graph.
   * Connects masterGain DIRECTLY to destination in parallel with AnalyserNode.
   */
  public async initialize(): Promise<AudioContext> {
    if (this.ctx && this.ctx.state !== 'closed') {
      return this.ctx;
    }

    const AudioContextClass = typeof window !== 'undefined'
      ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : null;
    if (!AudioContextClass) {
      throw new AudioEngineError('Web Audio API is not supported in this environment', 'CONTEXT_NOT_INITIALIZED');
    }

    const ctx = new AudioContextClass();
    this.ctx = ctx;

    // 1. Master Output Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);

    // 2. High-Resolution Telemetry Analyser (Parallel Tap)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -100;
    analyser.maxDecibels = -30;

    // CRITICAL AUDIO FIX:
    // Connect masterGain DIRECTLY to ctx.destination for unmediated audible output.
    // Connect masterGain to analyser IN PARALLEL so telemetry never impedes sound output.
    masterGain.connect(ctx.destination);
    masterGain.connect(analyser);

    // 3. Booth Output Gain
    const boothGain = ctx.createGain();
    boothGain.gain.setValueAtTime(this.boothVolume, ctx.currentTime);
    masterGain.connect(boothGain);

    // 4. Headphone Monitoring Bus (Cue / Master mix)
    const headphoneCueGain = ctx.createGain();
    const headphoneMasterGain = ctx.createGain();
    const headphoneVolumeGain = ctx.createGain();

    headphoneCueGain.gain.setValueAtTime(1.0 - this.cueMasterMix, ctx.currentTime);
    headphoneMasterGain.gain.setValueAtTime(this.cueMasterMix, ctx.currentTime);
    headphoneVolumeGain.gain.setValueAtTime(this.headphoneVolume, ctx.currentTime);

    masterGain.connect(headphoneMasterGain);
    headphoneMasterGain.connect(headphoneVolumeGain);
    headphoneCueGain.connect(headphoneVolumeGain);
    // Headphone output route to destination
    headphoneVolumeGain.connect(ctx.destination);

    this.masterGain = masterGain;
    this.boothGain = boothGain;
    this.headphoneCueGain = headphoneCueGain;
    this.headphoneMasterGain = headphoneMasterGain;
    this.headphoneVolumeGain = headphoneVolumeGain;
    this.analyser = analyser;

    // 5. Build Dual-Deck Subgraphs
    this.setupDeckNodes('A');
    this.setupDeckNodes('B');

    // 6. Apply initial crossfade values
    this.applyCrossfaderGains();

    // Listen to context state transitions (e.g. suspended -> running)
    ctx.onstatechange = () => {
      this.notifyListeners();
    };

    this.notifyListeners();
    return ctx;
  }

  /**
   * Synchronously and immediately unlocks the AudioContext following user gesture.
   */
  public async unlockAudio(): Promise<AudioContext> {
    const ctx = await this.initialize();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume rejected:', err);
      }
    }
    this.notifyListeners();
    return ctx;
  }

  /**
   * Resumes AudioContext following user gesture.
   */
  public async resume(): Promise<void> {
    await this.unlockAudio();
  }

  /**
   * Returns whether audio is currently running and audible.
   */
  public isAudioLive(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  /**
   * Returns current AudioContext state.
   */
  public getContextState(): AudioContextState | 'uninitialized' {
    if (!this.ctx) return 'uninitialized';
    return this.ctx.state;
  }

  /**
   * Returns the underlying AudioContext instance if initialized.
   */
  public getContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Returns or lazily initializes the underlying AudioContext instance.
   */
  public async ensureContext(): Promise<AudioContext> {
    return this.initialize();
  }

  /**
   * Returns master output gain node for sub-system routing.
   */
  public getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  /**
   * Tears down the audio engine, stopping playback and closing the AudioContext.
   */
  public async dispose(): Promise<void> {
    this.stop('A');
    this.stop('B');

    if (this.transportTimer) {
      clearInterval(this.transportTimer);
      this.transportTimer = null;
    }

    if (this.ctx && this.ctx.state !== 'closed') {
      await this.ctx.close();
    }

    this.ctx = null;
    this.masterGain = null;
    this.boothGain = null;
    this.headphoneCueGain = null;
    this.headphoneMasterGain = null;
    this.headphoneVolumeGain = null;
    this.analyser = null;
    this.deckA.nodes = null;
    this.deckB.nodes = null;
    this.notifyListeners();
  }

  private updateTransportTicker(): void {
    const isAnyDeckPlaying =
      this.deckA.transportState === 'playing' || this.deckB.transportState === 'playing';

    if (isAnyDeckPlaying && !this.transportTimer) {
      // 100ms interval (10Hz) provides tight beat, timecode & looping synchronization
      this.transportTimer = setInterval(() => {
        this.checkDeckLoops();
        this.notifyListeners();
      }, 100);
    } else if (!isAnyDeckPlaying && this.transportTimer) {
      clearInterval(this.transportTimer);
      this.transportTimer = null;
    }
  }

  /**
   * Evaluates active loops and seamless return triggers.
   */
  private checkDeckLoops(): void {
    const check = (deckId: DeckId) => {
      const deck = this.getDeckInternal(deckId);
      if (deck.transportState === 'playing' && deck.loop.enabled && deck.loop.end > deck.loop.start) {
        const cur = this.getCurrentTime(deckId);
        if (cur >= deck.loop.end - 0.05) {
          // Seamless loop turnaround
          this.seek(deckId, deck.loop.start);
        }
      }
    };
    check('A');
    check('B');
  }

  // =========================================================================
  // 2. AUDIO GRAPH BUILDING & DSP NODES
  // =========================================================================

  private setupDeckNodes(id: DeckId): void {
    if (!this.ctx || !this.masterGain || !this.headphoneCueGain) return;
    const ctx = this.ctx;
    const deck = id === 'A' ? this.deckA : this.deckB;
    const now = ctx.currentTime;

    // 1. Low EQ (lowshelf)
    const lowEq = ctx.createBiquadFilter();
    lowEq.type = 'lowshelf';
    lowEq.frequency.setValueAtTime(EQ_FREQUENCIES.low, now);
    lowEq.gain.setValueAtTime(deck.eq.low, now);

    // 2. Mid EQ (peaking)
    const midEq = ctx.createBiquadFilter();
    midEq.type = 'peaking';
    midEq.frequency.setValueAtTime(EQ_FREQUENCIES.mid, now);
    midEq.Q.setValueAtTime(1.0, now);
    midEq.gain.setValueAtTime(deck.eq.mid, now);

    // 3. High EQ (highshelf)
    const highEq = ctx.createBiquadFilter();
    highEq.type = 'highshelf';
    highEq.frequency.setValueAtTime(EQ_FREQUENCIES.high, now);
    highEq.gain.setValueAtTime(deck.eq.high, now);

    // 4. Deck Filter (lowpass / highpass / bypass)
    const filter = ctx.createBiquadFilter();
    this.configureFilterNode(filter, deck.filter, true);

    // 5. Channel Trim Gain (0.0 to 2.0, default 1.0)
    const trimGain = ctx.createGain();
    trimGain.gain.setValueAtTime(deck.trim, now);

    // 6. Real DSP FX Engine Subgraph
    const fxSend = ctx.createGain();
    const fxDry = ctx.createGain();
    const fxWet = ctx.createGain();
    const fxDelay = ctx.createDelay(4.0);
    const fxFeedback = ctx.createGain();
    const fxFilter = ctx.createBiquadFilter();
    const fxDistortion = ctx.createWaveShaper();

    // Default FX setup
    fxDelay.delayTime.setValueAtTime(0.25, now); // 120 BPM quarter note
    fxFeedback.gain.setValueAtTime(0.4, now);
    fxFilter.type = 'lowpass';
    fxFilter.frequency.setValueAtTime(4000, now);
    fxDistortion.curve = makeDistortionCurve(25);
    fxDistortion.oversample = '2x';

    fxSend.gain.setValueAtTime(deck.fx.enabled ? deck.fx.depth : 0.0, now);
    fxDry.gain.setValueAtTime(1.0, now);
    fxWet.gain.setValueAtTime(deck.fx.enabled ? deck.fx.depth : 0.0, now);

    // Delay loop: fxSend -> fxDelay -> fxFeedback -> fxDelay -> fxWet
    fxSend.connect(fxDelay);
    fxDelay.connect(fxFilter);
    fxFilter.connect(fxFeedback);
    fxFeedback.connect(fxDelay);
    fxFilter.connect(fxWet);

    // 7. Channel Gain Fader (Volume)
    const channelGain = ctx.createGain();
    channelGain.gain.setValueAtTime(deck.volume, now);

    // 8. Crossfade Gain
    const crossfadeGain = ctx.createGain();
    const { gainA, gainB } = calculateEqualPowerCrossfade(this.crossfaderPosition);
    crossfadeGain.gain.setValueAtTime(id === 'A' ? gainA : gainB, now);

    // 9. Pre-Fader Channel Cue Gain for Headphone Monitoring
    const cueGain = ctx.createGain();
    cueGain.gain.setValueAtTime(deck.cueMonitor ? 1.0 : 0.0, now);

    // -----------------------------------------------------------------------
    // Connect Chain:
    // source -> lowEq -> midEq -> highEq -> filter -> trimGain
    // trimGain -> fxDry -> channelGain -> crossfadeGain -> masterGain
    // trimGain -> fxSend -> [FX engine] -> fxWet -> channelGain
    // trimGain -> cueGain -> headphoneCueGain
    // -----------------------------------------------------------------------
    lowEq.connect(midEq);
    midEq.connect(highEq);
    highEq.connect(filter);
    filter.connect(trimGain);

    // Main dry path
    trimGain.connect(fxDry);
    fxDry.connect(channelGain);

    // Wet FX path
    trimGain.connect(fxSend);
    fxWet.connect(channelGain);

    // Output path
    channelGain.connect(crossfadeGain);
    crossfadeGain.connect(this.masterGain);

    // Headphone monitoring tap
    trimGain.connect(cueGain);
    cueGain.connect(this.headphoneCueGain);

    deck.nodes = {
      sourceNode: null,
      lowEq,
      midEq,
      highEq,
      filter,
      trimGain,
      channelGain,
      crossfadeGain,
      cueGain,
      fxSend,
      fxDelay,
      fxFeedback,
      fxWet,
      fxFilter,
      fxDistortion,
      fxDry,
    };
  }

  private configureFilterNode(node: BiquadFilterNode, filter: DeckFilter, immediate = false): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const rampTime = 0.015; // 15ms de-zippering

    switch (filter.type) {
      case 'bypass':
        node.type = 'lowpass';
        if (immediate) {
          node.frequency.cancelScheduledValues(now);
          node.frequency.setValueAtTime(20000, now);
          node.Q.setValueAtTime(0.707, now);
        } else {
          node.frequency.setTargetAtTime(20000, now, rampTime);
          node.Q.setTargetAtTime(0.707, now, rampTime);
        }
        break;
      case 'lowpass':
        node.type = 'lowpass';
        const lpFreq = clamp(filter.frequency, 20, 20000);
        const lpQ = clamp(filter.q, 0.1, 18.0);
        if (immediate) {
          node.frequency.cancelScheduledValues(now);
          node.frequency.setValueAtTime(lpFreq, now);
          node.Q.setValueAtTime(lpQ, now);
        } else {
          node.frequency.setTargetAtTime(lpFreq, now, rampTime);
          node.Q.setTargetAtTime(lpQ, now, rampTime);
        }
        break;
      case 'highpass':
        node.type = 'highpass';
        const hpFreq = clamp(filter.frequency, 20, 20000);
        const hpQ = clamp(filter.q, 0.1, 18.0);
        if (immediate) {
          node.frequency.cancelScheduledValues(now);
          node.frequency.setValueAtTime(hpFreq, now);
          node.Q.setValueAtTime(hpQ, now);
        } else {
          node.frequency.setTargetAtTime(hpFreq, now, rampTime);
          node.Q.setTargetAtTime(hpQ, now, rampTime);
        }
        break;
    }
  }

  // =========================================================================
  // 3. DECK LOADING & UNLOADING
  // =========================================================================

  /**
   * Loads an AudioBuffer into the designated deck.
   * If the deck is currently playing, playback is cleanly stopped first.
   */
  public async loadDeck(deckId: DeckId, buffer: AudioBuffer, trackName: string | null = null): Promise<void> {
    if (!buffer) {
      throw new AudioEngineError('Invalid AudioBuffer supplied for deck loading', 'INVALID_PARAMETER');
    }
    const deck = this.getDeckInternal(deckId);

    // Stop existing playback if active
    this.stop(deckId);

    await this.initialize();

    deck.buffer = buffer;
    deck.trackName = trackName;
    deck.duration = buffer.duration;
    deck.currentTime = 0;
    deck.cueTime = 0;
    deck.transportState = 'stopped';
    deck.loop = { enabled: false, start: 0, end: Math.min(buffer.duration, 8), lengthBeats: 4 };

    this.notifyListeners();
  }

  /**
   * Unloads any loaded track from the designated deck.
   */
  public unloadDeck(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);
    this.stop(deckId);

    deck.buffer = null;
    deck.trackName = null;
    deck.duration = 0;
    deck.currentTime = 0;
    deck.cueTime = 0;
    deck.hotCues = [null, null, null, null, null, null, null, null];
    deck.transportState = 'stopped';

    this.notifyListeners();
  }

  // =========================================================================
  // 4. TRANSPORT CONTROLS (PLAY, PAUSE, STOP, SEEK)
  // =========================================================================

  /**
   * Starts playback on the designated deck.
   * Spawns a fresh AudioBufferSourceNode and handles sample-accurate looping.
   */
  public async play(deckId: DeckId): Promise<void> {
    const deck = this.getDeckInternal(deckId);

    if (!deck.buffer) {
      throw new AudioEngineError(`Cannot play deck ${deckId}: No audio loaded`, 'BUFFER_NOT_LOADED');
    }

    if (deck.transportState === 'playing') {
      return;
    }

    const ctx = await this.unlockAudio();

    if (!deck.nodes) {
      this.setupDeckNodes(deckId);
    }
    const nodes = deck.nodes!;

    // Loop back to start if track has reached the end
    if (deck.currentTime >= deck.duration) {
      deck.currentTime = 0;
    }

    // Clean up any stale source node
    if (nodes.sourceNode) {
      try {
        nodes.sourceNode.onended = null;
        nodes.sourceNode.stop();
        nodes.sourceNode.disconnect();
      } catch {
        // Ignored
      }
      nodes.sourceNode = null;
    }

    // Create fresh one-shot AudioBufferSourceNode
    const source = ctx.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.setValueAtTime(deck.playbackRate, ctx.currentTime);

    // Hardware sample-accurate looping if active
    if (deck.loop.enabled && deck.loop.end > deck.loop.start) {
      source.loop = true;
      source.loopStart = deck.loop.start;
      source.loopEnd = deck.loop.end;
    }

    source.connect(nodes.lowEq);

    const startOffset = Math.max(0, Math.min(deck.currentTime, Math.max(0, deck.duration - 0.01)));
    deck.startedAt = ctx.currentTime - (startOffset / deck.playbackRate);

    source.onended = () => {
      if (nodes.sourceNode === source) {
        nodes.sourceNode = null;
        deck.currentTime = 0;
        deck.transportState = 'stopped';
        this.updateTransportTicker();
        this.notifyListeners();
      }
    };

    nodes.sourceNode = source;
    deck.transportState = 'playing';

    // Start with hardware clock timestamp
    source.start(Math.max(ctx.currentTime, 0), startOffset);

    this.updateTransportTicker();
    this.notifyListeners();
  }

  /**
   * Pauses playback on the designated deck and captures current playback offset.
   */
  public pause(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);

    if (deck.transportState !== 'playing' || !deck.nodes?.sourceNode) {
      return;
    }

    const ctx = this.ctx;
    if (ctx) {
      const elapsed = (ctx.currentTime - deck.startedAt) * deck.playbackRate;
      deck.currentTime = clamp(elapsed, 0, deck.duration);
    }

    const source = deck.nodes.sourceNode;
    source.onended = null;
    try {
      source.stop();
      source.disconnect();
    } catch {
      // Ignored
    }
    deck.nodes.sourceNode = null;
    deck.transportState = 'paused';

    this.updateTransportTicker();
    this.notifyListeners();
  }

  /**
   * Stops playback on the designated deck and resets position to 0.
   */
  public stop(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);

    if (deck.nodes?.sourceNode) {
      const source = deck.nodes.sourceNode;
      source.onended = null;
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignored
      }
      deck.nodes.sourceNode = null;
    }

    deck.currentTime = 0;
    deck.transportState = 'stopped';

    this.updateTransportTicker();
    this.notifyListeners();
  }

  /**
   * Seeks to a designated position (in seconds) within the loaded track.
   * If currently playing, seamlessly restarts playback from the new position.
   */
  public seek(deckId: DeckId, positionSeconds: number): void {
    const deck = this.getDeckInternal(deckId);
    if (!deck.buffer) return;

    const clampedPosition = clamp(positionSeconds, 0, deck.duration);
    const wasPlaying = deck.transportState === 'playing';

    if (wasPlaying && deck.nodes?.sourceNode && this.ctx) {
      const source = deck.nodes.sourceNode;
      source.onended = null;
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignored
      }
      deck.nodes.sourceNode = null;
      deck.currentTime = clampedPosition;

      // Spawn replacement source at new offset
      const newSource = this.ctx.createBufferSource();
      newSource.buffer = deck.buffer;
      newSource.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);

      if (deck.loop.enabled && deck.loop.end > deck.loop.start) {
        newSource.loop = true;
        newSource.loopStart = deck.loop.start;
        newSource.loopEnd = deck.loop.end;
      }

      newSource.connect(deck.nodes.lowEq);

      deck.startedAt = this.ctx.currentTime - (clampedPosition / deck.playbackRate);

      newSource.onended = () => {
        if (deck.nodes?.sourceNode === newSource) {
          deck.nodes.sourceNode = null;
          deck.currentTime = 0;
          deck.transportState = 'stopped';
          this.updateTransportTicker();
          this.notifyListeners();
        }
      };

      deck.nodes.sourceNode = newSource;
      newSource.start(Math.max(this.ctx.currentTime, 0), clampedPosition);
      this.updateTransportTicker();
    } else {
      deck.currentTime = clampedPosition;
    }

    this.notifyListeners();
  }

  /**
   * Returns authoritative hardware-clock playback position in seconds.
   */
  public getCurrentTime(deckId: DeckId): number {
    const deck = this.getDeckInternal(deckId);
    if (deck.transportState === 'playing' && this.ctx) {
      const elapsed = (this.ctx.currentTime - deck.startedAt) * deck.playbackRate;
      return clamp(elapsed, 0, deck.duration);
    }
    return deck.currentTime;
  }

  // =========================================================================
  // 5. PROFESSIONAL DECK CONTROLS (TRIM, EQ, FILTER, PITCH, CUE, LOOPS)
  // =========================================================================

  /**
   * Sets channel gain trim (0.0 to 2.0).
   */
  public setDeckTrim(deckId: DeckId, trim: number): void {
    const deck = this.getDeckInternal(deckId);
    deck.trim = clamp(trim, 0.0, 2.0);

    if (deck.nodes?.trimGain && this.ctx) {
      deck.nodes.trimGain.gain.setTargetAtTime(deck.trim, this.ctx.currentTime, 0.015);
    }
    this.notifyListeners();
  }

  /**
   * Sets channel fader volume for a deck (0.0 to 1.0).
   */
  public setDeckVolume(deckId: DeckId, volume: number): void {
    const deck = this.getDeckInternal(deckId);
    deck.volume = clamp(volume, 0.0, 1.0);

    if (deck.nodes?.channelGain && this.ctx) {
      deck.nodes.channelGain.gain.setTargetAtTime(deck.volume, this.ctx.currentTime, 0.015);
    }
    this.notifyListeners();
  }

  /**
   * Sets 3-band EQ gains (-24dB to +6dB).
   */
  public setDeckEQ(deckId: DeckId, eqValues: Partial<DeckEQ>): void {
    const deck = this.getDeckInternal(deckId);

    if (eqValues.low !== undefined) {
      deck.eq.low = clamp(eqValues.low, -24, 6);
    }
    if (eqValues.mid !== undefined) {
      deck.eq.mid = clamp(eqValues.mid, -24, 6);
    }
    if (eqValues.high !== undefined) {
      deck.eq.high = clamp(eqValues.high, -24, 6);
    }

    if (deck.nodes && this.ctx) {
      const now = this.ctx.currentTime;
      deck.nodes.lowEq.gain.setTargetAtTime(deck.eq.low, now, 0.015);
      deck.nodes.midEq.gain.setTargetAtTime(deck.eq.mid, now, 0.015);
      deck.nodes.highEq.gain.setTargetAtTime(deck.eq.high, now, 0.015);
    }
    this.notifyListeners();
  }

  /**
   * Sets deck sound-color filter mode, frequency, and resonance.
   */
  public setDeckFilter(deckId: DeckId, filterValues: Partial<DeckFilter>): void {
    const deck = this.getDeckInternal(deckId);

    if (filterValues.type !== undefined) {
      deck.filter.type = filterValues.type;
    }
    if (filterValues.frequency !== undefined) {
      deck.filter.frequency = clamp(filterValues.frequency, 20, 20000);
    }
    if (filterValues.q !== undefined) {
      deck.filter.q = clamp(filterValues.q, 0.1, 18.0);
    }

    if (deck.nodes?.filter) {
      this.configureFilterNode(deck.nodes.filter, deck.filter, false);
    }
    this.notifyListeners();
  }

  /**
   * Sets deck playback speed / vinyl pitch rate (range 0.5 to 2.0).
   */
  public setPlaybackRate(deckId: DeckId, rate: number): void {
    const deck = this.getDeckInternal(deckId);
    const clampedRate = clamp(rate, 0.5, 2.0);

    deck.basePlaybackRate = clampedRate;
    deck.playbackRate = clampedRate;

    if (deck.transportState === 'playing' && this.ctx && deck.nodes?.sourceNode) {
      const currentPos = this.getCurrentTime(deckId);
      deck.nodes.sourceNode.playbackRate.setValueAtTime(clampedRate, this.ctx.currentTime);
      deck.startedAt = this.ctx.currentTime - (currentPos / clampedRate);
    }

    this.notifyListeners();
  }

  /**
   * Momentarily nudges or bends playback rate during jog wheel manipulation.
   */
  public pitchBend(deckId: DeckId, deltaRate: number): void {
    const deck = this.getDeckInternal(deckId);
    const effectiveRate = clamp(deck.basePlaybackRate + deltaRate, 0.2, 3.0);
    deck.playbackRate = effectiveRate;

    if (deck.transportState === 'playing' && this.ctx && deck.nodes?.sourceNode) {
      const currentPos = this.getCurrentTime(deckId);
      deck.nodes.sourceNode.playbackRate.setValueAtTime(effectiveRate, this.ctx.currentTime);
      deck.startedAt = this.ctx.currentTime - (currentPos / effectiveRate);
    }
    this.notifyListeners();
  }

  /**
   * Scrubs playback position during vinyl jog platter drag.
   */
  public jogScrub(deckId: DeckId, deltaSeconds: number): void {
    const current = this.getCurrentTime(deckId);
    this.seek(deckId, current + deltaSeconds);
  }

  /**
   * Sets pitch fader range (±6%, ±10%, ±16%, ±100%).
   */
  public setPitchRange(deckId: DeckId, range: PitchRange): void {
    const deck = this.getDeckInternal(deckId);
    deck.pitchRange = range;
    this.notifyListeners();
  }

  /**
   * Toggles Key Lock / Master Tempo.
   */
  public setKeyLock(deckId: DeckId, enabled: boolean): void {
    const deck = this.getDeckInternal(deckId);
    deck.keyLock = enabled;
    this.notifyListeners();
  }

  /**
   * Captures the current position as main CUE point.
   */
  public setCue(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);
    deck.cueTime = this.getCurrentTime(deckId);
    this.notifyListeners();
  }

  /**
   * Returns to the stored CUE point.
   */
  public returnToCue(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);
    this.seek(deckId, deck.cueTime);
    if (deck.transportState === 'playing') {
      this.pause(deckId);
    }
  }

  /**
   * Sets or overwrites a Hot Cue slot (0 to 7).
   */
  public setHotCue(deckId: DeckId, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 8) return;
    const deck = this.getDeckInternal(deckId);
    const current = this.getCurrentTime(deckId);
    deck.hotCues[slotIndex] = current;
    this.notifyListeners();
  }

  /**
   * Triggers a Hot Cue slot (jumps and starts playback).
   */
  public async triggerHotCue(deckId: DeckId, slotIndex: number): Promise<void> {
    if (slotIndex < 0 || slotIndex >= 8) return;
    const deck = this.getDeckInternal(deckId);
    const cuePos = deck.hotCues[slotIndex];

    if (cuePos !== null) {
      this.seek(deckId, cuePos);
      if (deck.transportState !== 'playing') {
        await this.play(deckId);
      }
    } else {
      // Auto-set if empty
      this.setHotCue(deckId, slotIndex);
    }
  }

  /**
   * Deletes a Hot Cue slot.
   */
  public deleteHotCue(deckId: DeckId, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 8) return;
    const deck = this.getDeckInternal(deckId);
    deck.hotCues[slotIndex] = null;
    this.notifyListeners();
  }

  /**
   * Configures and enables/disables active looping.
   */
  public setLoop(deckId: DeckId, enabled: boolean, start?: number, end?: number, lengthBeats = 4): void {
    const deck = this.getDeckInternal(deckId);
    const current = this.getCurrentTime(deckId);
    const bpm = 120;
    const beatDuration = 60 / bpm; // 0.5s default

    const loopStart = start !== undefined ? start : current;
    const loopEnd = end !== undefined ? end : loopStart + lengthBeats * beatDuration;

    deck.loop = {
      enabled,
      start: Math.max(0, Math.min(loopStart, deck.duration)),
      end: Math.max(loopStart + 0.1, Math.min(loopEnd, deck.duration)),
      lengthBeats,
    };

    // Update active source loop parameters
    if (deck.nodes?.sourceNode) {
      deck.nodes.sourceNode.loop = enabled;
      if (enabled) {
        deck.nodes.sourceNode.loopStart = deck.loop.start;
        deck.nodes.sourceNode.loopEnd = deck.loop.end;
      }
    }

    this.notifyListeners();
  }

  public halveLoop(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);
    if (!deck.loop.enabled) return;
    const currentLength = deck.loop.end - deck.loop.start;
    const newEnd = deck.loop.start + currentLength / 2;
    this.setLoop(deckId, true, deck.loop.start, newEnd, deck.loop.lengthBeats / 2);
  }

  public doubleLoop(deckId: DeckId): void {
    const deck = this.getDeckInternal(deckId);
    if (!deck.loop.enabled) return;
    const currentLength = deck.loop.end - deck.loop.start;
    const newEnd = deck.loop.start + currentLength * 2;
    this.setLoop(deckId, true, deck.loop.start, newEnd, deck.loop.lengthBeats * 2);
  }

  /**
   * Jumps forward or backward by beat count.
   */
  public beatJump(deckId: DeckId, beats: number): void {
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const deltaSeconds = beats * beatDuration;
    const current = this.getCurrentTime(deckId);
    this.seek(deckId, current + deltaSeconds);
  }

  public setQuantize(deckId: DeckId, enabled: boolean): void {
    const deck = this.getDeckInternal(deckId);
    deck.quantize = enabled;
    this.notifyListeners();
  }

  public setSync(deckId: DeckId, enabled: boolean): void {
    const deck = this.getDeckInternal(deckId);
    deck.sync = enabled;
    if (enabled) {
      const otherDeck = deckId === 'A' ? this.deckB : this.deckA;
      if (otherDeck.buffer !== null) {
        this.setPlaybackRate(deckId, otherDeck.playbackRate);
      }
    }
    this.notifyListeners();
  }

  public setMasterDeck(deckId: DeckId): void {
    this.deckA.isMasterDeck = deckId === 'A';
    this.deckB.isMasterDeck = deckId === 'B';
    this.notifyListeners();
  }

  public setSlip(deckId: DeckId, enabled: boolean): void {
    const deck = this.getDeckInternal(deckId);
    deck.slip = enabled;
    this.notifyListeners();
  }

  /**
   * Configures real DSP FX on the deck.
   */
  public setDeckFX(
    deckId: DeckId,
    type: DeckFXType,
    enabled: boolean,
    depth = 0.5,
    beatDivision = 1.0
  ): void {
    const deck = this.getDeckInternal(deckId);
    deck.fx = { type, enabled, depth, beatDivision };

    if (deck.nodes && this.ctx) {
      const now = this.ctx.currentTime;
      const bpm = 120;
      const beatSec = (60 / bpm) * beatDivision;

      deck.nodes.fxDelay.delayTime.setTargetAtTime(clamp(beatSec, 0.05, 3.0), now, 0.015);
      deck.nodes.fxFeedback.gain.setTargetAtTime(clamp(depth * 0.75, 0.1, 0.85), now, 0.015);
      deck.nodes.fxSend.gain.setTargetAtTime(enabled ? depth : 0.0, now, 0.015);
      deck.nodes.fxWet.gain.setTargetAtTime(enabled ? depth : 0.0, now, 0.015);
    }

    this.notifyListeners();
  }

  /**
   * Toggles headphone cue monitor (PFL) for a deck.
   */
  public setCueMonitor(deckId: DeckId, enabled: boolean): void {
    const deck = this.getDeckInternal(deckId);
    deck.cueMonitor = enabled;
    if (deck.nodes?.cueGain && this.ctx) {
      deck.nodes.cueGain.gain.setTargetAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime, 0.015);
    }
    this.notifyListeners();
  }

  // =========================================================================
  // 6. MIXER & CROSSFADER
  // =========================================================================

  /**
   * Sets the equal-power crossfader position (-1.0 = Deck A, 0 = Center, +1.0 = Deck B).
   */
  public setCrossfader(position: number): void {
    this.crossfaderPosition = clamp(position, -1.0, 1.0);
    this.applyCrossfaderGains();
    this.notifyListeners();
  }

  private applyCrossfaderGains(): void {
    const { gainA, gainB } = calculateEqualPowerCrossfade(this.crossfaderPosition);

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.deckA.nodes?.crossfadeGain) {
        this.deckA.nodes.crossfadeGain.gain.setTargetAtTime(gainA, now, 0.015);
      }
      if (this.deckB.nodes?.crossfadeGain) {
        this.deckB.nodes.crossfadeGain.gain.setTargetAtTime(gainB, now, 0.015);
      }
    }
  }

  // =========================================================================
  // 7. MASTER & MONITORING STAGE
  // =========================================================================

  /**
   * Sets overall master output volume (0.0 to 1.0).
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = clamp(volume, 0.0, 1.0);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.015);
    }
    this.notifyListeners();
  }

  public setBoothVolume(volume: number): void {
    this.boothVolume = clamp(volume, 0.0, 1.0);
    if (this.boothGain && this.ctx) {
      this.boothGain.gain.setTargetAtTime(this.boothVolume, this.ctx.currentTime, 0.015);
    }
    this.notifyListeners();
  }

  public setHeadphoneVolume(volume: number): void {
    this.headphoneVolume = clamp(volume, 0.0, 1.0);
    if (this.headphoneVolumeGain && this.ctx) {
      this.headphoneVolumeGain.gain.setTargetAtTime(this.headphoneVolume, this.ctx.currentTime, 0.015);
    }
    this.notifyListeners();
  }

  public setCueMasterMix(mix: number): void {
    this.cueMasterMix = clamp(mix, 0.0, 1.0);
    if (this.ctx && this.headphoneCueGain && this.headphoneMasterGain) {
      const now = this.ctx.currentTime;
      this.headphoneCueGain.gain.setTargetAtTime(1.0 - this.cueMasterMix, now, 0.015);
      this.headphoneMasterGain.gain.setTargetAtTime(this.cueMasterMix, now, 0.015);
    }
    this.notifyListeners();
  }

  // =========================================================================
  // 8. ACOUSTIC ANALYSIS TAP & TELEMETRY
  // =========================================================================

  public getFrequencyData(outputArray?: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    const size = this.analyser ? this.analyser.frequencyBinCount : 1024;
    const array = outputArray && outputArray.length >= size ? outputArray : new Uint8Array(size);

    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
    return array;
  }

  public getTimeDomainData(outputArray?: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    const size = this.analyser ? this.analyser.fftSize : 2048;
    const array = outputArray && outputArray.length >= size ? outputArray : new Uint8Array(size);

    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
    return array;
  }

  public getFloatFrequencyData(outputArray?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
    const size = this.analyser ? this.analyser.frequencyBinCount : 1024;
    const array = outputArray && outputArray.length >= size ? outputArray : new Float32Array(size);

    if (this.analyser) {
      this.analyser.getFloatFrequencyData(array);
    } else {
      array.fill(-Infinity);
    }
    return array;
  }

  public getFloatTimeDomainData(outputArray?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
    const size = this.analyser ? this.analyser.fftSize : 2048;
    const array = outputArray && outputArray.length >= size ? outputArray : new Float32Array(size);

    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(array);
    } else {
      array.fill(0);
    }
    return array;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Diagnostic telemetry for real-time verification of audio signal path.
   */
  public getAudioDiagnostics(): AudioDiagnostics {
    let masterRms = 0;
    let masterPeak = 0;

    if (this.analyser) {
      const data = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        sumSq += val * val;
        if (Math.abs(val) > masterPeak) masterPeak = Math.abs(val);
      }
      masterRms = Math.sqrt(sumSq / data.length);
    }

    return {
      contextState: this.getContextState(),
      isAudioLive: this.isAudioLive(),
      masterRms,
      masterPeak,
      deckARms: this.deckA.transportState === 'playing' ? masterRms : 0,
      deckBRms: this.deckB.transportState === 'playing' ? masterRms : 0,
      sampleRate: this.ctx?.sampleRate || 44100,
    };
  }

  // =========================================================================
  // 9. STATE SUBSCRIPTION & QUERY
  // =========================================================================

  private getDeckInternal(deckId: DeckId): DeckInternalState {
    if (deckId === 'A') return this.deckA;
    if (deckId === 'B') return this.deckB;
    throw new AudioEngineError(`Invalid deck identifier "${deckId}". Expected "A" or "B".`, 'DECK_NOT_FOUND');
  }

  public getDeckState(deckId: DeckId): DeckState {
    const internal = this.getDeckInternal(deckId);
    return {
      id: internal.id,
      isLoaded: internal.buffer !== null,
      trackName: internal.trackName,
      duration: internal.duration,
      currentTime: this.getCurrentTime(deckId),
      transportState: internal.transportState,
      volume: internal.volume,
      trim: internal.trim,
      eq: { ...internal.eq },
      filter: { ...internal.filter },
      playbackRate: internal.playbackRate,
      pitchRange: internal.pitchRange,
      keyLock: internal.keyLock,
      cueTime: internal.cueTime,
      hotCues: [...internal.hotCues],
      loop: { ...internal.loop },
      fx: { ...internal.fx },
      quantize: internal.quantize,
      sync: internal.sync,
      isMasterDeck: internal.isMasterDeck,
      slip: internal.slip,
      cueMonitor: internal.cueMonitor,
    };
  }

  public getCrossfaderState(): CrossfaderState {
    const { gainA, gainB } = calculateEqualPowerCrossfade(this.crossfaderPosition);
    return {
      position: this.crossfaderPosition,
      gainA,
      gainB,
      curve: 'equal-power',
    };
  }

  public getMasterState(): MasterState {
    return {
      volume: this.masterVolume,
      boothVolume: this.boothVolume,
      headphoneVolume: this.headphoneVolume,
      cueMasterMix: this.cueMasterMix,
    };
  }

  /**
   * Returns a complete domain state snapshot.
   */
  public getState(): AudioEngineSnapshot {
    return {
      contextState: this.getContextState(),
      isAudioLive: this.isAudioLive(),
      deckA: this.getDeckState('A'),
      deckB: this.getDeckState('B'),
      crossfader: this.getCrossfaderState(),
      master: this.getMasterState(),
      diagnostics: this.getAudioDiagnostics(),
    };
  }

  /**
   * Subscribes to discrete domain state mutations.
   */
  public subscribe(listener: AudioEngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    if (this.listeners.size === 0) return;
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in AudioEngine listener:', err);
      }
    }
  }
}

// Singleton accessor for application runtime
let defaultEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!defaultEngineInstance) {
    defaultEngineInstance = new AudioEngine();
  }
  return defaultEngineInstance;
}
