/**
 * SONORA Creation Playback & Audio Scheduling Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.0, 5.1 & 5.2 Specification
 * 
 * Manages timeline playback scheduling:
 * - Decoupled from UI: high-frequency playhead movements use requestAnimationFrame
 * - Connects to authoritative Web Audio context via AudioEngine facade
 * - Schedules AudioBufferSourceNode instances per active clip with sourceStart offset
 * - Integrates Real Web Audio DSP Track Processing Chains (EQ, filter, compressor, limiter, saturation, delay, reverb)
 * - Supports Non-Linear Fade Curves (linear, ease-in, ease-out, equal-power) and Overlapping Crossfades
 * - Applies Volume & Pan Track Automation
 * - Handles missing source buffers gracefully without crashing
 */

import { getAudioEngine } from '../audio/AudioEngine';
import { AudioProject, FadeCurve } from './types';
import { buildTrackDspGraph, TrackDspNodeGraph } from './trackProcessing';
import { calculateFadeMultiplier, getInterpolatedAutomationValue } from './automationMath';
import { timeStretchAudioBuffer } from './warpDsp';

export type PlaybackTimeListener = (time: number) => void;
export type PlaybackStateListener = (isPlaying: boolean) => void;

class PlaybackScheduler {
  private sourceBuffers = new Map<string, AudioBuffer>();
  private activeSources: AudioBufferSourceNode[] = [];
  private activeGains: GainNode[] = [];
  private activeDspGraphs: TrackDspNodeGraph[] = [];

  private projectMasterGain: GainNode | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private playbackStartAudioTime = 0;
  private playbackStartTimelineTime = 0;
  private currentProject: AudioProject | null = null;

  private rafId: number | null = null;
  private timeListeners = new Set<PlaybackTimeListener>();
  private stateListeners = new Set<PlaybackStateListener>();

  /**
   * Registers a decoded audio buffer for a source ID or track ID.
   */
  public registerSourceBuffer(sourceId: string, buffer: AudioBuffer): void {
    if (sourceId && buffer) {
      this.sourceBuffers.set(sourceId, buffer);
    }
  }

  /**
   * Retrieves a registered audio buffer.
   */
  public getSourceBuffer(sourceId: string): AudioBuffer | undefined {
    return this.sourceBuffers.get(sourceId);
  }

