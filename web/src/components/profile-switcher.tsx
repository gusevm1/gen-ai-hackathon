"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function ProfileSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            Meine Suche
            <ChevronDown className="ml-1 size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent side="bottom" align="end" sideOffset={8}>
        <DropdownMenuItem>Meine Suche (active)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Manage profiles...</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
