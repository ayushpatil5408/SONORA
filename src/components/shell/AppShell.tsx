/**
 * SONORA Application Shell
 * Authoritative Reference: PRD.md Section 10 & 67: Milestone 1
 * 
 * Central application shell establishing the living audiovisual environment:
 * - Primary Navigation (Home, Search, Library, DJ Studio, Audio Lab, Creator)
 * - Route Coordinator (with hash-based URL synchronization)
 * - Persistent Global Player Dock
 * - Living Atmospheric Backdrop
 */

import React, { useState, useEffect } from 'react';
import { RouteId } from '../../types/routes';
import { getAudioEngine } from '../../audio/AudioEngine';
import { Navigation } from '../navigation/Navigation';
import { PersistentPlayer } from '../player/PersistentPlayer';

import { HomeView } from '../views/HomeView';
import { SearchView } from '../views/SearchView';
import { LibraryView } from '../views/LibraryView';
import { DJStudioView } from '../views/DJStudioView';
import { AudioLabView } from '../views/AudioLabView';
import { CreatorView } from '../views/CreatorView';

import './AppShell.css';

function getInitialRoute(): RouteId {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  const validRoutes: RouteId[] = [
    'home',
    'search',
    'library',
    'dj-studio',
    'audio-lab',
    'creator',
  ];
  if (validRoutes.includes(hash as RouteId)) {
    return hash as RouteId;
  }
  return 'home';
}

export const AppShell: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<RouteId>(getInitialRoute);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeDeck, setActiveDeck] = useState<'A' | 'B' | 'dual' | null>(null);

  useEffect(() => {
    const engine = getAudioEngine();
    const syncAudio = () => {
      const state = engine.getState();
      const aPlaying = state.deckA.transportState === 'playing';
      const bPlaying = state.deckB.transportState === 'playing';
      setIsPlaying(aPlaying || bPlaying);
      if (aPlaying && bPlaying) setActiveDeck('dual');
      else if (aPlaying) setActiveDeck('A');
      else if (bPlaying) setActiveDeck('B');
      else setActiveDeck(null);
    };

    syncAudio();
    return engine.subscribe(syncAudio);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveRoute(getInitialRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleNavigate = (route: RouteId) => {
    setActiveRoute(route);
    window.location.hash = `#${route}`;
  };

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} />;
      case 'search':
        return <SearchView onNavigate={handleNavigate} />;
      case 'library':
        return <LibraryView onNavigate={handleNavigate} />;
      case 'dj-studio':
        return <DJStudioView />;
      case 'audio-lab':
        return <AudioLabView />;
      case 'creator':
        return <CreatorView />;
      default:
        return <HomeView onNavigate={handleNavigate} />;
    }
  };

    const deckStateClass = activeDeck === 'A'
    ? 'is-deck-a'
    : activeDeck === 'B'
    ? 'is-deck-b'
    : activeDeck === 'dual'
    ? 'is-dual-playing'
    : '';

  return (
    <div
      className={`sonora-shell ${isPlaying ? 'is-playing' : ''} ${deckStateClass}`}
      role="application"
      aria-label="SONORA Music Platform"
    >
      {/* Living Atmospheric Backdrop */}
      <div className="sonora-shell-atmosphere" aria-hidden="true" />

      {/* Top Primary Navigation */}
      <Navigation activeRoute={activeRoute} onNavigate={handleNavigate} />

      {/* Main Dynamic Viewport */}
      <main className="sonora-shell-main" id="main-content">
        <div key={activeRoute} className="sonora-view-transition-wrap">
          {renderActiveView()}
        </div>
      </main>

      {/* Persistent Global Player Shell */}
      <PersistentPlayer
        activeRoute={activeRoute}
        onOpenDJStudio={() => handleNavigate('dj-studio')}
      />
    </div>
  );
};

export default AppShell;
