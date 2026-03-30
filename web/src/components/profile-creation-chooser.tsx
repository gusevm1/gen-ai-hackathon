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
        className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all min-h-[180px]"
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
        className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all min-h-[180px]"
        onClick={onAiClick}
      >
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="size-6 text-primary" />
            <CardTitle className="text-lg">
              {t(language, 'dashboard_ai_title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed">
            {t(language, 'dashboard_ai_desc')}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
