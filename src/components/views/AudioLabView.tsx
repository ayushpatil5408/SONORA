/**
 * SONORA AudioLabView Component
 * Authoritative Reference: PRD.md Section 19 & 30, Milestone 4
 * 
 * Living Audio Intelligence & Analysis Horizon:
 * - "Music as Matter" spatial analysis environment
 * - Central Radial Harmonic Core (Key, Camelot, Mode, BPM pulse)
 * - Multi-Band Living Spectral Organ (Sub-Bass, Mid, High & 8-band spectrum)
 * - Temporal Energy Terrain & Structural Phrase Architecture
 * - Strict adherence to Milestone 1 shell honesty: Non-destructive audio editing
 *   and stem export is not implemented yet.
 */

import React, { useState, useEffect, useRef } from 'react';
import { SonoraStage } from '../stage/SonoraStage';
import { WaveformRibbon } from '../WaveformRibbon';
import { TrackAnalysis } from '../../audio/analysisTypes';
import { analysisService } from '../../audio/analysisService';
import { getAudioEngine } from '../../audio/AudioEngine';
import { createSyntheticDemoBuffer, loadAudioFile } from '../../audio/audioLoader';
import { waveformService } from '../../audio/waveformService';
import { WaveformData } from '../../audio/waveformTypes';
import './Views.css';
import './AudioLabView.css';

interface DemoPreset {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  { id: 'demo-deckA', name: 'SONORA Pulse', artist: 'Sonora Acoustic Core', bpm: 120, key: 'Am' },
  { id: 'demo-deckB', name: 'SONORA Aurora', artist: 'Solar Resonance', bpm: 124, key: 'C' },
  { id: 'demo-deep', name: 'Celestial Drift', artist: 'Orbital Resonance', bpm: 128, key: 'Em' },
];

