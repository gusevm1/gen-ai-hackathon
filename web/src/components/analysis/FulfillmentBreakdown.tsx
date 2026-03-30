'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getFulfillmentStatus,
  getImportanceBadge,
  type CriterionResult,
  type FulfillmentStatus,
} from '@/lib/fulfillment-utils'

interface FulfillmentBreakdownProps {
  criteriaResults: CriterionResult[]
}

function getBarColor(status: FulfillmentStatus): string {
  switch (status) {
    case 'met':
      return 'bg-emerald-500'
    case 'partial':
      return 'bg-amber-500'
    case 'not-met':
      return 'bg-red-500'
    case 'unknown':
      return 'bg-gray-400'
  }
}

function getPercentColor(status: FulfillmentStatus): string {
  switch (status) {
    case 'met':
      return 'text-emerald-700 dark:text-emerald-400'
    case 'partial':
      return 'text-amber-700 dark:text-amber-400'
    case 'not-met':
      return 'text-red-700 dark:text-red-400'
    case 'unknown':
      return 'text-gray-500 dark:text-gray-400'
  }
}

function CriterionCard({
  criterion,
  defaultExpanded,
}: {
  criterion: CriterionResult
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const status = getFulfillmentStatus(criterion.fulfillment)
  const importance = getImportanceBadge(criterion.importance)
  const percent =
    criterion.fulfillment !== null && criterion.fulfillment !== undefined
      ? `${Math.round(criterion.fulfillment * 100)}%`
      : '--'

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {criterion.criterion_name}
          <Badge variant={importance.variant} className="text-[10px] ml-1">
            {importance.label}
          </Badge>
        </CardTitle>
        <CardAction>
          <span className={`text-lg font-bold ${getPercentColor(status)}`}>
            {percent}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fulfillment bar */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-3 rounded-full ${getBarColor(status)} transition-all duration-500`}
            style={{
              width:
                criterion.fulfillment !== null && criterion.fulfillment !== undefined
                  ? `${Math.min(Math.round(criterion.fulfillment * 100), 100)}%`
                  : '0%',
            }}
          />
        </div>

        {/* Expandable reasoning */}
        {criterion.reasoning && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {expanded ? 'Hide' : 'Show'} reasoning
            </button>
            {expanded && (
              <p className="mt-2 text-sm text-foreground/70">{criterion.reasoning}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UnknownCriterionRow({ criterion }: { criterion: CriterionResult }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-500/10">
        <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{criterion.criterion_name}</p>
        {criterion.reasoning && (
          <p className="mt-0.5 text-xs text-muted-foreground">{criterion.reasoning}</p>
        )}
      </div>
    </div>
  )
}

export function FulfillmentBreakdown({ criteriaResults }: FulfillmentBreakdownProps) {
  if (!criteriaResults || criteriaResults.length === 0) return null

  const knownCriteria = criteriaResults.filter(
    (cr) => cr.fulfillment !== null && cr.fulfillment !== undefined
  )
  const unknownCriteria = criteriaResults.filter(
    (cr) => cr.fulfillment === null || cr.fulfillment === undefined
  )

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Fulfillment Breakdown</h2>
      <div className="space-y-4">
        {knownCriteria.map((criterion, index) => (
          <CriterionCard
            key={criterion.criterion_name}
            criterion={criterion}
            defaultExpanded={index < 3}
          />
        ))}
      </div>

      {unknownCriteria.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Data unavailable</h3>
          <div className="space-y-2">
            {unknownCriteria.map((criterion) => (
              <UnknownCriterionRow key={criterion.criterion_name} criterion={criterion} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