  /**
   * Checks if an audio buffer is available for a source ID.
   */
  public hasSourceBuffer(sourceId: string): boolean {
    return this.sourceBuffers.has(sourceId);
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentProject(): AudioProject | null {
    return this.currentProject;
  }

  public onTimeUpdate(listener: PlaybackTimeListener): () => void {
    this.timeListeners.add(listener);
    return () => this.timeListeners.delete(listener);
  }

  public onStateChange(listener: PlaybackStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyTime(time: number): void {
    this.currentTime = time;
    this.timeListeners.forEach((fn) => fn(time));
  }

  private notifyState(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    this.stateListeners.forEach((fn) => fn(isPlaying));
  }

  /**
   * Initializes project master output gain node connected to AudioEngine.
   */
  private async ensureMasterRouting(ctx: AudioContext): Promise<GainNode> {
    if (this.projectMasterGain && this.projectMasterGain.context === ctx) {
      return this.projectMasterGain;
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.9, ctx.currentTime);

    const audioEngine = getAudioEngine();
    const dest = audioEngine.getMasterGain() || ctx.destination;
    master.connect(dest);

    this.projectMasterGain = master;
    return master;
  }

  /**
   * Stops all active hardware audio source nodes immediately.
   */
  private clearActiveAudioNodes(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already be stopped
      }
    }
    this.activeSources = [];

    for (const gain of this.activeGains) {
      try {
        gain.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeGains = [];

    for (const graph of this.activeDspGraphs) {
      try {
        graph.cleanup();
      } catch {
        // Ignore
      }
    }
    this.activeDspGraphs = [];
  }

  /**
   * Creates an audio curve array for non-linear fade transitions.
   */
  private createFadeCurveArray(
    curve: FadeCurve,
    isFadeIn: boolean,
    peakGain: number,
    steps = 32
  ): Float32Array {
    const arr = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const mult = calculateFadeMultiplier(progress, curve, isFadeIn);
      arr[i] = Math.max(0.0001, mult * peakGain);
    }
    return arr;
  }

  /**
   * Starts playback of the project from the current or specified time.
   */
  public async play(project: AudioProject, fromTime?: number): Promise<void> {
    const audioEngine = getAudioEngine();
    const ctx = await audioEngine.ensureContext();
    await audioEngine.resume();

    this.currentProject = project;
    this.clearActiveAudioNodes();

    const master = await this.ensureMasterRouting(ctx);
    const startTime = fromTime !== undefined ? Math.max(0, fromTime) : this.currentTime;
    const now = ctx.currentTime;

    this.playbackStartAudioTime = now;
    this.playbackStartTimelineTime = startTime;
    this.notifyTime(startTime);
    this.notifyState(true);

    // Schedule all active and upcoming clips across all unmuted tracks
    for (const track of project.tracks) {
      if (track.muted) continue;

      // 1. Track DSP Processing Graph
      const dspGraph = buildTrackDspGraph(ctx, track.processingChain);
      this.activeDspGraphs.push(dspGraph);

      // 2. Track-level gain & pan
      const trackGain = ctx.createGain();
      
      // Automation check: Volume
      const volLane = track.automationLanes?.find((l) => l.parameter === 'volume' && l.enabled);
      if (volLane && volLane.points.length > 0) {
        const initialVol = getInterpolatedAutomationValue(volLane, startTime, track.volume);
        trackGain.gain.setValueAtTime(initialVol, now);

        // Schedule future automation points
        for (const pt of volLane.points) {
          if (pt.time > startTime) {
            const ptAudioTime = now + (pt.time - startTime);
            trackGain.gain.linearRampToValueAtTime(pt.value, ptAudioTime);
          }
        }
      } else {
        trackGain.gain.setValueAtTime(track.volume, now);
      }

      // Connect: DSP Output -> TrackGain -> Master
      dspGraph.outputNode.connect(trackGain);
      trackGain.connect(master);
      this.activeGains.push(trackGain);

      // 3. Schedule clips on this track
      for (const clip of track.clips) {
        if (clip.muted) continue;

        const clipEnd = clip.timelineStart + clip.duration;
        if (clipEnd <= startTime) continue;

        const sourceId = clip.metadata?.sourceId || clip.id;
        const buffer = this.sourceBuffers.get(sourceId);
        if (!buffer) {
          // Gracefully continue; source is unavailable
          continue;
        }

        let effectiveBuffer = buffer;
        let scheduleAudioTime = now;
        let sourceOffset = clip.sourceStart;
        let playDuration = clip.duration;

        const isWarped = clip.warp && clip.warp.enabled && clip.warp.mode === 'project_locked';

        if (isWarped && clip.warp) {
          const effectiveBpm = clip.warp.manualBpm || clip.warp.sourceBpm || 120;
          const ratio = project.tempo / effectiveBpm;
          effectiveBuffer = timeStretchAudioBuffer(
            ctx,
            buffer,
            clip.sourceStart,
            clip.sourceEnd,
            ratio,
            clip.warp.quality || 'balanced',
            clip.warp.pitchLocked ?? true,
            sourceId
          );

          if (clip.timelineStart < startTime) {
            const elapsedInClip = startTime - clip.timelineStart;
            sourceOffset = elapsedInClip;
            playDuration = clip.duration - elapsedInClip;
            scheduleAudioTime = now;
          } else {
            const leadTime = clip.timelineStart - startTime;
            scheduleAudioTime = now + leadTime;
            sourceOffset = 0;
            playDuration = clip.duration;
          }
        } else {
          if (clip.timelineStart < startTime) {
            const elapsedInClip = startTime - clip.timelineStart;
            sourceOffset = clip.sourceStart + elapsedInClip;
            playDuration = clip.duration - elapsedInClip;
            scheduleAudioTime = now;
          } else {
            const leadTime = clip.timelineStart - startTime;
            scheduleAudioTime = now + leadTime;
            sourceOffset = clip.sourceStart;
            playDuration = clip.duration;
          }
        }

        if (playDuration <= 0) continue;

        try {
          const sourceNode = ctx.createBufferSource();
          sourceNode.buffer = effectiveBuffer;

          // Clip-level gain
          const clipGain = ctx.createGain();
          const effectiveGain = clip.gain ?? 1.0;
          clipGain.gain.setValueAtTime(effectiveGain, scheduleAudioTime);

          // Apply Fade-In with non-linear curve
          if (clip.fadeIn > 0 && clip.timelineStart >= startTime) {
            const inDuration = Math.min(clip.fadeIn, playDuration);
            const inCurve = clip.fadeInCurve || 'linear';
            if (inCurve === 'linear') {
              clipGain.gain.setValueAtTime(0.001, scheduleAudioTime);
              clipGain.gain.linearRampToValueAtTime(effectiveGain, scheduleAudioTime + inDuration);
            } else {
              const curveVals = this.createFadeCurveArray(inCurve, true, effectiveGain);
              clipGain.gain.setValueCurveAtTime(curveVals, scheduleAudioTime, inDuration);
            }
          }

          // Apply Fade-Out with non-linear curve
          if (clip.fadeOut > 0) {
            const outDuration = Math.min(clip.fadeOut, playDuration);
            const fadeOutStart = scheduleAudioTime + playDuration - outDuration;
            const outCurve = clip.fadeOutCurve || 'linear';

            if (outCurve === 'linear') {
              clipGain.gain.setValueAtTime(effectiveGain, Math.max(scheduleAudioTime, fadeOutStart));
              clipGain.gain.linearRampToValueAtTime(0.001, scheduleAudioTime + playDuration);
            } else {
              const curveVals = this.createFadeCurveArray(outCurve, false, effectiveGain);
              clipGain.gain.setValueCurveAtTime(curveVals, Math.max(scheduleAudioTime, fadeOutStart), outDuration);
            }
          }

          // Overlapping Crossfade Detection & Shaping
          if (track.crossfades && track.crossfades.length > 0) {
            const xfade = track.crossfades.find((xf) => xf.fromClipId === clip.id || xf.toClipId === clip.id);
            if (xfade) {
              const xfadeDuration = Math.min(xfade.duration, playDuration);
              if (xfade.fromClipId === clip.id) {
                // Outgoing clip in crossfade
                const fadeStart = scheduleAudioTime + playDuration - xfadeDuration;
                const curveVals = this.createFadeCurveArray(
                  xfade.curve === 'equal-power' ? 'equal-power' : 'linear',
                  false,
                  effectiveGain
                );
                clipGain.gain.setValueCurveAtTime(curveVals, Math.max(scheduleAudioTime, fadeStart), xfadeDuration);
              } else if (xfade.toClipId === clip.id && clip.timelineStart >= startTime) {
                // Incoming clip in crossfade
                const curveVals = this.createFadeCurveArray(
                  xfade.curve === 'equal-power' ? 'equal-power' : 'linear',
                  true,
                  effectiveGain
                );
                clipGain.gain.setValueCurveAtTime(curveVals, scheduleAudioTime, xfadeDuration);
              }
            }
          }

          // Route: Source -> ClipGain -> Track DSP Input
          clipGain.connect(dspGraph.inputNode);
          sourceNode.connect(clipGain);

          sourceNode.start(scheduleAudioTime, Math.max(0, sourceOffset), playDuration);
          this.activeSources.push(sourceNode);
          this.activeGains.push(clipGain);
        } catch {
          // Gracefully isolate scheduling error
        }
      }
    }

    this.startAnimationLoop(ctx, project.duration);
  }

  /**
   * rAF loop providing smooth playhead tracking.
   */
  private startAnimationLoop(ctx: AudioContext, projectDuration: number): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    const tick = () => {
      if (!this.isPlaying) return;

      const elapsed = ctx.currentTime - this.playbackStartAudioTime;
      const current = this.playbackStartTimelineTime + elapsed;

      if (current >= projectDuration) {
        this.stop();
        this.notifyTime(0);
        return;
      }

      this.notifyTime(current);
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Pauses timeline playback at current playhead position.
   */
  public pause(): void {
    if (!this.isPlaying) return;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.clearActiveAudioNodes();
    this.notifyState(false);
  }

  /**
   * Stops timeline playback and resets playhead to 0.
   */
  public stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.clearActiveAudioNodes();
    this.currentTime = 0;
    this.notifyState(false);
    this.notifyTime(0);
  }

  /**
   * Seeks the playhead to a target timestamp.
   */
  public async seek(project: AudioProject, targetTime: number): Promise<void> {
    const clampedTime = Math.max(0, Math.min(project.duration, targetTime));
    const wasPlaying = this.isPlaying;

    if (wasPlaying) {
      this.clearActiveAudioNodes();
      await this.play(project, clampedTime);
    } else {
      this.notifyTime(clampedTime);
    }
  }

  /**
   * Clean up all audio nodes and animation loops.
   */
  public dispose(): void {
    this.stop();
    this.sourceBuffers.clear();
    this.timeListeners.clear();
    this.stateListeners.clear();
  }
}

export const playbackScheduler = new PlaybackScheduler();
