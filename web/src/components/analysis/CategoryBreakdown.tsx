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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (!categories || categories.length === 0) return null

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>
      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="rounded-lg border border-border bg-card p-4"
          >
            {/* Header row: name + score */}
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{capitalize(cat.name)}</span>
              <span className="text-sm font-semibold">{cat.score}/100</span>
            </div>

            {/* Score bar */}
            <div className="mb-2 h-2.5 w-full rounded-full bg-muted">
              <div
                className={`h-2.5 rounded-full ${getScoreColor(cat.score)}`}
                style={{ width: `${Math.min(cat.score, 100)}%` }}
              />
            </div>

            {/* Weight badge */}
            <p className="mb-2 text-xs text-muted-foreground">
              Weight: {cat.weight}%
            </p>

            {/* Reasoning bullets */}
            {cat.reasoning && cat.reasoning.length > 0 && (
              <ul className="space-y-1 pl-4">
                {cat.reasoning.map((reason, i) => (
                  <li
                    key={i}
                    className="list-disc text-sm text-foreground/70"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
