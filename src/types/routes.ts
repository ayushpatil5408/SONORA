/**
 * SONORA Navigation & Route Contracts
 * Authoritative Reference: PRD.md Section 10 & Milestone 1
 */

export type RouteId =
  | 'home'
  | 'search'
  | 'library'
  | 'dj-studio'
  | 'audio-lab'
  | 'creator';

export interface RouteDefinition {
  id: RouteId;
  label: string;
  badge?: string;
  isImplemented: boolean;
}

export const PRIMARY_ROUTES: readonly RouteDefinition[] = [
  { id: 'home', label: 'Home', isImplemented: true },
  { id: 'search', label: 'Search', isImplemented: true, badge: 'Live' },
  { id: 'library', label: 'Library', isImplemented: true, badge: 'Live' },
  { id: 'dj-studio', label: 'DJ Studio', isImplemented: true, badge: 'Live' },
  { id: 'audio-lab', label: 'Audio Lab', isImplemented: false, badge: 'Phase 4' },
  { id: 'creator', label: 'Creator', isImplemented: false, badge: 'Future' },
] as const;
