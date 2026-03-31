'use client'

import { Star, MoreHorizontal, Copy, Pencil, Trash2 } from 'lucide-react'
import { OpenInFlatfoxButton } from '@/components/profiles/open-in-flatfox-button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

export interface ProfileData {
  id: string
  name: string
  is_default: boolean
  preferences: Record<string, unknown>
}

interface ProfileCardProps {
  profile: ProfileData
  isOnly: boolean
  onEdit: () => void
  onSetActive: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function buildSummaryLine(prefs: Record<string, unknown>, lang: ReturnType<typeof useLanguage>['language']): string {
  const parts: string[] = []

  const offerType = prefs.offerType as string | undefined
  const location = prefs.location as string | undefined
  const offerLabel = offerType === 'SALE' ? t(lang, 'profile_buy') : t(lang, 'profile_rent')
  if (location) {
    parts.push(`${offerLabel} in ${location}`)
  } else {
    parts.push(offerLabel)
  }

  const budgetMin = prefs.budgetMin as number | null | undefined
  const budgetMax = prefs.budgetMax as number | null | undefined
  if (budgetMin != null && budgetMax != null) {
    parts.push(`CHF ${budgetMin.toLocaleString('de-CH')}-${budgetMax.toLocaleString('de-CH')}`)
  } else if (budgetMax != null) {
    parts.push(`${t(lang, 'profile_up_to')} CHF ${budgetMax.toLocaleString('de-CH')}`)
  } else if (budgetMin != null) {
    parts.push(`${t(lang, 'profile_from')} CHF ${budgetMin.toLocaleString('de-CH')}`)
  }

  const roomsMin = prefs.roomsMin as number | null | undefined
  const roomsMax = prefs.roomsMax as number | null | undefined
  if (roomsMin != null && roomsMax != null) {
    parts.push(`${roomsMin}-${roomsMax} ${t(lang, 'profile_rooms')}`)
  } else if (roomsMin != null) {
    parts.push(`${roomsMin}+ ${t(lang, 'profile_rooms')}`)
  } else if (roomsMax != null) {
    parts.push(`${t(lang, 'profile_up_to')} ${roomsMax} ${t(lang, 'profile_rooms')}`)
  }

  if (parts.length <= 1 && !location) {
    return t(lang, 'profile_no_prefs')
  }

  return parts.join(' \u00b7 ')
}

export function ProfileCard({
  profile,
  isOnly,
  onEdit,
  onSetActive,
  onRename,
  onDuplicate,
  onDelete,
}: ProfileCardProps) {
  const { language } = useLanguage()
  const summary = buildSummaryLine(profile.preferences, language)
  const flatfoxPrefs = {
    offerType: profile.preferences.offerType as string | undefined,
    objectCategory: profile.preferences.objectCategory as string | undefined,
    location: profile.preferences.location as string | undefined,
    budgetMin: profile.preferences.budgetMin as number | null | undefined,
    budgetMax: profile.preferences.budgetMax as number | null | undefined,
    roomsMin: profile.preferences.roomsMin as number | null | undefined,
    roomsMax: profile.preferences.roomsMax as number | null | undefined,
  }

  return (
    <Card className="hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-primary/10 transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {profile.is_default && (
            <Star className="size-4 text-amber-500 fill-amber-500" />
          )}
          {profile.name}
        </CardTitle>
        <CardDescription>{summary}</CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="size-4" />
                {t(language, 'profile_rename')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="size-4" />
                {t(language, 'profile_duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isOnly}
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                {t(language, 'profile_delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardFooter className="gap-2 flex-wrap">
        <Button size="sm" onClick={onEdit}>
          {t(language, 'profile_edit')}
        </Button>
        {profile.is_default ? (
          <Badge variant="secondary">{t(language, 'profile_active')}</Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={onSetActive}>
            {t(language, 'profile_set_active')}
          </Button>
        )}
        <OpenInFlatfoxButton preferences={flatfoxPrefs} language={language} />
      </CardFooter>
    </Card>
  )
}
