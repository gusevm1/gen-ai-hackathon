import { Lightbulb } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface BulletSummaryProps {
  bullets: string[]
}

export function BulletSummary({ bullets }: BulletSummaryProps) {
  if (!bullets || bullets.length === 0) return null

  return (
    <div className="rounded-xl border-l-4 border-l-primary bg-card ring-1 ring-foreground/10 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Key Takeaways</h2>
      </div>

      {/* Bullet items */}
      <div className="space-y-0">
        {bullets.map((bullet, i) => (
          <div key={i}>
            <div className="flex items-start gap-3 py-3">
              <span className="flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-foreground/80 leading-relaxed">{bullet}</span>
            </div>
            {i < bullets.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </div>
  )
}
