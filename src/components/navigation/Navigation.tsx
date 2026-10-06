/**
 * SONORA Primary Navigation Component
 * Authoritative Reference: PRD.md Section 10 & Milestone 1 Step 4
 */

import React, { useState, useEffect } from 'react';
import { RouteId, PRIMARY_ROUTES } from '../../types/routes';
import { getAudioEngine } from '../../audio/AudioEngine';
import './Navigation.css';

export interface NavigationProps {
  activeRoute: RouteId;
  onNavigate: (route: RouteId) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeRoute,
  onNavigate,
}) => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeDeck, setActiveDeck] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    const engine = getAudioEngine();
    const syncAudio = () => {
      const state = engine.getState();
      const aPlaying = state.deckA.transportState === 'playing';
      const bPlaying = state.deckB.transportState === 'playing';
      setIsPlaying(aPlaying || bPlaying);
      if (aPlaying && bPlaying) setActiveDeck(null);
      else if (aPlaying) setActiveDeck('A');
      else if (bPlaying) setActiveDeck('B');
      else setActiveDeck(null);
    };

    syncAudio();
    const unsub = engine.subscribe(syncAudio);
    return unsub;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const checkBackend = async () => {
      try {
        const res = await fetch(`${apiUrl}/health`, { method: 'GET' });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'healthy') {
            setBackendStatus('online');
            return;
          }
        }
        setBackendStatus('offline');
      } catch {
        if (isMounted) {
          setBackendStatus('offline');
        }
      }
    };

    checkBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="sonora-header-nav" role="banner">
      {/* Brand Mark */}
      <button
        type="button"
        className="sonora-nav-brand"
        onClick={() => onNavigate('home')}
        aria-label="SONORA Home"
      >
        <div className={`sonora-nav-orb ${isPlaying ? 'is-playing' : ''}`} aria-hidden="true" />
        <span className="sonora-nav-title">SONORA</span>
      </button>

      {/* Primary Navigation Links */}
      <nav className="sonora-nav-links" aria-label="Primary Navigation">
        {PRIMARY_ROUTES.map((route) => {
          const isActive = activeRoute === route.id;
          return (
            <button
              key={route.id}
              type="button"
              className={`sonora-nav-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onNavigate(route.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{route.label}</span>
              {route.badge && (
                <span className="sonora-nav-item-badge" aria-hidden="true">
                  {route.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend & Environment Telemetry */}
      <div className="sonora-nav-telemetry" aria-live="polite">
        <div className="sonora-nav-status-node">
          <span
            className={`sonora-nav-beacon ${
              isPlaying
                ? activeDeck === 'A'
                  ? 'is-deck-a'
                  : activeDeck === 'B'
                  ? 'is-deck-b'
                  : 'is-online'
                : backendStatus === 'online'
                ? 'is-online'
                : backendStatus === 'offline'
                ? 'is-degraded'
                : ''
            }`}
            aria-hidden="true"
          />
          <span>
            {isPlaying
              ? activeDeck
                ? `Deck ${activeDeck} Resonating`
                : 'Dual Signal Blending'
              : backendStatus === 'online'
              ? 'API Online • SQLite'
              : backendStatus === 'offline'
              ? 'Local Audio Mode'
              : 'Verifying API…'}
          </span>
        </div>
      </div>
    </header>
  );
};
