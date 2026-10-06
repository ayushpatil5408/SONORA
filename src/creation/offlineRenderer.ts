/**
 * SONORA Offline Audio Rendering Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.5 Specification
 * 
 * Executes an offline RenderPlan to produce a broadcast-ready stereo audio mixdown
 * or isolated stem bounce.
 * 
 * Features:
 * - Uses browser-native OfflineAudioContext for deterministic, hardware-independent audio rendering
 * - Pure Float32Array software rendering fallback when running in Node.js test environments
 * - Full M5.4 WSOLA pitch-preserving time-stretching integration
 * - Full M5.2 Track DSP processing chain integration (EQ, filter, compressor, limiter, delay, reverb)
 * - Non-linear fade curves (linear, ease-in, ease-out, equal-power) and crossfades
 * - Track automation on volume and pan
 * - Stage-based progress notifications (preparing, rendering, encoding, complete)
 * - Safe cooperative cancellation support
 */

import { RenderPlan, RenderProgress, RenderResult, RenderError } from './renderTypes';
import { buildTrackDspGraph } from './trackProcessing';
import { calculateFadeMultiplier, getInterpolatedAutomationValue } from './automationMath';
import { timeStretchAudioBuffer } from './warpDsp';
import { encodeAudioBufferToWavBlob, encodeWav } from './wavEncoder';

export type BufferResolver = (sourceId: string) => AudioBuffer | undefined;

/**
 * Executes an offline render plan and returns the encoded WAV file result.
 */
export async function renderAudioProject(
  plan: RenderPlan,
  bufferResolver: BufferResolver,
  onProgress?: (progress: RenderProgress) => void,
  abortSignal?: AbortSignal
): Promise<RenderResult> {
  const startTime = Date.now();

  const reportProgress = (stage: RenderProgress['stage'], progress: number, message: string) => {
    if (onProgress) {
      onProgress({
        stage,
        progress: Math.max(0, Math.min(1, progress)),
        message,
        elapsedMs: Date.now() - startTime,
      });
    }
  };

  reportProgress('preparing', 0.05, 'Preparing render graph and assets...');

  // Check for early abort
  if (abortSignal?.aborted) {
    reportProgress('cancelled', 0, 'Render cancelled by user.');
    throw createRenderError('CANCELLED', 'Render cancelled by user.');
  }

  // Determine whether running in browser environment with OfflineAudioContext
  const hasBrowserOfflineContext =
    typeof window !== 'undefined' &&
    (window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext);

  if (hasBrowserOfflineContext) {
    return renderWithOfflineAudioContext(plan, bufferResolver, reportProgress, abortSignal);
  } else {
    // Pure software mixer for headless Node.js test suites
    return renderWithSoftwareEngine(plan, bufferResolver, reportProgress, abortSignal);
  }
}

/**
 * Browser-native OfflineAudioContext renderer.
 */
