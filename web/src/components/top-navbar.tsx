"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { User, BarChart3, Settings, Sparkles, Home, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { t } from "@/lib/translations"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ProfileCreationChooser } from "@/components/profile-creation-chooser"
import { CreateProfileDialog } from "@/components/profiles/create-profile-dialog"
import { createProfile } from "@/app/(dashboard)/profiles/actions"

export function TopNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { language } = useLanguage()
  const [chooserOpen, setChooserOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const linkClass = (url: string, accent?: boolean) => {
    const isActive = url === "/dashboard" ? pathname === url : pathname.startsWith(url)
    return cn(
      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
      accent
        ? cn("text-primary", isActive && "bg-primary/10")
        : isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
    )
  }

  return (
    <>
      <nav className="flex items-center gap-1">
        {/* Home */}
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          <Home className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_home")}</span>
        </Link>

        {/* Top Matches */}
        <Link href="/top-matches" className={linkClass("/top-matches", true)}>
          <Trophy className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_top_matches")}</span>
        </Link>

        {/* New Profile */}
        <button
          onClick={() => setChooserOpen(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
        >
          <Sparkles className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_new_profile")}</span>
        </button>

        {/* Profiles */}
        <Link href="/profiles" className={linkClass("/profiles")}>
          <User className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_profiles")}</span>
        </Link>

        {/* Analyses */}
        <Link href="/analyses" className={linkClass("/analyses")}>
          <BarChart3 className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_analyses")}</span>
        </Link>

        {/* Settings */}
        <Link href="/settings" className={linkClass("/settings")}>
          <Settings className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_settings")}</span>
        </Link>
      </nav>

      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="sm:max-w-2xl">
          <ProfileCreationChooser
            onAiClick={() => {
              setChooserOpen(false)
              router.push("/ai-search")
            }}
            onManualClick={() => {
              setChooserOpen(false)
              setCreateOpen(true)
            }}
          />
        </DialogContent>
      </Dialog>

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (name: string) => {
          await createProfile(name)
          setCreateOpen(false)
          router.push("/profiles")
          router.refresh()
        }}
      />
    </>
  )
}
