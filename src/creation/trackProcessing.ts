/**
 * SONORA Real Web Audio DSP Track Processing Engine
 * Authoritative Reference: PRD.md Section 35, Milestone 5.2 Specification
 * 
 * Instantiates and interconnects real Web Audio DSP nodes:
 * 1. 3-Band Parametric EQ (low shelf, mid peaking, high shelf via BiquadFilterNode)
 * 2. Sound Color Filter (lowpass, highpass, bandpass via BiquadFilterNode)
 * 3. Dynamic Compressor (threshold, ratio, attack, release via DynamicsCompressorNode)
 * 4. Brickwall Peak Limiter (fast-attack ceiling limiter via DynamicsCompressorNode)
 * 5. Harmonic Saturation (non-linear waveshaping via WaveShaperNode)
 * 6. Stereo Temporal Delay (time, feedback, wet/dry mix via DelayNode)
 * 7. Acoustic Space Reverb (synthetic impulse response via ConvolverNode)
 * 
 * Supports non-destructive real-time parameter modulation and instant zero-latency bypass.
 */

import {
  TrackProcessorType,
  TrackProcessor,
  TrackProcessingChain,
} from './types';

export interface TrackDspNodeGraph {
  inputNode: GainNode;
  outputNode: GainNode;
  updateParams: (processorId: string, params: Record<string, number | string | boolean>) => void;
  setBypass: (processorId: string, bypassed: boolean) => void;
  cleanup: () => void;
}

/**
 * Returns factory default parameters for a given processor type.
 */
export function getDefaultProcessorParams(type: TrackProcessorType): Record<string, number | string | boolean> {
  switch (type) {
    case 'eq':
      return {
        lowGain: 0,     // dB (-18 to +12)
        midGain: 0,     // dB (-18 to +12)
        highGain: 0,    // dB (-18 to +12)
        lowFreq: 120,   // Hz
        midFreq: 1200,  // Hz
        highFreq: 6500, // Hz
      };
    case 'filter':
      return {
        filterType: 'lowpass',
        cutoff: 18000,  // Hz
        resonance: 1.0, // Q
      };
    case 'compressor':
      return {
        threshold: -18, // dB (-60 to 0)
        ratio: 3.5,     // 1 to 20
        attack: 0.015,  // seconds
        release: 0.2,   // seconds
        knee: 6,        // dB
      };
    case 'limiter':
      return {
        ceiling: -0.5,  // dBFS
        threshold: -1.5,// dBFS
        release: 0.08,  // seconds
      };
    case 'saturation':
      return {
        drive: 15,      // 0 to 100
        mix: 0.4,       // 0.0 to 1.0
      };
    case 'delay':
      return {
        time: 0.375,    // seconds (e.g. 3/16 note at 120 BPM)
        feedback: 0.35, // 0.0 to 0.9
        mix: 0.3,       // 0.0 to 1.0
      };
    case 'reverb':
      return {
        decay: 2.2,     // seconds
        mix: 0.25,      // 0.0 to 1.0
      };
    default:
      return {};
  }
}

/**
 * Creates a new TrackProcessor domain entity.
 */
