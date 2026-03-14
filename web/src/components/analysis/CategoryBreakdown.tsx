'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CategoryScore {
  name: string
  score: number
  weight: number
  reasoning: string[]
}

interface CategoryBreakdownProps {
  categories: CategoryScore[]
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-gray-500'
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-700 dark:text-emerald-400'
  if (score >= 60) return 'text-blue-700 dark:text-blue-400'
  if (score >= 40) return 'text-amber-700 dark:text-amber-400'
  return 'text-gray-700 dark:text-gray-400'
}

function getImportanceLabel(weight: number): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (weight >= 70) return { label: 'Critical', variant: 'destructive' }
  if (weight >= 50) return { label: 'High', variant: 'default' }
  if (weight >= 30) return { label: 'Medium', variant: 'secondary' }
  return { label: 'Low', variant: 'outline' }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function CategoryCard({ cat, defaultExpanded }: { cat: CategoryScore; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const importance = getImportanceLabel(cat.weight)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {capitalize(cat.name)}
          <Badge variant={importance.variant} className="text-[10px] ml-1">
            {importance.label}
          </Badge>
        </CardTitle>
        <CardAction>
          <span className={`text-lg font-bold ${getScoreTextColor(cat.score)}`}>
            {cat.score}<span className="text-sm font-normal text-muted-foreground">/100</span>
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score bar */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-3 rounded-full ${getScoreColor(cat.score)} transition-all duration-500`}
            style={{ width: `${Math.min(cat.score, 100)}%` }}
          />
        </div>

        {/* Weight label */}
        <p className="text-xs text-muted-foreground">
          Weight: {cat.weight}%
        </p>

        {/* Expandable reasoning */}
        {cat.reasoning && cat.reasoning.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Hide' : 'Show'} reasoning ({cat.reasoning.length})
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1.5 pl-1">
                {cat.reasoning.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/70"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (!categories || categories.length === 0) return null

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>
      <div className="space-y-4">
        {categories.map((cat, index) => (
          <CategoryCard
            key={cat.name}
            cat={cat}
            defaultExpanded={index < 3}
          />
        ))}
      </div>
    </div>
  )
}
