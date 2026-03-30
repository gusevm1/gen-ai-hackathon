"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, BarChart3, Settings, Sparkles, Download, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { t } from "@/lib/translations"

export function TopNavbar() {
  const pathname = usePathname()
  const { language } = useLanguage()

  const navItems = [
    { titleKey: "nav_home" as const, url: "/dashboard", icon: Home },
    { titleKey: "nav_ai_search" as const, url: "/ai-search", icon: Sparkles, accent: true },
    { titleKey: "nav_profiles" as const, url: "/profiles", icon: User },
    { titleKey: "nav_analyses" as const, url: "/analyses", icon: BarChart3 },
    { titleKey: "nav_download" as const, url: "/download", icon: Download },
    { titleKey: "nav_settings" as const, url: "/settings", icon: Settings },
  ]

  return (
    <nav className="flex items-center gap-1">
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
  )
}
