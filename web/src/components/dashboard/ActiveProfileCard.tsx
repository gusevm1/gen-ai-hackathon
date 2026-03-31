'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, Check, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { setActiveProfile } from '@/app/(dashboard)/profiles/actions'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import { NewProfileModal } from './NewProfileModal'

interface Preferences {
  location?: string | null
  roomsMin?: number | null
  budgetMax?: number | null
  objectCategory?: string | null
  [key: string]: unknown
}

interface Profile {
  id: string
  name: string
  is_default: boolean
  preferences: Preferences
  updated_at: string
}

interface ActiveProfileCardProps {
  profiles: Profile[]
  activeProfile: Profile
}

function buildCriteriaSummary(prefs: Record<string, unknown>): string {
  const parts: string[] = []
  if (prefs.location) parts.push(String(prefs.location))
  if (prefs.roomsMin) parts.push(`${prefs.roomsMin}+ rooms`)
  if (prefs.budgetMax) parts.push(`<${Number(prefs.budgetMax).toLocaleString()} CHF`)
  const cat = prefs.objectCategory
  if (cat && cat !== 'ANY') parts.push(String(cat).toLowerCase())
  return parts.join(' \u00b7 ') || 'No criteria set'
}

function formatLastUsed(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ActiveProfileCard({ profiles, activeProfile }: ActiveProfileCardProps) {
  const [isPending, startTransition] = useTransition()
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const { language } = useLanguage()

  function handleSwitchProfile(profileId: string) {
    if (profileId === activeProfile.id) return
    startTransition(async () => {
      await setActiveProfile(profileId)
    })
  }

  const criteriaSummary = buildCriteriaSummary(activeProfile.preferences as Record<string, unknown>)
  const lastUsed = formatLastUsed(activeProfile.updated_at)

  return (
    <>
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Profile info */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t(language, 'dashboard_active_profile')}
              </p>
              <h2 className="text-xl font-bold truncate">{activeProfile.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{criteriaSummary}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(language, 'dashboard_last_used')}: {lastUsed}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-row gap-2 shrink-0">
              {/* Switch profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" disabled={isPending} className="gap-1">
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                      {t(language, 'dashboard_switch_profile')}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" sideOffset={8}>
                  {profiles.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => handleSwitchProfile(profile.id)}
                    >
                      {profile.id === activeProfile.id ? (
                        <Check className="mr-1.5 size-3.5" />
                      ) : (
                        <span className="mr-1.5 inline-block size-3.5" />
                      )}
                      {profile.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* New profile button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setNewProfileOpen(true)}
              >
                <Plus className="size-3.5" />
                {t(language, 'dashboard_new_profile')}
              </Button>

              {/* Open Flatfox CTA */}
              <a
                href="https://flatfox.ch/en/search/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1' })}
              >
                {t(language, 'dashboard_open_flatfox')}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <NewProfileModal open={newProfileOpen} onOpenChange={setNewProfileOpen} />
    </>
  )
}
