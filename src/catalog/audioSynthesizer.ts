/**
 * SONORA Demo Audio Synthesizer
 * Authoritative Reference: PRD.md Section 11, PRODUCT_ARCHITECTURE.md
 * 
 * Synthesizes pristine in-memory musical AudioBuffers for authorized prototype demo tracks.
 * Maps track BPM, Camelot harmonic key, and sound profile into distinctive, authentic
 * musical matter across Ambient, Techno, House, Lo-Fi, Cinematic, Synthwave, Minimal, and DnB.
 */

import { Track } from './types';

// Map Camelot key notation to root pitch frequencies (Hz)
const CAMELOT_FREQUENCIES: Record<string, number> = {
  '1A': 207.65, // Ab3
  '1B': 246.94, // B3
  '2A': 155.56, // Eb3
  '2B': 185.00, // F#3
  '3A': 233.08, // Bb3
  '3B': 277.18, // Db4
  '4A': 174.61, // F3
  '4B': 207.65, // Ab3
  '5A': 130.81, // C3
  '5B': 155.56, // Eb3
  '6A': 196.00, // G3
  '6B': 233.08, // Bb3
  '7A': 146.83, // D3
  '7B': 174.61, // F3
  '8A': 220.00, // A3
  '8B': 261.63, // C4
  '9A': 164.81, // E3
  '9B': 196.00, // G3
  '10A': 246.94, // B3
  '10B': 293.66, // D4
  '11A': 185.00, // F#3
  '11B': 220.00, // A3
  '12A': 138.59, // Db3
  '12B': 164.81, // E3
};

/**
 * Synthesizes a real stereo AudioBuffer matching the track's authentic metadata.
 */
