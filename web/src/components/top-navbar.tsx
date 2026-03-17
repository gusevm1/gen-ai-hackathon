"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, BarChart3, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "AI-Powered Search", url: "/ai-search", icon: Sparkles, accent: true },
  { title: "Profiles", url: "/profiles", icon: User },
  { title: "Analyses", url: "/analyses", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function TopNavbar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.url)

        return (
          <Link
            key={item.title}
            href={item.url}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              item.accent
                ? cn("text-primary", isActive && "bg-primary/10")
                : isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
          >
            <item.icon className="size-4" />
            <span className="hidden sm:inline">{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
