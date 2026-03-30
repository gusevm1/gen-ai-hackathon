export type FulfillmentStatus = 'met' | 'partial' | 'not-met' | 'unknown'

/**
 * CriterionResult type matching backend model_dump() snake_case output.
 * Stored in analyses.breakdown.criteria_results JSONB.
 */
export interface CriterionResult {
  criterion_name: string
  fulfillment: number | null
  importance: string
  weight: number
  reasoning: string | null
}

/**
 * ChecklistItem shape consumed by ChecklistSection component.
 */
interface ChecklistItem {
  criterion: string
  met: boolean | null | 'partial'
  note: string
}

/**
 * Map a fulfillment float to a status category.
 * Thresholds: met >= 0.7, partial >= 0.3, not-met < 0.3, unknown for null/undefined.
 */
export function getFulfillmentStatus(fulfillment: number | null | undefined): FulfillmentStatus {
  if (fulfillment === null || fulfillment === undefined) return 'unknown'
  if (fulfillment >= 0.7) return 'met'
  if (fulfillment >= 0.3) return 'partial'
  return 'not-met'
}

/**
 * Convert v2 CriterionResult[] into ChecklistItem[] for reuse with ChecklistSection.
 * Threshold mapping: met >= 0.7 -> true, 0.3-0.69 -> "partial", < 0.3 -> false, null -> null.
 */
export function deriveFulfillmentChecklist(criteriaResults: CriterionResult[]): ChecklistItem[] {
  return criteriaResults.map((cr) => {
    let met: boolean | null | 'partial'
    if (cr.fulfillment === null || cr.fulfillment === undefined) {
      met = null
    } else if (cr.fulfillment >= 0.7) {
      met = true
    } else if (cr.fulfillment >= 0.3) {
      met = 'partial'
    } else {
      met = false
    }

    return {
      criterion: cr.criterion_name,
      met,
      note: cr.reasoning ?? '',
    }
  })
}

/**
 * Map importance string to Badge props (label + variant).
 */
export function getImportanceBadge(importance: string): {
  label: string
  variant: 'destructive' | 'default' | 'secondary' | 'outline'
} {
  switch (importance.toLowerCase()) {
    case 'critical':
      return { label: 'Critical', variant: 'destructive' }
    case 'high':
      return { label: 'High', variant: 'default' }
    case 'medium':
      return { label: 'Medium', variant: 'secondary' }
    case 'low':
      return { label: 'Low', variant: 'outline' }
    default:
      return { label: importance, variant: 'outline' }
  }
}
