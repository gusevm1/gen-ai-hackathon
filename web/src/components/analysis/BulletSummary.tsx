interface BulletSummaryProps {
  bullets: string[]
}

export function BulletSummary({ bullets }: BulletSummaryProps) {
  if (!bullets || bullets.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Key Points</h2>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
            <span className="text-sm text-foreground/80">{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
