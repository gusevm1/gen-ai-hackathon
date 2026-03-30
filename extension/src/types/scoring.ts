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

/**
 * Per-criterion scoring result from v2 hybrid scorer.
 * Each user criterion gets a fulfillment score and reasoning.
 */
export interface CriterionResult {
  criterion_name: string; // e.g., "Budget", "Near public transport"
  fulfillment: number | null; // 0.0 - 1.0, or null if data unavailable
  importance: string; // "critical" | "high" | "medium" | "low"
  weight: number; // 5 | 3 | 2 | 1
  reasoning: string | null; // Explanation text or null
}

export interface ScoreResponse {
  overall_score: number; // 0-100
  match_tier: 'excellent' | 'good' | 'fair' | 'poor';
  summary_bullets: string[]; // 3-7 bullets
  categories: CategoryScore[];
  checklist: ChecklistItem[];
  language: string; // de/fr/it/en
  // v2 additions (all optional for backward compatibility with cached v1 responses)
  schema_version?: number;
  criteria_results?: CriterionResult[];
  enrichment_status?: 'available' | 'unavailable' | 'fallback' | null;
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