export function synthesizeTrackAudio(
  audioContext: AudioContext,
  track: Track,
  durationSeconds = 18
): AudioBuffer {
  const sampleRate = audioContext.sampleRate || 44100;
  const length = Math.floor(sampleRate * durationSeconds);
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  const chL = buffer.getChannelData(0);
  const chR = buffer.getChannelData(1);

  const bpm = track.bpm || 120;
  const beatDuration = 60 / bpm;
  const rootFreq = (track.key && CAMELOT_FREQUENCIES[track.key.toUpperCase()]) || 220;
  const style = track.demoProfile?.style || 'ambient';

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const beat = t / beatDuration;
    const beatFraction = beat % 1.0;

    let sampleL = 0;
    let sampleR = 0;

    switch (style) {
      case 'techno': {
        // Driving 4-on-the-floor kick transient
        const kickEnv = Math.exp(-beatFraction * 16.0);
        const kickFreq = 42 + 105 * Math.exp(-beatFraction * 32.0);
        const kick = Math.sin(2 * Math.PI * kickFreq * beatFraction * beatDuration) * kickEnv * 0.85;

        // Offbeat 16th rolling sub-bass
        const subFraction = (beat * 2) % 1.0;
        const subEnv = Math.exp(-subFraction * 5.0);
        const sub = Math.sin(2 * Math.PI * (rootFreq * 0.5) * t) * subEnv * 0.4;

        // Industrial metallic hi-hat on upbeat
        const hatFraction = (beat + 0.5) % 1.0;
        const hatEnv = Math.exp(-hatFraction * 38.0);
        const noise = Math.random() * 2 - 1;
        const hat = noise * hatEnv * 0.16;

        sampleL = kick + hat * 0.8 + sub;
        sampleR = kick + hat * 1.2 + sub;
        break;
      }

      case 'house': {
        // Deep round kick
        const kickEnv = Math.exp(-beatFraction * 12.0);
        const kickFreq = 50 + 80 * Math.exp(-beatFraction * 24.0);
        const kick = Math.sin(2 * Math.PI * kickFreq * beatFraction * beatDuration) * kickEnv * 0.75;

        // Jazzy chord stab on beat 2 and 4
        const chordBeat = Math.floor(beat) % 4;
        const isStabBeat = chordBeat === 1 || chordBeat === 3;
        const stabEnv = isStabBeat ? Math.exp(-beatFraction * 8.0) : 0;
        const chordStab =
          (Math.sin(2 * Math.PI * rootFreq * t) +
            Math.sin(2 * Math.PI * (rootFreq * 1.25) * t) +
            Math.sin(2 * Math.PI * (rootFreq * 1.5) * t)) *
          0.12 *
          stabEnv;

        // Shuffled open hi-hat
        const hatFraction = (beat + 0.5) % 1.0;
        const hatEnv = Math.exp(-hatFraction * 24.0);
        const hat = (Math.random() * 2 - 1) * hatEnv * 0.15;

        sampleL = kick + chordStab * 0.9 + hat * 0.75;
        sampleR = kick + chordStab * 1.1 + hat * 1.25;
        break;
      }

      case 'lofi': {
        // Relaxed dust and tape saturation
        const dust = (Math.random() * 2 - 1) * 0.015;

        // Mellow filtered Rhodes chord sequence
        const chordIdx = Math.floor(beat / 4) % 4;
        const chords = [rootFreq, rootFreq * 1.2, rootFreq * 1.33, rootFreq * 1.12];
        const chord = chords[chordIdx];
        const rhodes =
          Math.sin(2 * Math.PI * chord * t) * 0.2 +
          Math.sin(2 * Math.PI * (chord * 1.5) * t) * 0.1;

        // Soft muffled kick on beat 1 and 3
        const isKickBeat = Math.floor(beat) % 2 === 0;
        const kickEnv = isKickBeat ? Math.exp(-beatFraction * 10.0) : 0;
        const kick = Math.sin(2 * Math.PI * 55 * t) * kickEnv * 0.45;

        // Soft brush snare on beat 2 and 4
        const isSnareBeat = Math.floor(beat) % 2 === 1;
        const snareEnv = isSnareBeat ? Math.exp(-beatFraction * 14.0) : 0;
        const snare = (Math.random() * 2 - 1) * snareEnv * 0.14;

        sampleL = kick + snare + rhodes * 0.9 + dust;
        sampleR = kick + snare + rhodes * 1.1 + dust;
        break;
      }

      case 'synthwave': {
        // Driving 16th note rolling arpeggio bassline
        const arpStep = Math.floor(beat * 4) % 4;
        const octaves = [1, 2, 1, 2];
        const arpFreq = (rootFreq * 0.5) * octaves[arpStep];
        const arpEnv = Math.exp(-((beat * 4) % 1.0) * 8.0);
        const bass = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.35;

        // 80s analog brass pad
        const brass =
          (Math.sin(2 * Math.PI * rootFreq * t) +
            Math.sin(2 * Math.PI * (rootFreq * 1.5) * t) +
            Math.sin(2 * Math.PI * (rootFreq * 2.01) * t)) *
          0.1;

        // Punchy kick and gated snare
        const kickEnv = Math.exp(-beatFraction * 14.0);
        const kick = Math.sin(2 * Math.PI * 60 * t) * kickEnv * 0.65;

        sampleL = kick + bass * 0.85 + brass * 1.1;
        sampleR = kick + bass * 1.15 + brass * 0.85;
        break;
      }

      case 'cinematic': {
        // Majestic sub drone swell
        const swell = Math.sin((t / durationSeconds) * Math.PI);
        const drone = Math.sin(2 * Math.PI * (rootFreq * 0.5) * t) * 0.3 * swell;
        const fifth = Math.sin(2 * Math.PI * (rootFreq * 0.75) * t) * 0.2 * swell;

        // High shimmer overtone
        const shimmer = Math.sin(2 * Math.PI * (rootFreq * 3.01) * t) * 0.08 * (0.5 + 0.5 * Math.sin(t * 1.2));

        // Pulsing cinematic heart beat
        const pulseEnv = Math.exp(-beatFraction * 6.0);
        const pulse = Math.sin(2 * Math.PI * 40 * t) * pulseEnv * 0.5;

        sampleL = drone + fifth * 0.9 + shimmer * 1.2 + pulse;
        sampleR = drone + fifth * 1.1 + shimmer * 0.8 + pulse;
        break;
      }

      case 'drumandbass': {
        // 174 BPM syncopated drum breaks
        const dnbStep = Math.floor(beat * 2) % 4;
        const isKick = dnbStep === 0 || dnbStep === 2.5;
        const isSnare = dnbStep === 1 || dnbStep === 3;
        const kick = isKick ? Math.sin(2 * Math.PI * 55 * t) * Math.exp(-beatFraction * 16.0) * 0.7 : 0;
        const snare = isSnare ? (Math.random() * 2 - 1) * Math.exp(-beatFraction * 20.0) * 0.3 : 0;

        // Heavy Reese bass with sweeping LFO
        const lfo = 0.5 + 0.5 * Math.sin(t * 3.5);
        const reese =
          (Math.sin(2 * Math.PI * (rootFreq * 0.5) * t) +
            Math.sin(2 * Math.PI * (rootFreq * 0.505) * t)) *
          0.3 *
          lfo;

        sampleL = kick + snare * 0.8 + reese;
        sampleR = kick + snare * 1.2 + reese;
        break;
      }

      case 'minimal': {
        // Subtle rhythmic microclicks
        const clickEnv = Math.exp(-beatFraction * 45.0);
        const click = (Math.random() * 2 - 1) * clickEnv * 0.09;

        // Warm sub throb
        const subFraction = beat % 2.0;
        const sub = Math.sin(2 * Math.PI * 48 * t) * Math.exp(-subFraction * 3.0) * 0.45;

        // Dub echo chord
        const isDub = Math.floor(beat) % 8 === 0;
        const dubEnv = isDub ? Math.exp(-beatFraction * 2.0) : 0;
        const dub = Math.sin(2 * Math.PI * rootFreq * t) * dubEnv * 0.18;

        sampleL = click + sub + dub * 1.1;
        sampleR = click + sub + dub * 0.9;
        break;
      }

      case 'ambient':
      default: {
        // Deep meditative space with rich chord layers
        const lfo1 = 0.5 + 0.5 * Math.sin(t * 0.8);
        const lfo2 = 0.5 + 0.5 * Math.cos(t * 0.6);

        const fundamental = Math.sin(2 * Math.PI * rootFreq * t) * 0.25;
        const fifth = Math.sin(2 * Math.PI * (rootFreq * 1.498) * t) * 0.18 * lfo1;
        const octave = Math.sin(2 * Math.PI * (rootFreq * 2.002) * t) * 0.12 * lfo2;
        const sub = Math.sin(2 * Math.PI * (rootFreq * 0.5) * t) * 0.22;

        sampleL = fundamental + fifth * 1.2 + octave * 0.8 + sub;
        sampleR = fundamental + fifth * 0.8 + octave * 1.2 + sub;
        break;
      }
    }

    chL[i] = Math.max(-1.0, Math.min(1.0, sampleL * 0.82));
    chR[i] = Math.max(-1.0, Math.min(1.0, sampleR * 0.82));
  }

  return buffer;
}
