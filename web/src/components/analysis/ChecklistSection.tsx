import { Check, X, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ChecklistItem {
  criterion: string
  met: boolean | null
  note: string
}

interface ChecklistSectionProps {
  checklist: ChecklistItem[]
}

export function getStatusIndicator(met: boolean | null) {
  if (met === true) {
    return { icon: Check, color: 'text-emerald-500', label: 'Met' }
  }
  if (met === false) {
    return { icon: X, color: 'text-red-500', label: 'Not met' }
  }
  return { icon: HelpCircle, color: 'text-gray-400', label: 'Unknown' }
}

function getStatusBg(met: boolean | null): string {
  if (met === true) return 'bg-emerald-500/10'
  if (met === false) return 'bg-red-500/10'
  return 'bg-gray-500/10'
}

export function ChecklistSection({ checklist }: ChecklistSectionProps) {
  if (!checklist || checklist.length === 0) return null

  const metItems = checklist.filter((item) => item.met === true)
  const unmetItems = checklist.filter((item) => item.met === false)
  const unknownItems = checklist.filter((item) => item.met === null)

  const sortedItems = [...metItems, ...unmetItems, ...unknownItems]

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Criteria Checklist</h2>

      {/* Count summary badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        {metItems.length > 0 && (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0">
            <Check className="h-3 w-3 mr-0.5" />
            {metItems.length} met
          </Badge>
        )}
        {unmetItems.length > 0 && (
          <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-0">
            <X className="h-3 w-3 mr-0.5" />
            {unmetItems.length} not met
          </Badge>
        )}
        {unknownItems.length > 0 && (
          <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-0">
            <HelpCircle className="h-3 w-3 mr-0.5" />
            {unknownItems.length} unknown
          </Badge>
        )}
      </div>

      {/* Items list grouped by status */}
      <div className="space-y-2">
        {sortedItems.map((item, i) => {
          const status = getStatusIndicator(item.met)
          const Icon = status.icon

          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${getStatusBg(item.met)}`}>
                <Icon className={`h-3.5 w-3.5 ${status.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.criterion}</p>
                {item.note && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