export function createTrackProcessor(
  type: TrackProcessorType,
  name?: string
): TrackProcessor {
  const titles: Record<TrackProcessorType, string> = {
    eq: 'Spectral EQ (3-Band)',
    filter: 'Resonant Filter',
    compressor: 'Dynamic Compressor',
    limiter: 'Peak Safety Limiter',
    saturation: 'Harmonic Saturation',
    delay: 'Temporal Echo Delay',
    reverb: 'Acoustic Space Reverb',
  };

  return {
    id: `proc-${type}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    name: name || titles[type],
    enabled: true,
    bypassed: false,
    params: getDefaultProcessorParams(type),
  };
}

/**
 * Creates an in-memory soft-clipping sigmoid curve for saturation.
 */
function createSaturationCurve(drive: number): Float32Array<ArrayBuffer> {
  const n = 4096;
  const buffer = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, drive);
  const deg = Math.PI / 180;

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Synthesizes a lightweight algorithmic impulse response for reverb.
 */
function createSyntheticImpulseResponse(
  ctx: BaseAudioContext,
  duration = 2.0,
  decay = 2.0
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const length = Math.floor(sampleRate * Math.max(0.5, duration));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = length - i;
    const env = Math.pow(n / length, decay);
    // Gaussian white noise modulated by exponential decay
    left[i] = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }

  return impulse;
}

/**
 * Builds the real Web Audio DSP processing graph for a track.
 */
export function buildTrackDspGraph(
  ctx: BaseAudioContext,
  chain: TrackProcessingChain | undefined
): TrackDspNodeGraph {
  const inputNode = ctx.createGain();
  const outputNode = ctx.createGain();
  inputNode.gain.setValueAtTime(1.0, ctx.currentTime);
  outputNode.gain.setValueAtTime(1.0, ctx.currentTime);

  const cleanups: (() => void)[] = [];
  const paramUpdaters = new Map<string, (params: Record<string, number | string | boolean>) => void>();
  const bypassUpdaters = new Map<string, (bypassed: boolean) => void>();

  if (!chain || !chain.enabled || !chain.processors || chain.processors.length === 0) {
    inputNode.connect(outputNode);
    return {
      inputNode,
      outputNode,
      updateParams: () => {},
      setBypass: () => {},
      cleanup: () => {
        try {
          inputNode.disconnect();
          outputNode.disconnect();
        } catch {}
      },
    };
  }

  // Interconnect active processors sequentially
  let currentNode: AudioNode = inputNode;

  for (const proc of chain.processors) {
    if (!proc.enabled) continue;

    const procInput = ctx.createGain();
    const procOutput = ctx.createGain();
    const bypassGain = ctx.createGain();
    const wetGain = ctx.createGain();

    currentNode.connect(procInput);
    currentNode.connect(bypassGain);
    bypassGain.connect(procOutput);
    wetGain.connect(procOutput);

    const isBypassed = Boolean(proc.bypassed);
    bypassGain.gain.setValueAtTime(isBypassed ? 1.0 : 0.0, ctx.currentTime);
    wetGain.gain.setValueAtTime(isBypassed ? 0.0 : 1.0, ctx.currentTime);

    bypassUpdaters.set(proc.id, (bypassed: boolean) => {
      const now = ctx.currentTime;
      bypassGain.gain.setValueAtTime(bypassed ? 1.0 : 0.0, now);
      wetGain.gain.setValueAtTime(bypassed ? 0.0 : 1.0, now);
    });

    switch (proc.type) {
      case 'eq': {
        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.setValueAtTime(Number(proc.params.lowFreq || 120), ctx.currentTime);
        low.gain.setValueAtTime(Number(proc.params.lowGain || 0), ctx.currentTime);

        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.setValueAtTime(Number(proc.params.midFreq || 1200), ctx.currentTime);
        mid.gain.setValueAtTime(Number(proc.params.midGain || 0), ctx.currentTime);
        mid.Q.setValueAtTime(1.0, ctx.currentTime);

        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.setValueAtTime(Number(proc.params.highFreq || 6500), ctx.currentTime);
        high.gain.setValueAtTime(Number(proc.params.highGain || 0), ctx.currentTime);

        procInput.connect(low);
        low.connect(mid);
        mid.connect(high);
        high.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          const now = ctx.currentTime;
          if (p.lowGain !== undefined) low.gain.setValueAtTime(Number(p.lowGain), now);
          if (p.midGain !== undefined) mid.gain.setValueAtTime(Number(p.midGain), now);
          if (p.highGain !== undefined) high.gain.setValueAtTime(Number(p.highGain), now);
          if (p.lowFreq !== undefined) low.frequency.setValueAtTime(Number(p.lowFreq), now);
          if (p.midFreq !== undefined) mid.frequency.setValueAtTime(Number(p.midFreq), now);
          if (p.highFreq !== undefined) high.frequency.setValueAtTime(Number(p.highFreq), now);
        });
        break;
      }

      case 'filter': {
        const filter = ctx.createBiquadFilter();
        filter.type = (proc.params.filterType as BiquadFilterType) || 'lowpass';
        filter.frequency.setValueAtTime(Number(proc.params.cutoff || 18000), ctx.currentTime);
        filter.Q.setValueAtTime(Number(proc.params.resonance || 1.0), ctx.currentTime);

        procInput.connect(filter);
        filter.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          const now = ctx.currentTime;
          if (p.filterType) filter.type = p.filterType as BiquadFilterType;
          if (p.cutoff !== undefined) filter.frequency.setValueAtTime(Number(p.cutoff), now);
          if (p.resonance !== undefined) filter.Q.setValueAtTime(Number(p.resonance), now);
        });
        break;
      }

      case 'compressor': {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(Number(proc.params.threshold || -18), ctx.currentTime);
        comp.ratio.setValueAtTime(Number(proc.params.ratio || 3.5), ctx.currentTime);
        comp.attack.setValueAtTime(Number(proc.params.attack || 0.015), ctx.currentTime);
        comp.release.setValueAtTime(Number(proc.params.release || 0.2), ctx.currentTime);
        comp.knee.setValueAtTime(Number(proc.params.knee || 6), ctx.currentTime);

        procInput.connect(comp);
        comp.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          const now = ctx.currentTime;
          if (p.threshold !== undefined) comp.threshold.setValueAtTime(Number(p.threshold), now);
          if (p.ratio !== undefined) comp.ratio.setValueAtTime(Number(p.ratio), now);
          if (p.attack !== undefined) comp.attack.setValueAtTime(Number(p.attack), now);
          if (p.release !== undefined) comp.release.setValueAtTime(Number(p.release), now);
          if (p.knee !== undefined) comp.knee.setValueAtTime(Number(p.knee), now);
        });
        break;
      }

      case 'limiter': {
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(Number(proc.params.threshold || -1.5), ctx.currentTime);
        limiter.ratio.setValueAtTime(20.0, ctx.currentTime);
        limiter.attack.setValueAtTime(0.003, ctx.currentTime);
        limiter.release.setValueAtTime(Number(proc.params.release || 0.08), ctx.currentTime);
        limiter.knee.setValueAtTime(0.0, ctx.currentTime);

        procInput.connect(limiter);
        limiter.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          const now = ctx.currentTime;
          if (p.threshold !== undefined) limiter.threshold.setValueAtTime(Number(p.threshold), now);
          if (p.release !== undefined) limiter.release.setValueAtTime(Number(p.release), now);
        });
        break;
      }

      case 'saturation': {
        const shaper = ctx.createWaveShaper();
        shaper.curve = createSaturationCurve(Number(proc.params.drive || 15));
        shaper.oversample = '2x';

        procInput.connect(shaper);
        shaper.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          if (p.drive !== undefined) {
            shaper.curve = createSaturationCurve(Number(p.drive));
          }
        });
        break;
      }

      case 'delay': {
        const delay = ctx.createDelay(5.0);
        delay.delayTime.setValueAtTime(Number(proc.params.time || 0.375), ctx.currentTime);

        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(Number(proc.params.feedback || 0.35), ctx.currentTime);

        const delayWet = ctx.createGain();
        delayWet.gain.setValueAtTime(Number(proc.params.mix || 0.3), ctx.currentTime);

        procInput.connect(wetGain);
        procInput.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(delayWet);
        delayWet.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          const now = ctx.currentTime;
          if (p.time !== undefined) delay.delayTime.setValueAtTime(Number(p.time), now);
          if (p.feedback !== undefined) feedback.gain.setValueAtTime(Number(p.feedback), now);
          if (p.mix !== undefined) delayWet.gain.setValueAtTime(Number(p.mix), now);
        });
        break;
      }

      case 'reverb': {
        const convolver = ctx.createConvolver();
        convolver.buffer = createSyntheticImpulseResponse(ctx, Number(proc.params.decay || 2.2));

        const reverbWet = ctx.createGain();
        reverbWet.gain.setValueAtTime(Number(proc.params.mix || 0.25), ctx.currentTime);

        procInput.connect(wetGain);
        procInput.connect(convolver);
        convolver.connect(reverbWet);
        reverbWet.connect(wetGain);

        paramUpdaters.set(proc.id, (p) => {
          const now = ctx.currentTime;
          if (p.mix !== undefined) reverbWet.gain.setValueAtTime(Number(p.mix), now);
          if (p.decay !== undefined) {
            convolver.buffer = createSyntheticImpulseResponse(ctx, Number(p.decay));
          }
        });
        break;
      }
    }

    cleanups.push(() => {
      try {
        procInput.disconnect();
        procOutput.disconnect();
        bypassGain.disconnect();
        wetGain.disconnect();
      } catch {}
    });

    currentNode = procOutput;
  }

  currentNode.connect(outputNode);

  return {
    inputNode,
    outputNode,
    updateParams: (processorId, params) => {
      const updater = paramUpdaters.get(processorId);
      if (updater) updater(params);
    },
    setBypass: (processorId, bypassed) => {
      const bypasser = bypassUpdaters.get(processorId);
      if (bypasser) bypasser(bypassed);
    },
    cleanup: () => {
      cleanups.forEach((fn) => fn());
      try {
        inputNode.disconnect();
        outputNode.disconnect();
      } catch {}
    },
  };
}
