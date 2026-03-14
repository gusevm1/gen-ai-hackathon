import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TopNavbar } from "@/components/top-navbar"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavUser } from "@/components/nav-user"
import { ProfileSwitcher } from "@/components/profile-switcher"
import { Home } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Fetch all profiles for the current user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, is_default')
    .order('created_at', { ascending: true })

  const activeProfile = profiles?.find(p => p.is_default) ?? profiles?.[0]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Home className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">HomeMatch</span>
        </div>
        <TopNavbar />
        <div className="ml-auto flex items-center gap-2">
          <ProfileSwitcher
            profiles={profiles ?? []}
            activeProfileId={activeProfile?.id}
          />
          <ThemeToggle />
          <NavUser user={{ email: user.email ?? "" }} />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
