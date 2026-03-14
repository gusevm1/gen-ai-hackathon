"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check, Settings, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { setActiveProfile } from "@/app/(dashboard)/profiles/actions"

interface ProfileSwitcherProps {
  profiles: Array<{ id: string; name: string; is_default: boolean }>
  activeProfileId?: string
}

export function ProfileSwitcher({ profiles, activeProfileId }: ProfileSwitcherProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const displayName = activeProfile?.name ?? "No Profile"

  function handleSwitchProfile(profileId: string) {
    startTransition(async () => {
      await setActiveProfile(profileId)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className={isPending ? "opacity-60" : ""}>
            {isPending ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : null}
            {displayName}
            <ChevronDown className="ml-1 size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent side="bottom" align="end" sideOffset={8}>
        {profiles.length === 0 ? (
          <DropdownMenuItem disabled>No profiles yet</DropdownMenuItem>
        ) : (
          profiles.map(profile => (
            <DropdownMenuItem
              key={profile.id}
              onClick={() => {
                if (profile.id !== activeProfileId) {
                  handleSwitchProfile(profile.id)
                }
              }}
            >
              {profile.id === activeProfileId ? (
                <Check className="mr-1.5 size-3.5" />
              ) : (
                <span className="mr-1.5 inline-block size-3.5" />
              )}
              {profile.name}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profiles")}>
          <Settings className="mr-1.5 size-3.5" />
          Manage profiles...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