async function renderWithOfflineAudioContext(
  plan: RenderPlan,
  bufferResolver: BufferResolver,
  reportProgress: (stage: RenderProgress['stage'], progress: number, message: string) => void,
  abortSignal?: AbortSignal
): Promise<RenderResult> {
  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;

  const totalSamples = Math.max(128, Math.ceil(plan.duration * plan.sampleRate));
  const offlineCtx = new OfflineCtxClass(2, totalSamples, plan.sampleRate);

  reportProgress('preparing', 0.15, 'Building offline DSP graphs and scheduling clips...');

  // Master Gain Node
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.9, 0);
  masterGain.connect(offlineCtx.destination);

  // Schedule each track plan
  for (const trackPlan of plan.tracks) {
    if (trackPlan.muted && !trackPlan.solo && plan.mode !== 'stem') {
      continue;
    }

    // 1. Track DSP Graph
    const dspGraph = buildTrackDspGraph(offlineCtx, trackPlan.processingChain);

    // 2. Track Gain & Volume Automation
    const trackGain = offlineCtx.createGain();
    const volLane = trackPlan.automationLanes?.find((l) => l.parameter === 'volume' && l.enabled);
    if (volLane && volLane.points.length > 0) {
      const initialVol = getInterpolatedAutomationValue(volLane, plan.range.startProjectTime, trackPlan.volume);
      trackGain.gain.setValueAtTime(initialVol, 0);

      for (const pt of volLane.points) {
        if (pt.time >= plan.range.startProjectTime && pt.time <= plan.range.endProjectTime) {
          const ptRenderTime = pt.time - plan.range.startProjectTime;
          trackGain.gain.linearRampToValueAtTime(pt.value, ptRenderTime);
        }
      }
    } else {
      trackGain.gain.setValueAtTime(trackPlan.volume, 0);
    }

    // 3. Track Pan (using StereoPannerNode where available)
    let trackOutput: AudioNode = trackGain;
    if (typeof offlineCtx.createStereoPanner === 'function') {
      const panner = offlineCtx.createStereoPanner();
      const panLane = trackPlan.automationLanes?.find((l) => l.parameter === 'pan' && l.enabled);
      if (panLane && panLane.points.length > 0) {
        const initialPan = getInterpolatedAutomationValue(panLane, plan.range.startProjectTime, trackPlan.pan);
        panner.pan.setValueAtTime(initialPan, 0);
        for (const pt of panLane.points) {
          if (pt.time >= plan.range.startProjectTime && pt.time <= plan.range.endProjectTime) {
            const ptRenderTime = pt.time - plan.range.startProjectTime;
            panner.pan.linearRampToValueAtTime(pt.value, ptRenderTime);
          }
        }
      } else {
        panner.pan.setValueAtTime(trackPlan.pan, 0);
      }
      trackGain.connect(panner);
      trackOutput = panner;
    }

    dspGraph.outputNode.connect(trackGain);
    trackOutput.connect(masterGain);

    // 4. Schedule clips on this track
    for (const clipPlan of trackPlan.clips) {
      const rawBuffer = bufferResolver(clipPlan.sourceId);
      if (!rawBuffer) {
        // Skip unavailable buffer gracefully
        continue;
      }

      let effectiveBuffer = rawBuffer;
      let sourceOffset = clipPlan.sourceOffset;

      // Milestone 5.4 Warping Integration
      if (clipPlan.warp && clipPlan.warp.enabled && clipPlan.warp.mode === 'project_locked') {
        const effectiveBpm = clipPlan.warp.manualBpm || clipPlan.warp.sourceBpm || 120;
        const ratio = plan.tempo / effectiveBpm;
        effectiveBuffer = timeStretchAudioBuffer(
          offlineCtx,
          rawBuffer,
          clipPlan.sourceOffset,
          clipPlan.sourceOffset + clipPlan.playDuration * ratio,
          ratio,
          clipPlan.warp.quality || 'balanced',
          clipPlan.warp.pitchLocked ?? true,
          clipPlan.sourceId
        );
        sourceOffset = 0;
      }

      try {
        const sourceNode = offlineCtx.createBufferSource();
        sourceNode.buffer = effectiveBuffer;

        const clipGain = offlineCtx.createGain();
        clipGain.gain.setValueAtTime(clipPlan.gain, clipPlan.timelineStart);

        // Fade In
        if (clipPlan.fadeIn > 0) {
          const inDur = Math.min(clipPlan.fadeIn, clipPlan.playDuration);
          const inSteps = 32;
          const curveArr = new Float32Array(inSteps);
          for (let i = 0; i < inSteps; i++) {
            const progress = i / (inSteps - 1);
            const mult = calculateFadeMultiplier(progress, clipPlan.fadeInCurve, true);
            curveArr[i] = Math.max(0.0001, mult * clipPlan.gain);
          }
          clipGain.gain.setValueCurveAtTime(curveArr, clipPlan.timelineStart, inDur);
        }

        // Fade Out
        if (clipPlan.fadeOut > 0) {
          const outDur = Math.min(clipPlan.fadeOut, clipPlan.playDuration);
          const fadeStart = clipPlan.timelineStart + clipPlan.playDuration - outDur;
          const outSteps = 32;
          const curveArr = new Float32Array(outSteps);
          for (let i = 0; i < outSteps; i++) {
            const progress = i / (outSteps - 1);
            const mult = calculateFadeMultiplier(progress, clipPlan.fadeOutCurve, false);
            curveArr[i] = Math.max(0.0001, mult * clipPlan.gain);
          }
          clipGain.gain.setValueCurveAtTime(curveArr, fadeStart, outDur);
        }

        // Routing
        sourceNode.connect(clipGain);
        clipGain.connect(dspGraph.inputNode);

        sourceNode.start(
          clipPlan.timelineStart,
          Math.max(0, sourceOffset),
          clipPlan.playDuration
        );
      } catch (err) {
        // Log scheduling error non-fatally
        console.warn('Clip render schedule error:', err);
      }
    }
  }

  // Check abort right before rendering
  if (abortSignal?.aborted) {
    reportProgress('cancelled', 0, 'Render cancelled by user.');
    throw createRenderError('CANCELLED', 'Render cancelled by user.');
  }

  reportProgress('rendering', 0.4, 'Rendering acoustic graph via OfflineAudioContext...');

  let renderedBuffer: AudioBuffer;
  try {
    renderedBuffer = await offlineCtx.startRendering();
  } catch (err) {
    throw createRenderError('DSP_FAILURE', `Offline rendering graph failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (abortSignal?.aborted) {
    reportProgress('cancelled', 0, 'Render cancelled by user.');
    throw createRenderError('CANCELLED', 'Render cancelled by user.');
  }

  reportProgress('encoding', 0.85, 'Encoding audio into RIFF WAV container...');

  // Encode to WAV Blob
  const blob = encodeAudioBufferToWavBlob(renderedBuffer, plan.settings.bitDepth);

  const url = URL.createObjectURL(blob);
  const baseName = plan.projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filename = plan.mode === 'stem' && plan.targetTrack
    ? `${baseName}_stem_${plan.targetTrack.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.wav`
    : `${baseName}_mixdown.wav`;

  reportProgress('complete', 1.0, 'Render and export complete!');

  return {
    blob,
    url,
    filename,
    duration: plan.duration,
    sampleRate: plan.sampleRate,
    bitDepth: plan.settings.bitDepth,
    channels: 2,
    fileSize: blob.size,
    mode: plan.mode,
    trackName: plan.targetTrack?.name,
    renderedAt: new Date().toISOString(),
  };
}

/**
 * Pure Float32Array software mixer for headless Node.js tests or environments without Web Audio DOM.
 */
async function renderWithSoftwareEngine(
  plan: RenderPlan,
  bufferResolver: BufferResolver,
  reportProgress: (stage: RenderProgress['stage'], progress: number, message: string) => void,
  abortSignal?: AbortSignal
): Promise<RenderResult> {
  reportProgress('rendering', 0.3, 'Synthesizing software PCM mixdown...');

  const sampleRate = plan.sampleRate;
  const totalSamples = Math.max(128, Math.ceil(plan.duration * sampleRate));

  const leftMaster = new Float32Array(totalSamples);
  const rightMaster = new Float32Array(totalSamples);

  for (const trackPlan of plan.tracks) {
    if (trackPlan.muted && !trackPlan.solo && plan.mode !== 'stem') {
      continue;
    }

    const trackLeft = new Float32Array(totalSamples);
    const trackRight = new Float32Array(totalSamples);

    for (const clipPlan of trackPlan.clips) {
      if (abortSignal?.aborted) {
        throw createRenderError('CANCELLED', 'Render cancelled by user.');
      }

      const rawBuffer = bufferResolver(clipPlan.sourceId);
      if (!rawBuffer) continue;

      const clipStartSample = Math.floor(clipPlan.timelineStart * sampleRate);
      const clipDurationSamples = Math.floor(clipPlan.playDuration * sampleRate);
      const sourceStartSample = Math.floor(clipPlan.sourceOffset * sampleRate);

      const srcLeft = rawBuffer.getChannelData(0);
      const srcRight = rawBuffer.numberOfChannels > 1 ? rawBuffer.getChannelData(1) : srcLeft;

      for (let i = 0; i < clipDurationSamples; i++) {
        const outIdx = clipStartSample + i;
        if (outIdx >= totalSamples) break;

        const srcIdx = sourceStartSample + i;
        if (srcIdx >= srcLeft.length) break;

        let sampleL = srcLeft[srcIdx];
        let sampleR = srcRight[srcIdx];

        // Apply gain
        sampleL *= clipPlan.gain;
        sampleR *= clipPlan.gain;

        // Apply Fade In
        if (clipPlan.fadeIn > 0) {
          const fadeSamples = Math.floor(clipPlan.fadeIn * sampleRate);
          if (i < fadeSamples) {
            const mult = calculateFadeMultiplier(i / fadeSamples, clipPlan.fadeInCurve, true);
            sampleL *= mult;
            sampleR *= mult;
          }
        }

        // Apply Fade Out
        if (clipPlan.fadeOut > 0) {
          const fadeSamples = Math.floor(clipPlan.fadeOut * sampleRate);
          const fromEnd = clipDurationSamples - i;
          if (fromEnd < fadeSamples) {
            const mult = calculateFadeMultiplier((fadeSamples - fromEnd) / fadeSamples, clipPlan.fadeOutCurve, false);
            sampleL *= mult;
            sampleR *= mult;
          }
        }

        trackLeft[outIdx] += sampleL;
        trackRight[outIdx] += sampleR;
      }
    }

    // Apply track volume & pan
    const panAngle = ((trackPlan.pan + 1) * Math.PI) / 4; // 0 to PI/2
    const panGainL = Math.cos(panAngle);
    const panGainR = Math.sin(panAngle);

    for (let i = 0; i < totalSamples; i++) {
      leftMaster[i] += trackLeft[i] * trackPlan.volume * panGainL;
      rightMaster[i] += trackRight[i] * trackPlan.volume * panGainR;
    }
  }

  // Master Gain 0.9
  for (let i = 0; i < totalSamples; i++) {
    leftMaster[i] *= 0.9;
    rightMaster[i] *= 0.9;
  }

  reportProgress('encoding', 0.85, 'Encoding software PCM into WAV binary...');

  const arrayBuffer = encodeWav([leftMaster, rightMaster], sampleRate, plan.settings.bitDepth);

  const blob = typeof Blob !== 'undefined'
    ? new Blob([arrayBuffer], { type: 'audio/wav' })
    : ({ size: arrayBuffer.byteLength } as unknown as Blob);

  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(blob)
    : `blob:mock-url-${Date.now()}`;

  const baseName = plan.projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filename = plan.mode === 'stem' && plan.targetTrack
    ? `${baseName}_stem_${plan.targetTrack.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.wav`
    : `${baseName}_mixdown.wav`;

  reportProgress('complete', 1.0, 'Software render complete!');

  return {
    blob,
    url,
    filename,
    duration: plan.duration,
    sampleRate: plan.sampleRate,
    bitDepth: plan.settings.bitDepth,
    channels: 2,
    fileSize: arrayBuffer.byteLength,
    mode: plan.mode,
    trackName: plan.targetTrack?.name,
    renderedAt: new Date().toISOString(),
  };
}

function createRenderError(code: RenderError['code'], message: string): Error & { code: RenderError['code'] } {
  const err = new Error(message) as Error & { code: RenderError['code'] };
  err.code = code;
  return err;
}
