/**
 * TypeScript interfaces mirroring the backend Pydantic ScoreResponse models.
 * Keep in sync with backend/app/models/scoring.py.
 */

export interface CategoryScore {
  name: string; // location, price, size, features, condition
  score: number; // 0-100
  weight: number; // 0-100
  reasoning: string[]; // 1-5 bullets
}

export interface ChecklistItem {
  criterion: string;
  met: boolean | null; // True/False/null(unknown)
  note: string;
}

export interface ScoreResponse {
  overall_score: number; // 0-100
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[]; // 3-5 bullets
  categories: CategoryScore[];
  checklist: ChecklistItem[];
  language: string; // de/fr/it/en
}

/**
 * Modern color palette for match tiers.
 * Traffic-light system: green (excellent), blue (good), amber (fair), red (poor).
 */
export const TIER_COLORS: Record<
  ScoreResponse['match_tier'],
  { bg: string; text: string }
> = {
  excellent: { bg: '#10b981', text: '#ffffff' },
  good: { bg: '#3b82f6', text: '#ffffff' },
  fair: { bg: '#f59e0b', text: '#1a1a1a' },
  poor: { bg: '#ef4444', text: '#ffffff' },
};
