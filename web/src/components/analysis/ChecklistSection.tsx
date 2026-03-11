import { Check, X, HelpCircle } from 'lucide-react'

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

export function ChecklistSection({ checklist }: ChecklistSectionProps) {
  if (!checklist || checklist.length === 0) return null

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Criteria Checklist</h2>
      <div className="space-y-3">
        {checklist.map((item, i) => {
          const status = getStatusIndicator(item.met)
          const Icon = status.icon

          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${status.color}`} />
              <div>
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
