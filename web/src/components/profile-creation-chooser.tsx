'use client'

import { ClipboardList, Sparkles } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

interface ProfileCreationChooserProps {
  onManualClick: () => void
  onAiClick: () => void
}

export function ProfileCreationChooser({
  onManualClick,
  onAiClick,
}: ProfileCreationChooserProps) {
  const { language } = useLanguage()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <Card
        className="cursor-pointer border-2 border-border hover:border-muted-foreground/50 hover:shadow-xl transition-all duration-300 min-h-[180px]"
        onClick={onManualClick}
      >
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="size-6 text-muted-foreground" />
            <CardTitle className="text-lg">
              {t(language, 'dashboard_manual_title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed">
            {t(language, 'dashboard_manual_desc')}
          </CardDescription>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer border-2 border-rose-500/60 bg-gradient-to-br from-rose-950/40 to-pink-950/20 hover:border-rose-400 hover:from-rose-900/60 hover:to-pink-900/40 hover:shadow-[0_0_30px_rgba(244,63,94,0.25)] transition-all duration-300 min-h-[180px]"
        onClick={onAiClick}
      >
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="size-6 text-rose-400" />
            <CardTitle className="text-lg text-rose-50">
              {t(language, 'dashboard_ai_title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed text-rose-200/70">
            {t(language, 'dashboard_ai_desc')}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