export const AudioLabView: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('demo-deckA');
  const [activeAnalysis, setActiveAnalysis] = useState<TrackAnalysis | null>(null);
  const [activeWaveform, setActiveWaveform] = useState<WaveformData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [trackName, setTrackName] = useState<string>('SONORA Pulse');
  const [artistName, setArtistName] = useState<string>('Sonora Acoustic Core');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingest & Analyze selected preset or track
  const analyzePreset = async (preset: DemoPreset) => {
    setIsAnalyzing(true);
    try {
      const engine = getAudioEngine();
      const ctx = await engine.initialize();
      const isA = preset.id === 'demo-deckA';
      const buffer = createSyntheticDemoBuffer(ctx, isA ? 'deckA' : 'deckB', 16);

      setTrackName(preset.name);
      setArtistName(preset.artist);

      // Generate waveform peaks
      const wf = await waveformService.analyzeAudioBuffer(buffer, 800);
      setActiveWaveform(wf);

      // Analyze intelligence
      const analysis = await analysisService.analyzeBuffer(
        `preset-${preset.id}-${buffer.duration}`,
        buffer,
        { knownBpm: preset.bpm, knownKey: preset.key }
      );
      setActiveAnalysis(analysis);
    } catch (err) {
      console.warn('Audio lab analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Initial load
  useEffect(() => {
    const defaultPreset = DEMO_PRESETS[0];
    analyzePreset(defaultPreset);
  }, []);

  // Handle local audio file ingestion
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setSelectedPresetId('local-file');
    try {
      const engine = getAudioEngine();
      const ctx = await engine.initialize();
      const audioBuffer = await loadAudioFile(file, ctx);

      setTrackName(file.name);
      setArtistName('Local Ingested Signal');

      const wf = await waveformService.analyzeAudioBuffer(audioBuffer, 800);
      setActiveWaveform(wf);

      const analysis = await analysisService.analyzeBuffer(
        `local-${file.name}-${audioBuffer.duration}`,
        audioBuffer
      );
      setActiveAnalysis(analysis);
    } catch (err) {
      console.warn('Failed to analyze uploaded audio file:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SonoraStage variant="spatial" ariaLabel="Audio Intelligence Horizon">
      <section className="sonora-view-container sonora-audiolab-horizon" aria-label="Audio Intelligence Horizon">
        {/* View Header with Roadmap Honesty Disclaimer */}
        <header className="sonora-view-header">
          <div className="sonora-view-badge-row">
            <span className="sonora-view-badge">Milestone 4 — Intelligence</span>
            <span className="sonora-view-status-pill is-active">Active Analysis</span>
          </div>
          <h1 className="sonora-view-title">Audio Lab</h1>
          <p className="sonora-view-subtitle">
            Non-destructive audio editing and stem export is not implemented yet.
            The Audio Lab currently serves as SONORA's living Audio Intelligence Horizon,
            transforming raw acoustic waves into structured musical identity.
          </p>
        </header>

        {/* 1. Track Source Selector Strip */}
        <nav className="sonora-lab-source-strip" aria-label="Analysis Source Selector">
          <div className="sonora-lab-source-pills">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`sonora-lab-pill ${selectedPresetId === preset.id ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  analyzePreset(preset);
                }}
              >
                {preset.name}
              </button>
            ))}

            <button
              type="button"
              className={`sonora-lab-pill ${selectedPresetId === 'local-file' ? 'is-active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              Analyze File...
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              style={{ display: 'none' }}
              aria-label="Upload audio file for analysis"
            />
          </div>

          {isAnalyzing && (
            <div className="sonora-lab-analyzing-badge" role="status" aria-live="polite">
              <span className="sonora-lab-pulse-orb" aria-hidden="true" />
              <span>Extracting Sonic Intelligence...</span>
            </div>
          )}
        </nav>

        {/* 2. Living Sonic Identity Horizon */}
        <section className="sonora-sonic-identity-stage" aria-label="Sonic Identity Matrix">
          {/* Central Radial Harmonic Core */}
          <div className="sonora-harmonic-core" role="region" aria-label="Harmonic Core">
            <div className="sonora-harmonic-orbit-ring" aria-hidden="true" />
            <span className="sonora-core-camelot-badge">
              CAMELOT {activeAnalysis?.key?.camelot || '8A'}
            </span>
            <div className="sonora-core-key-glyph">
              {activeAnalysis?.key?.key || 'Am'}
            </div>
            <div className="sonora-core-mode-label">
              {activeAnalysis?.key?.mode?.toUpperCase() || 'MINOR'} • {Math.round((activeAnalysis?.key?.confidence || 0.9) * 100)}% CONFIDENCE
            </div>

            <div className="sonora-core-bpm-pulse">
              <span className="sonora-core-bpm-val">
                {activeAnalysis?.bpm?.bpm || 120} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>BPM</span>
              </span>
              <span className="sonora-core-confidence-bar">
                {activeAnalysis?.bpm?.source?.toUpperCase() || 'MEASURED'} BEAT GRID
              </span>
            </div>
          </div>

          {/* Multi-Band Spectral Organ */}
          <div className="sonora-spectral-organ" role="region" aria-label="Spectral Energy Distribution">
            <div className="sonora-spectral-header">
              <span className="sonora-spectral-title">Spectral Energy Distribution</span>
              <div className="sonora-spectral-stats">
                <span>Centroid: <strong>{activeAnalysis?.spectral?.centroid || 2400} Hz</strong></span>
                <span>Roll-off: <strong>{activeAnalysis?.spectral?.rolloff || 4500} Hz</strong></span>
              </div>
            </div>

            {/* 3-Band Living Filaments */}
            <div className="sonora-bands-filaments">
              <div className="sonora-band-row">
                <div className="sonora-band-meta">
                  <span>Sub-Bass Energy (&lt; 250 Hz)</span>
                  <span>{Math.round((activeAnalysis?.energy?.low || 0.72) * 100)}%</span>
                </div>
                <div className="sonora-band-meter" role="progressbar" aria-valuenow={Math.round((activeAnalysis?.energy?.low || 0.72) * 100)}>
                  <div
                    className="sonora-band-meter-fill is-low"
                    style={{ width: `${Math.round((activeAnalysis?.energy?.low || 0.72) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="sonora-band-row">
                <div className="sonora-band-meta">
                  <span>Mid Harmonics (250 Hz - 4 kHz)</span>
                  <span>{Math.round((activeAnalysis?.energy?.mid || 0.65) * 100)}%</span>
                </div>
                <div className="sonora-band-meter" role="progressbar" aria-valuenow={Math.round((activeAnalysis?.energy?.mid || 0.65) * 100)}>
                  <div
                    className="sonora-band-meter-fill is-mid"
                    style={{ width: `${Math.round((activeAnalysis?.energy?.mid || 0.65) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="sonora-band-row">
                <div className="sonora-band-meta">
                  <span>High Sparkle (&gt; 4 kHz)</span>
                  <span>{Math.round((activeAnalysis?.energy?.high || 0.58) * 100)}%</span>
                </div>
                <div className="sonora-band-meter" role="progressbar" aria-valuenow={Math.round((activeAnalysis?.energy?.high || 0.58) * 100)}>
                  <div
                    className="sonora-band-meter-fill is-high"
                    style={{ width: `${Math.round((activeAnalysis?.energy?.high || 0.58) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 8-Band Octave Frequency Spectrum */}
            <div className="sonora-octave-spectrum" aria-label="8-Band Octave Spectrum">
              {['SUB', 'BASS', 'LO-MID', 'MID', 'HI-MID', 'PRES', 'BRILL', 'AIR'].map((name, i) => {
                const bandVal = activeAnalysis?.spectral?.bands?.[i] ?? (0.3 + (i % 3) * 0.2);
                return (
                  <div key={name} className="sonora-octave-bar-col">
                    <div
                      className="sonora-octave-bar"
                      style={{ height: `${Math.max(10, Math.round(bandVal * 100))}%` }}
                    />
                    <span className="sonora-octave-label">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Temporal Waveform Terrain & Section Architecture */}
        <section className="sonora-terrain-horizon" aria-label="Temporal Waveform Terrain">
          <div className="sonora-terrain-header">
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {trackName}
              </h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                {artistName} • Dynamic Range: {activeAnalysis?.loudness?.dynamicRange || 14.2} dB • Integrated: {activeAnalysis?.loudness?.integratedLoudness || -12.4} dBFS
              </span>
            </div>

            {/* Phrase Sections */}
            <div className="sonora-sections-pills" aria-label="Structural Sections">
              {activeAnalysis?.sections?.map((sec) => (
                <span
                  key={sec.id}
                  className={`sonora-section-chip ${sec.type === 'drop' ? 'is-drop' : sec.type === 'build' ? 'is-build' : ''}`}
                >
                  {sec.label} ({sec.start}s - {sec.end}s)
                </span>
              ))}
            </div>
          </div>

          {/* Living Waveform with Intelligent Beat Grid & Phrase Markers */}
          <div style={{ height: '140px', width: '100%', position: 'relative' }}>
            <WaveformRibbon
              waveform={activeWaveform}
              duration={activeAnalysis?.duration || 16}
              currentTime={0}
              bpm={activeAnalysis?.bpm?.bpm || 120}
              analysis={activeAnalysis}
              ariaLabel="Acoustic Waveform Terrain with Intelligence Overlays"
            />
          </div>
        </section>
      </section>
    </SonoraStage>
  );
};
