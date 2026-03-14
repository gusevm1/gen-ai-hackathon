'use client'

import { Star, MoreHorizontal, Copy, Pencil, Trash2 } from 'lucide-react'
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

function buildSummaryLine(prefs: Record<string, unknown>): string {
  const parts: string[] = []

  const offerType = prefs.offerType as string | undefined
  const location = prefs.location as string | undefined
  const offerLabel = offerType === 'SALE' ? 'Buy' : 'Rent'
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
    parts.push(`up to CHF ${budgetMax.toLocaleString('de-CH')}`)
  } else if (budgetMin != null) {
    parts.push(`from CHF ${budgetMin.toLocaleString('de-CH')}`)
  }

  const roomsMin = prefs.roomsMin as number | null | undefined
  const roomsMax = prefs.roomsMax as number | null | undefined
  if (roomsMin != null && roomsMax != null) {
    parts.push(`${roomsMin}-${roomsMax} rooms`)
  } else if (roomsMin != null) {
    parts.push(`${roomsMin}+ rooms`)
  } else if (roomsMax != null) {
    parts.push(`up to ${roomsMax} rooms`)
  }

  if (parts.length <= 1 && !location) {
    return 'No preferences set yet'
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
  const summary = buildSummaryLine(profile.preferences)

  return (
    <Card>
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
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isOnly}
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={onEdit}>
          Edit
        </Button>
        {profile.is_default ? (
          <Badge variant="secondary">Active</Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={onSetActive}>
            Set Active
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
