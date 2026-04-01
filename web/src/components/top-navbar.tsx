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

  const navItems = [
    { titleKey: "nav_top_matches" as const, url: "/top-matches", icon: Trophy, accent: true },
    { titleKey: "nav_profiles" as const, url: "/profiles", icon: User },
    { titleKey: "nav_analyses" as const, url: "/analyses", icon: BarChart3 },
    { titleKey: "nav_settings" as const, url: "/settings", icon: Settings },
  ]

  return (
    <>
      <nav className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            pathname === "/dashboard"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
        >
          <Home className="size-4" />
          <span className="hidden sm:inline">{t(language, "nav_home")}</span>
        </Link>
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
        {navItems.map((item) => {
          const isActive = item.url === "/dashboard" ? pathname === item.url : pathname.startsWith(item.url)

          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                item.accent
                  ? cn("text-primary", isActive && "bg-primary/10")
                  : isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              <span className="hidden sm:inline">{t(language, item.titleKey)}</span>
            </Link>
          )
        })}
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
